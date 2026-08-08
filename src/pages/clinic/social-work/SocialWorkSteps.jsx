import React, { useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import DatePicker from '@/components/forms/DatePicker';
import TimePicker from '@/components/forms/TimePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import FileUploadField from '@/components/forms/FileUploadField';
import TabCapsule from '@/components/tab/TabCapsule';
import Checkbox from '@/components/checkbox/Checkbox';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import {
  SwField, SwBanner, SwConfidentialMask, SwAuditLine, toLocalIso,
} from '@/pages/clinic/social-work/SocialWorkShared';
import {
  SW_CURRENT_USER,
  SW_WORKERS,
  SW_CLINICS,
  SW_INTAKE_CHANNELS,
  SW_CLIENT_TYPES,
  SW_TARGET_GROUPS,
  SW_INFORMANT_RELATIONS,
  SW_PROBLEM_OPTIONS,
  SW_MAX_SECONDARY_PROBLEMS,
  SW_FUND_TYPES,
  SW_SERVICE_CATEGORIES,
  SW_FAMILY_RELATIONS,
  SW_EDUCATION_LEVELS,
  SW_REFERRAL_DESTINATIONS,
  SW_REFER_SCOPES,
  SW_APPOINTMENT_TYPES,
  SW_APPOINTMENT_TIMES,
  SW_DOCUMENT_TYPES,
  SW_UPLOAD_ACCEPT,
  SW_ADVICE_SUGGESTIONS,
  SW_DIAGNOSIS_SUGGESTIONS,
  SW_ASSESSMENT_SUGGESTIONS,
  SW_SOCIAL_HISTORY_SUGGESTIONS,
  SW_FOLLOWUP_SUGGESTIONS,
  SW_TERMINATION_SUGGESTIONS,
  SW_NURSE_NOTE_SUGGESTIONS,
  SW_REFER_SUGGESTIONS,
  SW_MEDICAL_ORDER_SUGGESTIONS,
  resolveSwClinic,
  resolveSwIntakeChannel,
  resolveSwClientType,
  resolveSwTargetGroup,
  resolveSwInformantRelation,
  resolveSwProblemLabel,
  resolveSwFundType,
  resolveSwReferralDestination,
  resolveSwAppointmentType,
  findSwProblem,
  isSwProblemSensitive,
  sumFamilyIncome,
  validateSwUpload,
  hasSocialWorkRights,
  getSwVisitRecords,
  getSwSupportingByHn,
  getSwFollowUpHistory,
  logSwPrint,
  getSwPrintLog,
  formatSwDate,
  formatSwDateTime,
  formatBaht,
  todayIso,
} from '@/data/socialWorkClinic';
import {
  SW_MATERIALS,
  SW_MATERIAL_OPTIONS,
  findSwMaterial,
  resolveSwCategory,
} from '@/data/socialWorkSupplies';

/* SocialWorkSteps — step bodies for แบบบันทึกผู้ใช้บริการสังคมสงเคราะห์
   "สส.2" (TOR 1.10.11.2), plugged into TreatmentFormShell by
   SocialWorkFormPage.

   The 8 steps map the legacy สส.2 tabs (manual §2.7) onto the TOR clause:
     1 ข้อมูลทั่วไป            ← tab "ข้อมูลทั่วไป" (+ คิว/วัน-เวลา/ผู้ให้บริการ/คลินิก/Flag/Audit)
     2 Vital Signs / Nurse Note ← TOR "Vital/Nurse Note + แพ้ยา/โรค"
     3 ประวัติ + ครอบครัว        ← tab "ข้อมูลประวัติครอบครัว" (+ ประวัติสังคมสงเคราะห์)
     4 ปัญหาและการวินิจฉัยทางสังคม ← tab "ปัญหาสังคมสงเคราะห์" (หลัก 1 / รอง ≤3)
     5 บริการ-กิจกรรม และการช่วยเหลือ ← tab "บริการหรือกิจกรรม" (เงิน/วัสดุ/บริการ 8 หมวด)
     6 ติดตามการช่วยเหลือ        ← tab "การติดตามผล" + "การยุติการให้บริการ"
     7 ข้อมูลประกอบการวินิจฉัย    ← ประวัติการรักษา / ส่งปรึกษา / Lab / รังสี (อ่านอย่างเดียว)
     8 คำสั่ง · e-Document · ส่งต่อ · นัดหมาย · สรุปและบันทึก

   Hard rules kept from the manual: ปัญหาหลักเลือกได้ 1 ข้อ · ปัญหารองเลือก
   ได้ไม่เกิน 3 ข้อ · จำนวนเงิน/จำนวนวัสดุคำนวณอัตโนมัติ ไม่พิมพ์เอง ·
   การยุติการให้บริการทำให้ระเบียนเป็นอ่านอย่างเดียว. */

/* ── shared bits (AncSteps / MentalHealthSteps conventions) ────────── */
const TopicHeader = ({ icon, children, aside }) => (
  <div className='flex items-center gap-2 w-full flex-wrap'>
    <span className='text-brand-500'><Icon name={icon} size={20} /></span>
    <h2 className='text-base font-bold text-brand-500'>{children}</h2>
    <div className='flex-1' />
    {aside}
  </div>
);

const StepCard = ({ children }) => (
  <section className='flex flex-col' style={{ gap: 'var(--dim-space-600)' }}>{children}</section>
);

const Block = React.forwardRef(({ children }, ref) => (
  <div
    ref={ref}
    className='flex flex-col w-full'
    style={{ gap: 'var(--dim-space-300, 12px)', scrollMarginTop: 110 }}
  >
    {children}
  </div>
));
Block.displayName = 'Block';

const ReadPanel = ({ children }) => (
  <div
    className='flex flex-col w-full'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      paddingTop: 'var(--dim-space-400, 16px)',
      paddingBottom: 'var(--dim-space-400, 16px)',
      paddingLeft: 'var(--dim-space-400, 16px)',
      paddingRight: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: 'var(--surface-card-quaternary, #F9FBFB)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
    }}
  >
    {children}
  </div>
);

