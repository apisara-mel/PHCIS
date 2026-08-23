import React, { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import TabCapsule from '@/components/tab/TabCapsule';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import GrowthPercentileChart from '@/pages/clinic/immunization/GrowthPercentileChart';
import {
  ALERT_LEVELS, DEV_RESULTS, EPI_SCHEDULE, HEIGHT_FOR_AGE_REF, REFERRAL_TARGETS,
  WEIGHT_FOR_AGE_REF,
  addDevelopmentRecord, addGrowthRecord, addReferral, ageMonthsAt, cancelReferral,
  childFullName, devResultMeta, formatAgeMonths, formatShDate, getChildAlerts,
  getDaycareChild, getDevelopmentRecords, getGrowthRecords, getReferrals,
  getVaccineRecord, growthChartPoints, interpretGrowth, resolveDaycareCenter,
  roomLabel, setVaccineDate, todayIso,
} from '@/data/daycareCore';
import {
  EmptyState, Field, FieldRow, NoticeBar, ReadField, SectionHeader, SubCard,
} from '@/pages/clinic/school-health/schoolHealthShared';

/* DaycareChildPage — แฟ้มสุขภาพเด็กรายคนในสถานรับเลี้ยง

   ครอบ TOR §3.5.2 (ชั่งน้ำหนัก-วัดส่วนสูง) · §3.5.3 (กราฟการเจริญเติบโต) ·
   §3.5.6 (ส่งต่อเข้ารับบริการที่ ศบส. เชื่อม PHCIS) และมติ คทง.5 ครั้งที่ 4
   เรื่องประเมินพัฒนาการ 2 ครั้ง + ส่งต่อเมื่อผลเป็น "ล่าช้า"

   แท็บเรียงตามลำดับที่เจ้าหน้าที่ทำจริง: เห็นกิจกรรมค้างก่อน → ชั่ง/วัด →
   ประเมินพัฒนาการ → วัคซีน → ส่งต่อ                                        */

const TABS = [
  { key: 'overview',    label: 'ภาพรวม / กิจกรรมค้าง' },
  { key: 'growth',      label: 'โภชนาการและการเจริญเติบโต' },
  { key: 'development', label: 'พัฒนาการ (DSPM)' },
  { key: 'vaccine',     label: 'วัคซีน' },
  { key: 'referral',    label: 'ส่งต่อ ศบส.' },
];

const DEV_NOTE_SUGGESTIONS = [
  'พัฒนาการครบทั้ง 5 ด้าน สมวัยตามเกณฑ์',
  'ด้านภาษาช้ากว่าเกณฑ์ — แนะนำผู้ปกครองกระตุ้นที่บ้าน',
  'ด้านกล้ามเนื้อมัดเล็กยังทำไม่ได้ตามช่วงอายุ',
  'ด้านสังคมและการช่วยเหลือตนเองสมวัย',
];

const REFERRAL_REASON_SUGGESTIONS = [
  'ผลประเมินพัฒนาการเป็นล่าช้า — ขอส่งต่อคลินิกกระตุ้นพัฒนาการ',
  'พบฟันผุหลายซี่ระหว่างตรวจสุขภาพช่องปาก',
  'ภาวะโภชนาการต่ำกว่าเกณฑ์ต่อเนื่อง 2 รอบ',
  'วัคซีนไม่ครบตามเกณฑ์อายุ ขอส่งต่อคลินิกเด็กดี',
];

const DaycareChildPage = () => {
  const history = useHistory();
  const { childId } = useParams();
  const [tab, setTab] = useState('overview');
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState('');

  const [growthDraft, setGrowthDraft] = useState(null);
  const [devDraft, setDevDraft] = useState(null);
  const [referralDraft, setReferralDraft] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const child = useMemo(() => getDaycareChild(childId), [childId, tick]);
  const alerts = useMemo(() => (child ? getChildAlerts(child) : []), [child, tick]);
  const growthRows = useMemo(() => (child ? getGrowthRecords(child.id) : []), [child, tick]);
  const devRows = useMemo(() => (child ? getDevelopmentRecords(child.id) : []), [child, tick]);
  const vaccine = useMemo(() => (child ? getVaccineRecord(child.id) : {}), [child, tick]);
  const referrals = useMemo(() => (child ? getReferrals(child.id) : []), [child, tick]);

  const latestGrowth = growthRows[0];
  const latestInterpretation = latestGrowth
    ? interpretGrowth({ ...latestGrowth, birthDate: child?.birthDate })
    : null;

  if (!child) {
    return (
      <QueuePageShell activeKey='daycare' breadcrumb={['สถานรับเลี้ยงเด็กกลางวัน', 'แฟ้มเด็ก']} title='ไม่พบข้อมูลเด็ก'>
        <div style={{ padding: 'var(--dim-space-600)' }}>
          <EmptyState icon='person_off' title='ไม่พบเด็กรายนี้ในทะเบียน' subtitle='อาจถูกจำหน่ายออกไปแล้ว หรือลิงก์ไม่ถูกต้อง' />
        </div>
      </QueuePageShell>
    );
  }

  const saveGrowth = () => {
    const interpreted = interpretGrowth({ ...growthDraft, birthDate: child.birthDate });
    addGrowthRecord(child.id, { ...growthDraft, band: interpreted?.band || null });
    setGrowthDraft(null);
    setTick((t) => t + 1);
    setToast(interpreted
      ? `บันทึกแล้ว — แปลผลอัตโนมัติ: ${interpreted.label}`
      : 'บันทึกการชั่งน้ำหนัก/วัดส่วนสูงแล้ว');
  };

  const saveDevelopment = () => {
    const saved = addDevelopmentRecord(child.id, {
      ...devDraft,
      ageMonths: ageMonthsAt(child.birthDate, devDraft.assessedAt),
    });
    setDevDraft(null);
    setTick((t) => t + 1);
    setToast(saved.result === 'suspect'
      ? `บันทึกแล้ว — ระบบนัดประเมินครั้งที่ ${saved.round + 1} อัตโนมัติวันที่ ${formatShDate(saved.followUpDue)} (มติ คทง.5)`
      : saved.result === 'delayed'
        ? 'บันทึกแล้ว — ผลเป็น "ล่าช้า" ให้ส่งต่อคลินิกกระตุ้นพัฒนาการ/สุขภาพจิตที่แท็บ “ส่งต่อ ศบส.”'
        : 'บันทึกผลประเมินพัฒนาการแล้ว');
  };

  const headerBadges = (
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      <ColorfulBadge style='indigo' size='small' hierarchy='secondary' width='hug'>{formatAgeMonths(child.birthDate)}</ColorfulBadge>
      <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug'>{roomLabel(child.room)}</ColorfulBadge>
      {latestInterpretation && (
        <ColorfulBadge style={latestInterpretation.style} size='small' hierarchy='secondary' width='hug'>
          {latestInterpretation.label}
        </ColorfulBadge>
      )}
      {alerts.length > 0 && (
        <ColorfulBadge style={ALERT_LEVELS[alerts[0].level].style} size='small' hierarchy='secondary' width='hug'>
          {`กิจกรรมค้าง ${alerts.length} รายการ`}
        </ColorfulBadge>
      )}
    </div>
  );

  return (
    <QueuePageShell
      activeKey='daycare'
      breadcrumb={['สถานรับเลี้ยงเด็กกลางวัน', 'แฟ้มเด็ก', childFullName(child)]}
      title={childFullName(child)}
      actions={(
        <NeutralSubdueButton size='sm' leadingIcon='arrow_back' onClick={() => history.push('/clinic/daycare')}>
          กลับหน้าเด็กในความดูแล
        </NeutralSubdueButton>
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
        <SubCard>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            {headerBadges}
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-500)' }}>
              <ReadField label='เลขบัตรประชาชน' value={child.nationalId} />
              <ReadField label='วันเกิด' value={formatShDate(child.birthDate)} />
              <ReadField label='สถานรับเลี้ยง' value={resolveDaycareCenter(child.centerId)} minWidth={240} />
              <ReadField label='ผู้ปกครอง' value={`${child.guardianName || '—'} (${child.guardianRelation || '—'})`} minWidth={240} />
              <ReadField label='เบอร์ติดต่อ' value={child.guardianPhone} />
              <ReadField label='โรคประจำตัว' value={child.congenital || '—'} />
              <ReadField label='ประวัติการแพ้' value={child.allergies || '—'} />
            </div>
          </div>
        </SubCard>

        <TabCapsule
          tabs={TABS.map((t) => ({ key: t.key, label: t.label }))}
          activeKey={tab}
          onChange={setTab}
        />

        {tab === 'overview' && (
          <SubCard>
            <SectionHeader icon='notifications_active' title='กิจกรรมที่ต้องดำเนินการ' subtitle='แจ้งเตือนล่วงหน้า 1 สัปดาห์ · เกินกำหนดแล้วจะค้างไว้จนกว่าจะบันทึกจริง (มติ คทง.5)' />
            {alerts.length === 0 ? (
              <EmptyState icon='task_alt' title='ไม่มีกิจกรรมค้าง' subtitle='กิจกรรมตามอายุของเด็กรายนี้ครบตามกำหนดแล้ว' />
            ) : (
              <Table
                columns={[
                  { key: 'kindLabel', label: 'กิจกรรม', flex: true, minWidth: 220 },
                  { key: 'dueIso', label: 'กำหนด', width: 130, render: (r) => formatShDate(r.dueIso) },
                  {
                    key: 'level', label: 'สถานะ', width: 140,
                    render: (r) => (
                      <ColorfulBadge style={ALERT_LEVELS[r.level].style} size='small' hierarchy='secondary' width='hug'>
                        {ALERT_LEVELS[r.level].label}
                      </ColorfulBadge>
                    ),
                  },
                  { key: 'detail', label: 'รายละเอียด', flex: true, minWidth: 300 },
                ]}
                rows={alerts}
                rowKey={(r) => r.key}
                emptyMessage='ไม่มีกิจกรรมค้าง'
              />
            )}
          </SubCard>
        )}

        {tab === 'growth' && (
          <>
            <SubCard>
              <SectionHeader
                icon='monitor_weight'
                title='ชั่งน้ำหนัก / วัดส่วนสูง'
                subtitle='ที่ประชุม คทง.5 กำหนดให้ชั่ง-วัดทุก 3 เดือน และให้ระบบแปลผลภาวะโภชนาการอัตโนมัติ'
                trailing={(
                  <BrandSubdueButton
                    size='sm' variant='fill' leadingIcon='add'
                    onClick={() => setGrowthDraft({ measuredAt: todayIso(), weightKg: '', heightCm: '' })}
                  >
                    บันทึกการชั่ง/วัด
                  </BrandSubdueButton>
                )}
              />
              {latestInterpretation && (
                <NoticeBar tone={latestInterpretation.offTarget ? 'warning' : 'info'} icon='insights'>
                  {`ผลล่าสุด: ${latestInterpretation.label} — ${latestInterpretation.note}`}
                </NoticeBar>
              )}
              <Table
                columns={[
                  { key: 'measuredAt', label: 'วันที่', width: 130, render: (r) => formatShDate(r.measuredAt) },
                  { key: 'ageAt', label: 'อายุขณะวัด', width: 130, render: (r) => formatAgeMonths(child.birthDate, r.measuredAt) },
                  { key: 'weightKg', label: 'น้ำหนัก (กก.)', width: 130 },
                  { key: 'heightCm', label: 'ส่วนสูง (ซม.)', width: 130 },
                  {
                    key: 'band', label: 'แปลผล', flex: true, minWidth: 180,
                    render: (r) => {
                      const res = interpretGrowth({ ...r, birthDate: child.birthDate });
                      return res
                        ? <ColorfulBadge style={res.style} size='small' hierarchy='secondary' width='hug'>{res.label}</ColorfulBadge>
                        : '—';
                    },
                  },
                  { key: 'by', label: 'ผู้บันทึก', flex: true, minWidth: 180 },
                ]}
                rows={growthRows}
                rowKey={(r) => r.id}
                emptyMessage='ยังไม่มีบันทึกการชั่งน้ำหนัก/วัดส่วนสูง'
              />
            </SubCard>

            <SubCard>
              <SectionHeader icon='show_chart' title='กราฟการเจริญเติบโต (§3.5.3)' subtitle='เกณฑ์อ้างอิงทรง WHO 0–5 ปี — ต้องแทนด้วยตาราง LMS จริงก่อน production' />
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
                <GrowthPercentileChart
                  title='น้ำหนักตามอายุ (Weight for Age)'
                  unit='กก.'
                  axisLabel='อายุ (เดือน)'
                  reference={WEIGHT_FOR_AGE_REF}
                  points={growthChartPoints(child, 'weightKg')}
                />
                <GrowthPercentileChart
                  title='ส่วนสูงตามอายุ (Height for Age)'
                  unit='ซม.'
                  axisLabel='อายุ (เดือน)'
                  reference={HEIGHT_FOR_AGE_REF}
                  points={growthChartPoints(child, 'heightCm')}
                />
              </div>
            </SubCard>
          </>
        )}

        {tab === 'development' && (
          <SubCard>
            <SectionHeader
              icon='child_care'
              title='ประเมินพัฒนาการ (DSPM)'
              subtitle='มติ คทง.5 ครั้งที่ 4 — ประเมิน 2 ครั้ง: ผล “สงสัยล่าช้า” ระบบนัดครั้งที่ 2 ให้เอง (+1 เดือน) · ผล “ล่าช้า” ให้ส่งต่อคลินิกกระตุ้นพัฒนาการ/สุขภาพจิต'
              trailing={(
                <BrandSubdueButton
                  size='sm' variant='fill' leadingIcon='add'
                  onClick={() => setDevDraft({ assessedAt: todayIso(), result: 'normal', note: '' })}
                >
                  บันทึกผลประเมิน
                </BrandSubdueButton>
              )}
            />
            <Table
              columns={[
                { key: 'round', label: 'ครั้งที่', width: 90 },
                { key: 'assessedAt', label: 'วันที่ประเมิน', width: 140, render: (r) => formatShDate(r.assessedAt) },
                { key: 'ageMonths', label: 'อายุ (เดือน)', width: 120 },
                {
                  key: 'result', label: 'ผลประเมิน', width: 150,
                  render: (r) => {
                    const meta = devResultMeta(r.result);
                    return meta
                      ? <ColorfulBadge style={meta.style} size='small' hierarchy='secondary' width='hug'>{meta.label}</ColorfulBadge>
                      : r.result;
                  },
                },
                {
                  key: 'followUpDue', label: 'นัดประเมินซ้ำ', width: 150,
                  render: (r) => (r.followUpDue ? formatShDate(r.followUpDue) : '—'),
                },
                { key: 'note', label: 'บันทึกผู้ประเมิน', flex: true, minWidth: 260 },
                { key: 'by', label: 'ผู้ประเมิน', flex: true, minWidth: 170 },
              ]}
              rows={devRows}
              rowKey={(r) => r.id}
              emptyMessage='ยังไม่มีผลการประเมินพัฒนาการ'
            />
            {devRows.some((d) => d.result === 'delayed') && (
              <NoticeBar
                tone='warning'
                icon='forward_to_inbox'
                trailing={(
                  <BrandSubdueButton
                    size='sm' variant='fill' leadingIcon='send'
                    onClick={() => setReferralDraft({
                      target: '/clinic/mental-health',
                      reason: 'ผลประเมินพัฒนาการเป็นล่าช้า — ขอส่งต่อคลินิกกระตุ้นพัฒนาการ',
                    })}
                  >
                    ส่งต่อคลินิกกระตุ้นพัฒนาการ
                  </BrandSubdueButton>
                )}
              >
                มีผลประเมินเป็น “ล่าช้า” — ตามมติ คทง.5 ต้องส่งต่อคลินิกกระตุ้นพัฒนาการหรืองานสุขภาพจิต
              </NoticeBar>
            )}
          </SubCard>
        )}

        {tab === 'vaccine' && (
          <SubCard>
            <SectionHeader
              icon='vaccines'
              title='ประวัติการได้รับวัคซีนตามเกณฑ์อายุ (EPI)'
              subtitle='มติ คทง.5 ครั้งที่ 5 — ช่องที่ยังไม่มีวันฉีดจะขึ้นสีเตือน และแจ้งเตือนล่วงหน้า 1 สัปดาห์ก่อนถึงกำหนดตามอายุ'
            />
            <Table
              columns={[
                { key: 'label', label: 'วัคซีน', flex: true, minWidth: 200 },
                { key: 'dueMonths', label: 'กำหนดตามอายุ (เดือน)', width: 180 },
                {
                  key: 'given', label: 'วันที่ฉีด', flex: true, minWidth: 200,
                  render: (r) => (r.given
                    ? formatShDate(r.given)
                    : <ColorfulBadge style='orange' size='small' hierarchy='secondary' width='hug'>ยังไม่มีบันทึก</ColorfulBadge>),
                },
                {
                  key: 'action', label: 'การดำเนินการ', width: 190, sortable: false,
                  render: (r) => (
                    <DatePicker
                      value={r.given || ''}
                      onChange={(v) => { setVaccineDate(child.id, r.key, v); setTick((t) => t + 1); setToast(`บันทึกวันฉีด ${r.label} แล้ว`); }}
                    />
                  ),
                },
              ]}
              rows={EPI_SCHEDULE.map((v) => ({ ...v, id: v.key, given: vaccine[v.key] || '' }))}
              rowKey={(r) => r.key}
              emptyMessage='ไม่มีตารางวัคซีน'
            />
          </SubCard>
        )}

        {tab === 'referral' && (
          <SubCard>
            <SectionHeader
              icon='forward_to_inbox'
              title='ส่งต่อเข้ารับบริการที่ศูนย์บริการสาธารณสุข (§3.5.6)'
              subtitle='ส่งต่อเป็นคำขอเข้าคิวของคลินิกปลายทาง — พยาบาลสถานรับเลี้ยงไม่ได้เปิด Visit เอง'
              trailing={(
                <BrandSubdueButton
                  size='sm' variant='fill' leadingIcon='send'
                  onClick={() => setReferralDraft({ target: REFERRAL_TARGETS[0].value, reason: '' })}
                >
                  ส่งต่อ ศบส.
                </BrandSubdueButton>
              )}
            />
            <Table
              columns={[
                { key: 'targetLabel', label: 'ปลายทาง', flex: true, minWidth: 260 },
                { key: 'reason', label: 'เหตุผล', flex: true, minWidth: 300 },
                { key: 'at', label: 'วัน-เวลาที่ส่ง', flex: true, minWidth: 180 },
                { key: 'by', label: 'ผู้ส่งต่อ', flex: true, minWidth: 170 },
                {
                  key: 'status', label: 'สถานะ', width: 140,
                  render: (r) => (r.status === 'cancelled'
                    ? <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>ยกเลิกแล้ว</ColorfulBadge>
                    : <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>ส่งต่อแล้ว</ColorfulBadge>),
                },
                {
                  key: 'actions', label: 'การดำเนินการ', width: 160, sortable: false,
                  render: (r) => (r.status === 'cancelled' ? '—' : (
                    <DangerSubdueButton size='sm' leadingIcon='close' onClick={() => { setCancelTarget(r); setCancelReason(''); }}>
                      ยกเลิกส่งต่อ
                    </DangerSubdueButton>
                  )),
                },
              ]}
              rows={referrals}
              rowKey={(r) => r.id}
              emptyMessage='ยังไม่มีการส่งต่อ'
            />
          </SubCard>
        )}
      </div>

      {/* บันทึกการชั่ง/วัด */}
      <Popup
        open={!!growthDraft}
        onClose={() => setGrowthDraft(null)}
        title='บันทึกการชั่งน้ำหนัก / วัดส่วนสูง'
        subtitle={`${childFullName(child)} · ${roomLabel(child.room)}`}
        primaryAction={{
          label: 'บันทึก',
          onClick: saveGrowth,
          disabled: !growthDraft?.weightKg || !growthDraft?.heightCm || !growthDraft?.measuredAt,
        }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setGrowthDraft(null) }}
      >
        {growthDraft && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <FieldRow>
              <Field label='วันที่วัด' required>
                <DatePicker value={growthDraft.measuredAt} onChange={(v) => setGrowthDraft((d) => ({ ...d, measuredAt: v }))} />
              </Field>
              <Field label='น้ำหนัก (กก.)' required>
                <InputField
                  type='number'
                  value={growthDraft.weightKg}
                  onChange={(v) => setGrowthDraft((d) => ({ ...d, weightKg: v?.target ? v.target.value : v }))}
                  placeholder='เช่น 12.4'
                />
              </Field>
              <Field label='ส่วนสูง (ซม.)' required>
                <InputField
                  type='number'
                  value={growthDraft.heightCm}
                  onChange={(v) => setGrowthDraft((d) => ({ ...d, heightCm: v?.target ? v.target.value : v }))}
                  placeholder='เช่น 92'
                />
              </Field>
            </FieldRow>
            {(() => {
              const preview = interpretGrowth({ ...growthDraft, birthDate: child.birthDate });
              return preview ? (
                <NoticeBar tone={preview.offTarget ? 'warning' : 'info'} icon='insights'>
                  {`แปลผลอัตโนมัติ: ${preview.label} — ${preview.note}`}
                </NoticeBar>
              ) : null;
            })()}
          </div>
        )}
      </Popup>

      {/* บันทึกผลประเมินพัฒนาการ */}
      <Popup
        open={!!devDraft}
        onClose={() => setDevDraft(null)}
        size='large'
        title={`บันทึกผลประเมินพัฒนาการ ครั้งที่ ${devRows.length + 1}`}
        subtitle='ผล “สงสัยล่าช้า” ระบบจะนัดประเมินครั้งถัดไปให้อัตโนมัติ 1 เดือน (มติ คทง.5 ครั้งที่ 4)'
        primaryAction={{ label: 'บันทึก', onClick: saveDevelopment, disabled: !devDraft?.assessedAt }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setDevDraft(null) }}
      >
        {devDraft && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <FieldRow>
              <Field label='วันที่ประเมิน' required>
                <DatePicker value={devDraft.assessedAt} onChange={(v) => setDevDraft((d) => ({ ...d, assessedAt: v }))} />
              </Field>
              <Field label='ผลการประเมิน' required>
                <Select
                  value={devDraft.result}
                  onChange={(v) => setDevDraft((d) => ({ ...d, result: v }))}
                  options={DEV_RESULTS}
                />
              </Field>
            </FieldRow>
            <SuggestibleTextarea
              label='บันทึกผู้ประเมิน'
              value={devDraft.note}
              onChange={(v) => setDevDraft((d) => ({ ...d, note: v }))}
              suggestions={DEV_NOTE_SUGGESTIONS}
              minChars={2}
              rows={3}
              voice
              placeholder='ระบุด้านที่ผิดปกติและคำแนะนำที่ให้ผู้ปกครอง'
            />
          </div>
        )}
      </Popup>

      {/* ส่งต่อ ศบส. */}
      <Popup
        open={!!referralDraft}
        onClose={() => setReferralDraft(null)}
        size='large'
        title='ส่งต่อเข้ารับบริการที่ศูนย์บริการสาธารณสุข'
        subtitle={`${childFullName(child)} — คำขอนี้จะไปแสดงที่คิวของคลินิกปลายทาง`}
        primaryAction={{
          label: 'ส่งต่อ',
          onClick: () => {
            addReferral(child.id, referralDraft);
            setReferralDraft(null);
            setTick((t) => t + 1);
            setTab('referral');
            setToast('ส่งต่อเข้ารับบริการที่ ศบส. แล้ว');
          },
          disabled: !referralDraft?.reason?.trim(),
        }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setReferralDraft(null) }}
      >
        {referralDraft && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <Field label='คลินิกปลายทาง' flex='1 1 100%'>
              <Select
                value={referralDraft.target}
                onChange={(v) => setReferralDraft((d) => ({ ...d, target: v }))}
                options={REFERRAL_TARGETS}
              />
            </Field>
            <SuggestibleTextarea
              label='เหตุผลการส่งต่อ'
              required
              value={referralDraft.reason}
              onChange={(v) => setReferralDraft((d) => ({ ...d, reason: v }))}
              suggestions={REFERRAL_REASON_SUGGESTIONS}
              minChars={2}
              rows={3}
              voice
              placeholder='ระบุสิ่งที่พบและเหตุผลที่ต้องส่งต่อ'
            />
          </div>
        )}
      </Popup>

      {/* ยกเลิกการส่งต่อ */}
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกการส่งต่อ'
        subtitle={cancelTarget?.targetLabel}
        primaryAction={{
          label: 'ยืนยันยกเลิก',
          onClick: () => {
            cancelReferral(child.id, cancelTarget.id, cancelReason);
            setCancelTarget(null);
            setTick((t) => t + 1);
            setToast('ยกเลิกการส่งต่อแล้ว');
          },
          disabled: !cancelReason.trim(),
        }}
        secondaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
      >
        <SuggestibleTextarea
          label='เหตุผลการยกเลิก'
          required
          value={cancelReason}
          onChange={setCancelReason}
          suggestions={['ผู้ปกครองขอเลื่อน', 'ส่งต่อผิดคลินิก', 'เด็กได้รับบริการที่อื่นแล้ว']}
          minChars={2}
          rows={3}
          voice
        />
      </Popup>

      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />
    </QueuePageShell>
  );
};

export default DaycareChildPage;
