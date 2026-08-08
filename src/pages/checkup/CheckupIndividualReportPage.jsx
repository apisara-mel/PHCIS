import React, { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import Select from '@/components/forms/Select';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import Table from '@/components/table/Table';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  REPORT_STATUSES, CHECKUP_DOCTORS,
  CHECKUP_SUMMARY_SUGGESTIONS, CHECKUP_ADVICE_SUGGESTIONS,
  getVisit, getVisitRecord, getReport, saveReportDraft,
  submitReportForAuthorize, authorizeReport, unauthorizeReport,
  sendReportToPatient, generateSummaryDraft, getCheckupRight, toggleCheckupRight,
  formatThaiDateTime, CHECKUP_STAFF,
} from '@/data/checkupStore';
import { ReportSectionEditor, OnePageReport } from '@/pages/checkup/CheckupOnePageReport';
import {
  PageBody, PageCard, EmptyState, NoticeBar, SectionHeader, SubCard,
  ReadField, CheckupAuditBar, StatTile,
} from '@/pages/checkup/CheckupUi';

/* CheckupIndividualReportPage — รายงานผลรายบุคคล (TOR 1.19.19 + 1.19.21).

   Health Reporting Automation: the report is generated from the saved visit
   record, the physician edits it lightly (reorder / hide sections, rewrite
   สรุปผล + ข้อแนะนำ), then it moves through the authorize workflow:

     ร่าง → รอแพทย์ authorize → อนุมัติแล้ว (locked, stamped) → ส่งถึงผู้ป่วย

   Guards from the spec:
     • an authorized report is read-only until "ยกเลิกการอนุมัติ" (reason required)
     • ส่งถึงผู้ป่วย is only enabled once authorized
     • printing before authorize stamps the ฉบับร่าง watermark
     • a user without the authorize right sees the button disabled with a reason */

const breadcrumb = ['ระบบงานตรวจสุขภาพ', 'รายงานผลรายบุคคล'];

const SEND_CHANNELS = [
  { value: 'พิมพ์เอกสารมอบให้ผู้รับบริการ', label: 'พิมพ์เอกสารมอบให้ผู้รับบริการ' },
  { value: 'แอปพลิเคชันผู้รับบริการ (BMA Health)', label: 'แอปพลิเคชันผู้รับบริการ (BMA Health)' },
  { value: 'ส่งไปยังหน่วยงานต้นสังกัด', label: 'ส่งไปยังหน่วยงานต้นสังกัด' },
];

