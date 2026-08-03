import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import QueuePatientAvatar from '@/components/patient/QueuePatientAvatar';
import { CONSENT_TYPE_TONE, CONSENT_STATUS } from '@/data/consentRecords';
import { getConsentRecords, subscribeConsentStore } from '@/data/consentWorkflowStore';
import {
  buildPatientConsentTimeline,
  CONSENT_HISTORY_ACTIONS,
} from '@/data/consentPatientHistory';
import CONSENT_NAV from '@/pages/consent/consentNav';

/* PHCIS | Consent — ประวัติความยินยอมรายบุคคล (Timeline · new tab).
   รวมทุกเหตุการณ์ให้/ไม่ให้/ถอน/แก้ไข จากทุกคำขอของผู้ป่วย HN เดียวกัน. */

const breadcrumb = ['จัดการความยินยอม', 'ประวัติความยินยอม'];

const BODY_TEXT = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.6,
};
const TITLE_TEXT = {
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
};
const MUTED_XS = { ...BODY_TEXT, color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' };

const CARD_STYLE = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};

const ACTION_BADGE_TONE = {
  green: 'green',
  red: 'red',
  yellow: 'yellow',
  blue: 'blue',
};

export default function ConsentHistoryPage() {
  const { hn: hnParam } = useParams();
  const hn = decodeURIComponent(hnParam || '');
  const [records, setRecords] = useState(getConsentRecords);
  useEffect(() => subscribeConsentStore(() => setRecords(getConsentRecords())), []);

  const { patient, events } = useMemo(
    () => buildPatientConsentTimeline(hn, records),
    [hn, records],
  );

  return (
    <QueuePageShell
      activeKey='consent-manage'
      sidebarItems={CONSENT_NAV}
      sidebarFallbackKey='consent-manage'
      brandTitle='ระบบจัดการความยินยอม'
      breadcrumb={breadcrumb}
      title='ประวัติความยินยอม'
      subtitle={patient ? `${patient.name} · HN ${patient.hn}` : `HN ${hn}`}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        {!patient ? (
          <section style={CARD_STYLE}>
            <span style={BODY_TEXT}>ไม่พบประวัติความยินยอมของ HN {hn || '—'}</span>
          </section>
        ) : (
          <>
            <section
              className='flex items-center flex-wrap'
              style={{
                ...CARD_STYLE,
                gap: 'var(--dim-space-400)',
                background: 'var(--surface-brandPrimary-quaternary)',
              }}
            >
              <QueuePatientAvatar hn={patient.hn} name={patient.name} size={48} />
              <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
                <span style={MUTED_XS}>ชื่อ-นามสกุล ผู้ป่วย</span>
                <span style={{ ...TITLE_TEXT, color: 'var(--text-content-default)' }}>{patient.name}</span>
              </div>
              <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
                <span style={MUTED_XS}>HN</span>
                <span style={{ ...TITLE_TEXT, color: 'var(--text-content-default)' }}>{patient.hn}</span>
              </div>
              {patient.guardian && (
                <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
                  <span style={MUTED_XS}>ผู้แทนโดยชอบธรรม</span>
                  <span style={{ ...BODY_TEXT, color: 'var(--text-content-default)' }}>{patient.guardian}</span>
                </div>
              )}
            </section>

            <section className='w-full flex flex-col' style={{ ...CARD_STYLE, gap: 'var(--dim-space-400)' }}>
              <h2 style={TITLE_TEXT}>Timeline การเปลี่ยนแปลงความยินยอม</h2>
              <p style={MUTED_XS}>
                รวมทุกแบบฟอร์มและทุกเหตุการณ์ — การให้ ไม่ให้ ถอน และแก้ไขความยินยอม
              </p>

              {events.length === 0 ? (
                <span style={BODY_TEXT}>ยังไม่มีประวัติความยินยอม</span>
              ) : (
                <div className='flex flex-col w-full'>
                  {events.map((ev, i) => {
                    const meta = CONSENT_HISTORY_ACTIONS[ev.action] || { tone: 'grey', icon: 'info' };
                    const statusTone = (CONSENT_STATUS[ev.toStatus] || {}).tone || ACTION_BADGE_TONE[meta.tone] || 'grey';
                    return (
                      <div key={ev.id} className='flex items-stretch' style={{ gap: 'var(--dim-space-300)' }}>
                        <div className='flex flex-col items-center' style={{ width: 24, flexShrink: 0 }}>
                          <span
                            aria-hidden
                            className='inline-flex items-center justify-center'
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 'var(--dim-radius-full)',
                              background: meta.tone === 'green'
                                ? 'var(--surface-statussummarycard-positive, #D1F6EE)'
                                : meta.tone === 'red'
                                  ? 'var(--surface-danger-tertiary, #FEE2E2)'
                                  : meta.tone === 'yellow'
                                    ? 'var(--surface-statussummarycard-inprogress, #FFEDD5)'
                                    : 'var(--surface-statussummarycard-info, #DBEAFE)',
                              color: 'var(--text-brandPrimary-default)',
                              flexShrink: 0,
                            }}
                          >
                            <Icon name={meta.icon} size={14} />
                          </span>
                          {i < events.length - 1 && (
                            <span
                              aria-hidden
                              style={{
                                width: 'var(--dim-stroke-100)',
                                flex: 1,
                                minHeight: 'var(--dim-space-400)',
                                background: 'var(--border-neutral-tertiary)',
                              }}
                            />
                          )}
                        </div>
                        <div
                          className='flex flex-col flex-1 min-w-0'
                          style={{ gap: 'var(--dim-space-150)', paddingBottom: 'var(--dim-space-500)' }}
                        >
                          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                            <ColorfulBadge
                              style={ACTION_BADGE_TONE[meta.tone] || 'grey'}
                              size='small'
                              hierarchy='secondary'
                              width='hug'
                            >
                              {ev.action}
                            </ColorfulBadge>
                            <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>{ev.formCode}</ColorfulBadge>
                            <ColorfulBadge
                              style={CONSENT_TYPE_TONE[ev.type] || 'grey'}
                              size='small'
                              hierarchy='secondary'
                              width='hug'
                            >
                              {ev.type}
                            </ColorfulBadge>
                            <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{ev.version}</ColorfulBadge>
                            <ColorfulBadge style={statusTone} size='small' hierarchy='secondary' width='hug'>{ev.toStatus}</ColorfulBadge>
                          </div>
                          <span style={{ ...BODY_TEXT, color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>
                            {ev.formName}
                          </span>
                          <span style={BODY_TEXT}>
                            การเปลี่ยนแปลง: {ev.changeDetail}
                          </span>
                          <span style={MUTED_XS}>
                            ช่องทาง: {ev.channel}
                          </span>
                          <span style={MUTED_XS}>
                            วันเวลา: {ev.dateTime}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </QueuePageShell>
  );
}