const Pair = ({ label, children }) => (
  <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-sm)' }}>
    <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>{label}</span>
    <span style={{ fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>{children}</span>
  </span>
);

const EmptyRow = ({ children }) => (
  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>{children}</span>
);

const CapsuleNav = ({ sections, active, onJump }) => (
  <div className='flex items-center gap-2 flex-wrap'>
    {sections.map((s) => (
      <TabCapsule
        key={s.key}
        variant='filter'
        label={s.label}
        selected={active === s.key}
        onClick={() => onJump(s.key)}
      />
    ))}
  </div>
);

/* บรรทัดตรวจสอบย้อนหลังบนหัวทุกขั้นตอน (playbook §5) */
const StepAuditBar = ({ locked, terminated }) => (
  <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <ColorfulBadge style='grey' size='small' hierarchy='secondary'>
      ผู้บันทึก {SW_CURRENT_USER}
    </ColorfulBadge>
    <ColorfulBadge style='grey' size='small' hierarchy='secondary'>
      {formatSwDateTime(new Date())}
    </ColorfulBadge>
    {terminated && <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยุติการให้บริการแล้ว — อ่านอย่างเดียว</ColorfulBadge>}
    {locked && !terminated && <ColorfulBadge style='blue' size='small' hierarchy='secondary'>โหมดอ่านอย่างเดียว</ColorfulBadge>}
  </div>
);

/* <Table rowKey> is called with the ROW only (no index), so every table on
   this page needs a key that lives on the row. Read-only lists get a
   synthetic `_rk`; editable lists carry a real `id` created on add. */
const withKeys = (list, prefix) =>
  (list || []).map((item, i) => ({ ...item, _rk: `${prefix}-${i}` }));

const newRowId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const useSectionJump = (initial) => {
  const [active, setActive] = useState(initial);
  const refs = useRef({});
  const jump = (key) => {
    setActive(key);
    refs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return { active, refs, jump };
};

/* ═══ Step 1 — ข้อมูลทั่วไป ══════════════════════════════════════════ */
const STEP1_SECTIONS = [
  { key: 'case', label: 'เลข CASE และการรับเรื่อง' },
  { key: 'informant', label: 'ผู้ให้ข้อมูล' },
  { key: 'service', label: 'วัน-เวลา ผู้ให้บริการ คลินิก' },
];

export const SwStep1General = ({ form, setForm, swHn, registration, queueRow, locked }) => {
  const history = useHistory();
  const { active, refs, jump } = useSectionJump('case');
  const set = (key) => (value) => { if (!locked) setForm((f) => ({ ...f, [key]: value })); };
  const canRead = hasSocialWorkRights();

  return (
    <StepCard>
      <StepAuditBar locked={locked} terminated={form.terminated} />
      <CapsuleNav sections={STEP1_SECTIONS} active={active} onJump={jump} />

      <Block ref={(el) => { refs.current.case = el; }}>
        <TopicHeader
          icon='badge'
          aside={<ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>}
        >
          เลขที่สังคมสงเคราะห์ (เลข CASE) และการรับเรื่อง
        </TopicHeader>

        {registration ? (
          <ReadPanel>
            <div className='flex items-center gap-3 flex-wrap'>
              <Pair label='เลข CASE'>{registration.caseNo}</Pair>
              <Pair label='วันที่รับเรื่อง'>{formatSwDate(registration.receivedDate)}</Pair>
              <Pair label='เจ้าของเคส'>{registration.owner || '—'}</Pair>
              <Pair label='ปัญหาแรกรับ'>{resolveSwProblemLabel(registration.firstProblem)}</Pair>
            </div>
            <SwAuditLine
              by={registration.recordedBy}
              at={registration.recordedAt}
              label='ลงทะเบียนโดย'
              formatDateTime={formatSwDateTime}
            />
          </ReadPanel>
        ) : (
          <SwBanner
            tone='warning'
            icon='assignment_late'
            action={(
              <BrandSubdueButton
                variant='outline' size='sm' leadingIcon='person_add'
                onClick={() => history.push('/clinic/social-work/registry')}
              >
                ไปลงทะเบียน
              </BrandSubdueButton>
            )}
          >
            ผู้รับบริการรายนี้ยังไม่มีเลขที่สังคมสงเคราะห์ — บันทึก สส.2 ได้ แต่ควรลงทะเบียนเพื่อออกเลข CASE
          </SwBanner>
        )}

        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <SwField label='การรับเรื่อง' required>
            <Select
              showLabel={false} searchable={false} size='lg'
              disabled={locked}
              value={form.intakeChannel}
              onChange={set('intakeChannel')}
              options={SW_INTAKE_CHANNELS}
              placeholder='เลือกช่องทางการรับเรื่อง'
            />
          </SwField>
          <SwField label='กลุ่มเป้าหมาย' required>
            <Select
              showLabel={false} searchable={false} size='lg'
              disabled={locked}
              value={form.targetGroup}
              onChange={set('targetGroup')}
              options={SW_TARGET_GROUPS}
              placeholder='เลือกกลุ่มเป้าหมาย'
            />
          </SwField>
          <SwField label='ประเภทผู้ใช้บริการ' required>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {SW_CLIENT_TYPES.map((t) => (
                <SelectableTag
                  key={t.value}
                  label={t.label}
                  size='md'
                  selected={form.clientType === t.value}
                  onClick={() => set('clientType')(t.value)}
                />
              ))}
            </div>
          </SwField>
        </div>
      </Block>

      <Block ref={(el) => { refs.current.informant = el; }}>
        <TopicHeader icon='record_voice_over'>ผู้ให้ข้อมูล</TopicHeader>
        {!canRead ? (
          <SwConfidentialMask what='ผู้ให้ข้อมูลของแบบบันทึก สส.2' />
        ) : (
          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <SwField label='ชื่อผู้ให้ข้อมูล' required>
              <InputField
                disabled={locked}
                value={form.informant}
                onChange={set('informant')}
                placeholder='เช่น นางสมทรง รุ่งเรือง'
              />
            </SwField>
            <SwField label='ความเกี่ยวข้อง' required>
              <Select
                showLabel={false} searchable={false} size='lg'
                disabled={locked}
                value={form.informantRelation}
                onChange={set('informantRelation')}
                options={SW_INFORMANT_RELATIONS}
                placeholder='เลือกความเกี่ยวข้อง'
              />
            </SwField>
            <SwField label='โทรศัพท์ติดต่อ'>
              <InputField
                disabled={locked}
                value={form.informantPhone}
                onChange={set('informantPhone')}
                placeholder='เช่น 081-234-5678'
              />
            </SwField>
          </div>
        )}
      </Block>

      <Block ref={(el) => { refs.current.service = el; }}>
        <TopicHeader icon='event'>วัน-เวลาให้บริการ · ผู้ให้บริการ · คลินิก</TopicHeader>
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <SwField label='วันที่ให้บริการ' required>
            <DatePicker
              showLabel={false}
              disabled={locked}
              value={form.serviceDate ? new Date(form.serviceDate) : null}
              onChange={(d) => set('serviceDate')(d ? toLocalIso(d) : '')}
              placeholder='เลือกวันที่'
            />
          </SwField>
          <SwField label='เวลา'>
            <TimePicker
              showLabel={false}
              showHelperText={false}
              disabled={locked}
              value={form.serviceTime}
              onChange={set('serviceTime')}
              placeholder='HH:MM'
            />
          </SwField>
          <SwField label='ผู้ให้บริการ' required>
            <Select
              showLabel={false} searchable size='lg'
              disabled={locked}
              value={form.worker}
              onChange={set('worker')}
              options={SW_WORKERS.map((w) => ({ value: w, label: w }))}
              placeholder='เลือกนักสังคมสงเคราะห์'
            />
          </SwField>
          <SwField label='คลินิก / จุดให้บริการ'>
            <Select
              showLabel={false} searchable={false} size='lg'
              disabled={locked}
              value={form.clinic}
              onChange={set('clinic')}
              options={SW_CLINICS}
              placeholder='เลือกคลินิก'
            />
          </SwField>
        </div>
        {queueRow && (
          <ReadPanel>
            <div className='flex items-center gap-3 flex-wrap'>
              <Pair label='คิว'>{queueRow.queue}</Pair>
              <Pair label='เวลารับบริการ'>{queueRow.arrivalTime ? `${queueRow.arrivalTime} น.` : '—'}</Pair>
              <Pair label='คลินิกจากคิว'>{resolveSwClinic(queueRow.clinic)}</Pair>
              <Pair label='ผู้ให้บริการจากคิว'>{queueRow.worker}</Pair>
              <Pair label='HN'>{swHn}</Pair>
            </div>
          </ReadPanel>
        )}
      </Block>
    </StepCard>
  );
};

/* ═══ Step 2 — Vital Signs / Nurse Note ════════════════════════════ */
export const SwStep2Vitals = ({ form, setForm, intake, locked }) => {
  const set = (key) => (value) => { if (!locked) setForm((f) => ({ ...f, [key]: value })); };
  const v = intake.vitals;
  const pairs = [
    ['BP', `${v.bp} mmHg`],
    ['HR', `${v.hr} /นาที`],
    ['Temp', `${v.temp} °C`],
    ['RR', `${v.rr} /นาที`],
    ['SpO₂', `${v.spo2} %`],
    ['น้ำหนัก', `${v.weight} กก.`],
    ['ส่วนสูง', `${v.height} ซม.`],
  ];

  return (
    <StepCard>
      <StepAuditBar locked={locked} terminated={form.terminated} />

      <Block>
        <TopicHeader icon='monitor_heart'>Vital Signs จากจุดคัดกรอง (อ่านอย่างเดียว)</TopicHeader>
        <ReadPanel>
          <div className='flex items-center gap-3 flex-wrap'>
            {pairs.map(([label, value]) => <Pair key={label} label={label}>{value}</Pair>)}
          </div>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>Nurse Note (จุดคัดกรอง)</span>
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>{intake.nurseNote}</span>
          </div>
        </ReadPanel>
      </Block>

      <Block>
        <TopicHeader icon='medication'>แพ้ยา และโรคประจำตัว</TopicHeader>
        <ReadPanel>
          <div className='flex items-center gap-3 flex-wrap'>
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>แพ้ยา</span>
            {intake.drugAllergies.map((a) => (
              <ColorfulBadge key={a} style={a.startsWith('ไม่มี') ? 'green' : 'red'} size='small' hierarchy='secondary'>{a}</ColorfulBadge>
            ))}
          </div>
          <div className='flex items-center gap-3 flex-wrap'>
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>โรคประจำตัว</span>
            {intake.chronicDiseases.map((d) => (
              <ColorfulBadge key={d} style={d.startsWith('ไม่มี') ? 'green' : 'orange'} size='small' hierarchy='secondary'>{d}</ColorfulBadge>
            ))}
          </div>
        </ReadPanel>
      </Block>

      <Block>
        <TopicHeader icon='edit_note'>บันทึกเพิ่มเติมของพยาบาล</TopicHeader>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.nurseNote}
          onChange={(e) => set('nurseNote')(e.target.value)}
          suggestions={SW_NURSE_NOTE_SUGGESTIONS}
          minChars={3}
          placeholder='บันทึกสภาพผู้รับบริการที่สังเกตได้ขณะมารับบริการ'
        />
      </Block>

      <Block>
        <TopicHeader icon='psychology_alt'>บันทึกแรกรับของนักสังคมสงเคราะห์</TopicHeader>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.socialWorkerNote}
          onChange={(e) => set('socialWorkerNote')(e.target.value)}
          suggestions={SW_ASSESSMENT_SUGGESTIONS}
          minChars={3}
          placeholder='สภาพปัญหาที่พบเมื่อแรกรับ ความต้องการของผู้รับบริการและครอบครัว'
        />
      </Block>
    </StepCard>
  );
};

/* ═══ Step 3 — ประวัติสังคมสงเคราะห์ + ประวัติครอบครัว ═════════════ */
const EMPTY_MEMBER = { id: '', name: '', age: '', relation: '', occupation: '', education: '', income: '' };

export const SwStep3History = ({ form, setForm, swHn, locked }) => {
  const [member, setMember] = useState(EMPTY_MEMBER);
  const [memberError, setMemberError] = useState('');
  const [editIndex, setEditIndex] = useState(null);
  const [removeIndex, setRemoveIndex] = useState(null);
  const canRead = hasSocialWorkRights();

  const set = (key) => (value) => { if (!locked) setForm((f) => ({ ...f, [key]: value })); };
  const setMemberField = (key) => (value) => { setMember((m) => ({ ...m, [key]: value })); setMemberError(''); };

  const priorVisits = useMemo(() => getSwVisitRecords(swHn), [swHn]);
  const members = form.familyMembers || [];
  const totalIncome = sumFamilyIncome(members);

  const commitMember = () => {
    if (locked) return;
    if (!member.name.trim()) { setMemberError('กรุณาระบุชื่อสมาชิกครอบครัว'); return; }
    if (!member.relation) { setMemberError('กรุณาระบุความสัมพันธ์'); return; }
    setForm((f) => {
      const list = [...(f.familyMembers || [])];
      if (editIndex !== null) list[editIndex] = { ...member, id: member.id || newRowId('member') };
      else list.push({ ...member, id: newRowId('member') });
      return { ...f, familyMembers: list };
    });
    setMember(EMPTY_MEMBER);
    setEditIndex(null);
    setMemberError('');
  };

  const startEditMember = (idx) => {
    setMember(members[idx]);
    setEditIndex(idx);
    setMemberError('');
  };

  const confirmRemoveMember = () => {
    setForm((f) => ({ ...f, familyMembers: (f.familyMembers || []).filter((_, i) => i !== removeIndex) }));
    setRemoveIndex(null);
    setEditIndex(null);
    setMember(EMPTY_MEMBER);
  };

  const memberColumns = [
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 170 },
    { key: 'age', label: 'อายุ (ปี)' },
    { key: 'relation', label: 'ความสัมพันธ์' },
    { key: 'occupation', label: 'อาชีพ', flex: true, minWidth: 140 },
    { key: 'education', label: 'การศึกษา', flex: true, minWidth: 150 },
    {
      key: 'income', label: 'รายได้ (บาท/เดือน)', align: 'right',
      render: (r) => (r.income ? Number(String(r.income).replace(/,/g, '')).toLocaleString('th-TH') : '—'),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (_r, idx) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' disabled={locked} onClick={() => startEditMember(idx)}>
            แก้ไข
          </BrandSubdueButton>
          <DangerSubdueButton size='sm' leadingIcon='delete' disabled={locked} onClick={() => setRemoveIndex(idx)}>
            ลบ
          </DangerSubdueButton>
        </div>
      ),
    },
  ];

  return (
    <StepCard>
      <StepAuditBar locked={locked} terminated={form.terminated} />

      <Popup
        open={removeIndex !== null}
        onClose={() => setRemoveIndex(null)}
        title='ลบสมาชิกครอบครัว'
        subtitle={removeIndex !== null ? members[removeIndex]?.name : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setRemoveIndex(null) }}
        primaryAction={{ label: 'ยืนยันลบ', onClick: confirmRemoveMember, tone: 'danger' }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
          รายชื่อที่ลบจะไม่ถูกนับในรายได้รวมของครอบครัว ต้องการลบใช่หรือไม่
        </span>
      </Popup>

      <Block>
        <TopicHeader icon='history'>ประวัติการรับบริการสังคมสงเคราะห์</TopicHeader>
        {priorVisits.length === 0 ? (
          <EmptyRow>ยังไม่มีประวัติการรับบริการสังคมสงเคราะห์ในระบบ (รายใหม่)</EmptyRow>
        ) : (
          <Table
            columns={[
              { key: 'visitDate', label: 'วันที่รับบริการ', render: (r) => formatSwDate(r.visitDate) },
              { key: 'primaryProblem', label: 'ปัญหาหลัก', flex: true, minWidth: 220, render: (r) => resolveSwProblemLabel(r.primaryProblem) },
              { key: 'worker', label: 'ผู้ให้บริการ', flex: true, minWidth: 180, render: (r) => r.worker || r.savedBy },
              { key: 'savedAt', label: 'บันทึกเมื่อ', render: (r) => formatSwDateTime(r.savedAt) },
            ]}
            rows={withKeys(priorVisits, 'visit')}
            rowKey={(r) => r._rk}
            emptyMessage='ยังไม่มีประวัติ'
          />
        )}
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.socialHistory}
          onChange={(e) => set('socialHistory')(e.target.value)}
          suggestions={SW_SOCIAL_HISTORY_SUGGESTIONS}
          minChars={3}
          placeholder='ประวัติการช่วยเหลือที่เคยได้รับ / สวัสดิการที่ได้รับอยู่ / หน่วยงานที่เคยติดต่อ'
        />
      </Block>

      <Block>
        <TopicHeader
          icon='family_restroom'
          aside={(
            <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
              รายได้รวมของครอบครัว {totalIncome.toLocaleString('th-TH')} บาท/เดือน
            </ColorfulBadge>
          )}
        >
          ข้อมูลประวัติครอบครัว
        </TopicHeader>

        {!canRead ? (
          <SwConfidentialMask what='ข้อมูลประวัติครอบครัวและรายได้ของแบบบันทึก สส.2' />
        ) : (
          <>
            <Table
              columns={memberColumns}
              rows={withKeys(members, 'member')}
              rowKey={(r) => r._rk}
              emptyMessage='ยังไม่ได้บันทึกสมาชิกครอบครัว — กรอกข้อมูลด้านล่างแล้วกด "เพิ่มสมาชิก"'
            />

            <div
              className='flex flex-col w-full'
              style={{
                gap: 'var(--dim-space-300, 12px)',
                paddingTop: 'var(--dim-space-400, 16px)',
                paddingBottom: 'var(--dim-space-400, 16px)',
                paddingLeft: 'var(--dim-space-400, 16px)',
                paddingRight: 'var(--dim-space-400, 16px)',
                borderRadius: 'var(--dim-radius-200, 8px)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
                background: 'var(--surface-card-quaternary, #F9FBFB)',
              }}
            >
              <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <SwField label='ชื่อ-นามสกุล' required>
                  <InputField disabled={locked} value={member.name} onChange={setMemberField('name')} placeholder='ชื่อสมาชิกครอบครัว' />
                </SwField>
                <SwField label='อายุ (ปี)' minWidth={120}>
                  <InputField disabled={locked} type='number' value={member.age} onChange={setMemberField('age')} placeholder='45' />
                </SwField>
                <SwField label='ความสัมพันธ์' required>
                  <Select
                    showLabel={false} searchable={false} size='lg'
                    disabled={locked}
                    value={member.relation}
                    onChange={setMemberField('relation')}
                    options={SW_FAMILY_RELATIONS.map((r) => ({ value: r, label: r }))}
                    placeholder='เลือกความสัมพันธ์'
                  />
                </SwField>
              </div>
              <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <SwField label='อาชีพ'>
                  <InputField disabled={locked} value={member.occupation} onChange={setMemberField('occupation')} placeholder='เช่น ค้าขาย / รับจ้างทั่วไป' />
                </SwField>
                <SwField label='การศึกษา'>
                  <Select
                    showLabel={false} searchable={false} size='lg'
                    disabled={locked}
                    value={member.education}
                    onChange={setMemberField('education')}
                    options={SW_EDUCATION_LEVELS.map((e) => ({ value: e, label: e }))}
                    placeholder='เลือกระดับการศึกษา'
                  />
                </SwField>
                <SwField label='รายได้ (บาท/เดือน)'>
                  <InputField disabled={locked} type='number' value={member.income} onChange={setMemberField('income')} placeholder='0' />
                </SwField>
              </div>
              {memberError && (
                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-danger-default, #B91C1C)' }}>{memberError}</span>
              )}
              <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <div className='flex-1' />
                {editIndex !== null && (
                  <NeutralSubdueButton size='sm' onClick={() => { setMember(EMPTY_MEMBER); setEditIndex(null); setMemberError(''); }}>
                    ยกเลิกการแก้ไข
                  </NeutralSubdueButton>
                )}
                <BrandDashedAddButton disabled={locked} onClick={commitMember}>
                  {editIndex !== null ? 'บันทึกการแก้ไขสมาชิก' : 'เพิ่มสมาชิก'}
                </BrandDashedAddButton>
              </div>
            </div>

            <SuggestibleTextarea
              voice
              disabled={locked}
              value={form.familyIncomeNote}
              onChange={(e) => set('familyIncomeNote')(e.target.value)}
              suggestions={[
                'รายได้ไม่แน่นอน ขึ้นกับงานรับจ้างรายวัน',
                'มีหนี้สินนอกระบบประมาณ 50,000 บาท',
                'ผู้รับบริการเป็นผู้หารายได้หลักเพียงคนเดียว',
                'ได้รับเบี้ยยังชีพผู้สูงอายุและเบี้ยความพิการรวม 1,500 บาท/เดือน',
              ]}
              minChars={3}
              rows={2}
              minHeight={64}
              placeholder='หมายเหตุเรื่องรายได้และภาระค่าใช้จ่ายของครอบครัว'
            />
          </>
        )}
      </Block>
    </StepCard>
  );
};

