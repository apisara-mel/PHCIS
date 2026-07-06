import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
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
import ASSESS_NAV from '@/pages/assess/assessNav';
import { CENTER_OPTIONS } from '@/data/accessControlStore';
import { readGroupPolicies } from '@/data/groupPolicyStore';
import { readDepartments } from '@/data/departmentStore';
import { readPositions } from '@/data/positionStore';
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

const Stepper = ({ step }) => {
  const idx = STEPS.findIndex((s) => s.key === step);
  return (
    <div className='flex items-start w-full' style={{ paddingBottom: 'var(--dim-space-200)' }}>
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        const on = done || active;
        return (
          <React.Fragment key={s.key}>
            <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-150)', width: 160, flexShrink: 0 }}>
              <span
                className='inline-flex items-center justify-center'
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--dim-radius-full)',
                  background: done
                    ? 'var(--surface-steps-success, #24A899)'
                    : active
                      ? 'var(--surface-steps-selected, #007549)'
                      : 'var(--surface-steps-default, #E2F3EB)',
                  color: active ? 'var(--text-steps-select, #FFFFFF)' : 'var(--text-steps-default, #007549)',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-sm)',
                  border: active ? 'var(--dim-stroke-400) solid var(--primaryborder-600, rgba(8,167,104,0.15))' : 'none',
                }}
              >
                {done ? <Icon name='check' size={16} color='var(--text-steps-select, #FFFFFF)' /> : s.n}
              </span>
              <span style={{
                fontFamily: done ? 'var(--type-family-body)' : active ? 'var(--type-family-heading-graphic2)' : 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                color: done
                  ? 'var(--text-steps-title-success, #196C65)'
                  : active
                    ? 'var(--text-steps-title-select, #007549)'
                    : 'var(--text-steps-title, rgba(0,117,73,0.5))',
                textAlign: 'center',
              }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span style={{
                flex: 1,
                height: 'var(--dim-stroke-150)',
                background: i < idx ? 'var(--surface-brandPrimary-default, #007549)' : 'var(--border-steps-default, #C5EDDA)',
                marginTop: 14,
                borderRadius: 999,
              }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

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
  const [personal, setPersonal] = useState({
    title: '', firstName: '', lastName: '', prefixEn: '', nameEn: '', surnameEn: '',
    gender: '', nationalId: '', licenseNo: '', birthDate: '', age: '', phone: '', email: '',
  });
  const [assignments, setAssignments] = useState([emptyAssignment()]);
  const [saved, setSaved] = useState(false);
  const [showDupeAlert, setShowDupeAlert] = useState(false);

  const groupPolicies = useMemo(() => readGroupPolicies(), []);
  const departments = useMemo(() => readDepartments(), []);
  const positions = useMemo(() => readPositions(), []);

  useEffect(() => {
    if (!existing) return;
    setPersonal({
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

  const centerOpts = [{ value: '', label: 'เลือกศูนย์บริการ' }, ...CENTER_OPTIONS];
  const groupOpts = [{ value: '', label: 'เลือก Group Policy' }, ...groupPolicies.map((g) => ({ value: g.id, label: g.name }))];
  const deptOpts = [{ value: '', label: 'เลือกแผนก' }, ...departments.map((d) => ({ value: d.id, label: d.name }))];
  const posOpts = [{ value: '', label: 'เลือกตำแหน่ง' }, ...positions.map((p) => ({ value: p.id, label: p.name }))];

  const labelOf = (opts, value) => opts.find((o) => o.value === value)?.label || '';
  const subOptsFor = (groupPolicyId) => {
    const gp = groupPolicies.find((g) => g.id === groupPolicyId);
    return [{ value: '', label: 'เลือกสาขาย่อย' }, ...(gp?.subBranches || []).map((sb) => ({ value: sb.id, label: sb.name }))];
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

  const personalValid = personal.firstName.trim() && personal.lastName.trim()
    && personal.nationalId.trim() && personal.email.trim();

  const assignmentValid = assignments.every((r) => (
    r.centerId && r.groupPolicyId && r.subBranchId && r.departmentId && r.positionId
  )) && assignments.some((r) => r.isPrimary);

  const duplicateIdx = findDuplicateAssignments(assignments);

  const buildRecord = () => {
    const base = existing || createAssessUser({});
    const normalized = assignments.map((r) => ({
      ...r,
      center: centerLabel(r.centerId) || labelOf(centerOpts, r.centerId),
      groupPolicy: labelOf(groupOpts, r.groupPolicyId),
      subBranch: labelOf(subOptsFor(r.groupPolicyId), r.subBranchId),
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

  const handleSubmit = () => {
    if (!personalValid || !assignmentValid || duplicateIdx.length) return;
    const record = upsertAssessUser(buildRecord());
    if (isEdit) {
      navigate.push(`/assess/users/${record.id}`);
      return;
    }
    setSaved(true);
  };

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
        title='บุคลากร'
        onBack={isEdit ? () => navigate.push(`/assess/users/${id}`) : () => navigate.push('/assess/users')}
      >
        <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)', paddingBottom: 'var(--dim-space-900)' }}>
          <section className='flex flex-col w-full' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-0)' }}>
            <Stepper step={step} />
          </section>

          {step === 'personal' && (
            <section className='flex flex-col w-full' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
              <TopicHeader icon='face' title='ข้อมูลส่วนตัว' subtitle='กรอกข้อมูลส่วนตัวของบุคลากร' />
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
                  <InputField label='อีเมล' required value={personal.email} onChange={setField('email')} placeholder='name@bma.go.th' />
                </div>
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
                <table className='w-full border-collapse' style={{ minWidth: 1100 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-table-header)' }}>
                      {['ลำดับ', 'ศูนย์บริการ', 'Group Policy', 'สาขาย่อย', 'แผนก', 'ตำแหน่ง', 'สาขาหลัก', 'การดำเนินการ'].map((h) => (
                        <th
                          key={h}
                          className='text-left'
                          style={{
                            ...TABLE_HEAD,
                            padding: 'var(--dim-space-200) var(--dim-space-400)',
                            borderBottom: 'var(--dim-stroke-200) solid var(--border-table-default)',
                            width: h === 'ลำดับ' ? 80 : h === 'สาขาหลัก' ? 112 : h === 'การดำเนินการ' ? 128 : undefined,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((row, idx) => {
                      const isDupe = duplicateIdx.includes(idx);
                      const subOpts = subOptsFor(row.groupPolicyId);
                      return (
                        <tr key={row.id} style={isDupe ? { background: 'var(--surface-alert-warning)' } : undefined}>
                          <td style={{ ...CELL_TEXT, padding: 'var(--dim-space-200) var(--dim-space-400)', borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line)' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: 'var(--dim-space-200) var(--dim-space-400)', borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line)' }}>
                            <Select size='medium' showLabel={false} showHelperText={false} options={centerOpts} value={row.centerId} onChange={(v) => setAssignment(idx, { centerId: v, center: centerLabel(v) })} />
                          </td>
                          <td style={{ padding: 'var(--dim-space-200) var(--dim-space-400)', borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line)' }}>
                            <Select size='medium' showLabel={false} showHelperText={false} options={groupOpts} value={row.groupPolicyId} onChange={(v) => setAssignment(idx, { groupPolicyId: v, subBranchId: '', subBranch: '' })} />
                          </td>
                          <td style={{ padding: 'var(--dim-space-200) var(--dim-space-400)', borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line)' }}>
                            <Select size='medium' showLabel={false} showHelperText={false} options={subOpts} value={row.subBranchId} onChange={(v) => setAssignment(idx, { subBranchId: v })} disabled={!row.groupPolicyId} />
                          </td>
                          <td style={{ padding: 'var(--dim-space-200) var(--dim-space-400)', borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line)' }}>
                            <Select size='medium' showLabel={false} showHelperText={false} options={deptOpts} value={row.departmentId} onChange={(v) => setAssignment(idx, { departmentId: v })} />
                          </td>
                          <td style={{ padding: 'var(--dim-space-200) var(--dim-space-400)', borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line)' }}>
                            <Select size='medium' showLabel={false} showHelperText={false} options={posOpts} value={row.positionId} onChange={(v) => setAssignment(idx, { positionId: v })} />
                          </td>
                          <td style={{ padding: 'var(--dim-space-200) var(--dim-space-400)', borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line)' }}>
                            <Switch checked={row.isPrimary} onChange={() => setPrimary(idx)} aria-label={`สาขาหลักแถว ${idx + 1}`} />
                          </td>
                          <td style={{ padding: 'var(--dim-space-200) var(--dim-space-400)', borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line)' }}>
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
                  <InfoField label='ชื่อ-นามสกุล' value={fullName(personal)} />
                  <InfoField label='Name' value={[personal.nameEn, personal.surnameEn].filter(Boolean).join(' ')} />
                  <InfoField label='เลขบัตรประชาชน' value={personal.nationalId} />
                  <InfoField label='รหัสวิชาชีพ (ว.)' value={personal.licenseNo} />
                  <InfoField label='อีเมล' value={personal.email} />
                  <InfoField label='เบอร์โทรศัพท์' value={personal.phone} />
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
                    <InfoField label='Group Policy' value={labelOf(groupOpts, row.groupPolicyId)} />
                    <InfoField label='สาขาย่อย' value={labelOf(subOptsFor(row.groupPolicyId), row.subBranchId)} />
                    <InfoField label='แผนก' value={labelOf(deptOpts, row.departmentId)} />
                    <InfoField label='ตำแหน่ง' value={labelOf(posOpts, row.positionId)} />
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
      {saved ? (
        <SuccessScreen
          title={<>คุณสร้างบุคลากรใหม่<br />สำเร็จ</>}
          buttonLabel='เข้าสู่หน้าบุคลากร'
          onDone={() => navigate.push('/assess/users')}
        />
      ) : null}
    </>
  );
}
