import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import Alert from '@/components/alert/Alert';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { Field, FieldGrid } from '@/components/forms/Fields';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import { Icon } from '@/components/icons/Icon';
import {
  allCriticalRecords, openCriticalRecords, acknowledgedCriticalRecords,
  criticalAgeMinutes, isCriticalEscalated, summariseCritical,
  acknowledgeCritical, amendAcknowledgement, cancelAcknowledgement,
  subscribeCritical, validateAcknowledgement,
  LAB_ACKNOWLEDGERS, CRITICAL_RESPONSE_SUGGESTIONS, CRITICAL_ESCALATE_MINUTES,
} from '@/data/labCritical';

/* Monospace for accession numbers and values — a rendering requirement for
   aligned identifiers, not a design-system value. tokens.css has no
   --type-family-mono, and a var() that only ever resolves to its own
   fallback is drift waiting for the day a theme defines it. */
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/* ทะเบียนค่าวิกฤต + การกดรับทราบ — the drawer behind the worklist's
   ค่าวิกฤต summary card.

   Delivered as a component rather than as more of LabQueuePage because that
   file is already 1,512 lines; the queue grows by one import instead of a
   few hundred lines.

   What it is FOR: LabResultEntryPage already forces the laboratory half of
   the critical-value loop — call the doctor, name ผู้รับแจ้ง, record the time
   and confirm read-back, all before รับรองผล will unlock. The half nobody
   has ever been able to see is whether the CLINICIAN then acknowledged it.
   An un-acknowledged panic value is an open incident, and 30 minutes is the
   interval past which it stops being "waiting" and becomes one. */

const CURRENT_ACTOR = 'เจ้าหน้าที่ห้องปฏิบัติการ';

const nowTimeString = () => new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

/* อายุการแจ้ง pill. Past CRITICAL_ESCALATE_MINUTES an open record turns
   destructive; an acknowledged one shows how long it actually took, in a
   neutral tone, because that number is a quality indicator rather than a
   live alarm. */