/* ═══ Step 4 — ปัญหาและการวินิจฉัยทางสังคม ═══════════════════════════ */
export const SwStep4Problems = ({ form, setForm, locked }) => {
  const [secondaryError, setSecondaryError] = useState('');
  const canRead = hasSocialWorkRights();
  const set = (key) => (value) => { if (!locked) setForm((f) => ({ ...f, [key]: value })); };

  const secondary = form.secondaryProblems || [];

  const toggleSecondary = (code) => {
    if (locked) return;
    if (code === form.primaryProblem) {
      setSecondaryError('รหัสนี้ถูกเลือกเป็นปัญหาหลักแล้ว — เลือกซ้ำเป็นปัญหารองไม่ได้');
      return;
    }
    if (secondary.includes(code)) {
      setSecondaryError('');
      setForm((f) => ({ ...f, secondaryProblems: (f.secondaryProblems || []).filter((c) => c !== code) }));
      return;
    }
    if (secondary.length >= SW_MAX_SECONDARY_PROBLEMS) {
      setSecondaryError(`เลือกปัญหารองได้ไม่เกิน ${SW_MAX_SECONDARY_PROBLEMS} ข้อ — เอาข้อเดิมออกก่อนจึงจะเลือกข้อใหม่ได้`);
      return;
    }
    setSecondaryError('');
    setForm((f) => ({ ...f, secondaryProblems: [...(f.secondaryProblems || []), code] }));
  };

  const pickPrimary = (code) => {
    if (locked) return;
    setSecondaryError('');
    setForm((f) => ({
      ...f,
      primaryProblem: code,
      /* ปัญหาหลักถูกดึงออกจากรายการปัญหารองโดยอัตโนมัติ (ห้ามซ้ำ) */
      secondaryProblems: (f.secondaryProblems || []).filter((c) => c !== code),
    }));
  };

  return (
    <StepCard>
      <StepAuditBar locked={locked} terminated={form.terminated} />

      {!canRead ? (
        <Block>
          <TopicHeader icon='lock'>ปัญหาสังคมสงเคราะห์</TopicHeader>
          <SwConfidentialMask what='ปัญหาสังคมสงเคราะห์ การวินิจฉัยและการประเมินทางสังคม' />
        </Block>
      ) : (
        <>
          <Block>
            <TopicHeader
              icon='report_problem'
              aside={<ColorfulBadge style='blue' size='small' hierarchy='secondary'>เลือกได้ 1 ข้อ</ColorfulBadge>}
            >
              ปัญหาหลัก
            </TopicHeader>
            <SwField
              label='รหัสปัญหาหลัก'
              required
              hint='ตามคู่มือระบบเดิม §2.7 — ปัญหาหลักบันทึกได้เพียง 1 ข้อ'
              grow={false}
            >
              <Select
                showLabel={false} searchable size='lg'
                disabled={locked}
                value={form.primaryProblem}
                onChange={pickPrimary}
                options={SW_PROBLEM_OPTIONS}
                placeholder='เลือกปัญหาหลัก'
              />
            </SwField>
            {form.primaryProblem && isSwProblemSensitive(form.primaryProblem) && (
              <SwBanner tone='danger' icon='lock'>
                ปัญหาหลักนี้จัดเป็นข้อมูลลับ (§1.4.2) — รายละเอียดและบันทึกบรรยายจะถูกปกปิดในหน้าคิว
                ทะเบียน และหน้าติดตามผล สำหรับผู้ใช้ที่ไม่มีสิทธิงานสังคมสงเคราะห์
              </SwBanner>
            )}
          </Block>

          <Block>
            <TopicHeader
              icon='checklist'
              aside={(
                <ColorfulBadge style={secondary.length >= SW_MAX_SECONDARY_PROBLEMS ? 'orange' : 'blue'} size='small' hierarchy='secondary'>
                  เลือกแล้ว {secondary.length}/{SW_MAX_SECONDARY_PROBLEMS} ข้อ
                </ColorfulBadge>
              )}
            >
              ปัญหารอง (ไม่เกิน {SW_MAX_SECONDARY_PROBLEMS} ข้อ)
            </TopicHeader>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {SW_PROBLEM_OPTIONS.map((opt) => {
                const selected = secondary.includes(opt.value);
                const isPrimary = form.primaryProblem === opt.value;
                const blocked = !selected && secondary.length >= SW_MAX_SECONDARY_PROBLEMS;
                return (
                  <Checkbox
                    key={opt.value}
                    checked={selected}
                    disabled={locked || isPrimary}
                    onChange={() => toggleSecondary(opt.value)}
                    label={opt.label}
                    description={isPrimary
                      ? 'เลือกเป็นปัญหาหลักแล้ว'
                      : (blocked ? `ครบ ${SW_MAX_SECONDARY_PROBLEMS} ข้อแล้ว — เอาข้ออื่นออกก่อน` : undefined)}
                    badge={findSwProblem(opt.value)?.sensitive
                      ? <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ</ColorfulBadge>
                      : undefined}
                  />
                );
              })}
            </div>
            {secondaryError && (
              <SwBanner tone='danger' icon='error'>{secondaryError}</SwBanner>
            )}
          </Block>

          <Block>
            <TopicHeader icon='fact_check'>การวินิจฉัยทางสังคม (Social diagnosis)</TopicHeader>
            <SuggestibleTextarea
              voice
              disabled={locked}
              value={form.socialDiagnosis}
              onChange={(e) => set('socialDiagnosis')(e.target.value)}
              suggestions={SW_DIAGNOSIS_SUGGESTIONS}
              minChars={3}
              placeholder='สรุปสาเหตุของปัญหา ปัจจัยแวดล้อม และผลกระทบต่อผู้รับบริการและครอบครัว'
            />
          </Block>

          <Block>
            <TopicHeader icon='insights'>การประเมินทางสังคม (Social assessment)</TopicHeader>
            <SuggestibleTextarea
              voice
              disabled={locked}
              value={form.socialAssessment}
              onChange={(e) => set('socialAssessment')(e.target.value)}
              suggestions={SW_ASSESSMENT_SUGGESTIONS}
              minChars={3}
              placeholder='ศักยภาพของผู้รับบริการ/ครอบครัว ทรัพยากรที่มี และแนวทางช่วยเหลือที่เหมาะสม'
            />
          </Block>
        </>
      )}
    </StepCard>
  );
};

/* ═══ Step 5 — บริการ-กิจกรรม และการช่วยเหลือ ═══════════════════════ */
const STEP5_SECTIONS = [
  { key: 'advice', label: 'Advice / Counselling' },
  { key: 'fund', label: 'เงินสนับสนุน' },
  { key: 'equipment', label: 'อุปกรณ์ช่วยเหลือ/ฟื้นฟู' },
  { key: 'consumable', label: 'เครื่องอุปโภคบริโภค' },
  { key: 'services', label: 'บริการอื่นตามแบบ สส.2' },
];

const EMPTY_ADVICE = { problemCode: '', text: '' };
const EMPTY_FUND = { type: '', amount: '', note: '', date: '' };
const EMPTY_MATERIAL_REQUEST = { materialCode: '', qty: '', note: '' };

