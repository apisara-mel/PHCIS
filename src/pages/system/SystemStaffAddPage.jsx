import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import BrandButton from '@/components/button/BrandButton';
import NeutralButton from '@/components/button/NeutralButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import DangerSubdueIconButton from '@/components/button/DangerSubdueIconButton';
import SuccessScreen from '@/components/layout/SuccessScreen';
import Icon from '@/components/icons/Icon';
import { ROLES, SUB_ROLES, DEPARTMENTS } from '@/data/usersAccess';
import SYSTEM_NAV from '@/pages/system/systemNav';

/* ระบบจัดการระบบ · เพิ่มบุคลากร (Figma 0EDfjwf1 · 0:293 → 16:705).
   2-step wizard: ข้อมูลส่วนตัว → ตำแหน่ง & หน่วยงาน & บทบาท (multi-office).
   Reuses InputField / Select / buttons + usersAccess reference data. */

const breadcrumb = ['จัดการระบบ', 'เพิ่มบุคลากร'];
const STEPS = [
  { key: 'personal', n: 1, label: 'ข้อมูลส่วนตัว', sub: 'ชื่อ ตำแหน่ง การติดต่อ' },
  { key: 'assign',   n: 2, label: 'ตำแหน่ง & หน่วยงาน & บทบาท', sub: 'สาขา แผนก ตำแหน่ง' },
];
const TITLE_OPTS = [
  { value: '', label: 'คำนำหน้า' },
  { value: 'นพ.', label: 'นพ.' }, { value: 'พญ.', label: 'พญ.' },
  { value: 'ภก.', label: 'ภก.' }, { value: 'ภญ.', label: 'ภญ.' },
  { value: 'นาย', label: 'นาย' }, { value: 'นาง', label: 'นาง' }, { value: 'น.ส.', label: 'น.ส.' },
];
const OFFICES = [
  { value: 'bna04', label: 'ศูนย์บริการสาธารณสุข 4 ดินแดง' },
  { value: 'wtt21', label: 'ศูนย์บริการสาธารณสุข 21 วัดธาตุทอง' },
  { value: 'bna08', label: 'ศูนย์บริการสาธารณสุข 8 บางนา' },
];
const GROUP_OPTS = [{ value: '', label: 'Group Policy' }, ...ROLES.map((r) => ({ value: r.key, label: r.label }))];
const DEPT_OPTS = [{ value: '', label: 'แผนก' }, ...DEPARTMENTS.map((d) => ({ value: d.key, label: d.label }))];
const subOpts = (roleKey) => [{ value: '', label: 'สาขาย่อย' }, ...((SUB_ROLES[roleKey] || []).map((s) => ({ value: s.key, label: s.label })))];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};
const H = { color: 'var(--text-content-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', lineHeight: 1.4 };
const NOTE = { color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', lineHeight: 1.5 };

/* Left-rail vertical stepper. */
const StepRail = ({ step }) => (
  <div className='flex flex-col shrink-0' style={{ ...CARD, width: 260, gap: 'var(--dim-space-400)', alignSelf: 'flex-start' }}>
    {STEPS.map((s) => {
      const active = s.key === step;
      const done = STEPS.findIndex((x) => x.key === step) > STEPS.findIndex((x) => x.key === s.key);
      const on = active || done;
      return (
        <div key={s.key} className='flex items-start' style={{ gap: 'var(--dim-space-300)' }}>
          <span className='inline-flex items-center justify-center shrink-0' style={{ width: 28, height: 28, borderRadius: 'var(--dim-radius-full)', border: `var(--dim-stroke-150) solid ${on ? 'var(--surface-brandPrimary-default, #007549)' : 'var(--border-content-tertiary, #E1E3E5)'}`, background: done ? 'var(--surface-brandPrimary-default, #007549)' : 'transparent', color: done ? '#FFFFFF' : on ? 'var(--text-brandPrimary-default)' : 'var(--text-content-tertiary)', fontSize: 'var(--type-size-sm)' }}>
            {done ? <Icon name='check' size={16} /> : s.n}
          </span>
          <div className='flex flex-col' style={{ gap: 2 }}>
            <span style={{ fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)', color: on ? 'var(--text-content-default)' : 'var(--text-content-tertiary)' }}>{s.label}</span>
            <span style={NOTE}>{s.sub}</span>
          </div>
        </div>
      );
    })}
  </div>
);

export default function SystemStaffAddPage() {
  const navigate = useHistory();
  const [step, setStep] = useState('personal');
  const [p, setP] = useState({ title: '', first: '', last: '', cid: '', license: '', email: '', phone: '' });
  const setField = (k) => (v) => setP((prev) => ({ ...prev, [k]: v }));
  const [rows, setRows] = useState([
    { office: 'bna04', group: 'doctor', sub: '', dept: 'opd', primary: true },
  ]);
  const [saved, setSaved] = useState(false);
  const setRow = (i, k, v) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const setPrimary = (i) => setRows((rs) => rs.map((r, idx) => ({ ...r, primary: idx === i })));
  const addRow = () => setRows((rs) => [...rs, { office: '', group: '', sub: '', dept: '', primary: rs.length === 0 }]);
  const removeRow = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i).map((r, idx, arr) => (arr.some((x) => x.primary) ? r : { ...r, primary: idx === 0 })));

  const personalValid = p.first.trim() && p.last.trim() && p.cid.trim() && p.email.trim();
  const officeCount = rows.length;
  const fullName = [p.title, p.first, p.last].filter(Boolean).join(' ').trim();

  if (saved) {
    return (
      <SuccessScreen
        title={`คุณเพิ่มบุคลากร ${fullName || 'ใหม่'} สำเร็จ`}
        buttonLabel='เข้าสู่หน้าบุคลากร'
        onDone={() => navigate.push('/admin/staff')}
      />
    );
  }

  return (
    <QueuePageShell
      activeKey='system-staff'
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-staff'
      brandTitle='ระบบ PHCIS'
      breadcrumb={breadcrumb}
      title='เพิ่มบุคลากร'
      onBack={() => navigate.push('/admin/staff')}
    >
      <div className='flex items-start flex-wrap' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        <StepRail step={step} />

        <section className='flex flex-col' style={{ ...CARD, flex: '1 1 0', minWidth: 'min(100%, 480px)', gap: 'var(--dim-space-500)' }}>
          {step === 'personal' ? (
            <>
              <span style={H}>ข้อมูลส่วนตัว</span>
              {/* avatar upload */}
              <div className='flex items-center' style={{ gap: 'var(--dim-space-400)' }}>
                <span className='inline-flex items-center justify-center shrink-0' style={{ width: 72, height: 72, borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-content-tertiary)' }}>
                  <Icon name='photo_camera' size={28} />
                </span>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <BrandButton variant='outline' size='sm' leadingIcon='upload'>อัปโหลดรูปภาพ</BrandButton>
                  <span style={NOTE}>JPG หรือ PNG ขนาดไม่เกิน 5MB</span>
                </div>
              </div>
              {/* fields */}
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                <div style={{ flex: '1 1 140px', minWidth: 140 }}><Select label='คำนำหน้า' options={TITLE_OPTS} value={p.title} onChange={setField('title')} /></div>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}><InputField label='ชื่อ' required value={p.first} onChange={setField('first')} placeholder='เช่น สมชาย' /></div>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}><InputField label='นามสกุล' required value={p.last} onChange={setField('last')} placeholder='เช่น ใจดี' /></div>
              </div>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                <div style={{ flex: '1 1 240px', minWidth: 220 }}><InputField label='เลขประจำตัวประชาชน' required value={p.cid} onChange={setField('cid')} placeholder='x-xxxx-xxxxx-xx-x' /></div>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}><InputField label='รหัสวิชาชีพ (ว.)' value={p.license} onChange={setField('license')} placeholder='ว.12345' /></div>
              </div>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                <div style={{ flex: '1 1 240px', minWidth: 220 }}><InputField label='อีเมล' required value={p.email} onChange={setField('email')} placeholder='name@bma.go.th' /></div>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}><InputField label='เบอร์โทรศัพท์' value={p.phone} onChange={setField('phone')} placeholder='08x-xxx-xxxx' /></div>
              </div>
              {/* OTP note */}
              <div className='flex items-start' style={{ gap: 'var(--dim-space-200)', background: 'var(--surface-brandPrimary-quaternary)', border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)', borderRadius: 'var(--dim-radius-300)', padding: 'var(--dim-space-300)' }}>
                <Icon name='info' size={18} color='var(--text-brandPrimary-default)' />
                <span style={NOTE}>ระบบจะส่งรหัส OTP ไปยังอีเมลและเบอร์โทรเพื่อยืนยันตัวตนก่อนเปิดใช้งานบัญชี</span>
              </div>
              <div className='flex items-center justify-between w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
                <NeutralButton variant='outline' size='md' onClick={() => navigate.push('/admin/staff')}>ยกเลิก</NeutralButton>
                <BrandButton variant='fill' size='md' trailingIcon='arrow_forward' disabled={!personalValid} onClick={() => setStep('assign')}>ถัดไป</BrandButton>
              </div>
            </>
          ) : (
            <>
              <div className='flex items-center justify-between w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='flex flex-col'>
                  <span style={H}>ตำแหน่ง & หน่วยงาน</span>
                  <span style={NOTE}>บุคลากร 1 คนทำงานได้หลายสำนักงานอนามัย — เลือกสาขาหลัก 1 แห่ง</span>
                </div>
                <ColorfulCount n={officeCount} />
              </div>

              <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
                {rows.map((r, i) => (
                  <div key={i} className='flex items-end flex-wrap' style={{ gap: 'var(--dim-space-200)', padding: 'var(--dim-space-300)', border: 'var(--dim-stroke-100) solid var(--border-card-default)', borderRadius: 'var(--dim-radius-400)' }}>
                    <div style={{ flex: '2 1 200px', minWidth: 180 }}><Select label={i === 0 ? 'สำนักงานอนามัย' : undefined} options={[{ value: '', label: 'เลือกสำนักงาน' }, ...OFFICES]} value={r.office} onChange={(v) => setRow(i, 'office', v)} /></div>
                    <div style={{ flex: '1 1 130px', minWidth: 120 }}><Select label={i === 0 ? 'Group Policy' : undefined} options={GROUP_OPTS} value={r.group} onChange={(v) => setRow(i, 'group', v)} /></div>
                    <div style={{ flex: '1 1 140px', minWidth: 120 }}><Select label={i === 0 ? 'สาขาย่อย' : undefined} options={subOpts(r.group)} value={r.sub} onChange={(v) => setRow(i, 'sub', v)} /></div>
                    <div style={{ flex: '1 1 130px', minWidth: 120 }}><Select label={i === 0 ? 'แผนก' : undefined} options={DEPT_OPTS} value={r.dept} onChange={(v) => setRow(i, 'dept', v)} /></div>
                    <button type='button' onClick={() => setPrimary(i)} className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)', height: 44, border: 0, background: 'transparent', cursor: 'pointer', color: r.primary ? 'var(--text-brandPrimary-default)' : 'var(--text-content-tertiary)' }}>
                      <Icon name={r.primary ? 'radio_button_checked' : 'radio_button_unchecked'} size={18} />
                      <span style={{ fontSize: 'var(--type-size-sm)' }}>หลัก</span>
                    </button>
                    <DangerSubdueIconButton icon='delete' variant='ghost' size='md' aria-label='ลบ' disabled={rows.length <= 1} onClick={() => removeRow(i)} />
                  </div>
                ))}
              </div>

              <div><BrandDashedAddButton onClick={addRow}>เพิ่มสังกัด / สำนักงานอนามัย</BrandDashedAddButton></div>

              <div className='flex items-center justify-between w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
                <NeutralButton variant='outline' size='md' leadingIcon='arrow_back' onClick={() => setStep('personal')}>ย้อนกลับ</NeutralButton>
                <BrandButton variant='fill' size='md' trailingIcon='check' onClick={() => setSaved(true)}>บันทึกบุคลากร</BrandButton>
              </div>
            </>
          )}
        </section>
      </div>
    </QueuePageShell>
  );
}

/* small count chip */
const ColorfulCount = ({ n }) => (
  <span className='inline-flex items-center shrink-0' style={{ gap: 'var(--dim-space-100)', padding: '2px var(--dim-space-200)', borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-info-tertiary, #DBEAFE)', color: 'var(--text-info-default, #1D4ED8)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>
    {n} สำนักงานอนามัย
  </span>
);
