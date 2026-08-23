import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import WizardMorphHeader, { WIZARD_MORPH_SHELL_PROPS } from '@/components/layout/WizardMorphHeader';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import Icon from '@/components/icons/Icon';
import Footer from '@/components/layout/Footer';
import SuccessScreen from '@/components/layout/SuccessScreen';
import BrandButton from '@/components/button/BrandButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import DangerSubdueIconButton from '@/components/button/DangerSubdueIconButton';
import Switch from '@/components/switch/Switch';
import Alert from '@/components/alert/Alert';
import Radio from '@/components/radio/Radio';
import AlertDialog from '@/components/popup/AlertDialog';
import ESignatureField from '@/components/form-builder/ESignatureField';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ASSESS_NAV from '@/pages/assess/assessNav';
import { CENTER_OPTIONS } from '@/data/accessControlStore';
import { readActivities } from '@/data/activityStore';
import { readDepartments } from '@/data/departmentStore';
import { readPositions } from '@/data/positionStore';
import { isValidEmail, EMAIL_FORMAT_ERROR } from '@/data/usersAccess';
import {
  TITLE_OPTIONS,
  GENDER_OPTIONS,
  emptyAssignment,
  findAssessUser,
  createAssessUser,
  upsertAssessUser,
  findDuplicateAssignments,
  fullName,
  centerLabel,
  readAssessUsers,
} from '@/data/assessUserStore';

/* PHCIS | Assess-control — Create personnel (Figma 4D3nTx53 · 10:44391). */

const breadcrumb = ['บุคลากร'];

const STEPS = [
  { key: 'personal', n: 1, label: 'ข้อมูลส่วนตัว' },
  { key: 'assign', n: 2, label: 'หน่วยงานและตำแหน่ง' },
  { key: 'review', n: 3, label: 'รีวิว' },
];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
};

const TOPIC_PRIMARY = {
  color: 'var(--text-topic-primary-title)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const TOPIC_SUB = {
  color: 'var(--text-topic-primary-subtext-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const TABLE_HEAD = {
  color: 'var(--text-table-title)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-xs)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const CELL_TEXT = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};

const VALUE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

/* คอลัมน์ตารางหน่วยงานและตำแหน่ง (step 2).
   • วันเวลาเริ่มงาน / วันเวลาสิ้นสุด — ช่วงปฏิบัติงานที่ศูนย์นั้น
   • สถานะในศูนย์ — Active/Inactive **รายศูนย์** ไม่ใช่รายบุคคล */
const ASSIGN_COLUMNS = [
  { key: 'order',      title: 'ลำดับ',            width: 72 },
  { key: 'center',     title: 'ศูนย์บริการ',       width: 200 },
  { key: 'activity',   title: 'กิจกรรม',           width: 180 },
  { key: 'sub',        title: 'กิจกรรมย่อย',       width: 180 },
  { key: 'dept',       title: 'แผนก',             width: 180 },
  { key: 'position',   title: 'ตำแหน่ง',           width: 180 },
  { key: 'startAt',    title: 'วันเวลาเริ่มงาน',    width: 208 },
  { key: 'endAt',      title: 'วันเวลาสิ้นสุด',     width: 208 },
  { key: 'active',     title: 'สถานะในศูนย์',      width: 152 },
  { key: 'primary',    title: 'สาขาหลัก',          width: 104 },
  { key: 'actions',    title: 'การดำเนินการ',      width: 120 },
];

const CELL_PAD = {
  padding: 'var(--dim-space-200) var(--dim-space-400)',
  borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line)',
};

/* `datetime-local` คืนค่า 'YYYY-MM-DDTHH:mm' — แปลงเป็นรูปแบบไทยให้อ่านง่าย
   บนหน้ารีวิว (ไม่แตะ timezone เพราะเป็นเวลาท้องถิ่นอยู่แล้ว). */
function formatDateTime(v) {
  if (!v) return '—';
  const [date, time = ''] = String(v).split('T');
  const [y, m, d] = date.split('-');
  if (!y || !m || !d) return v;
  return `${d}/${m}/${Number(y) + 543}${time ? ` ${time} น.` : ''}`;
}

