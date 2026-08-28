import React, { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PatientCard from '@/components/card/PatientCard';
import Icon from '@/components/icons/Icon';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import Textarea from '@/components/forms/Textarea';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import InternalReferPopup from '@/components/popup/InternalReferPopup';
import SuccessToast from '@/components/toast/SuccessToast';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import {
  hasSchoolHealthRights, setSchoolHealthRights, formatShDate, formatShDateTime,
  formatAgeYears, todayIso, SH_CENTER, STUDENT_STATUS,
} from '@/data/schoolHealthCore';
import {
  getStudentById, rightLabel, rightStyle, guardianRelationLabel,
} from '@/data/schoolHealthStudents';
import {
  buildAiHealthProblems, getReferrals, referStudent, cancelReferral, hasOpenReferral,
  logPrint, getPrintLog, getMissingVaccines, getLatestService, serviceTypeLabel,
} from '@/data/schoolHealthServices';
import { nutritionBand } from '@/data/schoolHealthGrowthRef';
import SCHOOL_HEALTH_TABS from '@/pages/clinic/school-health/SchoolHealthSteps';
import {
  PageBody, PageCard, SubCard, SectionHeader, NoticeBar, EmptyState,
  ReadField, AuditLine, ReadOnlyBanner,
} from '@/pages/clinic/school-health/schoolHealthShared';

/* StudentHealthProfilePage — หน้าหลักข้อมูลนักเรียน + Tabs 6 บริการ
   (TOR §3.3.2, §3.3.3, §3.3.5–3.3.8, §3.4.1, §3.4.2, §3.4.4 · มติ คทง.5)

   โครงหน้า:
     · SubHeader + PatientCard (ข้อมูลทั่วไป · สิทธิพื้นฐานด้านสุขภาพ 3.3.2 ·
       แพ้ยา · โรคประจำตัว · โรงเรียน-ชั้น-ห้อง-ครูประจำชั้น)
     · แผงสรุปปัญหาสุขภาพจากประวัติ (3.3.3) — rule-based ในต้นแบบนี้
     · Tabs 6 บริการ (SchoolHealthSteps.jsx) แต่ละแท็บมีฟอร์มบันทึก +
       ประวัติย้อนหลังพร้อมผล/วันที่/ผู้บันทึก และครบ แสดง-บันทึก-แก้ไข-ยกเลิก
     · ปุ่มส่งต่อเข้ารับบริการที่ศูนย์ฯ ผ่าน PHCIS (3.4.4) + พิมพ์บัตรสรุปสุขภาพ */

const breadcrumb = ['บันทึกการรักษา', 'งานอนามัยโรงเรียน', 'ข้อมูลสุขภาพนักเรียน'];

const TONE_ICON_COLOR = {
  danger: 'var(--text-alert-error, #B91C1C)',
  warning: 'var(--text-alert-warning, #C2410C)',
  info: 'var(--text-alert-info, #1D4ED8)',
};

const AiProblemPanel = ({ problems, onRefer }) => (
  <PageCard gap='var(--dim-space-400, 16px)'>
    <SectionHeader
      icon='neurology'
      title='สรุปปัญหาสุขภาพจากประวัติ (ผู้ช่วยอัจฉริยะ)'
      subtitle='ประมวลจากผลตรวจสุขภาพ ทันตกรรม วัคซีน พัฒนาการ และสุขภาพจิตล่าสุดของนักเรียนคนนี้ (TOR 3.3.3)'
      trailing={(
        <NeutralSubdueButton size='sm' leadingIcon='send' onClick={onRefer}>
          ส่งต่อเข้ารับบริการที่ศูนย์ฯ
        </NeutralSubdueButton>
      )}
    />
    {problems.length === 0 ? (
      <NoticeBar tone='brand' icon='check_circle'>
        ไม่พบปัญหาสุขภาพที่ต้องติดตามจากประวัติล่าสุด — ผลตรวจอยู่ในเกณฑ์และได้รับวัคซีนครบตามระดับชั้น
      </NoticeBar>
    ) : (
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        {problems.map((p) => (
          <SubCard key={p.key}>
            <div className='flex items-start w-full min-w-0' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <span className='shrink-0' style={{ color: TONE_ICON_COLOR[p.tone] || TONE_ICON_COLOR.info }}>
                <Icon name={p.icon} size={22} />
              </span>
              <div className='flex flex-col min-w-0 flex-1' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <span style={{ color: 'var(--text-content-default, #363B3F)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm, 14px)' }}>
                  {p.title}
                </span>
                <span style={{ color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', lineHeight: 1.5 }}>
                  {p.detail}
                </span>
                <AuditLine icon='arrow_forward'>{p.action}</AuditLine>
              </div>
            </div>
          </SubCard>
        ))}
      </div>
    )}
    <AuditLine icon='info'>
      ต้นแบบนี้ใช้กฎเกณฑ์ (rule-based) จากผลตรวจที่บันทึกไว้ — ยังไม่ใช่โมเดล AI จริง จึงรายงานสถานะเป็น partial ใน TOR 3.3.3
    </AuditLine>
  </PageCard>
);

const StudentHealthProfilePage = () => {
  const history = useHistory();
  const { studentId } = useParams();
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState('checkup');
  const [toast, setToast] = useState('');
  const [referOpen, setReferOpen] = useState(false);
  const [cancelReferTarget, setCancelReferTarget] = useState(null);
  const [cancelReferReason, setCancelReferReason] = useState('');
  const [cancelReferError, setCancelReferError] = useState('');
  const [printOpen, setPrintOpen] = useState(false);

  const canWrite = hasSchoolHealthRights();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const student = useMemo(() => getStudentById(studentId), [studentId, tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const problems = useMemo(() => (student ? buildAiHealthProblems(student) : []), [student, tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const referrals = useMemo(() => (student ? getReferrals(student.id) : []), [student, tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const printLog = useMemo(() => (student ? getPrintLog(student.id) : []), [student, tick]);

  const onChanged = (message) => { setTick((t) => t + 1); setToast(message); };

  if (!student) {
    return (
      <QueuePageShell
        activeKey='school-health'
        breadcrumb={breadcrumb}
        title='ข้อมูลสุขภาพนักเรียน'
        onBack={() => history.push('/clinic/school-health/students')}
        backLabel='กลับทะเบียนนักเรียน'
      >
        <PageBody>
          <PageCard>
            <EmptyState
              icon='person_search'
              title='ไม่พบข้อมูลนักเรียนรายนี้'
              subtitle='นักเรียนอาจถูกจำหน่ายออกจากทะเบียน หรือลิงก์ที่ใช้ไม่ถูกต้อง — กลับไปเลือกนักเรียนจากทะเบียนอีกครั้ง'
              actionLabel='ไปทะเบียนนักเรียน'
              onAction={() => history.push('/clinic/school-health/students')}
            />
          </PageCard>
        </PageBody>
      </QueuePageShell>
    );
  }

  const latestCheckup = getLatestService(student.id, 'checkup');
  const missingVaccines = getMissingVaccines(student);
  const openReferral = referrals.find((r) => r.status === 'referred');

  const cardPatient = {
    fullName: student.fullName,
    englishName: `Student No. ${student.studentNo} · ${student.schoolName}`,
    hn: student.hn,
    avatarUrl: undefined,
    vip: false,
    insurance: student.rightExpired ? `${rightLabel(student.rightType)} (หมดอายุ)` : rightLabel(student.rightType),
    bloodType: student.bloodType,
    patientType: 'นักเรียน (งานอนามัยโรงเรียน)',
    doctor: student.teacher,
    sex: student.sex,
    age: formatAgeYears(student.birthDate),
    nationalId: student.citizenId || '—',
    address: student.address || '—',
  };

  const headerTags = (
    <>
      <ColorfulBadge style='teal' size='small' hierarchy='secondary' icon='school'>{student.schoolName}</ColorfulBadge>
      <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>{`${student.gradeName} · ${student.roomName}`}</ColorfulBadge>
      <ColorfulBadge style='grey' size='small' hierarchy='secondary'>{`เลขที่ ${student.studentNo}`}</ColorfulBadge>
      <ColorfulBadge style={student.rightExpired || !student.hasRight ? 'red' : rightStyle(student.rightType)} size='small' hierarchy='secondary' icon='badge'>
        {student.rightExpired ? 'สิทธิการรักษาหมดอายุ' : rightLabel(student.rightType)}
      </ColorfulBadge>
      <ColorfulBadge style={STUDENT_STATUS[student.status]?.style || 'grey'} size='small' hierarchy='secondary'>
        {STUDENT_STATUS[student.status]?.label || '—'}
      </ColorfulBadge>
      {student.confidential ? (
        <ColorfulBadge style='red' size='small' hierarchy='secondary' icon='lock'>ข้อมูลลับ (§1.4.2)</ColorfulBadge>
      ) : null}
    </>
  );

  const tabs = SCHOOL_HEALTH_TABS.map((t) => ({ key: t.key, label: t.label, icon: t.icon }));
  const ActiveTab = (SCHOOL_HEALTH_TABS.find((t) => t.key === activeTab) || SCHOOL_HEALTH_TABS[0]).Component;

  const doPrint = () => {
    logPrint(student.id, 'บัตรสรุปสุขภาพนักเรียน');
    setTick((t) => t + 1);
    setPrintOpen(false);
    if (typeof window !== 'undefined') window.print();
    setToast('บันทึกประวัติการพิมพ์บัตรสรุปสุขภาพแล้ว');
  };

  return (
    <ClinicFilterProvider>
      <QueuePageShell
        activeKey='school-health'
        breadcrumb={breadcrumb}
        title={`ข้อมูลสุขภาพนักเรียน — ${student.fullName}`}
        onBack={() => history.push('/clinic/school-health')}
        backLabel='กลับหน้าคิว'
        actions={(
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <NeutralSubdueButton
              size='sm'
              leadingIcon={canWrite ? 'lock_open' : 'lock'}
              onClick={() => { setSchoolHealthRights(!hasSchoolHealthRights()); setTick((t) => t + 1); }}
            >
              {canWrite ? 'สิทธิ: แก้ไขได้' : 'สิทธิ: อ่านอย่างเดียว'}
            </NeutralSubdueButton>
            <NeutralSubdueButton size='sm' leadingIcon='groups' onClick={() => history.push('/clinic/school-health/students')}>
              ทะเบียนนักเรียน
            </NeutralSubdueButton>
            <NeutralSubdueButton size='sm' leadingIcon='print' onClick={() => setPrintOpen(true)}>
              พิมพ์บัตรสรุปสุขภาพ
            </NeutralSubdueButton>
            <BrandSubdueButton
              variant='fill'
              size='sm'
              leadingIcon='send'
              disabled={!canWrite || hasOpenReferral(student.id)}
              onClick={() => setReferOpen(true)}
              title={hasOpenReferral(student.id) ? 'มีรายการส่งต่อค้างอยู่ — ยกเลิกรายการเดิมก่อนจึงส่งต่อใหม่ได้' : undefined}
            >
              ส่งต่อเข้ารับบริการ
            </BrandSubdueButton>
          </div>
        )}
        headerInfo={(
          <PatientCard
            embedded
            showBack={false}
            patient={cardPatient}
            title={`ข้อมูลสุขภาพนักเรียน — ${student.fullName}`}
            tags={headerTags}
            forceAlertRow
            drugAllergies={student.allergies}
            chronicDiseases={student.chronicDiseases}
          />
        )}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {/* ── popup: ส่งต่อ PHCIS ── */}
        <InternalReferPopup
          open={referOpen}
          onClose={() => setReferOpen(false)}
          fromDepartment='งานอนามัยโรงเรียน'
          title='ส่งต่อเข้ารับบริการที่ศูนย์บริการสาธารณสุข'
          subtitle={`${student.fullName} · ${student.schoolName} ${student.gradeName} ${student.roomName}`}
          primaryLabel='ยืนยันส่งต่อ'
          onConfirm={(payload) => {
            referStudent(student.id, {
              department: payload?.departmentLabel || payload?.departmentId || '—',
              servicePoint: payload?.servicePointLabel || payload?.servicePointId || '—',
              note: payload?.note || '',
              center: SH_CENTER.name,
              problems: problems.map((p) => p.title),
            });
            setReferOpen(false);
            onChanged('ส่งต่อเข้ารับบริการที่ศูนย์ฯ เรียบร้อย — ดูสถานะได้ที่การ์ด "การส่งต่อ"');
          }}
          extra={(
            <NoticeBar tone='info' icon='info'>
              {problems.length > 0
                ? `ระบบจะแนบปัญหาสุขภาพที่พบไปกับใบส่งต่อ: ${problems.map((p) => p.title).join(' · ')}`
                : 'ยังไม่พบปัญหาสุขภาพจากประวัติ — ระบุเหตุผลการส่งต่อในช่องหมายเหตุ'}
            </NoticeBar>
          )}
        />

        {/* ── popup: ยกเลิกการส่งต่อ ── */}
        <Popup
          open={!!cancelReferTarget}
          onClose={() => setCancelReferTarget(null)}
          title='ยกเลิกการส่งต่อ'
          subtitle={cancelReferTarget ? `ส่งต่อเมื่อ ${formatShDateTime(cancelReferTarget.at)} โดย ${cancelReferTarget.by}` : ''}
          tertiaryAction={{ label: 'ปิด', onClick: () => setCancelReferTarget(null) }}
          primaryAction={{
            label: 'ยืนยันยกเลิกการส่งต่อ',
            tone: 'danger',
            onClick: () => {
              if (!cancelReferReason.trim()) { setCancelReferError('กรุณาระบุเหตุผลการยกเลิก'); return; }
              cancelReferral(cancelReferTarget.id, cancelReferReason.trim());
              setCancelReferTarget(null);
              setCancelReferReason('');
              onChanged('ยกเลิกการส่งต่อแล้ว — ส่งต่อใหม่ได้ทันที');
            },
          }}
        >
          <Textarea
            label='เหตุผลการยกเลิก'
            required
            value={cancelReferReason}
            onChange={(v) => { setCancelReferReason(v); if (v.trim()) setCancelReferError(''); }}
            error={cancelReferError || undefined}
            placeholder='เช่น ผู้ปกครองขอเลื่อน / ส่งต่อผิดหน่วยบริการ'
          />
        </Popup>

        {/* ── popup: ยืนยันพิมพ์ ── */}
        <Popup
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          title='พิมพ์บัตรสรุปสุขภาพนักเรียน'
          subtitle={`${student.fullName} · ${student.schoolName} ${student.gradeName} ${student.roomName}`}
          tertiaryAction={{ label: 'ปิด', onClick: () => setPrintOpen(false) }}
          primaryAction={{ label: 'พิมพ์', onClick: doPrint }}
        >
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <NoticeBar tone='info' icon='print'>
              บัตรสรุปสุขภาพจะแสดงข้อมูลทั่วไป ผลตรวจล่าสุด ภาวะโภชนาการ ความครบถ้วนวัคซีน และคำแนะนำ
              พร้อมชื่อผู้ออกเอกสารและเวลาที่พิมพ์ · ระบบบันทึกประวัติการพิมพ์ทุกครั้ง
            </NoticeBar>
            <SubCard tone='brand'>
              <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
                <ReadField label='หน่วยบริการ' value={SH_CENTER.name} minWidth={260} />
                <ReadField label='วันที่พิมพ์' value={formatShDate(todayIso())} minWidth={170} />
                <ReadField label='พิมพ์มาแล้ว' value={`${printLog.length} ครั้ง`} minWidth={140} />
              </div>
            </SubCard>
          </div>
        </Popup>

        <PageBody>
          <ReadOnlyBanner show={!canWrite} />

          {student.status !== 'active' ? (
            <NoticeBar tone='warning' icon='info'>
              {`นักเรียนคนนี้อยู่ในสถานะ "${STUDENT_STATUS[student.status]?.label}" — ดูประวัติย้อนหลังได้ แต่ควรเปิดใช้งานทะเบียนก่อนบันทึกบริการใหม่`}
            </NoticeBar>
          ) : null}

          {!student.hasRight || student.rightExpired ? (
            <NoticeBar tone='warning' icon='badge'>
              {student.rightExpired
                ? `สิทธิการรักษาหมดอายุเมื่อ ${formatShDate(student.rightExpiry)} — บันทึกบริการอนามัยโรงเรียนได้ตามปกติ แต่ควรประสานงานทะเบียนก่อนส่งต่อเข้ารับบริการที่ศูนย์ฯ`
                : 'นักเรียนยังไม่มีสิทธิการรักษาในระบบ — บันทึกบริการอนามัยโรงเรียนได้ตามปกติ (TOR 3.3.2) แต่ควรตรวจสอบสิทธิก่อนส่งต่อ'}
            </NoticeBar>
          ) : null}

          <PageCard gap='var(--dim-space-400, 16px)'>
            <SectionHeader icon='fact_check' title='สรุปสถานะล่าสุด' />
            <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
              <ReadField label='ตรวจสุขภาพล่าสุด' value={latestCheckup ? formatShDate(latestCheckup.date) : 'ยังไม่เคยตรวจ'} minWidth={180} />
              <ReadField
                label='ภาวะโภชนาการ'
                value={latestCheckup?.nutritionKey
                  ? (latestCheckup.nutritionKey === 'out-of-range' ? 'เกณฑ์ไม่ครอบคลุมช่วงอายุ' : (nutritionBand(latestCheckup.nutritionKey)?.label || '—'))
                  : '—'}
                minWidth={180}
              />
              <ReadField label='BMI ล่าสุด' value={latestCheckup?.bmi ?? '—'} minWidth={120} />
              <ReadField label='วัคซีนตามระดับชั้น' value={missingVaccines.length === 0 ? 'ครบตามเกณฑ์' : `ค้าง ${missingVaccines.length} รายการ`} minWidth={190} />
              <ReadField label='ผู้ปกครอง' value={`${student.guardianName} (${guardianRelationLabel(student.guardianRelation)}) · ${student.guardianPhone}`} minWidth={300} />
              <ReadField label='ครูประจำชั้น' value={student.teacher} minWidth={190} />
            </div>
          </PageCard>

          <AiProblemPanel problems={problems} onRefer={() => setReferOpen(true)} />

          {/* ── สถานะการส่งต่อ (TOR 3.4.4) ── */}
          <PageCard gap='var(--dim-space-400, 16px)'>
            <SectionHeader
              icon='send'
              title='การส่งต่อเข้ารับบริการที่ศูนย์ฯ (ผ่าน PHCIS)'
              subtitle='ส่งต่อได้ทีละ 1 รายการที่ยังค้าง — ยกเลิกรายการเดิมพร้อมเหตุผลก่อนจึงส่งต่อใหม่ได้'
              trailing={openReferral ? (
                <ColorfulBadge style='orange' size='small' hierarchy='secondary'>มีรายการส่งต่อค้างอยู่</ColorfulBadge>
              ) : null}
            />
            {referrals.length === 0 ? (
              <EmptyState
                compact
                icon='send'
                title='ยังไม่มีการส่งต่อ'
                subtitle='เมื่อพบปัญหาที่เกินขอบเขตบริการในโรงเรียน กด "ส่งต่อเข้ารับบริการ" ที่แถบด้านบน'
              />
            ) : (
              <Table
                columns={[
                  { key: 'at', label: 'วันเวลาที่ส่งต่อ', render: (r) => formatShDateTime(r.at) },
                  { key: 'department', label: 'แผนก/คลินิกปลายทาง', flex: true, minWidth: 200, render: (r) => r.department || '—' },
                  { key: 'servicePoint', label: 'จุดบริการ', flex: true, minWidth: 180, render: (r) => r.servicePoint || '—' },
                  { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 240, sortable: false, render: (r) => r.note || '—' },
                  { key: 'problems', label: 'ปัญหาที่แนบไป', flex: true, minWidth: 260, sortable: false, render: (r) => ((r.problems || []).length ? r.problems.join(' · ') : '—') },
                  { key: 'by', label: 'ผู้ส่งต่อ', flex: true, minWidth: 190, render: (r) => `${r.by} (${r.position})` },
                  {
                    key: 'status',
                    label: 'สถานะ',
                    render: (r) => (r.status === 'cancelled'
                      ? <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกการส่งต่อแล้ว</ColorfulBadge>
                      : <ColorfulBadge style='green' size='small' hierarchy='secondary'>ส่งต่อแล้ว</ColorfulBadge>),
                  },
                  {
                    key: 'actions',
                    label: 'การดำเนินการ',
                    sortable: false,
                    render: (r) => (r.status === 'referred' ? (
                      <DangerSubdueButton
                        size='sm'
                        leadingIcon='block'
                        disabled={!canWrite}
                        onClick={() => { setCancelReferReason(''); setCancelReferError(''); setCancelReferTarget(r); }}
                      >
                        ยกเลิกการส่งต่อ
                      </DangerSubdueButton>
                    ) : (
                      <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs, 12px)' }}>
                        {r.cancellation ? `ยกเลิกโดย ${r.cancellation.by} — ${r.cancellation.reason}` : '—'}
                      </span>
                    )),
                  },
                ]}
                rows={referrals}
                rowKey={(r) => r.id}
                emptyMessage='ยังไม่มีการส่งต่อ'
              />
            )}
          </PageCard>

          {/* ── เนื้อหาแท็บบริการ ── */}
          <PageCard>
            <ActiveTab student={student} canWrite={canWrite && student.status === 'active'} onChanged={onChanged} />
          </PageCard>

          <PageCard gap='var(--dim-space-300, 12px)'>
            <AuditLine>
              {`ทุกรายการบันทึกในหน้านี้ระบุผู้บันทึก ตำแหน่ง และเวลา · แท็บที่กำลังดู: ${serviceTypeLabel(activeTab)} · หน่วยบริการ ${SH_CENTER.name}`}
            </AuditLine>
            {printLog.length > 0 ? (
              <AuditLine icon='print'>
                {`ประวัติการพิมพ์ล่าสุด: ${printLog.slice(0, 2).map((p) => `${p.docType} โดย ${p.by} เมื่อ ${formatShDateTime(p.at)}`).join(' · ')}`}
              </AuditLine>
            ) : null}
          </PageCard>
        </PageBody>

        <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />
      </QueuePageShell>
    </ClinicFilterProvider>
  );
};

export default StudentHealthProfilePage;
