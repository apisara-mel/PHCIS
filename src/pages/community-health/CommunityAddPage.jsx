import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Alert from '@/components/alert/Alert';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import CommunityLayout from './CommunityLayout';
import { CommunityCard } from './communityShared';
import {
  DISTRICT_OPTIONS,
  SUBDISTRICT_OPTIONS,
  CENTER_OPTIONS,
  RISK_OPTIONS,
  FACILITY_OPTIONS,
  COMMUNITY_ROWS,
} from './communityRegisterData';

/* เพิ่มชุมชน — ported from claude/Community community-add.html.
   The source is a SINGLE flat form (one <form id="addForm">, footer
   ยกเลิก/บันทึกแบบร่าง/บันทึกข้อมูล, no data-step / wizard markers) —
   per the task brief this is built as a standard form card, not a
   mih-step-form wizard, since forcing a step shape the source doesn't
   have would invent structure that isn't there.

   The source's draggable "เลือกตำแหน่งบนแผนที่" (pan/zoom + draggable pin)
   is out of scope here — coordinates are entered as free text instead,
   same simplification CommunityDashboardPage's MapTeaserCard already
   uses for this module (the real interactive map lives on its own
   /community-health/gis page). */

const asOption = (v) => ({ value: v, label: v });

const SectionTitle = ({ icon, children }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <Icon name={icon} size={18} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
    <p
      style={{
        margin: 0,
        fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-medium, 500))',
        color: 'var(--text-topic-tertiary-title, #363B3F)',
      }}
    >
      {children}
    </p>
  </div>
);

const RemovableChip = ({ label, tone = 'green', onRemove }) => (
  <span
    className='inline-flex items-center'
    style={{
      gap: 'var(--dim-space-150, 6px)',
      height: 'var(--dim-size-600, 32px)',
      paddingLeft: 'var(--dim-space-300, 12px)',
      paddingRight: 'var(--dim-space-150, 6px)',
      borderRadius: 'var(--dim-radius-full, 9999px)',
      background: tone === 'orange' ? 'var(--surface-colorfulbadge-warning2, #FFF7ED)' : 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
      border: `var(--dim-stroke-100, 1px) solid ${tone === 'orange' ? 'var(--border-colorfulbadge-warning2, #FED7AA)' : 'var(--border-brandPrimary-quaternary, #E2F3EB)'}`,
      color: tone === 'orange' ? 'var(--text-colorfulbadge-warning2, #C2410C)' : 'var(--text-brandPrimary-default, #007549)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm, 14px)',
    }}
  >
    {label}
    <button
      type='button'
      onClick={onRemove}
      aria-label={`ลบ ${label}`}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 'var(--dim-size-400, 20px)', height: 'var(--dim-size-400, 20px)',
        borderRadius: 'var(--dim-radius-full, 9999px)', border: 0, background: 'transparent',
        color: 'currentColor', cursor: 'pointer', padding: 0,
      }}
    >
      <Icon name='close' size={14} />
    </button>
  </span>
);

const AddToListRow = ({ options, value, onChange, onAdd, placeholder, error }) => (
  <div className='flex items-end w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <div className='flex-1 min-w-0'>
      <Select
        showFieldName={false}
        searchable={false}
        value={value}
        onChange={onChange}
        options={options.map(asOption)}
        placeholder={placeholder}
        error={error}
      />
    </div>
    <NeutralSubdueIconButton icon='add' size='md' variant='outline' onClick={onAdd} aria-label={placeholder} />
  </div>
);

const BLANK_FORM = {
  code: '', nameTh: '', nameEn: '', center: '',
  province: 'กรุงเทพมหานคร', district: '', subdistrict: '', postcode: '',
  leaderName: '', leaderRole: '', leaderTel: '',
  coords: '', boundaryName: '', boundaryCommunity: '',
};

