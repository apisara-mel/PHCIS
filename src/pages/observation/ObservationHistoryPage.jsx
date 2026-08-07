import React, { useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import StatusBadge from '@/components/badge/StatusBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Popup from '@/components/popup/Popup';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import PatientCard from '@/components/card/PatientCard';
import Footer from '@/components/layout/Footer';
import Pagination from '@/components/pagination/Pagination';
import VitalTrendChart from '@/components/observation/VitalTrendChart';
import EwsScoreBadge from '@/components/observation/EwsScoreBadge';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  MOCK_OBSERVATION_PATIENTS,
  EWS_RISK_TIERS,
  EWS_SCALES,
  EWS_SYSTEM_LABEL,
  scorePatientVitals,
  buildObservationTimeline,
  observationDayOffset,
  vitalsTimelineCells,
} from '@/data/observationMock';

/* Read-only counterpart to ObservationDetailPage.jsx (แฟ้มบันทึกสังเกตอาการ) —
   reached only from the queue's "รายการที่ส่งต่อแล้ว" tab (patient.status
   'ready_discharge' | 'discharged'), so there is nothing left to record:
   no quick-add popups, no discharge form, no "ส่งต่อ" action. Reuses the
   same Observation Timeline merge/rendering + trend-graph popup as the
   active record page so a referred case reads identically to how it did
   while still under observation, just without any editing surface. */

const HISTORY_PAGE_SIZE = 20;

/* Same status-pill styling as ObservationDetailPage's own
   STAT_ORDER_STATUS_STYLE (Observation Timeline order-entry rows). */
const STAT_ORDER_STATUS_STYLE = {
  completed:   { bg: 'var(--surface-colorfulbadge-green)',  color: 'var(--text-colorfulbadge-green)',  icon: 'check_circle' },
  in_progress: { bg: 'var(--surface-colorfulbadge-orange)', color: 'var(--text-colorfulbadge-orange)', icon: 'hourglass_top' },
  pending:     { bg: 'var(--surface-colorfulbadge-red)',    color: 'var(--text-colorfulbadge-red)',    icon: 'error' },
};