export const SwStep5Services = ({ form, setForm, swHn, locked }) => {
  const history = useHistory();
  const { active, refs, jump } = useSectionJump('advice');
  const canRead = hasSocialWorkRights();

  const [advice, setAdvice] = useState(EMPTY_ADVICE);
  const [adviceError, setAdviceError] = useState('');
  const [fund, setFund] = useState(EMPTY_FUND);
  const [fundError, setFundError] = useState('');
  const [equipment, setEquipment] = useState(EMPTY_MATERIAL_REQUEST);
  const [equipmentError, setEquipmentError] = useState('');
  const [consumable, setConsumable] = useState(EMPTY_MATERIAL_REQUEST);
  const [consumableError, setConsumableError] = useState('');

  const problemOptions = useMemo(() => {
    const codes = [form.primaryProblem, ...(form.secondaryProblems || [])].filter(Boolean);
    return codes.map((c) => ({ value: c, label: resolveSwProblemLabel(c) }));
  }, [form.primaryProblem, form.secondaryProblems]);

  const equipmentOptions = SW_MATERIAL_OPTIONS.filter((o) => findSwMaterial(o.value)?.category === 'device');
  const consumableOptions = SW_MATERIAL_OPTIONS.filter((o) => ['milk', 'medfood', 'dryfood', 'diaper'].includes(findSwMaterial(o.value)?.category));

  const pushRow = (key, value) => setForm((f) => ({ ...f, [key]: [...(f[key] || []), value] }));
  const dropRow = (key, idx) => setForm((f) => ({ ...f, [key]: (f[key] || []).filter((_, i) => i !== idx) }));

  const addAdvice = () => {
    if (locked) return;
    if (!advice.problemCode) { setAdviceError('กรุณาผูกคำแนะนำกับรหัสปัญหา (เลือกจากปัญหาหลัก/รองในขั้นตอนที่ 4)'); return; }
    if (!advice.text.trim()) { setAdviceError('กรุณาระบุเนื้อหาการให้คำปรึกษา'); return; }
    pushRow('advices', { ...advice, text: advice.text.trim(), by: SW_CURRENT_USER, at: new Date().toISOString() });
    setAdvice(EMPTY_ADVICE);
    setAdviceError('');
  };

  const addFund = () => {
    if (locked) return;
    if (!fund.type) { setFundError('กรุณาเลือกประเภทเงินสนับสนุน'); return; }
    const amount = Number(fund.amount);
    if (!Number.isFinite(amount) || amount <= 0) { setFundError('จำนวนเงินต้องมากกว่า 0 บาท'); return; }
    const ceiling = SW_FUND_TYPES.find((t) => t.value === fund.type)?.ceiling;
    if (ceiling && amount > ceiling) {
      setFundError(`จำนวนเงินเกินเพดานของประเภทนี้ (${ceiling.toLocaleString('th-TH')} บาท) — ต้องขออนุมัติพิเศษก่อน`);
      return;
    }
    pushRow('funds', {
      ...fund, amount, date: fund.date || todayIso(), by: SW_CURRENT_USER, at: new Date().toISOString(),
    });
    setFund(EMPTY_FUND);
    setFundError('');
  };

  const addMaterial = (kind) => {
    if (locked) return;
    const src = kind === 'equipmentRequests' ? equipment : consumable;
    const setErr = kind === 'equipmentRequests' ? setEquipmentError : setConsumableError;
    const reset = kind === 'equipmentRequests' ? setEquipment : setConsumable;
    if (!src.materialCode) { setErr('กรุณาเลือกรายการวัสดุ'); return; }
    const qty = Number(src.qty);
    if (!Number.isFinite(qty) || qty <= 0) { setErr('จำนวนต้องมากกว่า 0'); return; }
    pushRow(kind, { ...src, qty, by: SW_CURRENT_USER, at: new Date().toISOString() });
    reset(EMPTY_MATERIAL_REQUEST);
    setErr('');
  };

  /* Deep-link ไปหน้าจ่ายวัสดุ พร้อม context ของผู้รับบริการและรายการ
     (TOR 1.10.11.2 "เชื่อมข้อมูลการให้เงินสนับสนุน วัสดุ") */
  const goIssue = (row) => history.push({
    pathname: '/clinic/social-work/supplies',
    state: { tab: 'issue', hn: swHn, materialCode: row.materialCode, qty: row.qty },
  });

  const materialColumns = (kind) => ([
    { key: 'materialCode', label: 'รหัส' },
    { key: 'name', label: 'รายการวัสดุ', flex: true, minWidth: 220, render: (r) => findSwMaterial(r.materialCode)?.name || '—' },
    { key: 'category', label: 'หมวด', render: (r) => resolveSwCategory(findSwMaterial(r.materialCode)?.category) },
    { key: 'qty', label: 'จำนวน', align: 'right', render: (r) => `${r.qty} ${findSwMaterial(r.materialCode)?.unit || ''}` },
    { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 180, render: (r) => r.note || '—' },
    {
      key: 'audit', label: 'ผู้บันทึก', sortable: false,
      render: (r) => <SwAuditLine by={r.by} at={r.at} label='โดย' formatDateTime={formatSwDateTime} />,
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r, idx) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='local_shipping' onClick={() => goIssue(r)}>
            ไปจ่ายวัสดุ
          </BrandSubdueButton>
          <DangerSubdueButton size='sm' leadingIcon='delete' disabled={locked} onClick={() => dropRow(kind, idx)}>
            ลบ
          </DangerSubdueButton>
        </div>
      ),
    },
  ]);

  const toggleService = (catKey, item) => {
    if (locked) return;
    setForm((f) => {
      const current = (f.services || {})[catKey] || [];
      const next = current.includes(item) ? current.filter((i) => i !== item) : [...current, item];
      return { ...f, services: { ...(f.services || {}), [catKey]: next } };
    });
  };

  if (!canRead) {
    return (
      <StepCard>
        <StepAuditBar locked={locked} terminated={form.terminated} />
        <Block>
          <TopicHeader icon='lock'>บริการหรือกิจกรรม และการช่วยเหลือ</TopicHeader>
          <SwConfidentialMask what='รายละเอียดการให้คำปรึกษา เงินสนับสนุน และวัสดุที่ช่วยเหลือ' />
        </Block>
      </StepCard>
    );
  }

  return (
    <StepCard>
      <StepAuditBar locked={locked} terminated={form.terminated} />
      <CapsuleNav sections={STEP5_SECTIONS} active={active} onJump={jump} />

      {/* ── Advice / Counselling (ผูกรหัสปัญหา) ────────────────────── */}
      <Block ref={(el) => { refs.current.advice = el; }}>
        <TopicHeader icon='support_agent'>การให้คำแนะนำ / ให้คำปรึกษา (Advice · Counselling)</TopicHeader>
        <Table
          columns={[
            { key: 'problemCode', label: 'รหัสปัญหา', render: (r) => resolveSwProblemLabel(r.problemCode) },
            { key: 'text', label: 'เนื้อหาการให้คำปรึกษา', flex: true, minWidth: 320 },
            { key: 'audit', label: 'ผู้บันทึก', sortable: false, render: (r) => <SwAuditLine by={r.by} at={r.at} label='โดย' formatDateTime={formatSwDateTime} /> },
            {
              key: 'actions', label: '', sortable: false,
              render: (_r, idx) => (
                <DangerSubdueButton size='sm' leadingIcon='delete' disabled={locked} onClick={() => dropRow('advices', idx)}>ลบ</DangerSubdueButton>
              ),
            },
          ]}
          rows={withKeys(form.advices, 'advice')}
          rowKey={(r) => r._rk}
          emptyMessage='ยังไม่ได้บันทึกการให้คำปรึกษา'
        />
        {problemOptions.length === 0 ? (
          <SwBanner tone='warning' icon='info'>
            ยังไม่ได้เลือกปัญหาในขั้นตอนที่ 4 — ต้องเลือกปัญหาหลัก/ปัญหารองก่อนจึงจะผูกคำปรึกษากับรหัสปัญหาได้
          </SwBanner>
        ) : (
          <>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <SwField label='ผูกกับรหัสปัญหา' required>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  disabled={locked}
                  value={advice.problemCode}
                  onChange={(v) => { setAdvice((a) => ({ ...a, problemCode: v })); setAdviceError(''); }}
                  options={problemOptions}
                  placeholder='เลือกรหัสปัญหา'
                />
              </SwField>
            </div>
            <SuggestibleTextarea
              voice
              disabled={locked}
              value={advice.text}
              onChange={(e) => { setAdvice((a) => ({ ...a, text: e.target.value })); setAdviceError(''); }}
              suggestions={SW_ADVICE_SUGGESTIONS}
              minChars={3}
              rows={2}
              minHeight={64}
              placeholder='บันทึกเนื้อหาการให้คำแนะนำ/คำปรึกษาที่ให้กับผู้รับบริการ'
            />
            {adviceError && <SwBanner tone='danger' icon='error'>{adviceError}</SwBanner>}
            <div className='flex items-center w-full'>
              <div className='flex-1' />
              <BrandDashedAddButton disabled={locked} onClick={addAdvice}>เพิ่มการให้คำปรึกษา</BrandDashedAddButton>
            </div>
          </>
        )}
      </Block>

      {/* ── เงินสนับสนุน 5 ประเภท ──────────────────────────────────── */}
      <Block ref={(el) => { refs.current.fund = el; }}>
        <TopicHeader
          icon='payments'
          aside={(
            <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
              รวม {formatBaht((form.funds || []).reduce((s, f) => s + (Number(f.amount) || 0), 0))}
            </ColorfulBadge>
          )}
        >
          การช่วยเหลือ — เงินสนับสนุน
        </TopicHeader>
        <Table
          columns={[
            { key: 'date', label: 'วันที่', render: (r) => formatSwDate(r.date) },
            { key: 'type', label: 'ประเภทเงินสนับสนุน', flex: true, minWidth: 200, render: (r) => resolveSwFundType(r.type) },
            { key: 'amount', label: 'จำนวนเงิน', align: 'right', render: (r) => formatBaht(r.amount) },
            { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 200, render: (r) => r.note || '—' },
            { key: 'audit', label: 'ผู้บันทึก', sortable: false, render: (r) => <SwAuditLine by={r.by} at={r.at} label='โดย' formatDateTime={formatSwDateTime} /> },
            {
              key: 'actions', label: '', sortable: false,
              render: (_r, idx) => (
                <DangerSubdueButton size='sm' leadingIcon='delete' disabled={locked} onClick={() => dropRow('funds', idx)}>ลบ</DangerSubdueButton>
              ),
            },
          ]}
          rows={withKeys(form.funds, 'fund')}
          rowKey={(r) => r._rk}
          emptyMessage='ยังไม่ได้บันทึกการช่วยเหลือด้วยเงินสนับสนุน'
        />
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <SwField label='ประเภทเงินสนับสนุน' required>
            <Select
              showLabel={false} searchable={false} size='lg'
              disabled={locked}
              value={fund.type}
              onChange={(v) => { setFund((f) => ({ ...f, type: v })); setFundError(''); }}
              options={SW_FUND_TYPES.map((t) => ({ value: t.value, label: `${t.label} (เพดาน ${t.ceiling.toLocaleString('th-TH')} บาท)` }))}
              placeholder='เลือกประเภท'
            />
          </SwField>
          <SwField label='จำนวนเงิน (บาท)' required minWidth={160}>
            <InputField
              disabled={locked}
              type='number'
              value={fund.amount}
              onChange={(v) => { setFund((f) => ({ ...f, amount: v })); setFundError(''); }}
              placeholder='0'
            />
          </SwField>
          <SwField label='วันที่จ่าย'>
            <DatePicker
              showLabel={false}
              disabled={locked}
              value={fund.date ? new Date(fund.date) : null}
              onChange={(d) => setFund((f) => ({ ...f, date: d ? toLocalIso(d) : '' }))}
              placeholder='ค่าเริ่มต้น = วันนี้'
            />
          </SwField>
          <SwField label='หมายเหตุ'>
            <InputField disabled={locked} value={fund.note} onChange={(v) => setFund((f) => ({ ...f, note: v }))} placeholder='เช่น ค่าพาหนะมารับบริการ 6 ครั้ง' />
          </SwField>
        </div>
        {fundError && <SwBanner tone='danger' icon='error'>{fundError}</SwBanner>}
        <div className='flex items-center w-full'>
          <div className='flex-1' />
          <BrandDashedAddButton disabled={locked} onClick={addFund}>เพิ่มเงินสนับสนุน</BrandDashedAddButton>
        </div>
      </Block>

      {/* ── อุปกรณ์ช่วยเหลือ / ฟื้นฟู ─────────────────────────────── */}
      <Block ref={(el) => { refs.current.equipment = el; }}>
        <TopicHeader icon='accessible_forward'>อุปกรณ์ช่วยเหลือ / ฟื้นฟูสมรรถภาพ</TopicHeader>
        <Table
          columns={materialColumns('equipmentRequests')}
          rows={withKeys(form.equipmentRequests, 'eq')}
          rowKey={(r) => r._rk}
          emptyMessage='ยังไม่ได้บันทึกอุปกรณ์ช่วยเหลือ/ฟื้นฟู'
        />
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <SwField label='รายการอุปกรณ์' required>
            <Select
              showLabel={false} searchable size='lg'
              disabled={locked}
              value={equipment.materialCode}
              onChange={(v) => { setEquipment((s) => ({ ...s, materialCode: v })); setEquipmentError(''); }}
              options={equipmentOptions}
              placeholder='เลือกอุปกรณ์'
            />
          </SwField>
          <SwField label='จำนวน' required minWidth={140}>
            <InputField
              disabled={locked} type='number'
              value={equipment.qty}
              onChange={(v) => { setEquipment((s) => ({ ...s, qty: v })); setEquipmentError(''); }}
              placeholder='1'
            />
          </SwField>
          <SwField label='หมายเหตุ'>
            <InputField disabled={locked} value={equipment.note} onChange={(v) => setEquipment((s) => ({ ...s, note: v }))} placeholder='เช่น ให้ยืมใช้ 6 เดือน' />
          </SwField>
        </div>
        {equipmentError && <SwBanner tone='danger' icon='error'>{equipmentError}</SwBanner>}
        <div className='flex items-center w-full'>
          <div className='flex-1' />
          <BrandDashedAddButton disabled={locked} onClick={() => addMaterial('equipmentRequests')}>เพิ่มอุปกรณ์</BrandDashedAddButton>
        </div>
      </Block>

      {/* ── เครื่องอุปโภคบริโภค ────────────────────────────────────── */}
      <Block ref={(el) => { refs.current.consumable = el; }}>
        <TopicHeader icon='inventory_2'>เครื่องอุปโภคบริโภค (นมผง · อาหารทางการแพทย์ · ข้าวสารอาหารแห้ง · ผ้าอ้อม)</TopicHeader>
        <Table
          columns={materialColumns('consumableRequests')}
          rows={withKeys(form.consumableRequests, 'cs')}
          rowKey={(r) => r._rk}
          emptyMessage='ยังไม่ได้บันทึกเครื่องอุปโภคบริโภค'
        />
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <SwField label='รายการวัสดุ' required>
            <Select
              showLabel={false} searchable size='lg'
              disabled={locked}
              value={consumable.materialCode}
              onChange={(v) => { setConsumable((s) => ({ ...s, materialCode: v })); setConsumableError(''); }}
              options={consumableOptions}
              placeholder='เลือกวัสดุ'
            />
          </SwField>
          <SwField label='จำนวน' required minWidth={140}>
            <InputField
              disabled={locked} type='number'
              value={consumable.qty}
              onChange={(v) => { setConsumable((s) => ({ ...s, qty: v })); setConsumableError(''); }}
              placeholder='1'
            />
          </SwField>
          <SwField label='หมายเหตุ'>
            <InputField disabled={locked} value={consumable.note} onChange={(v) => setConsumable((s) => ({ ...s, note: v }))} placeholder='เช่น จ่ายรอบเดือนสิงหาคม' />
          </SwField>
        </div>
        {consumableError && <SwBanner tone='danger' icon='error'>{consumableError}</SwBanner>}
        <div className='flex items-center w-full'>
          <div className='flex-1' />
          <BrandDashedAddButton disabled={locked} onClick={() => addMaterial('consumableRequests')}>เพิ่มวัสดุ</BrandDashedAddButton>
        </div>
      </Block>

      {/* ── บริการอื่นตามแบบ สส.2 (8 หมวด) ────────────────────────── */}
      <Block ref={(el) => { refs.current.services = el; }}>
        <TopicHeader icon='volunteer_activism'>บริการหรือกิจกรรมอื่นตามแบบ สส.2</TopicHeader>
        {SW_SERVICE_CATEGORIES.map((cat) => {
          const chosen = (form.services || {})[cat.key] || [];
          return (
            <div key={cat.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <Icon name={cat.icon} size={18} />
                <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
                  {cat.label}
                </span>
                {chosen.length > 0 && (
                  <ColorfulBadge style='green' size='small' hierarchy='secondary'>เลือกแล้ว {chosen.length} รายการ</ColorfulBadge>
                )}
              </div>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {cat.items.map((item) => (
                  <SelectableTag
                    key={item}
                    label={item}
                    size='md'
                    selected={chosen.includes(item)}
                    onClick={() => toggleService(cat.key, item)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </Block>
    </StepCard>
  );
};

/* ═══ Step 6 — ติดตามการช่วยเหลือ + การยุติการให้บริการ ═════════════ */
const EMPTY_FOLLOWUP = { date: '', reached: true, result: '', reason: '' };

export const SwStep6FollowUp = ({ form, setForm, swHn, locked }) => {
  const [entry, setEntry] = useState(EMPTY_FOLLOWUP);
  const [error, setError] = useState('');
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const canRead = hasSocialWorkRights();

  const history = useMemo(() => getSwFollowUpHistory(swHn), [swHn]);
  const rows = form.followUps || [];

  const addFollowUp = () => {
    if (locked) return;
    if (!entry.date) { setError('กรุณาระบุวันที่ติดตาม'); return; }
    if (entry.reached && !entry.result.trim()) { setError('กรุณาบันทึกผลการติดตาม'); return; }
    if (!entry.reached && !entry.reason.trim()) { setError('ติดตามไม่ได้ — กรุณาระบุสาเหตุที่ติดตามไม่ได้'); return; }
    setForm((f) => ({
      ...f,
      followUps: [...(f.followUps || []), {
        date: entry.date,
        reached: entry.reached,
        result: entry.reached ? entry.result.trim() : entry.reason.trim(),
        by: SW_CURRENT_USER,
        at: new Date().toISOString(),
      }],
    }));
    setEntry(EMPTY_FOLLOWUP);
    setError('');
  };

  const removeFollowUp = (idx) => setForm((f) => ({
    ...f, followUps: (f.followUps || []).filter((_, i) => i !== idx),
  }));

  const confirmTerminate = () => {
    if (!form.terminationReason.trim()) return;
    setForm((f) => ({
      ...f,
      terminated: true,
      terminationDate: f.terminationDate || todayIso(),
      terminatedBy: SW_CURRENT_USER,
    }));
    setTerminateOpen(false);
  };

  const confirmReopen = () => {
    if (!reopenReason.trim()) return;
    setForm((f) => ({
      ...f,
      terminated: false,
      reopenLog: [...(f.reopenLog || []), { reason: reopenReason.trim(), by: SW_CURRENT_USER, at: new Date().toISOString() }],
    }));
    setReopenReason('');
    setReopenOpen(false);
  };

  return (
    <StepCard>
      <StepAuditBar locked={locked} terminated={form.terminated} />

      <Popup
        open={terminateOpen}
        onClose={() => setTerminateOpen(false)}
        title='ยุติการให้บริการสังคมสงเคราะห์'
        subtitle={`HN ${swHn}`}
        tertiaryAction={{ label: 'ปิด', onClick: () => setTerminateOpen(false) }}
        primaryAction={{ label: 'ยืนยันยุติการให้บริการ', onClick: confirmTerminate, tone: 'danger' }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
          เมื่อยุติการให้บริการแล้ว ระเบียน สส.2 นี้จะเป็นอ่านอย่างเดียว —
          หากต้องการกลับมาให้บริการต่อจะต้องระบุเหตุผลในการเปิดเคสใหม่ (บันทึกใน audit trail)
        </span>
      </Popup>

      <Popup
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        title='เปิดเคสใหม่หลังยุติการให้บริการ'
        subtitle={`HN ${swHn}`}
        tertiaryAction={{ label: 'ปิด', onClick: () => setReopenOpen(false) }}
        primaryAction={{ label: 'ยืนยันเปิดเคสใหม่', onClick: confirmReopen }}
      >
        <SuggestibleTextarea
          label='เหตุผลในการเปิดเคสใหม่'
          required
          voice
          value={reopenReason}
          onChange={(e) => setReopenReason(e.target.value)}
          suggestions={[
            'ผู้รับบริการกลับมามีปัญหาซ้ำ ต้องการความช่วยเหลือต่อเนื่อง',
            'พบปัญหาใหม่จากการเยี่ยมบ้าน',
            'ครอบครัวร้องขอความช่วยเหลือเพิ่มเติม',
          ]}
          minChars={3}
          rows={2}
          minHeight={64}
          placeholder='ระบุเหตุผลที่กลับมาให้บริการต่อ'
        />
      </Popup>

      {form.terminated && (
        <SwBanner
          tone='neutral'
          icon='lock'
          action={(
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='restart_alt' onClick={() => setReopenOpen(true)}>
              เปิดเคสใหม่
            </BrandSubdueButton>
          )}
        >
          ยุติการให้บริการเมื่อ {formatSwDate(form.terminationDate)} โดย {form.terminatedBy || SW_CURRENT_USER} —
          เหตุผล: {form.terminationReason || '—'} · ระเบียนนี้เป็นอ่านอย่างเดียว
        </SwBanner>
      )}

      {!canRead ? (
        <Block>
          <TopicHeader icon='lock'>การติดตามผล</TopicHeader>
          <SwConfidentialMask what='ผลการติดตามการช่วยเหลือทางสังคมสงเคราะห์' />
        </Block>
      ) : (
        <>
          <Block>
            <TopicHeader icon='history'>ประวัติการติดตามที่ผ่านมา (อ่านอย่างเดียว)</TopicHeader>
            {history.length === 0 ? (
              <EmptyRow>ยังไม่มีประวัติการติดตามของผู้รับบริการรายนี้</EmptyRow>
            ) : (
              <Table
                columns={[
                  { key: 'date', label: 'วันที่ติดตาม', render: (r) => formatSwDate(r.date) },
                  {
                    key: 'reached', label: 'ผลการติดต่อ',
                    render: (r) => (
                      <ColorfulBadge style={r.reached ? 'green' : 'orange'} size='small' hierarchy='secondary'>
                        {r.reached ? 'ติดตามได้' : 'ติดตามไม่ได้'}
                      </ColorfulBadge>
                    ),
                  },
                  { key: 'result', label: 'ผล / สาเหตุ', flex: true, minWidth: 320 },
                  { key: 'by', label: 'ผู้บันทึก', flex: true, minWidth: 180 },
                ]}
                rows={withKeys([...history].sort((a, b) => b.date.localeCompare(a.date)), 'hist')}
                rowKey={(r) => r._rk}
                emptyMessage='ยังไม่มีประวัติการติดตาม'
              />
            )}
          </Block>

          <Block>
            <TopicHeader icon='fact_check'>บันทึกการติดตามครั้งนี้</TopicHeader>
            <Table
              columns={[
                { key: 'date', label: 'วันที่ติดตาม', render: (r) => formatSwDate(r.date) },
                {
                  key: 'reached', label: 'ผลการติดต่อ',
                  render: (r) => (
                    <ColorfulBadge style={r.reached ? 'green' : 'orange'} size='small' hierarchy='secondary'>
                      {r.reached ? 'ติดตามได้' : 'ติดตามไม่ได้'}
                    </ColorfulBadge>
                  ),
                },
                { key: 'result', label: 'ผล / สาเหตุ', flex: true, minWidth: 320 },
                { key: 'audit', label: 'ผู้บันทึก', sortable: false, render: (r) => <SwAuditLine by={r.by} at={r.at} label='โดย' formatDateTime={formatSwDateTime} /> },
                {
                  key: 'actions', label: '', sortable: false,
                  render: (_r, idx) => (
                    <DangerSubdueButton size='sm' leadingIcon='delete' disabled={locked} onClick={() => removeFollowUp(idx)}>ลบ</DangerSubdueButton>
                  ),
                },
              ]}
              rows={withKeys(rows, 'fu')}
              rowKey={(r) => r._rk}
              emptyMessage='ยังไม่ได้บันทึกการติดตามในการให้บริการครั้งนี้'
            />

            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <SwField label='วันที่ติดตาม' required>
                <DatePicker
                  showLabel={false}
                  disabled={locked}
                  value={entry.date ? new Date(entry.date) : null}
                  onChange={(d) => { setEntry((e) => ({ ...e, date: d ? toLocalIso(d) : '' })); setError(''); }}
                  placeholder='เลือกวันที่'
                />
              </SwField>
              <SwField label='ผลการติดต่อ' required>
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <SelectableTag
                    label='ติดตามได้'
                    size='md'
                    selected={entry.reached}
                    onClick={() => { if (!locked) { setEntry((e) => ({ ...e, reached: true })); setError(''); } }}
                  />
                  <SelectableTag
                    label='ติดตามไม่ได้'
                    size='md'
                    selected={!entry.reached}
                    onClick={() => { if (!locked) { setEntry((e) => ({ ...e, reached: false })); setError(''); } }}
                  />
                </div>
              </SwField>
            </div>

            {entry.reached ? (
              <SuggestibleTextarea
                voice
                disabled={locked}
                value={entry.result}
                onChange={(e) => { setEntry((s) => ({ ...s, result: e.target.value })); setError(''); }}
                suggestions={SW_FOLLOWUP_SUGGESTIONS}
                minChars={3}
                rows={2}
                minHeight={64}
                placeholder='ผลการติดตาม เช่น สภาพผู้รับบริการ การใช้วัสดุ/อุปกรณ์ ความก้าวหน้าของการแก้ปัญหา'
              />
            ) : (
              <>
                <SwBanner tone='warning' icon='warning'>
                  ติดตามไม่ได้ — ระบบจะยกธง "ติดตามค้าง" ให้ผู้รับบริการรายนี้บนหน้าคิวจนกว่าจะติดตามสำเร็จ
                </SwBanner>
                <SuggestibleTextarea
                  voice
                  disabled={locked}
                  value={entry.reason}
                  onChange={(e) => { setEntry((s) => ({ ...s, reason: e.target.value })); setError(''); }}
                  suggestions={[
                    'โทรศัพท์ติดต่อไม่ได้ เบอร์ยกเลิกการใช้งาน',
                    'ย้ายที่อยู่โดยไม่แจ้ง ไม่พบผู้รับบริการที่บ้าน',
                    'ผู้รับบริการปฏิเสธการติดตาม',
                    'ญาติแจ้งว่าไปพักอยู่ต่างจังหวัดชั่วคราว',
                  ]}
                  minChars={3}
                  rows={2}
                  minHeight={64}
                  placeholder='ระบุสาเหตุที่ติดตามไม่ได้'
                />
              </>
            )}
            {error && <SwBanner tone='danger' icon='error'>{error}</SwBanner>}
            <div className='flex items-center w-full'>
              <div className='flex-1' />
              <BrandDashedAddButton disabled={locked} onClick={addFollowUp}>เพิ่มการติดตาม</BrandDashedAddButton>
            </div>
          </Block>

          <Block>
            <TopicHeader icon='task_alt'>การยุติการให้บริการ</TopicHeader>
            <SuggestibleTextarea
              voice
              disabled={locked || form.terminated}
              value={form.terminationReason}
              onChange={(e) => setForm((f) => ({ ...f, terminationReason: e.target.value }))}
              suggestions={SW_TERMINATION_SUGGESTIONS}
              minChars={3}
              rows={2}
              minHeight={64}
              placeholder='เหตุผลในการยุติการให้บริการ'
            />
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <SwField label='วันที่ยุติการให้บริการ'>
                <DatePicker
                  showLabel={false}
                  disabled={locked || form.terminated}
                  value={form.terminationDate ? new Date(form.terminationDate) : null}
                  onChange={(d) => setForm((f) => ({ ...f, terminationDate: d ? toLocalIso(d) : '' }))}
                  placeholder='ค่าเริ่มต้น = วันนี้'
                />
              </SwField>
            </div>
            {!form.terminated && (
              <div className='flex items-center w-full'>
                <div className='flex-1' />
                <DangerSubdueButton
                  size='lg'
                  leadingIcon='block'
                  disabled={locked || !form.terminationReason.trim()}
                  onClick={() => setTerminateOpen(true)}
                >
                  ยุติการให้บริการ
                </DangerSubdueButton>
              </div>
            )}
            {(form.reopenLog || []).length > 0 && (
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                {form.reopenLog.map((r, i) => (
                  <span key={`${r.at}-${i}`} style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    เปิดเคสใหม่โดย {r.by} · {formatSwDateTime(r.at)} — เหตุผล: {r.reason}
                  </span>
                ))}
              </div>
            )}
          </Block>
        </>
      )}
    </StepCard>
  );
};

/* ═══ Step 7 — ข้อมูลประกอบการวินิจฉัย (อ่านอย่างเดียว) ════════════ */
const LAB_FLAG = {
  normal: { style: 'green', label: 'ปกติ' },
  high: { style: 'red', label: 'สูงกว่าเกณฑ์' },
  low: { style: 'blue', label: 'ต่ำกว่าเกณฑ์' },
  abnormal: { style: 'orange', label: 'ผิดปกติ' },
};

const STEP7_SECTIONS = [
  { key: 'treatments', label: 'ประวัติการรักษา' },
  { key: 'consults', label: 'การส่งปรึกษา' },
  { key: 'labs', label: 'ผลตรวจห้องปฏิบัติการ' },
  { key: 'imaging', label: 'ผลตรวจทางรังสีวิทยา' },
];

export const SwStep7Supporting = ({ form, swHn, locked }) => {
  const { active, refs, jump } = useSectionJump('treatments');
  const support = useMemo(() => getSwSupportingByHn(swHn), [swHn]);

  return (
    <StepCard>
      <StepAuditBar locked={locked} terminated={form.terminated} />
      <CapsuleNav sections={STEP7_SECTIONS} active={active} onJump={jump} />

      <SwBanner tone='neutral' icon='visibility'>
        ข้อมูลในขั้นตอนนี้ดึงจากระบบตรวจรักษา ชันสูตรโรค และรังสีวินิจฉัย — แสดงอย่างเดียว แก้ไขที่ต้นทาง
      </SwBanner>

      <Block ref={(el) => { refs.current.treatments = el; }}>
        <TopicHeader icon='clinical_notes'>ประวัติการรักษา</TopicHeader>
        <Table
          columns={[
            { key: 'date', label: 'วันที่', render: (r) => formatSwDate(r.date) },
            { key: 'clinic', label: 'คลินิก', flex: true, minWidth: 180 },
            { key: 'summary', label: 'สรุปการรักษา', flex: true, minWidth: 320 },
            { key: 'doctor', label: 'แพทย์', flex: true, minWidth: 160 },
          ]}
          rows={withKeys(support.treatments, 'tr')}
          rowKey={(r) => r._rk}
          emptyMessage='ไม่มีประวัติการรักษาในระบบสำหรับผู้รับบริการรายนี้'
        />
      </Block>

      <Block ref={(el) => { refs.current.consults = el; }}>
        <TopicHeader icon='forum'>การส่งปรึกษา (Consult)</TopicHeader>
        <Table
          columns={[
            { key: 'date', label: 'วันที่', render: (r) => formatSwDate(r.date) },
            { key: 'to', label: 'ปรึกษาไปยัง', flex: true, minWidth: 240 },
            { key: 'reason', label: 'เหตุผล', flex: true, minWidth: 260 },
            {
              key: 'status', label: 'สถานะ',
              render: (r) => (
                <ColorfulBadge style={r.status === 'ตอบกลับแล้ว' ? 'green' : 'yellow'} size='small' hierarchy='secondary'>
                  {r.status}
                </ColorfulBadge>
              ),
            },
          ]}
          rows={withKeys(support.consults, 'consult')}
          rowKey={(r) => r._rk}
          emptyMessage='ไม่มีรายการส่งปรึกษา'
        />
      </Block>

      <Block ref={(el) => { refs.current.labs = el; }}>
        <TopicHeader icon='labs'>ผลตรวจทางห้องปฏิบัติการ</TopicHeader>
        <Table
          columns={[
            { key: 'date', label: 'วันที่ตรวจ', render: (r) => formatSwDate(r.date) },
            { key: 'test', label: 'รายการตรวจ', flex: true, minWidth: 180 },
            { key: 'value', label: 'ผล' },
            { key: 'unit', label: 'หน่วย' },
            { key: 'ref', label: 'ค่าอ้างอิง' },
            {
              key: 'flag', label: 'สถานะ', sortable: false,
              render: (r) => {
                const f = LAB_FLAG[r.flag] || LAB_FLAG.normal;
                return <ColorfulBadge style={f.style} size='small' hierarchy='secondary'>{f.label}</ColorfulBadge>;
              },
            },
          ]}
          rows={withKeys(support.labs, 'lab')}
          rowKey={(r) => r._rk}
          emptyMessage='ไม่มีผลตรวจทางห้องปฏิบัติการ'
        />
      </Block>

      <Block ref={(el) => { refs.current.imaging = el; }}>
        <TopicHeader icon='radiology'>ผลตรวจทางรังสีวิทยา</TopicHeader>
        <Table
          columns={[
            { key: 'date', label: 'วันที่ตรวจ', render: (r) => formatSwDate(r.date) },
            { key: 'test', label: 'รายการตรวจ', flex: true, minWidth: 220 },
            { key: 'result', label: 'ผลการอ่าน', flex: true, minWidth: 320 },
            {
              key: 'flag', label: 'สถานะ', sortable: false,
              render: (r) => {
                const f = LAB_FLAG[r.flag] || LAB_FLAG.normal;
                return <ColorfulBadge style={f.style} size='small' hierarchy='secondary'>{f.label}</ColorfulBadge>;
              },
            },
          ]}
          rows={withKeys(support.imaging, 'img')}
          rowKey={(r) => r._rk}
          emptyMessage='ไม่มีผลตรวจทางรังสีวิทยา'
        />
      </Block>
    </StepCard>
  );
};

/* ═══ Step 8 — คำสั่ง · e-Document · ส่งต่อ · นัดหมาย · สรุป ═══════ */
const STEP8_SECTIONS = [
  { key: 'orders', label: 'คำสั่งทางการแพทย์' },
  { key: 'documents', label: 'e-Document' },
  { key: 'refer', label: 'ส่งต่อ' },
  { key: 'appointment', label: 'นัดหมาย' },
  { key: 'summary', label: 'สรุปและบันทึก' },
];

export const SwStep8Closing = ({ form, setForm, swHn, cardPatient, registration, locked, saveLocked = locked, saved, onConfirmSave }) => {
  const { active, refs, jump } = useSectionJump('orders');
  const [uploadError, setUploadError] = useState('');
  const [docType, setDocType] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null);
  const [printTick, setPrintTick] = useState(0);

  const set = (key) => (value) => { if (!locked) setForm((f) => ({ ...f, [key]: value })); };
  const setAppt = (key) => (value) => {
    if (locked) return;
    setForm((f) => ({ ...f, appointment: { ...f.appointment, [key]: value } }));
  };

  const appt = form.appointment || {};
  const dateInPast = !!appt.date && appt.date < todayIso();
  const booked = !!appt.date && !appt.cancelled;

  const addDocument = (file) => {
    if (locked) return;
    const err = validateSwUpload(file.name, file.size);
    if (err) { setUploadError(err); return; }
    if (!docType) { setUploadError('กรุณาเลือกประเภทเอกสารก่อนแนบไฟล์'); return; }
    setUploadError('');
    setForm((f) => ({
      ...f,
      documents: [
        ...(f.documents || []),
        {
          id: `doc-${Date.now()}`,
          name: file.name,
          docType,
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          by: SW_CURRENT_USER,
          at: new Date().toISOString(),
        },
      ],
    }));
  };

  const confirmRemoveDoc = () => {
    setForm((f) => ({ ...f, documents: (f.documents || []).filter((d) => d.id !== removeTarget.id) }));
    setRemoveTarget(null);
  };

  const printLog = useMemo(() => getSwPrintLog(swHn), [swHn, printTick]);
  const doPrint = (type) => { logSwPrint(swHn, type); setPrintTick((t) => t + 1); };

  /* Validation — surfaced where the commit action lives; save is blocked
     while any error remains. */
  const validationErrors = useMemo(() => {
    const errs = [];
    if (!form.intakeChannel) errs.push('ยังไม่ได้เลือกการรับเรื่อง (ขั้นตอนที่ 1)');
    if (!form.targetGroup) errs.push('ยังไม่ได้เลือกกลุ่มเป้าหมาย (ขั้นตอนที่ 1)');
    if (!form.informant || !form.informantRelation) errs.push('ยังไม่ได้ระบุผู้ให้ข้อมูลและความเกี่ยวข้อง (ขั้นตอนที่ 1)');
    if (!form.serviceDate) errs.push('ยังไม่ได้ระบุวันที่ให้บริการ (ขั้นตอนที่ 1)');
    if (!form.worker) errs.push('ยังไม่ได้เลือกผู้ให้บริการ (ขั้นตอนที่ 1)');
    if (!form.primaryProblem) errs.push('ยังไม่ได้เลือกปัญหาหลัก (ขั้นตอนที่ 4)');
    if ((form.secondaryProblems || []).length > SW_MAX_SECONDARY_PROBLEMS) {
      errs.push(`ปัญหารองเกิน ${SW_MAX_SECONDARY_PROBLEMS} ข้อ (ขั้นตอนที่ 4)`);
    }
    if (!form.socialDiagnosis) errs.push('ยังไม่ได้บันทึกการวินิจฉัยทางสังคม (ขั้นตอนที่ 4)');
    if ((form.funds || []).some((f) => !(Number(f.amount) > 0))) errs.push('มีรายการเงินสนับสนุนที่จำนวนเงินไม่ถูกต้อง (ขั้นตอนที่ 5)');
    if (form.referralEnabled && !form.referralDestination) errs.push('เปิดการส่งต่อแล้ว แต่ยังไม่ได้เลือกหน่วยงานปลายทาง (ขั้นตอนที่ 8)');
    if (form.referralEnabled && !form.referralReason) errs.push('เปิดการส่งต่อแล้ว แต่ยังไม่ได้ระบุเหตุผลการส่งต่อ (ขั้นตอนที่ 8)');
    if (booked && dateInPast) errs.push('วันนัดหมายเป็นวันในอดีต (ขั้นตอนที่ 8)');
    if (form.terminated && !form.terminationReason) errs.push('ยุติการให้บริการแล้ว แต่ยังไม่ได้ระบุเหตุผล (ขั้นตอนที่ 6)');
    return errs;
  }, [form, booked, dateInPast]);

  const SummaryRow = ({ label, children }) => (
    <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      <span style={{ width: 200, flexShrink: 0, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>{label}</span>
      <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>{children}</span>
    </div>
  );

  const totalFunds = (form.funds || []).reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const chosenServices = SW_SERVICE_CATEGORIES
    .map((c) => ({ label: c.label, items: (form.services || {})[c.key] || [] }))
    .filter((c) => c.items.length > 0);

  return (
    <StepCard>
      <StepAuditBar locked={locked} terminated={form.terminated} />
      <CapsuleNav sections={STEP8_SECTIONS} active={active} onJump={jump} />

      <Popup
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title='ลบเอกสารแนบ'
        subtitle={removeTarget ? removeTarget.name : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setRemoveTarget(null) }}
        primaryAction={{ label: 'ยืนยันลบเอกสาร', onClick: confirmRemoveDoc, tone: 'danger' }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
          เอกสารที่ลบจะไม่ถูกแนบไปกับการบันทึกครั้งนี้ ต้องการลบใช่หรือไม่
        </span>
      </Popup>

      {/* ── คำสั่งทางการแพทย์ ─────────────────────────────────────── */}
      <Block ref={(el) => { refs.current.orders = el; }}>
        <TopicHeader
          icon='prescriptions'
          aside={<ColorfulBadge style='grey' size='small' hierarchy='secondary'>บันทึกเป็นข้อความ (CPOE เต็มรูปแบบอยู่ที่ระบบสั่งการรักษา)</ColorfulBadge>}
        >
          คำสั่งทางการแพทย์ที่เกี่ยวข้อง
        </TopicHeader>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.medicalOrders}
          onChange={(e) => set('medicalOrders')(e.target.value)}
          suggestions={SW_MEDICAL_ORDER_SUGGESTIONS}
          minChars={3}
          placeholder='คำสั่งของแพทย์/พยาบาลที่เกี่ยวข้องกับแผนการช่วยเหลือ เช่น การทำแผล การส่งกายภาพบำบัด'
        />
      </Block>

      {/* ── e-Document ────────────────────────────────────────────── */}
      <Block ref={(el) => { refs.current.documents = el; }}>
        <TopicHeader icon='attach_file'>เอกสารแนบ (e-Document)</TopicHeader>
        {!locked && (
          <div className='flex items-end w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <SwField label='ประเภทเอกสาร' required>
              <Select
                showLabel={false} searchable={false} size='lg'
                value={docType}
                onChange={(v) => { setDocType(v); setUploadError(''); }}
                options={SW_DOCUMENT_TYPES}
                placeholder='เลือกประเภทเอกสาร'
              />
            </SwField>
            <SwField label='ไฟล์แนบ'>
              <FileUploadField
                accept={SW_UPLOAD_ACCEPT}
                buttonLabel='แนบเอกสาร'
                helperText={`รองรับ ${SW_UPLOAD_ACCEPT} ขนาดไม่เกิน 10 MB`}
                onFile={addDocument}
              />
            </SwField>
          </div>
        )}
        {uploadError && <SwBanner tone='danger' icon='error'>{uploadError}</SwBanner>}
        <Table
          columns={[
            { key: 'docType', label: 'ประเภท', render: (r) => SW_DOCUMENT_TYPES.find((t) => t.value === r.docType)?.label || '—' },
            { key: 'name', label: 'ชื่อไฟล์', flex: true, minWidth: 260 },
            { key: 'sizeKb', label: 'ขนาด', align: 'right', render: (r) => `${r.sizeKb} KB` },
            { key: 'audit', label: 'ผู้แนบ', sortable: false, render: (r) => <SwAuditLine by={r.by} at={r.at} label='โดย' formatDateTime={formatSwDateTime} /> },
            {
              key: 'actions', label: '', sortable: false,
              render: (r) => (
                <DangerSubdueButton size='sm' leadingIcon='delete' disabled={locked} onClick={() => setRemoveTarget(r)}>ลบ</DangerSubdueButton>
              ),
            },
          ]}
          rows={form.documents || []}
          rowKey={(r) => r.id}
          emptyMessage='ยังไม่มีเอกสารแนบ'
        />
      </Block>

      {/* ── ส่งต่อ ────────────────────────────────────────────────── */}
      <Block ref={(el) => { refs.current.refer = el; }}>
        <TopicHeader icon='sync_alt'>การส่งต่อ</TopicHeader>
        <SelectableTag
          label='มีการส่งต่อผู้รับบริการ'
          size='lg'
          selected={!!form.referralEnabled}
          onClick={() => { if (!locked) set('referralEnabled')(!form.referralEnabled); }}
        />
        {form.referralEnabled && (
          <>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <SwField label='รูปแบบการส่งต่อ' required>
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  {SW_REFER_SCOPES.map((s) => (
                    <SelectableTag
                      key={s.value}
                      label={s.label}
                      size='md'
                      selected={form.referralScope === s.value}
                      onClick={() => set('referralScope')(s.value)}
                    />
                  ))}
                </div>
              </SwField>
              <SwField label='หน่วยงานปลายทาง' required>
                <Select
                  showLabel={false} searchable size='lg'
                  disabled={locked}
                  value={form.referralDestination}
                  onChange={set('referralDestination')}
                  options={SW_REFERRAL_DESTINATIONS}
                  placeholder='เลือกหน่วยงานปลายทาง'
                />
              </SwField>
            </div>
            <SuggestibleTextarea
              voice
              disabled={locked}
              value={form.referralReason}
              onChange={(e) => set('referralReason')(e.target.value)}
              suggestions={SW_REFER_SUGGESTIONS}
              minChars={3}
              rows={2}
              minHeight={64}
              placeholder='เหตุผลและรายละเอียดการส่งต่อ'
            />
          </>
        )}
      </Block>

      {/* ── นัดหมาย ───────────────────────────────────────────────── */}
      <Block ref={(el) => { refs.current.appointment = el; }}>
        <TopicHeader icon='event'>นัดหมายครั้งถัดไป</TopicHeader>
        {appt.cancelled ? (
          <div className='flex items-center gap-3 flex-wrap'>
            <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกนัดหมายแล้ว</ColorfulBadge>
            <BrandSubdueButton
              variant='outline' size='sm' leadingIcon='event_repeat'
              disabled={locked}
              onClick={() => set('appointment')({ date: '', time: '', type: '', note: '', cancelled: false })}
            >
              นัดหมายใหม่
            </BrandSubdueButton>
          </div>
        ) : (
          <>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <SwField label='ประเภทนัดหมาย'>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  disabled={locked}
                  value={appt.type}
                  onChange={setAppt('type')}
                  options={SW_APPOINTMENT_TYPES}
                  placeholder='เลือกประเภทนัดหมาย'
                />
              </SwField>
              <SwField
                label='วันนัดหมาย'
                hint={dateInPast ? 'วันที่นัดต้องไม่เป็นวันในอดีต' : undefined}
                hintTone={dateInPast ? 'error' : undefined}
              >
                <DatePicker
                  showLabel={false}
                  disabled={locked}
                  value={appt.date ? new Date(appt.date) : null}
                  onChange={(d) => setAppt('date')(d ? toLocalIso(d) : '')}
                  placeholder='เลือกวันที่'
                />
              </SwField>
              <SwField label='เวลานัด'>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  disabled={locked}
                  value={appt.time}
                  onChange={setAppt('time')}
                  options={SW_APPOINTMENT_TIMES.map((t) => ({ value: t, label: `${t} น.` }))}
                  placeholder='เลือกเวลา'
                />
              </SwField>
            </div>
            <SuggestibleTextarea
              voice
              disabled={locked}
              value={appt.note}
              onChange={(e) => setAppt('note')(e.target.value)}
              suggestions={[
                'นัดรับผ้าอ้อมรอบถัดไป',
                'นัดเยี่ยมบ้านเพื่อประเมินสภาพแวดล้อม',
                'นัดรับกายอุปกรณ์ โปรดนำบัตรประชาชนมาด้วย',
                'นัดประชุมครอบครัวเพื่อวางแผนการดูแล',
              ]}
              minChars={3}
              rows={2}
              minHeight={64}
              placeholder='หมายเหตุการนัดหมาย'
            />
            {booked && !dateInPast && (
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
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
                }}
              >
                <Icon name='event_available' size={20} />
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                  นัดแล้ว: {formatSwDate(appt.date)}{appt.time ? ` เวลา ${appt.time} น.` : ''}
                  {appt.type ? ` · ${resolveSwAppointmentType(appt.type)}` : ''}
                </span>
                <div className='flex-1' />
                <NeutralSubdueButton size='sm' leadingIcon='event_busy' disabled={locked} onClick={() => setAppt('cancelled')(true)}>
                  ยกเลิกนัด
                </NeutralSubdueButton>
              </div>
            )}
          </>
        )}
      </Block>

      {/* ── สรุป · พิมพ์ · ยืนยันบันทึก ────────────────────────────── */}
      <Block ref={(el) => { refs.current.summary = el; }}>
        {validationErrors.length > 0 && (
          <div
            className='flex flex-col w-full'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-danger-quaternary, #FFF0F0)',
            }}
          >
            <span className='flex items-center gap-2' style={{ color: 'var(--text-danger-default, #B91C1C)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>
              <Icon name='error' size={18} />
              ต้องแก้ไข {validationErrors.length} รายการก่อนบันทึก
            </span>
            {validationErrors.map((e) => (
              <span key={e} style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-danger-default, #B91C1C)' }}>• {e}</span>
            ))}
          </div>
        )}

        <TopicHeader icon='summarize'>สรุปแบบบันทึกผู้ใช้บริการสังคมสงเคราะห์ (สส.2)</TopicHeader>
        <div
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-300, 12px)',
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            paddingLeft: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
            borderRadius: 'var(--dim-radius-400, 12px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            background: 'var(--surface-card-100, #FFFFFF)',
          }}
        >
          <div className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={{ fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-brandPrimary-default, #007549)' }}>
              แบบ สส.2 — งานสังคมสงเคราะห์
            </span>
            <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
          </div>
          <SummaryRow label='ผู้รับบริการ'>{cardPatient?.fullName || '—'} · HN {swHn}</SummaryRow>
          <SummaryRow label='เลขที่สังคมสงเคราะห์'>{registration?.caseNo || 'ยังไม่ออกเลข CASE'}</SummaryRow>
          <SummaryRow label='การรับเรื่อง / กลุ่มเป้าหมาย'>
            {resolveSwIntakeChannel(form.intakeChannel)} · {resolveSwTargetGroup(form.targetGroup)} · {resolveSwClientType(form.clientType)}
          </SummaryRow>
          <SummaryRow label='ผู้ให้ข้อมูล'>
            {form.informant ? `${form.informant} (${resolveSwInformantRelation(form.informantRelation)})` : '—'}
          </SummaryRow>
          <SummaryRow label='วัน-เวลา / ผู้ให้บริการ'>
            {form.serviceDate ? formatSwDate(form.serviceDate) : '—'}{form.serviceTime ? ` ${form.serviceTime} น.` : ''} · {form.worker || '—'} · {resolveSwClinic(form.clinic)}
          </SummaryRow>
          <SummaryRow label='ปัญหาหลัก'>{form.primaryProblem ? resolveSwProblemLabel(form.primaryProblem) : '—'}</SummaryRow>
          <SummaryRow label='ปัญหารอง'>
            {(form.secondaryProblems || []).length > 0
              ? form.secondaryProblems.map((c) => resolveSwProblemLabel(c)).join(' · ')
              : '—'}
          </SummaryRow>
          <SummaryRow label='การวินิจฉัยทางสังคม'>{form.socialDiagnosis || '—'}</SummaryRow>
          <SummaryRow label='รายได้รวมของครอบครัว'>
            {(form.familyMembers || []).length > 0
              ? `${sumFamilyIncome(form.familyMembers).toLocaleString('th-TH')} บาท/เดือน (${form.familyMembers.length} คน)`
              : '—'}
          </SummaryRow>
          <SummaryRow label='เงินสนับสนุน'>
            {(form.funds || []).length > 0 ? `${form.funds.length} รายการ · รวม ${formatBaht(totalFunds)}` : 'ไม่มี'}
          </SummaryRow>
          <SummaryRow label='อุปกรณ์ / วัสดุที่ช่วยเหลือ'>
            {[
              (form.equipmentRequests || []).length > 0 ? `อุปกรณ์ ${form.equipmentRequests.length} รายการ` : null,
              (form.consumableRequests || []).length > 0 ? `เครื่องอุปโภคบริโภค ${form.consumableRequests.length} รายการ` : null,
            ].filter(Boolean).join(' · ') || 'ไม่มี'}
          </SummaryRow>
          <SummaryRow label='บริการอื่น'>
            {chosenServices.length > 0
              ? chosenServices.map((c) => `${c.label} (${c.items.length})`).join(' · ')
              : 'ไม่มี'}
          </SummaryRow>
          <SummaryRow label='การติดตาม'>
            {(form.followUps || []).length > 0 ? `${form.followUps.length} ครั้งในการให้บริการครั้งนี้` : 'ยังไม่มี'}
          </SummaryRow>
          <SummaryRow label='ส่งต่อ'>
            {form.referralEnabled
              ? `${resolveSwReferralDestination(form.referralDestination)}${form.referralReason ? ` — ${form.referralReason}` : ''}`
              : 'ไม่มีการส่งต่อ'}
          </SummaryRow>
          <SummaryRow label='นัดหมาย'>
            {appt.cancelled
              ? 'ยกเลิกนัดหมาย'
              : appt.date
                ? `${formatSwDate(appt.date)}${appt.time ? ` เวลา ${appt.time} น.` : ''}`
                : 'ไม่มีนัดหมาย'}
          </SummaryRow>
          <SummaryRow label='การยุติการให้บริการ'>
            {form.terminated ? `ยุติแล้ว ${formatSwDate(form.terminationDate)} — ${form.terminationReason}` : 'ยังให้บริการอยู่'}
          </SummaryRow>
          <SummaryRow label='เอกสารแนบ'>{(form.documents || []).length > 0 ? `${form.documents.length} ไฟล์` : 'ไม่มี'}</SummaryRow>
        </div>
      </Block>

      <Block>
        <TopicHeader icon='print'>พิมพ์เอกสาร</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          <BrandSubdueButton variant='outline' leadingIcon='print' onClick={() => doPrint('แบบบันทึก สส.2')}>
            พิมพ์แบบ สส.2
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='print' onClick={() => doPrint('ใบสรุปการช่วยเหลือ')}>
            พิมพ์ใบสรุปการช่วยเหลือ
          </BrandSubdueButton>
        </div>
        {printLog.length > 0 && (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            {printLog.map((e, i) => (
              <span key={`${e.at}-${i}`} style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                พิมพ์{e.docType} โดย {e.by} · {formatSwDateTime(e.at)}
              </span>
            ))}
          </div>
        )}
      </Block>

      <Block>
        <TopicHeader icon='check-circle'>ยืนยันการบันทึก</TopicHeader>
        {saved ? (
          <div className='flex items-center gap-2' style={{ color: 'var(--text-brandPrimary-default, #007549)', fontSize: 'var(--type-size-sm)' }}>
            <Icon name='check-circle' size={18} />
            บันทึกแบบ สส.2 เรียบร้อยแล้ว · ผู้บันทึก {SW_CURRENT_USER} — กด "จบการบันทึก" ด้านล่างเพื่อกลับหน้าคิว
          </div>
        ) : (
          /* ปุ่มยืนยันใช้ `saveLocked` (ไม่รวม terminated) — หลังยืนยันยุติบริการ
             ยังต้องกดบันทึก สส.2 ได้ โดย validation ด้านบนบังคับเหตุผลการยุติแล้ว */
          <BrandButton
            size='lg'
            leadingIcon='save'
            disabled={validationErrors.length > 0 || saveLocked}
            onClick={() => { if (validationErrors.length === 0 && !saveLocked) onConfirmSave(); }}
          >
            ยืนยันบันทึกแบบ สส.2
          </BrandButton>
        )}
      </Block>
    </StepCard>
  );
};

export const SW_STEP_RENDERERS = [
  SwStep1General,
  SwStep2Vitals,
  SwStep3History,
  SwStep4Problems,
  SwStep5Services,
  SwStep6FollowUp,
  SwStep7Supporting,
  SwStep8Closing,
];

export const SW_STEPS = [
  { title: 'ข้อมูลทั่วไป', subtitle: 'General Information' },
  { title: 'Vital Signs / Nurse Note', subtitle: 'Vitals & Nursing Note' },
  { title: 'ประวัติและครอบครัว', subtitle: 'Social & Family History' },
  { title: 'ปัญหาและการวินิจฉัย', subtitle: 'Problems & Social Diagnosis' },
  { title: 'บริการและการช่วยเหลือ', subtitle: 'Services & Assistance' },
  { title: 'ติดตามการช่วยเหลือ', subtitle: 'Follow-up & Termination' },
  { title: 'ข้อมูลประกอบการวินิจฉัย', subtitle: 'Supporting Data' },
  { title: 'คำสั่ง เอกสาร ส่งต่อ นัดหมาย', subtitle: 'Orders · Documents · Refer · Appointment' },
];

/* รายการวัสดุทั้งหมด — export ต่อให้หน้าอื่นใช้ตรวจสอบชื่อรายการได้ */
export const SW_ALL_MATERIALS = SW_MATERIALS;