const CommunityAddPage = () => {
  const history = useHistory();
  const [form, setForm] = useState(BLANK_FORM);
  const [risks, setRisks] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [riskPick, setRiskPick] = useState('');
  const [facilityPick, setFacilityPick] = useState('');
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [draftSavedAt, setDraftSavedAt] = useState('');

  const setField = (key, v) => {
    setDirty(true);
    setForm((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const addRisk = () => {
    if (!riskPick || risks.includes(riskPick)) return;
    setDirty(true);
    setRisks((prev) => [...prev, riskPick]);
    setRiskPick('');
    setErrors((prev) => ({ ...prev, risks: undefined }));
  };
  const addFacility = () => {
    if (!facilityPick || facilities.includes(facilityPick)) return;
    setDirty(true);
    setFacilities((prev) => [...prev, facilityPick]);
    setFacilityPick('');
    setErrors((prev) => ({ ...prev, facilities: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.code.trim()) errs.code = 'กรุณาระบุรหัสชุมชน';
    if (!form.nameTh.trim()) errs.nameTh = 'กรุณาระบุชื่อชุมชน (ภาษาไทย)';
    if (!form.nameEn.trim()) errs.nameEn = 'กรุณาระบุชื่อชุมชน (ภาษาอังกฤษ)';
    if (!form.center) errs.center = 'กรุณาเลือกศูนย์สุขภาพชุมชน';
    if (!form.district) errs.district = 'กรุณาเลือกเขต/อำเภอ';
    if (!form.subdistrict) errs.subdistrict = 'กรุณาเลือกแขวง/ตำบล';
    if (!form.boundaryName.trim()) errs.boundaryName = 'กรุณาระบุชื่อขอบเขต';
    if (!form.boundaryCommunity) errs.boundaryCommunity = 'กรุณาเลือกชุมชน';
    if (risks.length === 0) errs.risks = 'กรุณาเลือกพื้นที่เสี่ยงอย่างน้อย 1 รายการ';
    if (facilities.length === 0) errs.facilities = 'กรุณาเลือกสถานที่/สิ่งอำนวยความสะดวกอย่างน้อย 1 รายการ';
    return errs;
  };

  const goBack = () => (dirty ? setLeaving(true) : history.push('/community-health/register'));

  const saveDraft = () => {
    setDraftSavedAt(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
    setSaved('บันทึกแบบร่างเรียบร้อยแล้ว — กลับมาแก้ไขต่อได้ภายหลัง');
  };

  const handleSubmit = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setDirty(false);
    setSaved(`บันทึกข้อมูลชุมชน "${form.nameTh}" เรียบร้อยแล้ว`);
    setTimeout(() => history.push('/community-health/register'), 600);
  };

  return (
    <CommunityLayout activeKey='community' breadcrumb={['ข้อมูลชุมชน', 'ข้อมูลทะเบียนชุมชน', 'เพิ่มชุมชน']}>
      <UnsavedChangesPopup
        open={leaving}
        onClose={() => setLeaving(false)}
        onSave={() => { setLeaving(false); handleSubmit(); }}
        onDiscard={() => { setLeaving(false); setDirty(false); history.push('/community-health/register'); }}
        title='ยกเลิกการเพิ่มชุมชนหรือไม่ ?'
        description='ข้อมูลที่กรอกไว้จะไม่ถูกบันทึก คุณต้องการยกเลิกหรือไม่?'
      />

      <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <NeutralSubdueButton variant='outline' size='md' leadingIcon='arrow_back' onClick={goBack}>
          กลับ
        </NeutralSubdueButton>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
            fontSize: 'var(--type-size-lg, 18px)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-medium, 500))',
            color: 'var(--text-topic-tertiary-title, #363B3F)',
          }}
        >
          เพิ่มชุมชน
        </h1>
      </div>

      {saved ? <Alert type='success' title='สำเร็จ' subtext={saved} /> : null}

      <CommunityCard>
        <SectionTitle icon='badge'>ข้อมูลทั่วไป</SectionTitle>
        <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <InputField label='รหัสชุมชน' required value={form.code} onChange={(v) => setField('code', v)} error={errors.code} placeholder='รหัสชุมชน' />
          <InputField label='ชื่อชุมชน (ภาษาไทย)' required value={form.nameTh} onChange={(v) => setField('nameTh', v)} error={errors.nameTh} placeholder='ชื่อชุมชน (ภาษาไทย)' />
          <InputField label='ชื่อชุมชน (ภาษาอังกฤษ)' required value={form.nameEn} onChange={(v) => setField('nameEn', v)} error={errors.nameEn} placeholder='ชื่อชุมชน (ภาษาอังกฤษ)' />
          <Select label='ศูนย์สุขภาพชุมชน' required searchable={false} value={form.center} onChange={(v) => setField('center', v)} options={CENTER_OPTIONS.map(asOption)} error={errors.center} placeholder='เลือกศูนย์สุขภาพชุมชน' />
        </div>
      </CommunityCard>

      <CommunityCard>
        <SectionTitle icon='location_on'>ข้อมูลที่อยู่</SectionTitle>
        <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <InputField label='จังหวัด' required disabled value={form.province} />
          <Select label='เขต/อำเภอ' required searchable={false} value={form.district} onChange={(v) => setField('district', v)} options={DISTRICT_OPTIONS.map(asOption)} error={errors.district} placeholder='เลือกเขต/อำเภอ' />
          <Select label='แขวง/ตำบล' required searchable={false} value={form.subdistrict} onChange={(v) => setField('subdistrict', v)} options={SUBDISTRICT_OPTIONS.map(asOption)} error={errors.subdistrict} placeholder='เลือกแขวง/ตำบล' />
          <InputField label='รหัสไปรษณีย์' value={form.postcode} onChange={(v) => setField('postcode', v)} placeholder='รหัสไปรษณีย์' />
        </div>
      </CommunityCard>

      <CommunityCard>
        <SectionTitle icon='volunteer_activism'>ข้อมูลผู้นำชุมชน / อาสาสมัคร</SectionTitle>
        <div className='grid grid-cols-1 md:grid-cols-3 w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <InputField label='ชื่อ-นามสกุล' value={form.leaderName} onChange={(v) => setField('leaderName', v)} placeholder='ชื่อผู้นำชุมชน' />
          <InputField label='ตำแหน่ง' value={form.leaderRole} onChange={(v) => setField('leaderRole', v)} placeholder='ตำแหน่ง' />
          <InputField label='โทรศัพท์ผู้นำชุมชน' type='tel' value={form.leaderTel} onChange={(v) => setField('leaderTel', v)} placeholder='โทรศัพท์ผู้นำชุมชน' />
        </div>
      </CommunityCard>

      <CommunityCard>
        <SectionTitle icon='groups'>ข้อมูลประชากร</SectionTitle>
        <p style={{ margin: 0, fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
          คำนวณอัตโนมัติจากทะเบียนบ้านและสมาชิกที่ผูกกับชุมชนนี้ — กรอกได้หลังบันทึกชุมชนแล้วเพิ่มทะเบียนบ้าน
        </p>
        <div className='grid grid-cols-2 md:grid-cols-4 w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <InputField label='จำนวนครัวเรือน' disabled value='0' />
          <InputField label='จำนวนประชากรทั้งหมด' disabled value='0' />
          <InputField label='ประชากรชาย' disabled value='0' />
          <InputField label='ประชากรหญิง' disabled value='0' />
          <InputField label='ประชากรสูงอายุ' disabled value='0' />
          <InputField label='เด็ก' disabled value='0' />
          <InputField label='ผู้พิการ' disabled value='0' />
          <InputField label='โรคเรื้อรัง' disabled value='0' />
        </div>
      </CommunityCard>

      <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
        <CommunityCard>
          <SectionTitle icon='warning'>พื้นที่เสี่ยง</SectionTitle>
          <AddToListRow options={RISK_OPTIONS.filter((r) => !risks.includes(r))} value={riskPick} onChange={setRiskPick} onAdd={addRisk} placeholder='เลือกพื้นที่เสี่ยง' error={errors.risks} />
          <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-150, 6px)' }}>
            {risks.map((r) => <RemovableChip key={r} label={r} tone='orange' onRemove={() => setRisks((prev) => prev.filter((x) => x !== r))} />)}
          </div>
        </CommunityCard>

        <CommunityCard>
          <SectionTitle icon='place'>สถานที่/สิ่งอำนวยความสะดวก</SectionTitle>
          <AddToListRow options={FACILITY_OPTIONS.filter((f) => !facilities.includes(f))} value={facilityPick} onChange={setFacilityPick} onAdd={addFacility} placeholder='เลือกสถานที่/สิ่งอำนวยความสะดวก' error={errors.facilities} />
          <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-150, 6px)' }}>
            {facilities.map((f) => <RemovableChip key={f} label={f} tone='green' onRemove={() => setFacilities((prev) => prev.filter((x) => x !== f))} />)}
          </div>
        </CommunityCard>
      </div>

      <CommunityCard>
        <SectionTitle icon='travel_explore'>ข้อมูลพื้นที่ / ขอบเขตชุมชน</SectionTitle>
        <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <InputField label='พิกัด' value={form.coords} onChange={(v) => setField('coords', v)} placeholder='เช่น 13.7649, 100.5522' helperText='ระบุพิกัดละติจูด, ลองจิจูดของขอบเขตชุมชน' />
          <InputField label='ชื่อขอบเขต' required value={form.boundaryName} onChange={(v) => setField('boundaryName', v)} error={errors.boundaryName} placeholder='เช่น ขอบเขตชุมชนดินแดง' />
          <Select
            label='ชุมชน' required searchable={false} value={form.boundaryCommunity}
            onChange={(v) => setField('boundaryCommunity', v)}
            options={COMMUNITY_ROWS.map((c) => ({ value: c.nameTh, label: c.nameTh }))}
            error={errors.boundaryCommunity}
            placeholder='เลือกชุมชน'
          />
        </div>
        {/* แผนที่แบบลาก-วาง ขอบเขต (Google-Maps-like pan/zoom + draggable pin)
            ของต้นแบบไม่ได้พอร์ตมา — ดู note ด้านบนของไฟล์ */}
        <div
          className='flex flex-col items-center justify-center w-full'
          style={{
            minHeight: 180,
            borderRadius: 'var(--dim-radius-400, 12px)',
            background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
            border: 'var(--dim-stroke-100, 1px) dashed var(--border-brandPrimary-quaternary, #E2F3EB)',
            gap: 'var(--dim-space-200, 8px)',
          }}
        >
          <Icon name='pin_drop' size={28} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
          <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-sm, 14px)' }}>
            {form.coords ? `ตำแหน่งที่เลือก: ${form.coords}` : 'ระบุพิกัดด้านบนเพื่อกำหนดตำแหน่งขอบเขตชุมชน'}
          </span>
        </div>
      </CommunityCard>

      {/* Sticky footer — ยกเลิก / บันทึกแบบร่าง / บันทึกข้อมูล ตรงตามต้นแบบ */}
      <section
        className='bg-surface-card rounded-card shadow-card flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center w-full sticky bottom-0'
        style={{
          gap: 'var(--dim-space-300, 12px)',
          paddingTop: 'var(--dim-space-400, 16px)',
          paddingBottom: 'var(--dim-space-400, 16px)',
          paddingLeft: 'var(--dim-space-500, 20px)',
          paddingRight: 'var(--dim-space-500, 20px)',
          background: 'var(--surface-card-100, #FFFFFF)',
          borderRadius: 'var(--dim-radius-500, 16px)',
          boxShadow: 'var(--shadow-brand-drop-bottom-200, 0 1px 4px rgba(8,167,104,0.10), 0 1px 2px rgba(8,167,104,0.08))',
          zIndex: 60,
        }}
      >
        <div className='flex-1 min-w-0 flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <Icon name='fiber_manual_record' size={8} style={{ color: 'var(--text-content-tertiary, #858C92)' }} />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {draftSavedAt ? `บันทึกแบบร่างล่าสุดเมื่อ ${draftSavedAt} น.` : 'ร่างแบบฟอร์ม (ยังไม่ได้บันทึกแบบร่าง)'}
          </span>
          {dirty ? <ColorfulBadge style='orange' size='small' icon='edit'>มีการแก้ไขที่ยังไม่บันทึก</ColorfulBadge> : null}
        </div>
        <div className='flex items-center justify-end w-full sm:w-auto' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <NeutralSubdueButton className='flex-1 sm:flex-none' variant='outline' size='md' onClick={goBack}>
            ยกเลิก
          </NeutralSubdueButton>
          <BrandSubdueButton className='flex-1 sm:flex-none' variant='outline' size='md' leadingIcon='save' onClick={saveDraft}>
            บันทึกแบบร่าง
          </BrandSubdueButton>
          <BrandButton className='flex-1 sm:flex-none' size='md' leadingIcon='check' onClick={handleSubmit}>
            บันทึกข้อมูล
          </BrandButton>
        </div>
      </section>
    </CommunityLayout>
  );
};

export default CommunityAddPage;
