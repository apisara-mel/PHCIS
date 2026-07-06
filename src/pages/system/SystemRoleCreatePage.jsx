import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Select from '@/components/forms/Select';
import BrandButton from '@/components/button/BrandButton';
import NeutralButton from '@/components/button/NeutralButton';
import SuccessScreen from '@/components/layout/SuccessScreen';
import { ROLES, SUB_ROLES, DEPARTMENTS } from '@/data/usersAccess';
import SYSTEM_NAV from '@/pages/system/systemNav';

/* ระบบจัดการระบบ · สร้างบทบาทใหม่ (Figma 0EDfjwf1 · 10:1326).
   Role info + a per-feature permission matrix across two systems
   (PHCIS · ระบบจัดตารางเวร). Each row is a 3-state segmented control. */

const breadcrumb = ['จัดการระบบ', 'สร้างบทบาท'];
const FEATURES = [
  { key: 'reg',     label: 'เวชระเบียน / ลงทะเบียน', desc: 'ค้นหา–แก้ไขข้อมูลผู้รับบริการ' },
  { key: 'opd',     label: 'OPD / ตรวจรักษา',        desc: 'บันทึกการตรวจและการวินิจฉัย' },
  { key: 'cpoe',    label: 'สั่งยา / คำสั่งแพทย์ (CPOE)', desc: 'ออกคำสั่งยาและการตรวจ' },
  { key: 'pharm',   label: 'ห้องยา (Pharmacy)',       desc: 'จ่ายยาตามคำสั่ง' },
  { key: 'lab',     label: 'ห้องปฏิบัติการ / รังสีวิทยา', desc: 'สั่งตรวจและดูผล' },
  { key: 'finance', label: 'การเงิน / เคลม',          desc: 'ออกใบเสร็จและเบิกจ่าย' },
];
const TITLE_OPTS = [
  { value: '', label: 'ตำแหน่ง' },
  { value: 'head', label: 'หัวหน้าแผนก' }, { value: 'senior', label: 'อาวุโส' }, { value: 'staff', label: 'เจ้าหน้าที่' },
];
const GROUP_OPTS = [{ value: '', label: 'เลือก Group policy' }, ...ROLES.map((r) => ({ value: r.key, label: r.label }))];
const DEPT_OPTS = [{ value: '', label: 'เลือกแผนก' }, ...DEPARTMENTS.map((d) => ({ value: d.key, label: d.label }))];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};
const H = { color: 'var(--text-content-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', lineHeight: 1.4 };
const VAL = { color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' };
const META = { color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' };

/* 3-state segmented permission control. */
const PermToggle = ({ value, onChange, editLabel }) => {
  const opts = [['none', 'ไม่มีสิทธิ์'], ['view', 'ดู'], ['edit', editLabel]];
  return (
    <div className='inline-flex items-center' style={{ gap: 2, padding: 2, borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-brandPrimary-quaternary)' }}>
      {opts.map(([v, label]) => {
        const on = value === v;
        return (
          <button key={v} type='button' onClick={() => onChange(v)} aria-pressed={on}
            style={{
              height: 28, padding: '0 var(--dim-space-300)', borderRadius: 'var(--dim-radius-full)', border: 'none', cursor: 'pointer',
              background: on ? (v === 'none' ? 'var(--surface-card-100)' : 'var(--surface-brandPrimaryButton-default, #007549)') : 'transparent',
              color: on ? (v === 'none' ? 'var(--text-content-default)' : '#FFFFFF') : 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)',
              boxShadow: on && v === 'none' ? 'var(--shadow-card)' : 'none',
              transition: 'background-color 120ms ease, color 120ms ease',
            }}>
            {label}
          </button>
        );
      })}
    </div>
  );
};

const PermSection = ({ title, editLabel, perms, setPerm, prefix }) => (
  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
    <span style={{ ...H, fontSize: 'var(--type-size-sm)', color: 'var(--text-brandPrimary-default)' }}>{title}</span>
    {FEATURES.map((f) => (
      <div key={f.key} className='flex items-center justify-between flex-wrap w-full' style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-300) 0', borderBottom: 'var(--dim-stroke-100) solid var(--border-content-quaternary, #F0F1F3)' }}>
        <div className='flex flex-col min-w-0'>
          <span style={VAL}>{f.label}</span>
          <span style={META}>{f.desc}</span>
        </div>
        <PermToggle value={perms[`${prefix}.${f.key}`] || 'none'} onChange={(v) => setPerm(`${prefix}.${f.key}`, v)} editLabel={editLabel} />
      </div>
    ))}
  </div>
);

export default function SystemRoleCreatePage() {
  const navigate = useHistory();
  const [group, setGroup] = useState('');
  const [sub, setSub] = useState('');
  const [dept, setDept] = useState('');
  const [position, setPosition] = useState('');
  const [desc, setDesc] = useState('');
  const [perms, setPerms] = useState({});
  const [saved, setSaved] = useState(false);
  const setPerm = (k, v) => setPerms((p) => ({ ...p, [k]: v }));
  const subOpts = [{ value: '', label: 'เลือกสาขาย่อย' }, ...((SUB_ROLES[group] || []).map((s) => ({ value: s.key, label: s.label })))];

  if (saved) {
    return (
      <SuccessScreen
        title={<>คุณสร้างบทบาทใหม่<br />สำเร็จ</>}
        buttonLabel='เข้าสู่หน้าบทบาท'
        onDone={() => navigate.push('/admin/roles')}
      />
    );
  }

  return (
    <QueuePageShell
      activeKey='system-roles'
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-roles'
      brandTitle='ระบบ PHCIS'
      breadcrumb={breadcrumb}
      title='สร้างบทบาทใหม่'
      onBack={() => navigate.push('/admin/roles')}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        {/* role info */}
        <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          <span style={H}>ข้อมูลบทบาท</span>
          <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
            <div style={{ flex: '1 1 200px', minWidth: 180 }}><Select label='ชื่อ Group policy' options={GROUP_OPTS} value={group} onChange={(v) => { setGroup(v); setSub(''); }} /></div>
            <div style={{ flex: '1 1 200px', minWidth: 180 }}><Select label='สาขาย่อย' options={subOpts} value={sub} onChange={setSub} /></div>
            <div style={{ flex: '1 1 200px', minWidth: 180 }}><Select label='แผนก' options={DEPT_OPTS} value={dept} onChange={setDept} /></div>
            <div style={{ flex: '1 1 200px', minWidth: 180 }}><Select label='ตำแหน่ง' options={TITLE_OPTS} value={position} onChange={setPosition} /></div>
          </div>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
            <span style={META}>คำอธิบาย</span>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder='เช่น เข้าถึงการรักษาระดับสูงสุด'
              rows={2}
              style={{ width: '100%', resize: 'vertical', padding: 'var(--dim-space-300)', borderRadius: 'var(--dim-radius-300)', border: '1.5px solid var(--border-content-tertiary, #E1E3E5)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)', outline: 'none' }}
            />
          </div>
        </section>

        {/* permission matrix */}
        <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-500)' }}>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
            <span style={H}>สิทธิ์การเข้าถึงระบบ</span>
            <span style={META}>เลือกระดับการเข้าถึงของแต่ละระบบ</span>
          </div>
          <PermSection title='ระบบ PHCIS' editLabel='บันทึก' perms={perms} setPerm={setPerm} prefix='phcis' />
          <PermSection title='ระบบจัดตารางเวร' editLabel='แก้ไข' perms={perms} setPerm={setPerm} prefix='sched' />

          <div className='flex items-center justify-between w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
            <NeutralButton variant='outline' size='md' onClick={() => navigate.push('/admin/roles')}>ยกเลิก</NeutralButton>
            <BrandButton variant='fill' size='md' trailingIcon='check' onClick={() => setSaved(true)}>บันทึกบทบาท</BrandButton>
          </div>
        </section>
      </div>
    </QueuePageShell>
  );
}