const CheckupIndividualReportPage = () => {
  const history = useHistory();
  const { visitId } = useParams();
  const [tick, setTick] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [authDoctor, setAuthDoctor] = useState('');
  const [unauthOpen, setUnauthOpen] = useState(false);
  const [unauthReason, setUnauthReason] = useState('');
  const [unauthError, setUnauthError] = useState('');
  const [sendOpen, setSendOpen] = useState(false);
  const [sendChannel, setSendChannel] = useState(SEND_CHANNELS[0].value);
  const [toast, setToast] = useState('');

  const visit = useMemo(() => getVisit(visitId), [visitId]);
  const record = useMemo(() => getVisitRecord(visitId), [visitId, tick]);
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const stored = useMemo(() => getReport(visitId), [visitId, tick]);

  const auto = useMemo(
    () => (visit && record ? generateSummaryDraft(visit, record) : null),
    [visit, record],
  );

  const [draft, setDraft] = useState(() => {
    const r = getReport(visitId);
    const rec = getVisitRecord(visitId);
    return {
      sectionOrder: r.sectionOrder,
      hidden: r.hidden || {},
      summaryText: r.summaryText || rec?.summaryText || '',
      adviceText: r.adviceText || rec?.adviceText || '',
    };
  });

  const patient = useMemo(
    () => (visit?.hn && getPatientByHN(visit.hn)) || DEFAULT_PATIENT,
    [visit],
  );

  const canAuthorize = getCheckupRight('authorizeReport');
  const status = stored.status;
  const authorized = status === 'authorized' || status === 'sent';
  const locked = authorized;

  const patchDraft = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const reportForDoc = { ...stored, ...draft };

  const handleSaveDraft = () => {
    saveReportDraft(visitId, draft);
    setTick((t) => t + 1);
    setToast('บันทึกรายงานฉบับร่างเรียบร้อยแล้ว');
  };

  const handleSubmit = () => {
    submitReportForAuthorize(visitId, draft);
    setTick((t) => t + 1);
    setToast('ส่งรายงานให้แพทย์อนุมัติแล้ว');
  };

  const handleAuthorize = () => {
    if (!authDoctor) return;
    saveReportDraft(visitId, draft);
    authorizeReport(visitId, authDoctor);
    setAuthOpen(false);
    setTick((t) => t + 1);
    setToast(`อนุมัติรายงานโดย ${authDoctor} เรียบร้อยแล้ว`);
  };

  const handleUnauthorize = () => {
    if (!unauthReason.trim()) { setUnauthError('ต้องระบุเหตุผลการยกเลิกการอนุมัติ'); return; }
    unauthorizeReport(visitId, unauthReason.trim());
    setUnauthOpen(false);
    setTick((t) => t + 1);
    setToast('ยกเลิกการอนุมัติแล้ว — รายงานกลับเป็นฉบับร่างและแก้ไขได้');
  };

  const handleSend = () => {
    sendReportToPatient(visitId, sendChannel);
    setSendOpen(false);
    setTick((t) => t + 1);
    setToast(`ส่งรายงานถึงผู้รับบริการทาง ${sendChannel} แล้ว`);
  };

  if (!visit) {
    return (
      <QueuePageShell
        activeKey='checkup'
        breadcrumb={breadcrumb}
        title='รายงานผลรายบุคคล'
        onBack={() => history.push('/checkup')}
        backLabel='กลับไปคิวตรวจสุขภาพ'
      >
        <PageBody>
          <PageCard>
            <EmptyState
              icon='error'
              title='ไม่พบข้อมูลการตรวจที่ระบุ'
              subtitle={`ไม่พบ visit "${visitId}"`}
              actionLabel='กลับไปคิวตรวจสุขภาพ'
              onAction={() => history.push('/checkup')}
            />
          </PageCard>
        </PageBody>
      </QueuePageShell>
    );
  }

  if (!record) {
    return (
      <QueuePageShell
        activeKey='checkup'
        breadcrumb={breadcrumb}
        title={`รายงานผลรายบุคคล — ${visit.name}`}
        onBack={() => history.push('/checkup')}
        backLabel='กลับไปคิวตรวจสุขภาพ'
      >
        <PageBody>
          <PageCard>
            <EmptyState
              icon='description'
              title='ยังไม่มีผลตรวจสำหรับสร้างรายงาน'
              subtitle='ระบบสร้างรายงานผลหน้าเดียวจากผลตรวจที่บันทึกไว้ — บันทึกผลตรวจให้ครบก่อน'
              actionLabel='ไปบันทึกผลตรวจ'
              onAction={() => history.push(`/checkup/record/${visit.id}`)}
            />
          </PageCard>
        </PageBody>
      </QueuePageShell>
    );
  }

  const statusCfg = REPORT_STATUSES[status] || REPORT_STATUSES.draft;

  const historyColumns = [
    { key: 'at', label: 'วันเวลา', render: (r) => formatThaiDateTime(r.at) },
    { key: 'by', label: 'ผู้ดำเนินการ', flex: true, minWidth: 200 },
    { key: 'action', label: 'การดำเนินการ', flex: true, minWidth: 300 },
  ];

  return (
    <QueuePageShell
      activeKey='checkup'
      breadcrumb={breadcrumb}
      title={`รายงานผลรายบุคคล — ${visit.name} · HN ${visit.hn}`}
      onBack={() => history.push('/checkup')}
      backLabel='กลับไปคิวตรวจสุขภาพ'
      actions={(
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueButton
            size='md'
            leadingIcon={canAuthorize ? 'lock_open' : 'lock'}
            onClick={() => { toggleCheckupRight('authorizeReport'); setTick((t) => t + 1); }}
            title='สลับสิทธิ์อนุมัติรายงาน (สำหรับทดสอบ)'
          >
            {canAuthorize ? 'สิทธิ์: อนุมัติได้' : 'สิทธิ์: อนุมัติไม่ได้'}
          </NeutralSubdueButton>
          <NeutralSubdueButton size='md' leadingIcon='print' onClick={() => { if (typeof window !== 'undefined') window.print(); }}>
            {authorized ? 'พิมพ์รายงาน' : 'พิมพ์ (ฉบับร่าง)'}
          </NeutralSubdueButton>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='history' onClick={() => history.push(`/checkup/history/${visit.hn}`)}>
            ผลตรวจย้อนหลัง
          </BrandSubdueButton>
        </div>
      )}
    >
      <PageBody>
        {toast ? (
          <NoticeBar
            tone='success'
            icon='check_circle'
            trailing={(
              <button type='button' aria-label='ปิดการแจ้งเตือน' onClick={() => setToast('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                <Icon name='close' size={16} />
              </button>
            )}
          >
            {toast}
          </NoticeBar>
        ) : null}

        {authorized ? (
          <NoticeBar
            tone='success'
            icon='verified'
            trailing={(
              <DangerSubdueButton
                variant='outline'
                size='sm'
                leadingIcon='lock_open'
                disabled={!canAuthorize}
                onClick={() => { setUnauthReason(''); setUnauthError(''); setUnauthOpen(true); }}
              >
                ยกเลิกการอนุมัติ
              </DangerSubdueButton>
            )}
          >
            {`รายงานถูกอนุมัติแล้วโดย ${stored.authorizedBy} (${formatThaiDateTime(stored.authorizedAt)}) — ล็อกการแก้ไข ต้องยกเลิกการอนุมัติพร้อมเหตุผลก่อนจึงจะแก้ไขได้`}
          </NoticeBar>
        ) : (
          <NoticeBar tone='warning' icon='warning'>
            {status === 'pending'
              ? 'รายงานอยู่ในสถานะรอแพทย์อนุมัติ — ยังส่งถึงผู้รับบริการไม่ได้ และการพิมพ์จะมีลายน้ำ "ฉบับร่าง"'
              : 'รายงานเป็นฉบับร่าง — แก้ไขได้ตามต้องการ กด "ส่งให้แพทย์อนุมัติ" เมื่อพร้อม'}
          </NoticeBar>
        )}

        {!canAuthorize ? (
          <NoticeBar tone='neutral' icon='lock'>
            บัญชีผู้ใช้ของคุณไม่มีสิทธิ์อนุมัติรายงาน — ปุ่ม "อนุมัติรายงาน" และ "ยกเลิกการอนุมัติ" ถูกปิดใช้งาน
            (สิทธิ์นี้สงวนไว้สำหรับแพทย์ผู้รับผิดชอบ)
          </NoticeBar>
        ) : null}

        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
          <StatTile label='สถานะรายงาน' value={statusCfg.label} tone={authorized ? 'brand' : 'warning'} icon='fact_check' />
          <StatTile label='รายการผิดปกติที่พบ' value={auto?.findings.length ?? 0} unit='รายการ' tone={(auto?.findings.length ?? 0) > 0 ? 'danger' : 'brand'} icon='error' />
          <StatTile label='ครั้งที่รับบริการ' value={`ครั้งที่ ${visit.round || 1}`} tone='info' icon='event_repeat' />
        </div>

        <div className='grid grid-cols-1 xl:grid-cols-3 w-full' style={{ gap: 'var(--dim-space-600)' }}>
          <div className='xl:col-span-1 flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
            <PageCard>
              <ReportSectionEditor
                report={reportForDoc}
                locked={locked}
                onChange={patchDraft}
              />
            </PageCard>

            <PageCard>
              <SectionHeader
                icon='edit_note'
                title='แก้ไขข้อความสรุปและคำแนะนำ'
                subtitle='ข้อความที่แก้ที่นี่จะใช้ในรายงานฉบับผู้รับบริการ (ระบบยังเก็บฉบับที่สร้างอัตโนมัติไว้)'
                trailing={(
                  <BrandSubdueButton
                    variant='outline'
                    size='sm'
                    leadingIcon='auto_awesome'
                    disabled={locked}
                    onClick={() => patchDraft({ summaryText: auto.summaryText, adviceText: auto.adviceText })}
                  >
                    ใช้ร่างอัตโนมัติ
                  </BrandSubdueButton>
                )}
              />
              <SuggestibleTextarea
                voice
                label='สรุปผลการตรวจ (ในรายงาน)'
                required
                value={draft.summaryText}
                disabled={locked}
                onChange={(e) => patchDraft({ summaryText: e?.target ? e.target.value : e })}
                placeholder='เช่น ผลการตรวจสุขภาพพบความผิดปกติ 3 รายการ ได้แก่ …'
                suggestions={CHECKUP_SUMMARY_SUGGESTIONS}
                minChars={3}
              />
              <SuggestibleTextarea
                voice
                label='ข้อแนะนำสำหรับผู้รับบริการ (ในรายงาน)'
                required
                value={draft.adviceText}
                disabled={locked}
                onChange={(e) => patchDraft({ adviceText: e?.target ? e.target.value : e })}
                placeholder='เช่น ควบคุมอาหาร ออกกำลังกาย และนัดติดตามที่คลินิก NCD ใน 1 เดือน'
                suggestions={CHECKUP_ADVICE_SUGGESTIONS}
                minChars={3}
              />
              {record.adviceAuto ? (
                <SubCard tone='info'>
                  <SectionHeader icon='auto_awesome' title='คำแนะนำฉบับที่ระบบสร้างอัตโนมัติ' subtitle='เก็บไว้เทียบกับฉบับที่แพทย์แก้' />
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)', whiteSpace: 'pre-wrap' }}>
                    {record.adviceAuto}
                  </span>
                </SubCard>
              ) : null}
            </PageCard>

            <PageCard>
              <SectionHeader icon='history' title='ประวัติการดำเนินการกับรายงาน' subtitle='บันทึกผู้ดำเนินการและเวลาทุกครั้ง (audit trail)' />
              {(stored.history || []).length === 0 ? (
                <EmptyState compact icon='history' title='ยังไม่มีประวัติการดำเนินการ' subtitle='การบันทึกร่าง ส่งอนุมัติ อนุมัติ และส่งถึงผู้ป่วย จะถูกบันทึกที่นี่' />
              ) : (
                <Table columns={historyColumns} rows={stored.history} rowKey={(r, i) => `${r.at}-${i}`} emptyMessage='ไม่มีประวัติ' />
              )}
              <CheckupAuditBar record={record} />
              <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-500)' }}>
                <ReadField label='ผู้จัดทำรายงาน' value={CHECKUP_STAFF.name} minWidth={200} />
                <ReadField label='ผู้อนุมัติ' value={stored.authorizedBy || 'ยังไม่อนุมัติ'} minWidth={180} />
                <ReadField label='เวลาที่อนุมัติ' value={stored.authorizedAt ? formatThaiDateTime(stored.authorizedAt) : '—'} minWidth={220} />
                {stored.unauthorizeReason ? (
                  <ReadField label='เหตุผลการยกเลิกการอนุมัติครั้งก่อน' value={stored.unauthorizeReason} minWidth={280} />
                ) : null}
              </div>
            </PageCard>
          </div>

          <div className='xl:col-span-2 flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <ColorfulBadge style={statusCfg.badge} size='default' hierarchy='secondary'>{statusCfg.label}</ColorfulBadge>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                ตัวอย่างรายงานหน้าเดียว (One-page) ที่ระบบสร้างอัตโนมัติจากผลตรวจ
              </span>
            </div>
            <OnePageReport visit={visit} record={record} report={reportForDoc} patient={patient} />
          </div>
        </div>
      </PageBody>

      {/* Sticky workflow bar */}
      <div
        className='flex items-center w-full'
        style={{
          gap: 'var(--dim-space-300)',
          paddingTop: 'var(--dim-space-400)',
          paddingBottom: 'var(--dim-space-400)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          background: 'var(--surface-navigation-default)',
          boxShadow: 'var(--shadow-brand-drop-top-100)',
          position: 'sticky',
          bottom: 'var(--dim-space-0)',
          zIndex: 60,
        }}
      >
        <NeutralSubdueButton size='lg' leadingIcon='arrow_back' onClick={() => history.push('/checkup')}>
          กลับไปคิว
        </NeutralSubdueButton>
        <div className='flex-1' />
        <BrandSubdueButton variant='outline' size='lg' leadingIcon='save' disabled={locked} onClick={handleSaveDraft}>
          บันทึกฉบับร่าง
        </BrandSubdueButton>
        {!authorized ? (
          <>
            {status !== 'pending' ? (
              <BrandSubdueButton
                variant='outline'
                size='lg'
                leadingIcon='send'
                disabled={!draft.summaryText.trim() || !draft.adviceText.trim()}
                onClick={handleSubmit}
              >
                ส่งให้แพทย์อนุมัติ
              </BrandSubdueButton>
            ) : null}
            <BrandSubdueButton
              variant='fill'
              size='lg'
              leadingIcon='verified'
              disabled={!canAuthorize || !draft.summaryText.trim() || !draft.adviceText.trim()}
              title={canAuthorize ? undefined : 'บัญชีของคุณไม่มีสิทธิ์อนุมัติรายงาน'}
              onClick={() => { setAuthDoctor(visit.doctor || CHECKUP_DOCTORS[0]); setAuthOpen(true); }}
            >
              อนุมัติรายงาน
            </BrandSubdueButton>
          </>
        ) : (
          <BrandSubdueButton
            variant='fill'
            size='lg'
            leadingIcon='outgoing_mail'
            disabled={status === 'sent'}
            onClick={() => setSendOpen(true)}
          >
            {status === 'sent' ? 'ส่งถึงผู้ป่วยแล้ว' : 'ส่งถึงผู้ป่วย'}
          </BrandSubdueButton>
        )}
      </div>

      <Popup
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        title='ยืนยันการอนุมัติรายงานผลตรวจ'
        subtitle={`${visit.name} · HN ${visit.hn} · ${visit.orderNo}`}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setAuthOpen(false) }}
        primaryAction={{ label: 'ยืนยันอนุมัติ', onClick: handleAuthorize, disabled: !authDoctor }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
          <NoticeBar tone='warning' icon='warning'>
            เมื่ออนุมัติแล้ว รายงานจะถูกล็อกไม่ให้แก้ไข และประทับชื่อผู้อนุมัติกับเวลาไว้ในเอกสาร —
            ต้องกด "ยกเลิกการอนุมัติ" พร้อมระบุเหตุผลก่อนจึงจะแก้ไขได้อีกครั้ง
          </NoticeBar>
          <Select
            label='แพทย์ผู้อนุมัติรายงาน'
            required
            showHelperText={false}
            showLeadingIcon={false}
            size='md'
            options={CHECKUP_DOCTORS.map((d) => ({ value: d, label: d }))}
            value={authDoctor}
            onChange={(v) => setAuthDoctor(typeof v === 'string' ? v : v?.value)}
          />
        </div>
      </Popup>

      <Popup
        open={unauthOpen}
        onClose={() => setUnauthOpen(false)}
        title='ยกเลิกการอนุมัติรายงาน'
        subtitle={`${visit.name} · HN ${visit.hn}`}
        tertiaryAction={{ label: 'ปิด', onClick: () => setUnauthOpen(false) }}
        primaryAction={{ label: 'ยืนยันยกเลิกการอนุมัติ', onClick: handleUnauthorize, tone: 'danger' }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <NoticeBar tone='danger' icon='error'>
            รายงานจะกลับเป็นฉบับร่างและแก้ไขได้ — เหตุผล ผู้ดำเนินการ และเวลาจะถูกบันทึกไว้ใน audit trail
          </NoticeBar>
          <SuggestibleTextarea
            voice
            label='เหตุผลการยกเลิกการอนุมัติ'
            required
            value={unauthReason}
            onChange={(e) => { setUnauthReason(e?.target ? e.target.value : e); setUnauthError(''); }}
            placeholder='เช่น พบว่าค่าผลตรวจกรอกผิด ต้องแก้ไขก่อนอนุมัติใหม่'
            suggestions={[
              'พบว่าค่าผลตรวจกรอกผิด ต้องแก้ไขก่อนอนุมัติใหม่',
              'ต้องเพิ่มผลตรวจที่มาภายหลัง',
              'ปรับข้อความสรุปและคำแนะนำ',
              'อนุมัติผิดคน',
            ]}
            minChars={2}
          />
          {unauthError ? (
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-danger-secondary, #DC2626)' }}>
              {unauthError}
            </span>
          ) : null}
        </div>
      </Popup>

      <Popup
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title='ส่งรายงานผลถึงผู้รับบริการ'
        subtitle={`${visit.name} · HN ${visit.hn}`}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setSendOpen(false) }}
        primaryAction={{ label: 'ยืนยันส่ง', onClick: handleSend }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
          <NoticeBar tone='info' icon='info'>
            ส่งได้เฉพาะรายงานที่อนุมัติแล้ว — ในต้นแบบนี้ช่องทางการส่งเป็น mock (ยังไม่ต่อระบบส่งจริง)
          </NoticeBar>
          <Select
            label='ช่องทางการส่ง'
            required
            showHelperText={false}
            showLeadingIcon={false}
            size='md'
            options={SEND_CHANNELS}
            value={sendChannel}
            onChange={(v) => setSendChannel(typeof v === 'string' ? v : v?.value)}
          />
        </div>
      </Popup>
    </QueuePageShell>
  );
};

export default CheckupIndividualReportPage;
