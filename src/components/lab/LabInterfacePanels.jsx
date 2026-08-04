import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import Alert from '@/components/alert/Alert';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import { Icon } from '@/components/icons/Icon';
import {
  LAB_ANALYZERS, getMappings, setMapping, addMapping,
  unmappedCount, mappableTestOptions, getMessages,
} from '@/data/labInterfaces';

/* Monospace is a rendering requirement for codes and identifiers, not a
   design-system value — there is no --type-family-mono in tokens.css, so a
   var() that only ever resolves to its own fallback is drift waiting to
   happen. Plain stack, stated once. */
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/* แท็บ "จับคู่รหัส" และ "คิวข้อความ" ของหน้า /lab/interface.

   Split out of LabInterfacePage for the same reason the analyser tab was:
   the page is a shell of state + confirm dialogs, and four tab bodies inline
   turned it into a file nobody would want to edit. Both panels here call the
   labInterfaces.js store directly for reads and non-destructive writes, and
   hand DESTRUCTIVE actions (remove a mapping, bounce a message) back to the
   page as callbacks — those need a confirm dialog with a mandatory reason,
   and keeping all the dialogs in one place is what stops two of them from
   drifting apart. */

export const InterfaceCard = ({ icon, title, subtitle, action, children }) => (
  <section
    className='flex flex-col w-full'
    style={{
      background: 'var(--surface-card-100)',
      borderRadius: 'var(--dim-radius-500)',
      boxShadow: 'var(--shadow-card)',
      paddingTop: 'var(--dim-space-600)',
      paddingRight: 'var(--dim-space-600)',
      paddingBottom: 'var(--dim-space-600)',
      paddingLeft: 'var(--dim-space-600)',
      gap: 'var(--dim-space-400)',
    }}
  >
    <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
      {icon && <Icon name={icon} size={20} style={{ color: 'var(--text-brandPrimary-default)' }} />}
      <div className='flex flex-col min-w-0' style={{ flex: '1 1 240px', gap: 'var(--dim-space-050, 2px)' }}>
        <span style={{ fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
          {title}
        </span>
        {subtitle && (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {subtitle}
          </span>
        )}
      </div>
      {action}
    </div>
    {children}
  </section>
);

export const InterfaceEmptyState = ({ icon, title, hint, tone = 'neutral' }) => (
  <div
    className='w-full flex flex-col items-center justify-center'
    style={{
      gap: 'var(--dim-space-200)',
      minHeight: 200,
      background: tone === 'error' ? 'var(--surface-alert-error)' : 'var(--surface-card-200)',
      border: `var(--dim-stroke-100) solid ${tone === 'error' ? 'var(--border-alert-error)' : 'var(--border-neutral-quaternary)'}`,
      borderRadius: 'var(--dim-radius-500)',
    }}
  >
    <Icon name={icon} size={28} style={{ color: tone === 'error' ? 'var(--text-alert-error)' : 'var(--text-content-quaternary)' }} />
    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: tone === 'error' ? 'var(--text-alert-error)' : 'var(--text-content-tertiary)', textAlign: 'center' }}>
      {title}
    </span>
    {hint && (
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-quaternary)', textAlign: 'center' }}>
        {hint}
      </span>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────
   จับคู่รหัส (analyser/LIS code ↔ catalog test ↔ TMLT) */
export const LabCodeMappingPanel = ({
  canEdit = true,
  denyReason,
  version = 0,
  actor,
  draft,
  onDraftChange,
  onRequestRemove,
  onToast,
}) => {
  const mappings = useMemo(() => getMappings(), [version]);
  const testOptions = useMemo(() => mappableTestOptions(), [version]);
  const unmapped = unmappedCount();

  const columns = [
    {
      key: 'code',
      label: 'รหัสจากเครื่อง / LIS',
      width: 150,
      render: (m) => (
        <span style={{ fontFamily: MONO, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
          {m.code}
        </span>
      ),
    },
    {
      key: 'analyzerName',
      label: 'เครื่องตรวจวิเคราะห์',
      width: 200,
      render: (m) => (
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
          {m.analyzerName}
        </span>
      ),
    },
    {
      key: 'testId',
      label: 'รายการตรวจในระบบ',
      render: (m) => (
        <Select
          placeholder='— ยังไม่จับคู่ —'
          value={m.testId ?? ''}
          options={testOptions}
          onChange={(v) => {
            setMapping(m.code, m.analyzer, v, { actor });
            onToast?.(v ? 'จับคู่รหัสแล้ว' : 'ยกเลิกการจับคู่รหัสแล้ว');
          }}
          showLabel={false}
          size='md'
          disabled={!canEdit}
        />
      ),
    },
    {
      key: 'tmlt',
      label: 'TMLT / LOINC',
      width: 170,
      render: (m) => (m.testId ? (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ fontFamily: MONO, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
            TMLT {m.tmlt || '—'}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            LOINC {m.loinc || '—'}
          </span>
        </div>
      ) : (
        <Badge style='error' size='small' icon='link_off'>ยังไม่จับคู่</Badge>
      )),
    },
    {
      key: 'actions',
      label: '',
      width: 110,
      render: (m) => (
        <DangerSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='delete'
          disabled={!canEdit}
          title={canEdit ? undefined : denyReason}
          onClick={() => onRequestRemove(m)}
        >
          ลบ
        </DangerSubdueButton>
      ),
    },
  ];

  return (
    <InterfaceCard
      icon='link'
      title='จับคู่รหัสเครื่องตรวจ / LIS กับรายการตรวจในระบบ'
      /* The "เปิด TMLT Browser" button that used to sit here opened
         https://tmlt-browser.this.or.th — a hostname that does not resolve.
         A dead external link on an integration screen reads as a broken
         deployment to whoever clicks it, and a failed navigation in a new
         tab is not something this page can even detect, let alone handle.
         The code-lookup guidance moved into the subtitle rather than staying
         attached to a fabricated URL; a real สำนักอนามัย TMLT browser link
         can be restored here once one is confirmed from the reference docs. */
      subtitle='รหัสที่ยังไม่จับคู่ไม่ได้ถูกทิ้ง แต่จะถูกกักไว้ในคิวข้อความ — ผลจะไม่เข้าถึงผู้ป่วยจนกว่าจะจับคู่ · รหัส TMLT / LOINC ของแต่ละรายการตรวจดูได้จากทะเบียนรายการตรวจในหน้าตั้งค่า (/lab/setup)'
    >
      {/* An unmapped code is not cosmetic: the message arrives, no catalog row
          claims it, and the result goes nowhere. Persistent strip, not a
          transient toast. */}
      {unmapped > 0 && (
        <Alert
          type='destructive'
          iconName='link_off'
          iconFill={1}
          title={`มีรหัส ${unmapped} รายการที่ยังไม่ได้จับคู่กับรายการตรวจ`}
          subtext='ผลที่ส่งมาด้วยรหัสเหล่านี้จะถูกกักไว้และไม่ปรากฏในผลของผู้ป่วย'
          showBadge={false}
          showIndicator={false}
          showDetail={false}
        />
      )}

      <div className='w-full' style={{ overflowX: 'auto' }}>
        <Table
          columns={columns}
          rows={mappings}
          rowKey={(m) => `${m.analyzer}::${m.code}`}
          emptyMessage='ยังไม่มีการจับคู่รหัสในระบบ'
        />
      </div>

      <div
        className='flex flex-wrap items-end w-full'
        style={{
          gap: 'var(--dim-space-300)',
          background: 'var(--surface-card-200)',
          border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
          borderRadius: 'var(--dim-radius-300)',
          paddingTop: 'var(--dim-space-400)',
          paddingBottom: 'var(--dim-space-400)',
          paddingLeft: 'var(--dim-space-400)',
          paddingRight: 'var(--dim-space-400)',
        }}
      >
        <div style={{ width: 180 }}>
          <InputField
            label='รหัสจากเครื่อง / LIS'
            size='md'
            showLeadingIcon={false}
            placeholder='เช่น ESR'
            value={draft.code}
            disabled={!canEdit}
            onChange={(v) => onDraftChange({ ...draft, code: typeof v === 'string' ? v : v?.target?.value ?? '' })}
          />
        </div>
        <div style={{ width: 240 }}>
          <Select
            label='เครื่องตรวจวิเคราะห์'
            value={draft.analyzer}
            options={LAB_ANALYZERS.map((a) => ({ value: a.key, label: a.name }))}
            onChange={(v) => onDraftChange({ ...draft, analyzer: v })}
            size='md'
            disabled={!canEdit}
            searchable={false}
          />
        </div>
        <div style={{ width: 300 }}>
          <Select
            label='รายการตรวจในระบบ'
            value={draft.testId}
            options={testOptions}
            onChange={(v) => onDraftChange({ ...draft, testId: v })}
            size='md'
            disabled={!canEdit}
          />
        </div>
        <NeutralSubdueButton
          variant='outline'
          size='md'
          leadingIcon='add'
          disabled={!canEdit || !String(draft.code ?? '').trim()}
          title={canEdit ? undefined : denyReason}
          onClick={() => {
            const ok = addMapping(String(draft.code).trim(), draft.analyzer, draft.testId, { actor });
            onToast?.(ok ? 'เพิ่มรหัสจับคู่แล้ว' : 'รหัสนี้มีอยู่แล้วสำหรับเครื่องนี้');
            if (ok) onDraftChange({ code: '', analyzer: LAB_ANALYZERS[0].key, testId: '' });
          }}
        >
          เพิ่มรหัส
        </NeutralSubdueButton>
      </div>
    </InterfaceCard>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   คิวข้อความเข้า-ออก */
export const LabMessageQueuePanel = ({
  canEdit = true,
  denyReason,
  version = 0,
  connected = true,
  onImport,
  onRequestBounce,
}) => {
  const [filter, setFilter] = useState('all');
  const messages = useMemo(() => getMessages(), [version]);
  const filtered = useMemo(
    () => (filter === 'all' ? messages : messages.filter((m) => m.state === filter)),
    [messages, filter],
  );

  const columns = [
    {
      key: 'id',
      label: 'ข้อความ',
      width: 190,
      render: (m) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', fontFamily: MONO, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
            <Icon name={m.direction === 'in' ? 'south_west' : 'north_east'} size={14} />
            {m.id}
          </span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {m.type} · {m.at} · {m.direction === 'in' ? 'ขาเข้า' : 'ขาออก'}
          </span>
        </div>
      ),
    },
    {
      key: 'code',
      label: 'รหัส / Accession',
      width: 180,
      render: (m) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ fontFamily: MONO, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
            {m.code}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {m.accessionNo}
          </span>
        </div>
      ),
    },
    {
      key: 'analyzerName',
      label: 'เครื่อง / ค่าที่ได้',
      render: (m) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
            {m.analyzerName}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {m.values ? Object.entries(m.values).map(([k, v]) => `${k}=${v}`).join(' · ') : m.raw}
          </span>
          {m.note && (
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-statusbadge-warning, #C2410C)' }}>
              {m.note}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'state',
      label: 'สถานะ',
      width: 150,
      render: (m) => <Badge style={m.stateColor === 'neutral' ? 'neutral' : m.stateColor} size='small'>{m.stateLabel}</Badge>,
    },
    {
      key: 'actions',
      label: '',
      width: 220,
      render: (m) => (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-150)' }}>
          {m.direction === 'in' && m.state !== 'imported' && m.state !== 'bounced' && (
            <BrandPrimaryButton size='sm' leadingIcon='download' disabled={!canEdit} title={canEdit ? undefined : denyReason} onClick={() => onImport(m)}>
              นำเข้าผล
            </BrandPrimaryButton>
          )}
          {m.state !== 'bounced' && (
            <DangerSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='undo'
              disabled={!canEdit}
              title={canEdit ? undefined : denyReason}
              onClick={() => onRequestBounce(m)}
            >
              ตีกลับ
            </DangerSubdueButton>
          )}
        </div>
      ),
    },
  ];

  return (
    <InterfaceCard
      icon='forum'
      title='คิวข้อความเข้า-ออกกับเครื่องตรวจวิเคราะห์'
      subtitle='ข้อความที่ไม่พบรหัสจับคู่หรือไม่พบใบคำขอจะถูกกักไว้ ไม่ถูกทิ้งเงียบ'
      action={(
        <div style={{ width: 220 }}>
          <Select
            value={filter}
            options={[
              { value: 'all', label: 'ทุกสถานะ' },
              { value: 'pending', label: 'รอนำเข้า' },
              { value: 'imported', label: 'นำเข้าแล้ว' },
              { value: 'unmapped', label: 'ไม่พบรหัสที่จับคู่' },
              { value: 'quarantined', label: 'กักไว้ตรวจสอบ' },
              { value: 'bounced', label: 'ตีกลับ' },
            ]}
            onChange={setFilter}
            showLabel={false}
            size='md'
            searchable={false}
          />
        </div>
      )}
    >
      {/* "ยังไม่มีข้อความ" and "เชื่อมต่อไม่ได้" are DIFFERENT states — the
          first is a quiet morning, the second is an outage, and rendering
          them the same way hides the outage behind the quiet morning. */}
      {!connected ? (
        <InterfaceEmptyState
          icon='wifi_off'
          tone='error'
          title='เชื่อมต่อกับ LIS ไม่ได้ — ไม่สามารถรับข้อความใหม่ได้'
          hint='ตรวจสอบการตั้งค่าที่แท็บ "การเชื่อมต่อ LIS" แล้วกดทดสอบการเชื่อมต่ออีกครั้ง'
        />
      ) : filtered.length === 0 ? (
        <InterfaceEmptyState
          icon='inbox'
          title={filter === 'all' ? 'ยังไม่มีข้อความจาก LIS' : 'ไม่พบข้อความในสถานะที่เลือก'}
          hint={filter === 'all'
            ? 'ข้อความจะปรากฏที่นี่เมื่อเครื่องตรวจวิเคราะห์ส่งผลเข้ามา'
            : 'ลองเลือก "ทุกสถานะ" เพื่อดูข้อความทั้งหมด'}
        />
      ) : (
        <div className='w-full' style={{ overflowX: 'auto' }}>
          <Table
            columns={columns}
            rows={filtered}
            rowKey={(m) => m.id}
            emptyMessage='ยังไม่มีข้อความจาก LIS'
          />
        </div>
      )}
    </InterfaceCard>
  );
};