export default function ObservationHistoryPage() {
  const { id } = useParams();
  const history = useHistory();

  const patient = MOCK_OBSERVATION_PATIENTS.find((p) => p.id === id) || MOCK_OBSERVATION_PATIENTS[0];
  const [historyPage, setHistoryPage] = useState(1);
  const [showTrendGraphModal, setShowTrendGraphModal] = useState(false);
  const [selectedTrendParam, setSelectedTrendParam] = useState('bp');

  const latestVitals = patient.vitalsTrend?.[patient.vitalsTrend.length - 1];
  const finalEws = latestVitals
    ? scorePatientVitals(patient, latestVitals)
    : { score: 0, tier: EWS_RISK_TIERS.NORMAL, scale: null };

  /* Same merged feed the live record renders — built by the shared
     buildObservationTimeline so a closed case reads exactly as it did
     while open, and the midnight-ordering / same-minute-collision fixes
     apply here too rather than being duplicated and drifting. */
  const observationTimeline = buildObservationTimeline(patient);
  const dayOffsetOf = (entry) => observationDayOffset(patient, entry);

  const timelineByKey = new Map(observationTimeline.map((e) => [e.key, e.opinions]));
  const trendNotesByIndex = (() => {
    const seen = new Map();
    return patient.vitalsTrend.map((v) => {
      const repeat = seen.get(v.time) || 0;
      seen.set(v.time, repeat + 1);
      return timelineByKey.get(repeat === 0 ? v.time : `${v.time}#${repeat}`) ?? [];
    });
  })();

  const historyTotalPages = Math.max(1, Math.ceil(observationTimeline.length / HISTORY_PAGE_SIZE));
  const historyPageClamped = Math.min(historyPage, historyTotalPages);
  const pagedTimeline = observationTimeline.slice(
    (historyPageClamped - 1) * HISTORY_PAGE_SIZE,
    historyPageClamped * HISTORY_PAGE_SIZE,
  );

  /* Same PatientCard field mapping as ObservationDetailPage. */
  const linkedProfile = getPatientByHN(patient.hn);
  const patientCardProfile = {
    fullName: patient.patientName,
    englishName: linkedProfile?.englishName || '',
    hn: patient.hn,
    sex: patient.gender,
    age: `${patient.age} ปี`,
    nationalId: linkedProfile?.nationalId || '-',
    bloodType: linkedProfile?.bloodType || '-',
    patientType: 'ผู้ป่วยสังเกตอาการ',
    doctor: patient.doctorName,
    insurance: patient.rights,
    address: linkedProfile?.address || '-',
    avatarUrl: patient.avatar || linkedProfile?.avatarUrl || '/avatars/somchai-mock.png',
    vip: false,
  };

  const dischargeSummary = patient.dischargeSummary || {};
  const referralTarget =
    dischargeSummary.referScope === 'internal' && dischargeSummary.referDepartment
      ? `แผนกภายใน: ${dischargeSummary.referDepartment}`
      : dischargeSummary.referHospital
      ? `โรงพยาบาลภายนอก: ${dischargeSummary.referHospital}`
      : '-';

  return (
    <QueuePageShell
      activeKey='observation'
      breadcrumb={['หน้าหลัก PHCIS', 'ห้องสังเกตอาการ', `ประวัติบันทึกการสังเกตอาการ: ${patient.patientName}`]}
    >
      <PatientCard
        sticky
        patient={patientCardProfile}
        title='ประวัติบันทึกการสังเกตอาการ (Observation History)'
        actions={
          <NeutralSubdueButton variant='outline' size='md' leadingIcon='print' onClick={() => window.print()}>
            พิมพ์ใบสังเกตอาการ (Timed Sheet)
          </NeutralSubdueButton>
        }
        tags={
          <>
            <span className='px-2.5 py-1 bg-brand-700 text-white rounded-full text-xs font-bold'>
              {patient.bedNo}
            </span>
            <StatusBadge style='success' size='small' showDot>
              ส่งต่อแล้ว
            </StatusBadge>
            <span className='inline-flex items-center rounded-full bg-badge-blueBg text-badge-blueText font-medium px-2.5 py-1 text-xs'>
              VN: {patient.vn}
            </span>
            <span className='inline-flex items-center rounded-full bg-badge-tealBg text-badge-tealText font-medium px-2.5 py-1 text-xs'>
              พยาบาลรับผู้ป่วย: {patient.nurseName}
            </span>
            <span className='inline-flex items-center rounded-full bg-badge-purpleBg text-badge-purpleText font-medium px-2.5 py-1 text-xs'>
              เวลาเข้าเตียง: {patient.admitTime}
            </span>
          </>
        }
      />

      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-600, 24px)',
        }}
      >
        {/* Final EWS reading — no clinical protocol alert here (that's an
            actionable directive for an active case; this one's closed). */}
        <div className='bg-white rounded-2xl p-5 border-none' style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}>
          <div className='flex items-center gap-3'>
            <EwsScoreBadge
              score={finalEws.score}
              tier={finalEws.tier}
              scale={finalEws.scale}
              size='md'
            />
            <div>
              <h3 className='font-bold text-brand-600 text-sm'>
                {EWS_SYSTEM_LABEL} ล่าสุดก่อนส่งต่อ
              </h3>
              <p className='text-xs text-ink-tertiary'>
                เกณฑ์ {finalEws.scale?.label || EWS_SCALES.ADULT.label}
              </p>
              <p className='text-xs font-semibold' style={{ color: finalEws.tier.color }}>
                ระดับความเสี่ยง: {finalEws.tier.label}
              </p>
            </div>
          </div>
        </div>

        {/* Observation Timeline — read-only: same merged feed as the live
            record, no quick-add buttons since there is nothing left to add. */}
        <div
          style={{
            background: 'var(--surface-card-100)',
            borderRadius: 'var(--dim-radius-500)',
            boxShadow: 'var(--shadow-card-strong)',
            overflow: 'hidden',
          }}
        >
          <div
            className='flex flex-wrap items-center justify-between'
            style={{
              padding: 'var(--dim-space-400)',
              background: 'var(--surface-card-100)',
              borderBottom: 'var(--dim-stroke-100) solid var(--border-table-default)',
              gap: 'var(--dim-space-300)',
            }}
          >
            <h3
              className='flex items-center'
              style={{
                gap: 'var(--dim-space-150, 6px)',
                color: 'var(--text-table-title)',
                fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
                fontWeight: 'var(--type-weight-bold)',
                fontSize: 'var(--type-size-sm)',
              }}
            >
              <span className='material-symbols-outlined' style={{ color: 'var(--icon-brandPrimary-default)' }}>timeline</span>
              ไทม์ไลน์การสังเกตอาการ (Observation Timeline)
            </h3>
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='show_chart'
              onClick={() => setShowTrendGraphModal(true)}
            >
              ดูแบบกราฟ
            </BrandSubdueButton>
          </div>

          <div style={{ padding: 'var(--dim-space-400)' }}>
            <div style={{ marginBottom: 'var(--dim-space-300)' }}>
              <span
                style={{
                  color: 'var(--text-content-secondary)',
                  fontFamily: 'var(--type-family-body)',
                  fontWeight: 'var(--type-weight-medium)',
                  fontSize: 'var(--type-size-xs)',
                }}
              >
                บันทึกไว้ทั้งหมด {observationTimeline.length} ช่วงเวลา
              </span>
            </div>
            {pagedTimeline.length === 0 ? (
              <p style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-sm)', textAlign: 'center', padding: 'var(--dim-space-600) 0' }}>
                ไม่มีบันทึกสัญญาณชีพหรือความเห็นระหว่างสังเกตอาการ
              </p>
            ) : (
              <div className='flex flex-col'>
                {pagedTimeline.map((entry, idx) => {
                  const isLast = idx === pagedTimeline.length - 1;
                  const ewsRes = entry.vitals ? scorePatientVitals(patient, entry.vitals) : null;
                  return (
                    <div key={entry.key} className='flex' style={{ gap: 'var(--dim-space-300)' }}>
                      <div className='flex flex-col items-center shrink-0' style={{ width: 'var(--dim-size-300, 16px)' }}>
                        <span
                          className='shrink-0 rounded-full'
                          style={{
                            width: 12,
                            height: 12,
                            background: 'var(--brand-p600)',
                            border: 'var(--dim-stroke-200, 2px) solid var(--surface-card-100)',
                            boxShadow: '0 0 0 2px var(--border-brandPrimary-quaternary)',
                          }}
                        />
                        {!isLast && (
                          <span
                            className='flex-1'
                            style={{ width: 2, background: 'var(--border-steps-default)', marginTop: 'var(--dim-space-100)' }}
                          />
                        )}
                      </div>
                      <div className='flex-1 min-w-0' style={{ paddingBottom: 'var(--dim-space-500, 20px)' }}>
                        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)', marginBottom: 'var(--dim-space-200)' }}>
                          <span
                            className='font-mono'
                            style={{
                              fontWeight: 'var(--type-weight-bold)',
                              color: 'var(--text-brandPrimary-default)',
                              background: 'var(--surface-brandPrimary-quaternary)',
                              padding: 'var(--dim-space-050, 2px) var(--dim-space-200)',
                              borderRadius: 'var(--dim-radius-150, 6px)',
                              fontSize: 'var(--type-size-xs)',
                            }}
                          >
                            {entry.time}
                          </span>
                          {dayOffsetOf(entry) > 0 && (
                            <StatusBadge style='neutral' size='small'>
                              วันที่ {dayOffsetOf(entry) + 1} ของการสังเกตอาการ
                            </StatusBadge>
                          )}
                          {entry.repeatIndex > 0 && (
                            <StatusBadge style='neutral' size='small'>
                              วัดซ้ำครั้งที่ {entry.repeatIndex + 1} ในนาทีเดียวกัน
                            </StatusBadge>
                          )}
                          {ewsRes && (
                            <EwsScoreBadge
                              score={ewsRes.score}
                              tier={ewsRes.tier}
                              scale={ewsRes.scale}
                              size='sm'
                            />
                          )}
                        </div>

                        {entry.vitals && (
                          <div
                            className='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7'
                            style={{ gap: 'var(--dim-space-200)', marginBottom: 'var(--dim-space-200)' }}
                          >
                            {vitalsTimelineCells(entry.vitals).map(([label, value]) => (
                              <div
                                key={label}
                                className='bg-surface-card p-1.5 rounded-lg shadow-2xs border border-ink-line'
                              >
                                <div className='text-[10px] text-ink-quaternary font-medium'>{label}</div>
                                <div className='font-bold text-brand-600 text-[11px]'>{value}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {entry.opinions.map((op, opIdx) => {
                          if (op.kind === 'order') {
                            const cfg = STAT_ORDER_STATUS_STYLE[op.status];
                            const statusLabel = op.status === 'completed' ? 'เสร็จสิ้น' : op.status === 'in_progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ';
                            return (
                              <div
                                key={opIdx}
                                style={{
                                  background: 'var(--surface-brandPrimary-quaternary)',
                                  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                                  borderRadius: 'var(--dim-radius-300)',
                                  padding: 'var(--dim-space-300)',
                                  marginTop: opIdx > 0 ? 'var(--dim-space-200)' : 0,
                                }}
                              >
                                <div className='flex items-center justify-between' style={{ marginBottom: 'var(--dim-space-100)' }}>
                                  <div className='flex items-center' style={{ gap: 'var(--dim-space-100)', color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>
                                    <span className='material-symbols-outlined' style={{ fontSize: 14, color: 'var(--icon-brandPrimary-default)' }}>bolt</span>
                                    สั่งการโดย: {op.author}
                                  </div>
                                  <span
                                    className='inline-flex items-center'
                                    style={{
                                      gap: 'var(--dim-space-050, 2px)',
                                      padding: '2px var(--dim-space-200)',
                                      borderRadius: 'var(--dim-radius-full)',
                                      background: cfg.bg,
                                      color: cfg.color,
                                      fontSize: 10,
                                      fontWeight: 'var(--type-weight-bold)',
                                    }}
                                  >
                                    <span className='material-symbols-outlined' style={{ fontSize: 12 }}>{cfg.icon}</span>
                                    {statusLabel}
                                  </span>
                                </div>
                                <div style={{ color: 'var(--text-content-default)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', lineHeight: 1.6 }}>
                                  {op.text}
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div
                              key={opIdx}
                              style={{
                                background: 'var(--surface-neutral-quaternary)',
                                border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                                borderRadius: 'var(--dim-radius-300)',
                                padding: 'var(--dim-space-300)',
                                marginTop: opIdx > 0 ? 'var(--dim-space-200)' : 0,
                              }}
                            >
                              <div style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>
                                บันทึกโดย: {op.author}{op.noteType ? ` · ${op.noteType}` : ''}
                              </div>
                              <div style={{ color: 'var(--text-content-default)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', lineHeight: 1.6 }}>
                                {op.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {historyTotalPages > 1 && (
              <div className='flex items-center justify-center' style={{ paddingTop: 'var(--dim-space-400)' }}>
                <Pagination currentPage={historyPageClamped} pageCount={historyTotalPages} onPageChange={setHistoryPage} />
              </div>
            )}
          </div>
        </div>

        {/* Discharge / Referral Summary — read-only recap of whatever was
            recorded on the active record page's Discharge Summary step. */}
        <div className='bg-white rounded-2xl p-6 border-none' style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}>
          <h3 className='font-bold text-brand-600 text-sm mb-6 flex items-center gap-2 border-b border-gray-100 pb-3'>
            <span className='material-symbols-outlined text-brand-600'>output</span>
            สรุปผลการจำหน่าย / ส่งต่อ (Discharge & Referral Summary)
          </h3>
          <div className='space-y-5 text-xs text-gray-700'>
            <div>
              <div className='font-bold text-content-default mb-1'>สรุปความเห็นแพทย์ (Doctor Discharge Note)</div>
              <p style={{ color: 'var(--text-content-secondary)', lineHeight: 1.6 }}>{dischargeSummary.doctorSummary || '-'}</p>
            </div>
            <div>
              <div className='font-bold text-content-default mb-1'>คำแนะนำและข้อควรระวังเมื่อจำหน่าย (Discharge Instructions)</div>
              <p style={{ color: 'var(--text-content-secondary)', lineHeight: 1.6 }}>{dischargeSummary.dischargeAdvice || '-'}</p>
            </div>
            <div>
              <div className='font-bold text-content-default mb-1'>ปลายทางส่งต่อ (Referral Destination)</div>
              <p style={{ color: 'var(--text-content-secondary)', lineHeight: 1.6 }}>{referralTarget}</p>
            </div>
          </div>
        </div>
      </div>

      <Footer
        type='with BTN'
        sticky
        showLegal={false}
        showAutoSave={false}
        showButton2={false}
        showButton3={false}
        showButton1
        button1Label='กลับสู่รายการเตียงสังเกตอาการ'
        button1Icon='arrow_back'
        onButton1Click={() => history.push('/observation')}
      />

      {/* Modal: Vital Signs Trend Visualizer — same chart engine as
          ObservationDetailPage's "ดูแบบกราฟ" popup. */}
      <Popup
        open={showTrendGraphModal}
        onClose={() => setShowTrendGraphModal(false)}
        title='กราฟแนวโน้มสัญญาณชีพตามช่วงเวลา (Vital Signs Trend Visualizer)'
        leading={<span className='material-symbols-outlined text-2xl' style={{ color: 'var(--brand-p700)' }}>show_chart</span>}
        size='extraLarge'
        bodyScrollable={false}
        bodyStyle={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-300)',
          paddingTop: 'var(--dim-space-200)',
          paddingLeft: 'clamp(var(--dim-space-300), 4vw, var(--dim-space-600))',
          paddingRight: 'clamp(var(--dim-space-300), 4vw, var(--dim-space-600))',
          paddingBottom: 'var(--dim-space-600)',
        }}
      >
        <TabBar align='center' className='shrink-0'>
          {[
            { key: 'bp', label: 'ความดัน (BP)' },
            { key: 'pulse', label: 'ชีพจร (Pulse)' },
            { key: 'spo2', label: 'ออกซิเจนปลายนิ้ว (SpO2)' },
            { key: 'temp', label: 'อุณหภูมิ (Temp)' },
            { key: 'rr', label: 'อัตราการหายใจ (RR)' },
          ].map((param) => (
            <TabPill
              key={param.key}
              size='small'
              selected={selectedTrendParam === param.key}
              onClick={() => setSelectedTrendParam(param.key)}
              role='tab'
            >
              {param.label}
            </TabPill>
          ))}
        </TabBar>

        <div className='flex-1 min-h-0'>
          <VitalTrendChart data={patient.vitalsTrend} parameter={selectedTrendParam} notes={trendNotesByIndex} fillHeight />
        </div>
      </Popup>
    </QueuePageShell>
  );
}