function TopicHeader({ icon, title, subtitle }) {
  return (
    <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-200)' }}>
      <Icon name={icon} size={20} style={{ color: 'var(--text-brandPrimary-default)', flexShrink: 0 }} />
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
        <span style={TOPIC_PRIMARY}>{title}</span>
        {subtitle ? <span style={TOPIC_SUB}>{subtitle}</span> : null}
      </div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100)', flex: '1 1 160px' }}>
      <span style={LABEL}>{label}</span>
      <span style={VALUE}>{value || '—'}</span>
    </div>
  );
}

export default function AssessUserCreatePage() {
  const navigate = useHistory();
  const { id } = useParams();
  const isEdit = window.location.pathname.endsWith('/edit');
  const existing = useMemo(() => (id ? findAssessUser(id) : null), [id]);

  const [step, setStep] = useState('personal');
  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const [personal, setPersonal] = useState({
    employeeCode: '',
    title: '', firstName: '', lastName: '', prefixEn: '', nameEn: '', surnameEn: '',
    gender: '', nationalId: '', licenseNo: '', birthDate: '', age: '', phone: '', email: '',
    signature: '',
  });
  const [assignments, setAssignments] = useState([emptyAssignment()]);
  const [saved, setSaved] = useState(false);
  const [showDupeAlert, setShowDupeAlert] = useState(false);
  /* โหมดเพิ่มบุคลากร: สร้างใหม่ vs เลือกบุคลากรเดิมจากระบบ (กันสร้างคนซ้ำ
     และกันให้สิทธิ์ซ้ำซ้อน — Nielsen #5/#6) เฉพาะ flow สร้าง (ไม่ใช่แก้ไข) */
  const [entryMode, setEntryMode] = useState('new'); // 'new' | 'existing'
  const [pickedUserId, setPickedUserId] = useState('');
  /* Confirmation ก่อนบันทึกจริง — การผูกสิทธิ์กิจกรรมมีผลต่อการเข้าถึงข้อมูลผู้ป่วย */
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  const activities = useMemo(() => readActivities(), []);
  const departments = useMemo(() => readDepartments(), []);
  const positions = useMemo(() => readPositions(), []);
  const allUsers = useMemo(() => readAssessUsers(), []);
  const pickedUser = useMemo(
    () => (entryMode === 'existing' ? allUsers.find((u) => u.id === pickedUserId) || null : null),
    [entryMode, pickedUserId, allUsers],
  );

  useEffect(() => {
    if (!existing) return;
    setPersonal({
      employeeCode: existing.employeeCode || '',
      signature: existing.signature || '',
      title: existing.title || '',
      firstName: existing.firstName || '',
      lastName: existing.lastName || '',
      prefixEn: existing.prefixEn || '',
      nameEn: existing.nameEn || '',
      surnameEn: existing.surnameEn || '',
      gender: existing.gender || '',
      nationalId: existing.nationalId || '',
      licenseNo: existing.licenseNo || '',
      birthDate: existing.birthDate || '',
      age: existing.age || '',
      phone: existing.phone || '',
      email: existing.email || '',
    });
    setAssignments(existing.assignments?.length ? existing.assignments : [emptyAssignment()]);
  }, [existing]);

  /* เลือกบุคลากรเดิม → เติมข้อมูลส่วนตัว + สิทธิ์กิจกรรมเดิมของเขาเข้าฟอร์ม
     (แถวเดิมโชว์ให้เห็นว่ามีอะไรอยู่แล้ว — เพิ่มแถวใหม่ได้โดยไม่ให้ซ้ำ)
     สลับกลับมา "สร้างใหม่" หรือเปลี่ยนคน = ล้างฟอร์มเริ่มใหม่ */
  useEffect(() => {
    if (isEdit) return;
    if (!pickedUser) {
      setPersonal({
        employeeCode: '', title: '', firstName: '', lastName: '', prefixEn: '', nameEn: '', surnameEn: '',
        gender: '', nationalId: '', licenseNo: '', birthDate: '', age: '', phone: '', email: '',
        signature: '',
      });
      setAssignments([emptyAssignment()]);
      return;
    }
    setPersonal({
      employeeCode: pickedUser.employeeCode || '',
      signature: pickedUser.signature || '',
      title: pickedUser.title || '',
      firstName: pickedUser.firstName || '',
      lastName: pickedUser.lastName || '',
      prefixEn: pickedUser.prefixEn || '',
      nameEn: pickedUser.nameEn || '',
      surnameEn: pickedUser.surnameEn || '',
      gender: pickedUser.gender || '',
      nationalId: pickedUser.nationalId || '',
      licenseNo: pickedUser.licenseNo || '',
      birthDate: pickedUser.birthDate || '',
      age: pickedUser.age || '',
      phone: pickedUser.phone || '',
      email: pickedUser.email || '',
    });
    setAssignments(pickedUser.assignments?.length ? pickedUser.assignments : [emptyAssignment()]);
  }, [isEdit, pickedUser]);

  const centerOpts = [{ value: '', label: 'เลือกศูนย์บริการ' }, ...CENTER_OPTIONS];
  const activityOpts = [{ value: '', label: 'เลือกกิจกรรม' }, ...activities.map((a) => ({ value: a.id, label: a.name }))];
  const deptOpts = [{ value: '', label: 'เลือกแผนก' }, ...departments.map((d) => ({ value: d.id, label: d.name }))];
  const posOpts = [{ value: '', label: 'เลือกตำแหน่ง' }, ...positions.map((p) => ({ value: p.id, label: p.name }))];

  /* Auto-complete เลือกบุคลากรเดิม — ค้นด้วยชื่อ/รหัสพนักงาน/เลขวิชาชีพ
     (Select searchable) พร้อม subtext บอกกิจกรรมเดิมกันเลือกผิดคน */
  const userPickOpts = useMemo(() => allUsers.map((u) => ({
    value: u.id,
    label: fullName(u),
    subtext: [u.employeeCode, u.licenseNo, (u.assignments || []).filter((a) => a.activity).map((a) => a.activity).join(', ')]
      .filter(Boolean).join(' · ') || 'ยังไม่มีสิทธิ์กิจกรรม',
  })), [allUsers]);

  const labelOf = (opts, value) => opts.find((o) => o.value === value)?.label || '';
  const subOptsFor = (activityId) => {
    const act = activities.find((a) => a.id === activityId);
    return [{ value: '', label: 'เลือกกิจกรรมย่อย' }, ...(act?.subActivities || []).map((sub) => ({ value: sub.id, label: sub.name }))];
  };

  const setField = (key) => (v) => setPersonal((p) => ({ ...p, [key]: v }));

  const setAssignment = (idx, patch) => {
    setAssignments((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const setPrimary = (idx) => {
    setAssignments((rows) => rows.map((r, i) => ({ ...r, isPrimary: i === idx })));
  };

  const addAssignment = () => setAssignments((rows) => [...rows, { ...emptyAssignment(), isPrimary: rows.length === 0 }]);

  const removeAssignment = (idx) => {
    setAssignments((rows) => {
      const next = rows.filter((_, i) => i !== idx);
      if (!next.some((r) => r.isPrimary) && next.length) next[0] = { ...next[0], isPrimary: true };
      return next.length ? next : [{ ...emptyAssignment(), isPrimary: true }];
    });
  };

  /* อีเมลบังคับกรอก **และ** ต้องถูกรูปแบบ ไม่งั้นข้ามไป step ถัดไปไม่ได้ */
  const personalValid = personal.employeeCode.trim() && personal.firstName.trim()
    && personal.lastName.trim() && personal.nationalId.trim()
    && personal.email.trim() && isValidEmail(personal.email);

  /* สิ้นสุดเว้นว่างได้ (= ปฏิบัติงานต่อเนื่อง) แต่ถ้าใส่ ต้องไม่มาก่อนวันเริ่ม */
  const rangeValid = (r) => !r.startAt || !r.endAt || r.endAt > r.startAt;

  const assignmentValid = assignments.every((r) => (
    r.centerId && r.activityId && r.subActivityId && r.departmentId && r.positionId
    && r.startAt && rangeValid(r)
  )) && assignments.some((r) => r.isPrimary);

  const duplicateIdx = findDuplicateAssignments(assignments);

  const buildRecord = () => {
    /* เลือกบุคลากรเดิม = อัปเดต record ของคนนั้น (id เดิม) ไม่สร้างคนซ้ำ */
    const base = existing || pickedUser || createAssessUser({});
    const normalized = assignments.map((r) => ({
      ...r,
      center: centerLabel(r.centerId) || labelOf(centerOpts, r.centerId),
      activity: labelOf(activityOpts, r.activityId),
      subActivity: labelOf(subOptsFor(r.activityId), r.subActivityId),
      department: labelOf(deptOpts, r.departmentId),
      position: labelOf(posOpts, r.positionId),
    }));
    return {
      ...base,
      ...personal,
      assignments: normalized,
      active: base.active !== false,
    };
  };

  const handleSaveDraft = () => {
    upsertAssessUser(buildRecord());
  };

  const goNext = () => {
    if (step === 'personal') {
      if (!personalValid) return;
      setStep('assign');
      return;
    }
    if (step === 'assign') {
      if (duplicateIdx.length) {
        setShowDupeAlert(true);
        return;
      }
      if (!assignmentValid) return;
      setStep('review');
    }
  };

  const goBack = () => {
    if (step === 'assign') setStep('personal');
    else if (step === 'review') setStep('assign');
  };

  /* ปุ่มบันทึกเปิด modal ทวนสรุปก่อน — ยืนยันแล้วจึงบันทึกจริง */
  const handleSubmit = () => {
    if (!personalValid || !assignmentValid || duplicateIdx.length) return;
    setConfirmSaveOpen(true);
  };

  const applySubmit = () => {
    setConfirmSaveOpen(false);
    const record = upsertAssessUser(buildRecord());
    if (isEdit) {
      navigate.push(`/assess/users/${record.id}`);
      return;
    }
    setSaved(true);
  };

  const confirmSummary = useMemo(() => {
    const acts = [...new Set(assignments.map((r) => labelOf(activityOpts, r.activityId)).filter(Boolean))];
    const primary = assignments.find((r) => r.isPrimary);
    const center = primary ? (centerLabel(primary.centerId) || labelOf(centerOpts, primary.centerId)) : '';
    return `${fullName(personal)} — ${assignments.length} หน่วยงาน · กิจกรรม: ${acts.join(', ') || '—'}${center ? ` · ศูนย์หลัก: ${center}` : ''}`;
  }, [assignments, personal, activityOpts, centerOpts]);

  const footerPrimary = step === 'personal'
    ? { label: 'ถัดไป: หน่วยงานและตำแหน่ง', icon: 'arrow_forward', disabled: !personalValid, onClick: goNext }
    : step === 'assign'
      ? { label: 'ถัดไป: รีวิว', icon: 'arrow_forward', disabled: !assignmentValid || !!duplicateIdx.length, onClick: goNext }
      : { label: isEdit ? 'บันทึก' : 'สร้างบุคลากร', icon: isEdit ? 'save' : 'check', disabled: false, onClick: handleSubmit };

  if (isEdit && id && !existing) {
    return (
      <QueuePageShell
        activeKey='system-staff'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='system-staff'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title='บุคลากร'
        onBack={() => navigate.push('/assess/users')}
      >
        <div style={{ padding: 'var(--dim-space-600)' }}>ไม่พบบุคลากร</div>
      </QueuePageShell>
    );
  }

  return (
    <>
      <QueuePageShell
        activeKey='system-staff'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='system-staff'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        {...WIZARD_MORPH_SHELL_PROPS}
        headerInfo={(
          <WizardMorphHeader
            title={isEdit ? 'แก้ไขบุคลากร' : 'สร้างบุคลากร'}
            steps={STEPS.map((s) => s.label)}
            current={stepIndex}
            onStepClick={(i) => { if (i < stepIndex) setStep(STEPS[i].key); }}
          />
        )}
      >
        <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)', paddingBottom: 'var(--dim-space-900)' }}>
          {/* โหมดเพิ่มบุคลากร — แยก "สร้างใหม่" vs "เลือกจากระบบ" ให้ชัดตั้งแต่ต้น
              เลือกคนเดิมแล้วเห็นสิทธิ์กิจกรรมที่มีอยู่ทันที กันให้สิทธิ์ซ้ำซ้อน */}
          {!isEdit && step === 'personal' && (
            <section className='flex flex-col w-full' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
              <TopicHeader
                icon='person_add'
                title='เลือกวิธีเพิ่มบุคลากร'
                subtitle='สร้างบุคลากรใหม่ หรือเลือกบุคลากรเดิมจากระบบเพื่อเพิ่ม/ปรับสิทธิ์กิจกรรม'
              />
              <div className='flex flex-wrap items-start' style={{ gap: 'var(--dim-space-600)' }}>
                <Radio
                  name='assess-user-entry-mode'
                  value='new'
                  checked={entryMode === 'new'}
                  onChange={() => { setEntryMode('new'); setPickedUserId(''); }}
                  label='สร้างบุคลากรใหม่'
                  description='กรอกข้อมูลบุคลากรที่ยังไม่เคยมีในระบบ'
                />
                <Radio
                  name='assess-user-entry-mode'
                  value='existing'
                  checked={entryMode === 'existing'}
                  onChange={() => setEntryMode('existing')}
                  label='เลือกบุคลากรเดิมจากระบบ'
                  description='ค้นหาด้วยชื่อ รหัสพนักงาน หรือเลขวิชาชีพ แล้วปรับสิทธิ์ของคนเดิม'
                />
              </div>
              {entryMode === 'existing' && (
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)', maxWidth: 480 }}>
                  <Select
                    label='ค้นหาบุคลากรเดิม'
                    options={userPickOpts}
                    value={pickedUserId}
                    onChange={setPickedUserId}
                    searchable
                    placeholder='พิมพ์ชื่อ / รหัสพนักงาน / เลขวิชาชีพ'
                    helperText={allUsers.length ? 'ระบบจะเติมข้อมูลและสิทธิ์เดิมของบุคลากรให้อัตโนมัติ' : 'ยังไม่มีบุคลากรในระบบ — สลับไป "สร้างบุคลากรใหม่"'}
                  />
                  {pickedUser ? (
                    <div
                      className='flex flex-col'
                      style={{
                        gap: 'var(--dim-space-200)',
                        padding: 'var(--dim-space-400)',
                        background: 'var(--surface-brandPrimary-quaternary)',
                        border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                        borderRadius: 'var(--dim-radius-400)',
                      }}
                    >
                      <span style={LABEL}>สิทธิ์กิจกรรมเดิมของ {fullName(pickedUser)}</span>
                      {(pickedUser.assignments || []).filter((a) => a.activity).length ? (
                        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                          {(pickedUser.assignments || []).filter((a) => a.activity).map((a) => (
                            <ColorfulBadge key={a.id} style='teal' size='small' hierarchy='secondary' width='hug'>
                              {[a.activity, a.subActivity, a.center].filter(Boolean).join(' · ')}
                            </ColorfulBadge>
                          ))}
                        </div>
                      ) : (
                        <span style={VALUE}>ยังไม่มีสิทธิ์กิจกรรม — เพิ่มได้ใน step หน่วยงานและตำแหน่ง</span>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          )}
          {step === 'personal' && (
            <section className='flex flex-col w-full' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
              <TopicHeader icon='face' title='ข้อมูลส่วนตัว' subtitle='กรอกข้อมูลส่วนตัวของบุคลากร' />
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                <div style={{ flex: '1 1 240px', minWidth: 220 }}>
                  <InputField
                    label='รหัสพนักงาน'
                    required
                    value={personal.employeeCode}
                    onChange={setField('employeeCode')}
                    placeholder='เช่น EMP-00412'
                    helperText='รหัสประจำตัวบุคลากรของสำนักอนามัย ต้องไม่ซ้ำกับผู้อื่น'
                  />
                </div>
              </div>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                <div style={{ flex: '1 1 140px', minWidth: 140 }}>
                  <Select label='คำนำหน้า' options={TITLE_OPTIONS} value={personal.title} onChange={setField('title')} searchable={false} />
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                  <InputField label='ชื่อ' required value={personal.firstName} onChange={setField('firstName')} placeholder='เช่น สมชาย' />
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                  <InputField label='นามสกุล' required value={personal.lastName} onChange={setField('lastName')} placeholder='เช่น ใจดี' />
                </div>
              </div>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                <div style={{ flex: '1 1 140px', minWidth: 140 }}>
                  <InputField label='Prefix' value={personal.prefixEn} onChange={setField('prefixEn')} placeholder='Mr.' />
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                  <InputField label='Name' value={personal.nameEn} onChange={setField('nameEn')} placeholder='Somchai' />
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                  <InputField label='Surname' value={personal.surnameEn} onChange={setField('surnameEn')} placeholder='Jaisawaddee' />
                </div>
              </div>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                  <Select label='เพศกำเนิด' options={GENDER_OPTIONS} value={personal.gender} onChange={setField('gender')} searchable={false} />
                </div>
                <div style={{ flex: '1 1 240px', minWidth: 220 }}>
                  <InputField label='เลขบัตรประชาชน' required value={personal.nationalId} onChange={setField('nationalId')} placeholder='x-xxx-xxxxx-xx-x' />
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                  <InputField label='รหัสวิชาชีพ (ว.)' value={personal.licenseNo} onChange={setField('licenseNo')} placeholder='ว.12345' />
                </div>
              </div>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                  <InputField label='วันเดือนปีเกิด' value={personal.birthDate} onChange={setField('birthDate')} placeholder='DD/MM/YYYY' />
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                  <InputField label='อายุ (ปี-เดือน-วัน)' value={personal.age} onChange={setField('age')} placeholder='43-0-9' />
                </div>
              </div>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                <div style={{ flex: '1 1 240px', minWidth: 220 }}>
                  <InputField label='เบอร์โทรศัพท์' value={personal.phone} onChange={setField('phone')} placeholder='08x-xxx-xxxx' />
                </div>
                <div style={{ flex: '1 1 240px', minWidth: 220 }}>
                  <InputField
                    label='อีเมล'
                    required
                    value={personal.email}
                    onChange={setField('email')}
                    placeholder='name@bma.go.th'
                    error={isValidEmail(personal.email) ? '' : EMAIL_FORMAT_ERROR}
                  />
                </div>
              </div>

              {/* ลายเซ็นดิจิทัล — เซ็นสดบนจอ หรืออัปโหลดรูปลายเซ็นก็ได้
                  (ESignatureField รวมทั้งสองช่องทางไว้แล้ว ตาม TOR §1.8.4.1–.2) */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <TopicHeader
                  icon='stylus_note'
                  title='ลายเซ็นดิจิทัล'
                  subtitle='เซ็นบนจอหรืออัปโหลดรูปลายเซ็น — ใช้กำกับเอกสารที่บุคลากรคนนี้ลงนาม'
                />
                <ESignatureField
                  value={personal.signature}
                  onChange={setField('signature')}
                  signerName={fullName(personal)}
                />
              </div>
            </section>
          )}

          {step === 'assign' && (
            <section className='flex flex-col w-full' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
              <TopicHeader
                icon='face'
                title='หน่วยงานและตำแหน่ง'
                subtitle='บุคลากร 1 คนทำงานได้หลายสำนักงานอนามัย และกรุณาเลือกสาขาหลัก 1 แห่ง'
              />
              {showDupeAlert && (
                <Alert
                  type='warning'
                  title='มีรายการที่ซ้ำกัน'
                  subtext='กรุณาตรวจสอบหน่วยงานและตำแหน่งที่ซ้ำกัน แล้วแก้ไขก่อนดำเนินการต่อ'
                  onClose={() => setShowDupeAlert(false)}
                />
              )}
              <div
                className='w-full overflow-x-auto'
                style={{
                  border: 'var(--dim-stroke-100) solid var(--border-table-default)',
                  borderRadius: 'var(--dim-radius-400)',
                }}
              >
                <table className='w-full border-collapse' style={{ minWidth: 1640 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-table-header)' }}>
                      {ASSIGN_COLUMNS.map(({ title, width }) => (
                        <th
                          key={title}
                          className='text-left'
                          style={{
                            ...TABLE_HEAD,
                            padding: 'var(--dim-space-200) var(--dim-space-400)',
                            borderBottom: 'var(--dim-stroke-200) solid var(--border-table-default)',
                            width,
                          }}
                        >
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((row, idx) => {
                      const isDupe = duplicateIdx.includes(idx);
                      const subOpts = subOptsFor(row.activityId);
                      return (
                        <tr key={row.id} style={isDupe ? { background: 'var(--surface-alert-warning)' } : undefined}>
                          <td style={{ ...CELL_TEXT, ...CELL_PAD }}>
                            {idx + 1}
                          </td>
                          <td style={CELL_PAD}>
                            <Select size='medium' showLabel={false} showHelperText={false} options={centerOpts} value={row.centerId} onChange={(v) => setAssignment(idx, { centerId: v, center: centerLabel(v) })} />
                          </td>
                          <td style={CELL_PAD}>
                            <Select size='medium' showLabel={false} showHelperText={false} options={activityOpts} value={row.activityId} onChange={(v) => setAssignment(idx, { activityId: v, subActivityId: '', subActivity: '' })} />
                          </td>
                          <td style={CELL_PAD}>
                            <Select size='medium' showLabel={false} showHelperText={false} options={subOpts} value={row.subActivityId} onChange={(v) => setAssignment(idx, { subActivityId: v })} disabled={!row.activityId} />
                          </td>
                          <td style={CELL_PAD}>
                            <Select size='medium' showLabel={false} showHelperText={false} options={deptOpts} value={row.departmentId} onChange={(v) => setAssignment(idx, { departmentId: v })} />
                          </td>
                          <td style={CELL_PAD}>
                            <Select size='medium' showLabel={false} showHelperText={false} options={posOpts} value={row.positionId} onChange={(v) => setAssignment(idx, { positionId: v })} />
                          </td>
                          <td style={CELL_PAD}>
                            <InputField
                              showLabel={false}
                              showHelperText={false}
                              showLeadingIcon={false}
                              size='medium'
                              type='datetime-local'
                              value={row.startAt || ''}
                              onChange={(v) => setAssignment(idx, { startAt: v })}
                              aria-label={`วันเวลาเริ่มงานแถว ${idx + 1}`}
                            />
                          </td>
                          <td style={CELL_PAD}>
                            <InputField
                              showLabel={false}
                              showHelperText={false}
                              showLeadingIcon={false}
                              size='medium'
                              type='datetime-local'
                              value={row.endAt || ''}
                              onChange={(v) => setAssignment(idx, { endAt: v })}
                              aria-label={`วันเวลาสิ้นสุดแถว ${idx + 1}`}
                            />
                          </td>
                          {/* สถานะรายศูนย์ — คนเดียวกัน Active ที่ศูนย์หนึ่ง Inactive อีกศูนย์ได้ */}
                          <td style={CELL_PAD}>
                            <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                              <Switch
                                checked={row.active !== false}
                                onChange={(next) => setAssignment(idx, { active: next })}
                                aria-label={`สถานะในศูนย์แถว ${idx + 1}`}
                              />
                              <ColorfulBadge style={row.active !== false ? 'green' : 'grey'}>
                                {row.active !== false ? 'Active' : 'Inactive'}
                              </ColorfulBadge>
                            </div>
                          </td>
                          <td style={CELL_PAD}>
                            <Switch checked={row.isPrimary} onChange={() => setPrimary(idx)} aria-label={`สาขาหลักแถว ${idx + 1}`} />
                          </td>
                          <td style={CELL_PAD}>
                            <DangerSubdueIconButton icon='delete' variant='ghost' size='md' aria-label='ลบ' disabled={assignments.length <= 1} onClick={() => removeAssignment(idx)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <BrandDashedAddButton onClick={addAssignment}>เพิ่มหน่วยงานและตำแหน่ง</BrandDashedAddButton>
            </section>
          )}

          {step === 'review' && (
            <section className='flex flex-col w-full' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
              <TopicHeader icon='fact_check' title='รีวิว' subtitle='ตรวจสอบข้อมูลก่อนสร้างบุคลากร' />
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
                <span style={TOPIC_PRIMARY}>ข้อมูลส่วนตัว</span>
                <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
                  <InfoField label='รหัสพนักงาน' value={personal.employeeCode} />
                  <InfoField label='ชื่อ-นามสกุล' value={fullName(personal)} />
                  <InfoField label='Name' value={[personal.nameEn, personal.surnameEn].filter(Boolean).join(' ')} />
                  <InfoField label='เลขบัตรประชาชน' value={personal.nationalId} />
                  <InfoField label='รหัสวิชาชีพ (ว.)' value={personal.licenseNo} />
                  <InfoField label='อีเมล' value={personal.email} />
                  <InfoField label='เบอร์โทรศัพท์' value={personal.phone} />
                </div>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                  <span style={LABEL}>ลายเซ็นดิจิทัล</span>
                  {personal.signature ? (
                    <img
                      src={personal.signature}
                      alt='ลายเซ็นดิจิทัล'
                      style={{
                        height: 64,
                        width: 'auto',
                        maxWidth: 240,
                        objectFit: 'contain',
                        background: 'var(--surface-card-100)',
                        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                        borderRadius: 'var(--dim-radius-200)',
                        padding: 'var(--dim-space-200)',
                      }}
                    />
                  ) : (
                    <span style={VALUE}>ยังไม่ได้เซ็น</span>
                  )}
                </div>
              </div>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
                <span style={TOPIC_PRIMARY}>หน่วยงานและตำแหน่ง</span>
                {assignments.map((row, idx) => (
                  <div
                    key={row.id}
                    className='flex flex-wrap'
                    style={{
                      gap: 'var(--dim-space-400)',
                      padding: 'var(--dim-space-400)',
                      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                      borderRadius: 'var(--dim-radius-400)',
                    }}
                  >
                    <InfoField label='ลำดับ' value={String(idx + 1)} />
                    <InfoField label='ศูนย์บริการ' value={centerLabel(row.centerId) || labelOf(centerOpts, row.centerId)} />
                    <InfoField label='กิจกรรม' value={labelOf(activityOpts, row.activityId)} />
                    <InfoField label='กิจกรรมย่อย' value={labelOf(subOptsFor(row.activityId), row.subActivityId)} />
                    <InfoField label='แผนก' value={labelOf(deptOpts, row.departmentId)} />
                    <InfoField label='ตำแหน่ง' value={labelOf(posOpts, row.positionId)} />
                    <InfoField label='วันเวลาเริ่มงาน' value={formatDateTime(row.startAt)} />
                    <InfoField label='วันเวลาสิ้นสุด' value={row.endAt ? formatDateTime(row.endAt) : 'ไม่กำหนด'} />
                    <InfoField label='สถานะในศูนย์' value={row.active !== false ? 'Active' : 'Inactive'} />
                    <InfoField label='สาขาหลัก' value={row.isPrimary ? 'ใช่' : 'ไม่ใช่'} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <Footer
          type='with BTN'
          sticky
          showButton3
          button3Label={step === 'personal' ? 'ยกเลิก' : 'ย้อนกลับ'}
          button3Icon={step === 'personal' ? undefined : 'arrow_back'}
          onButton3Click={step === 'personal' ? () => navigate.push('/assess/users') : goBack}
          showButton2
          button2Label='บันทึกร่าง'
          button2Icon='save'
          onButton2Click={handleSaveDraft}
          showButton1
          button1Label={footerPrimary.label}
          button1TrailingIcon={footerPrimary.icon}
          button1Disabled={footerPrimary.disabled}
          onButton1Click={footerPrimary.onClick}
        />
      </QueuePageShell>
      {/* ทวนสรุปก่อนบันทึกการเปลี่ยนแปลงสิทธิ์ — กระทบการเข้าถึงข้อมูลของบุคลากร */}
      <AlertDialog
        open={confirmSaveOpen}
        onClose={() => setConfirmSaveOpen(false)}
        type='warning'
        alignment='center'
        title={pickedUser || isEdit ? 'ยืนยันการบันทึกสิทธิ์ของบุคลากรเดิม?' : 'ยืนยันการสร้างบุคลากร?'}
        description={confirmSummary}
        confirmLabel={isEdit ? 'บันทึก' : pickedUser ? 'บันทึกสิทธิ์' : 'สร้างบุคลากร'}
        cancelLabel='ยกเลิก'
        onConfirm={applySubmit}
      />
      {saved ? (
        <SuccessScreen
          title={pickedUser
            ? <>อัปเดตสิทธิ์บุคลากร<br />สำเร็จ</>
            : <>คุณสร้างบุคลากรใหม่<br />สำเร็จ</>}
          buttonLabel='เข้าสู่หน้าบุคลากร'
          onDone={() => navigate.push('/assess/users')}
        />
      ) : null}
    </>
  );
}