const AgeChip = ({ record, now }) => {
  const minutes = record.acknowledged
    ? (record.ackMinutes ?? criticalAgeMinutes(record, now))
    : criticalAgeMinutes(record, now);
  const escalated = isCriticalEscalated(record, now);
  const tone = escalated
    ? { bg: 'var(--surface-pill-red)', fg: 'var(--text-pill-red)' }
    : record.acknowledged
      ? { bg: 'var(--surface-pill-green)', fg: 'var(--text-pill-green)' }
      : { bg: 'var(--surface-pill-yellow)', fg: 'var(--text-pill-yellow)' };
  return (
    <span
      className='inline-flex items-center'
      style={{
        gap: 'var(--dim-space-100)',
        background: tone.bg,
        color: tone.fg,
        borderRadius: 'var(--dim-radius-full, 9999px)',
        paddingTop: 'var(--dim-space-050, 2px)',
        paddingBottom: 'var(--dim-space-050, 2px)',
        paddingLeft: 'var(--dim-space-200)',
        paddingRight: 'var(--dim-space-200)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        fontWeight: 'var(--type-weight-medium)',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon name={escalated ? 'running_with_errors' : 'schedule'} size={12} />
      {record.acknowledged ? `รับทราบใน ${minutes} นาที` : `${minutes} นาที`}
    </span>
  );
};

const Line = ({ label, value, mono }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
      {label}
    </span>
    <span
      style={{
        fontFamily: mono ? MONO : 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        color: 'var(--text-content-default)',
      }}
    >
      {value || '—'}
    </span>
  </div>
);

const blankAckDraft = () => ({ ackBy: '', ackPosition: '', ackAt: nowTimeString(), response: '' });

const LabCriticalLogPanel = ({ open, onClose, onOpenResult }) => {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeCritical(() => setVersion((v) => v + 1)), []);

  /* One ticking clock for the whole panel — the age column and the
     escalation colour both read it, so a single interval keeps them in
     step and avoids a timer per row. 30 s is fine for a 30-minute
     threshold and costs nothing. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return undefined;
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, [open]);

  const [tab, setTab] = useState('open');
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(blankAckDraft);
  const [errors, setErrors] = useState({});
  const [mode, setMode] = useState('ack');           /* 'ack' | 'amend' */
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  /* AlertDialog exposes no confirmDisabled and does not self-close, so
     confirming with an empty required reason used to be a DEAD CLICK:
     handleCancelAck returned early and the dialog just sat there saying
     nothing. `attempted` is what turns that silence into an error state. */
  const [cancelAttempted, setCancelAttempted] = useState(false);

  /* Reset to a clean sheet each time the drawer opens, so a half-typed
     acknowledgement from an earlier session never reappears attached to a
     different patient. */
  useEffect(() => {
    if (!open) return;
    setTab('open');
    setSelectedId(null);
    setDraft(blankAckDraft());
    setErrors({});
    setMode('ack');
  }, [open]);

  const summary = useMemo(() => summariseCritical(now), [now, version]);
  const rows = useMemo(
    () => (tab === 'open' ? openCriticalRecords() : acknowledgedCriticalRecords()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, version],
  );
  const selected = useMemo(
    () => allCriticalRecords().find((r) => r.id === selectedId) ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId, version],
  );

  /* Open rows sort by age, oldest first — the one that has been waiting
     longest is the one that needs a phone call now. */
  const sortedRows = useMemo(() => {
    const list = [...rows];
    if (tab === 'open') {
      list.sort((a, b) => criticalAgeMinutes(b, now) - criticalAgeMinutes(a, now));
    }
    return list;
  }, [rows, tab, now]);

  const startAck = (record) => {
    setSelectedId(record.id);
    setMode('ack');
    setDraft(blankAckDraft());
    setErrors({});
  };

  const startAmend = (record) => {
    setSelectedId(record.id);
    setMode('amend');
    setDraft({
      ackBy: record.ackBy ?? '',
      ackPosition: record.ackPosition ?? '',
      ackAt: record.ackAt ?? nowTimeString(),
      response: record.response ?? '',
    });
    setErrors({});
  };

  const closeForm = () => {
    setSelectedId(null);
    setDraft(blankAckDraft());
    setErrors({});
  };

  const handleSubmit = () => {
    if (!selected) return;
    const check = validateAcknowledgement(draft);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    const fn = mode === 'amend' ? amendAcknowledgement : acknowledgeCritical;
    const result = fn(selected.id, draft, { actor: CURRENT_ACTOR });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    closeForm();
    setTab('acknowledged');
  };

  const handleCancelAck = () => {
    setCancelAttempted(true);
    if (!cancelTarget || !cancelReason.trim()) return;
    cancelAcknowledgement(cancelTarget.id, { reason: cancelReason.trim(), actor: CURRENT_ACTOR });
    setCancelTarget(null);
    setCancelReason('');
    setCancelAttempted(false);
    setTab('open');
  };

  const columns = [
    {
      key: 'found',
      label: 'เวลาที่พบค่า',
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
            {r.foundAtLabel}
          </span>
          <AgeChip record={r} now={now} />
        </div>
      ),
    },
    {
      key: 'value',
      label: 'ผู้ป่วย / ค่าที่พบ',
      render: (r) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
            {r.confidential && <Icon name='lock' size={12} style={{ color: 'var(--text-content-quaternary)' }} />}
            {r.patientName} · HN {r.hn}
          </span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-statusbadge-error, #B91C1C)', fontWeight: 'var(--type-weight-medium)' }}>
            {r.testLabel} — {r.valueSummary}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {r.accessionNo} · {r.location}
          </span>
        </div>
      ),
    },
    {
      key: 'notify',
      label: 'การแจ้งของห้องปฏิบัติการ',
      render: (r) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
            แจ้ง {r.notifiedTo || '—'} · {r.notifiedAt || '—'}
          </span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            โดย {r.notifiedBy || '—'}
          </span>
          <span
            className='inline-flex items-center'
            style={{
              gap: 'var(--dim-space-100)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              color: r.readBack ? 'var(--text-pill-green)' : 'var(--text-statusbadge-error, #B91C1C)',
            }}
          >
            <Icon name={r.readBack ? 'check_circle' : 'error'} size={12} />
            {r.readBack ? 'ทวนค่ากลับแล้ว (read-back)' : 'ยังไม่ได้ทวนค่ากลับ'}
          </span>
        </div>
      ),
    },
    {
      key: 'ack',
      label: 'การรับทราบ',
      render: (r) => (r.acknowledged ? (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
            {r.ackBy} · {r.ackAt}
          </span>
          {r.ackPosition && (
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              {r.ackPosition}
            </span>
          )}
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
            {r.response}
          </span>
        </div>
      ) : (
        <Badge style={isCriticalEscalated(r, now) ? 'error' : 'warning'} size='small' icon='pending'>
          {isCriticalEscalated(r, now) ? `เกิน ${CRITICAL_ESCALATE_MINUTES} นาที` : 'รอแพทย์รับทราบ'}
        </Badge>
      )),
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-150)' }}>
          {!r.acknowledged ? (
            <BrandButton size='sm' leadingIcon='how_to_reg' onClick={() => startAck(r)}>
              กดรับทราบ
            </BrandButton>
          ) : (
            <>
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => startAmend(r)}>
                แก้ไข
              </NeutralSubdueButton>
              <DangerSubdueButton
                variant='outline'
                size='sm'
                leadingIcon='undo'
                onClick={() => { setCancelTarget(r); setCancelReason(''); setCancelAttempted(false); }}
              >
                ยกเลิก
              </DangerSubdueButton>
            </>
          )}
          {onOpenResult && (
            <NeutralSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='open_in_new'
              onClick={() => onOpenResult(r)}
            >
              ดูผล
            </NeutralSubdueButton>
          )}
        </div>
      ),
    },
  ];

  const emptyMessage = tab === 'open'
    /* Success-toned, not blank: an empty ค่าวิกฤต queue is the good outcome
       and must read that way, otherwise it looks like the panel failed to
       load. */
    ? 'ไม่มีค่าวิกฤตที่รอการรับทราบ — ทุกรายการได้รับการตอบรับจากแพทย์แล้ว'
    : 'ยังไม่มีค่าวิกฤตที่ถูกกดรับทราบ';

  return (
    <>
      <Popup
        open={open}
        onClose={onClose}
        size='extraLarge'
        title='ทะเบียนค่าวิกฤต (Critical value register)'
        subtitle={`ห้องปฏิบัติการแจ้งแล้วต้องมีผู้รับทราบที่ระบุชื่อและเวลา — เกิน ${CRITICAL_ESCALATE_MINUTES} นาทีถือเป็นอุบัติการณ์ที่ต้องติดตาม`}
        secondaryAction={{ label: 'ปิด', onClick: onClose }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          {summary.escalated > 0 && (
            <Alert
              type='destructive'
              iconName='running_with_errors'
              iconFill={1}
              title={`มีค่าวิกฤต ${summary.escalated} รายการที่ยังไม่มีผู้รับทราบเกิน ${CRITICAL_ESCALATE_MINUTES} นาที`}
              subtext='ติดต่อแพทย์ผู้สั่งซ้ำและบันทึกผู้รับทราบ — ค่าที่แจ้งแล้วแต่ไม่มีใครรับทราบเท่ากับยังไม่ได้แจ้ง'
              showBadge={false}
              showIndicator={false}
              showDetail={false}
            />
          )}

          {/* Tabs. Plain buttons rather than the shell's TabUnderline because
              this lives inside a Popup, not inside QueuePageShell. */}
          <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
            {[
              { key: 'open', label: 'รอรับทราบ', count: summary.open, icon: 'pending' },
              { key: 'acknowledged', label: 'รับทราบแล้ว', count: summary.acknowledged, icon: 'how_to_reg' },
            ].map((t) => {
              const on = tab === t.key;
              return (
                <button
                  key={t.key}
                  type='button'
                  onClick={() => { setTab(t.key); closeForm(); }}
                  aria-pressed={on}
                  className='inline-flex items-center'
                  style={{
                    gap: 'var(--dim-space-150)',
                    paddingTop: 'var(--dim-space-200)',
                    paddingBottom: 'var(--dim-space-200)',
                    paddingLeft: 'var(--dim-space-400)',
                    paddingRight: 'var(--dim-space-400)',
                    background: on ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
                    border: `var(--dim-stroke-100) solid ${on ? 'var(--border-brandPrimary-default)' : 'var(--border-card-default)'}`,
                    borderRadius: 'var(--dim-radius-full, 9999px)',
                    color: on ? 'var(--text-brandPrimary-default)' : 'var(--text-content-secondary)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm)',
                    fontWeight: 'var(--type-weight-medium)',
                    cursor: 'pointer',
                  }}
                >
                  <Icon name={t.icon} size={16} />
                  {t.label} ({t.count})
                </button>
              );
            })}
            <div className='flex-1' />
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              ทั้งหมด {summary.total} รายการ
            </span>
          </div>

          {sortedRows.length === 0 ? (
            <div
              className='w-full flex flex-col items-center justify-center'
              style={{
                gap: 'var(--dim-space-200)',
                minHeight: 200,
                background: tab === 'open' ? 'var(--surface-alert-success)' : 'var(--surface-card-200)',
                border: `var(--dim-stroke-100) solid ${tab === 'open' ? 'var(--border-alert-success)' : 'var(--border-neutral-quaternary)'}`,
                borderRadius: 'var(--dim-radius-500)',
              }}
            >
              <Icon
                name={tab === 'open' ? 'check_circle' : 'inbox'}
                size={28}
                style={{ color: tab === 'open' ? 'var(--text-alert-success)' : 'var(--text-content-quaternary)' }}
              />
              <span
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  color: tab === 'open' ? 'var(--text-alert-success)' : 'var(--text-content-tertiary)',
                  textAlign: 'center',
                }}
              >
                {emptyMessage}
              </span>
            </div>
          ) : (
            <div className='w-full' style={{ overflowX: 'auto' }}>
              <Table
                columns={columns}
                rows={sortedRows}
                rowKey={(r) => r.id}
                emptyMessage={emptyMessage}
              />
            </div>
          )}

          {/* Acknowledgement form — inline under the table rather than a
              nested popup, so the row it belongs to stays visible while it
              is filled in. */}
          {selected && (
            <div
              className='flex flex-col w-full'
              style={{
                gap: 'var(--dim-space-400)',
                background: 'var(--surface-card-200)',
                border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-tertiary)',
                borderRadius: 'var(--dim-radius-500)',
                paddingTop: 'var(--dim-space-500)',
                paddingBottom: 'var(--dim-space-500)',
                paddingLeft: 'var(--dim-space-500)',
                paddingRight: 'var(--dim-space-500)',
              }}
            >
              <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <Icon name='how_to_reg' size={20} style={{ color: 'var(--text-brandPrimary-default)' }} />
                <span style={{ fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
                  {mode === 'amend' ? 'แก้ไขบันทึกการรับทราบ' : 'บันทึกการรับทราบค่าวิกฤต'}
                </span>
                <Badge style='error' size='small' icon='warning'>{selected.testLabel}</Badge>
                <span style={{ fontFamily: MONO, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                  {selected.accessionNo}
                </span>
                <div className='flex-1' />
                <AgeChip record={selected} now={now} />
              </div>

              <div className='grid grid-cols-2 md:grid-cols-4 w-full' style={{ gap: 'var(--dim-space-400)' }}>
                <Line label='ค่าที่พบ' value={selected.valueSummary} />
                <Line label='ผู้ป่วย' value={`${selected.patientName} · HN ${selected.hn}`} />
                <Line label='แพทย์ผู้สั่ง' value={selected.doctor} />
                <Line label='ห้องปฏิบัติการแจ้งเมื่อ' value={`${selected.notifiedAt} โดย ${selected.notifiedBy}`} />
              </div>

              <FieldGrid cols={3}>
                <Field label='ผู้รับทราบ' required>
                  <Select
                    placeholder='เลือกผู้รับทราบ'
                    value={draft.ackBy}
                    error={errors.ackBy}
                    options={LAB_ACKNOWLEDGERS.map((a) => ({ value: a.name, label: a.name, subtext: a.position }))}
                    onChange={(v) => {
                      const person = LAB_ACKNOWLEDGERS.find((a) => a.name === v);
                      setDraft((d) => ({ ...d, ackBy: v, ackPosition: person?.position ?? '' }));
                      setErrors((e) => ({ ...e, ackBy: undefined }));
                    }}
                    showLabel={false}
                    size='md'
                    searchable={false}
                  />
                </Field>
                <Field label='เวลาที่รับทราบ' required>
                  <InputField
                    type='time'
                    showLabel={false}
                    showLeadingIcon={false}
                    size='md'
                    value={draft.ackAt}
                    error={errors.ackAt}
                    onChange={(v) => {
                      setDraft((d) => ({ ...d, ackAt: typeof v === 'string' ? v : v?.target?.value ?? '' }));
                      setErrors((e) => ({ ...e, ackAt: undefined }));
                    }}
                  />
                </Field>
                <Field label='ตำแหน่ง / หน่วยงาน'>
                  <InputField
                    showLabel={false}
                    showLeadingIcon={false}
                    size='md'
                    placeholder='เติมอัตโนมัติจากผู้รับทราบ'
                    value={draft.ackPosition}
                    onChange={(v) => setDraft((d) => ({ ...d, ackPosition: typeof v === 'string' ? v : v?.target?.value ?? '' }))}
                  />
                </Field>
              </FieldGrid>

              <SuggestibleTextarea
                label='การดำเนินการหลังรับทราบ'
                required
                value={draft.response}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, response: e?.target ? e.target.value : e }));
                  setErrors((er) => ({ ...er, response: undefined }));
                }}
                placeholder='พิมพ์อย่างน้อย 3 ตัวอักษรเพื่อดูข้อความที่ใช้บ่อย เช่น สั่งตรวจซ้ำ / ให้ผู้ป่วยกลับมาทันที'
                suggestions={CRITICAL_RESPONSE_SUGGESTIONS}
                minChars={3}
                voice
                rows={3}
                height={120}
              />
              {errors.response && (
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-danger-secondary)' }}>
                  {errors.response}
                </span>
              )}

              <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <span style={{ flex: 1, minWidth: 200, fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                  ระบบจะบันทึกชื่อผู้รับทราบ เวลา และการดำเนินการลงใน audit trail ของงานชันสูตรโรค
                </span>
                <NeutralSubdueButton variant='outline' size='md' onClick={closeForm}>
                  ยกเลิก
                </NeutralSubdueButton>
                <BrandButton size='md' leadingIcon='save' onClick={handleSubmit}>
                  {mode === 'amend' ? 'บันทึกการแก้ไข' : 'บันทึกการรับทราบ'}
                </BrandButton>
              </div>
            </div>
          )}
        </div>
      </Popup>

      {/* ยกเลิกการรับทราบ — needs a reason, because reopening a closed
          incident without saying why is indistinguishable from a mis-click. */}
      <AlertDialog
        open={!!cancelTarget}
        type='warning'
        title='ยกเลิกบันทึกการรับทราบ?'
        description={cancelTarget
          ? `รายการ ${cancelTarget.testLabel} (${cancelTarget.accessionNo}) จะกลับไปอยู่สถานะรอรับทราบ และนาฬิกาจะนับต่อจากเวลาที่พบค่าเดิม`
          : ''}
        cancelLabel='ไม่ยกเลิก'
        confirmLabel='ยืนยันยกเลิกการรับทราบ'
        onCancel={() => { setCancelTarget(null); setCancelReason(''); setCancelAttempted(false); }}
        onClose={() => { setCancelTarget(null); setCancelReason(''); setCancelAttempted(false); }}
        onConfirm={handleCancelAck}
      >
        <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          <InputField
            label='เหตุผลที่ยกเลิก'
            required
            showLeadingIcon={false}
            size='md'
            placeholder='เช่น ผู้ที่ระบุไว้ไม่ได้เป็นผู้รับสายจริง'
            value={cancelReason}
            error={cancelAttempted && !cancelReason.trim() ? 'ต้องระบุเหตุผลก่อนจึงจะยืนยันได้' : undefined}
            onChange={(v) => setCancelReason(typeof v === 'string' ? v : v?.target?.value ?? '')}
          />
          {!cancelAttempted && !cancelReason.trim() && (
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              ต้องระบุเหตุผลก่อนจึงจะยืนยันได้
            </span>
          )}
        </div>
      </AlertDialog>
    </>
  );
};

export default LabCriticalLogPanel;
