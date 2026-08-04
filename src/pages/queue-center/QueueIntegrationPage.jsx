import React, { useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Switch from '@/components/switch/Switch';
import InputField from '@/components/forms/InputField';
import Dropdown from '@/components/forms/Dropdown';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Alert from '@/components/alert/Alert';
import Tooltip from '@/components/tooltip/Tooltip';
import Icon from '@/components/icons/Icon';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';

import {
  useQueueCenter,
  useQueueSettingsTick,
  QueueCenterSubNav,
  SectionCard,
  FieldLabel,
  HelperText,
  EmptyState,
  ReadOnlyBanner,
  RoleSwitcher,
  DraftInputField,
  toNumberDraft,
  PAGE_BODY_STYLE,
  CARD_STYLE,
} from './queueCenterShared';
import {
  QUEUE_STATIONS,
  PHARMACY_PREP_STATUSES,
  getStation,
  getQueueActor,
  getIntegrationSources,
  getIntegrationLog,
  setIntegrationEnabled,
  syncSource,
  getQueueSettings,
  setQueueSetting,
  getSettingsAudit,
  previewAppointmentOrder,
  formatClock,
  formatDateTh,
  queueTypeMeta,
} from '@/data/queueCenterStore';

/* ════════════════════════════════════════════════════════════════════════
   QueueIntegrationPage — การเชื่อมต่อข้อมูลคิว (TOR 1.3.6.1 / 1.3.6.2 +
   1.3.2.3 / 1.3.2.4 และฝั่ง config ของ 1.3.4.1)

   ผูกจุดบริการของคิวกลางเข้ากับคิวของระบบเดิม (เวชระเบียน · OPD · การเงิน ·
   ห้องยา · แล็บ · เอกซเรย์) และกำหนดกติกาแปลงนัดหมาย → ลำดับคิว

   หน้านี้ "ไม่แก้ไฟล์ของโมดูลต้นทาง" — อ่าน/จำลองผ่าน queueCenterStore
   เท่านั้น ตัวเลขคิวจึงอาจไม่ตรงกับหน้า /opd/queue, /pharmacy/queue ฯลฯ
   100% (ระบุเป็นข้อจำกัดใน manifest)
   ════════════════════════════════════════════════════════════════════════ */

const breadcrumb = ['ระบบบริหารจัดการคิว', 'การเชื่อมต่อข้อมูลคิว'];

const WALKIN_RULES = [
  { value: 'append', label: 'ต่อท้ายรอบนัดหมาย' },
  { value: 'urgency', label: 'สลับตามความเร่งด่วน' },
];

const QueueIntegrationPage = () => {
  useQueueCenter();
  useQueueSettingsTick();
  const actor = getQueueActor();
  const canAdmin = actor.canAdmin;

  const [activeTab, setActiveTab] = useState('sources');
  const [toast, setToast] = useState('');
  const [banner, setBanner] = useState(null);
  const [previewStationId, setPreviewStationId] = useState('st-opd');

  const settings = getQueueSettings();
  const sources = getIntegrationSources();
  const log = getIntegrationLog();

  const guardAdmin = () => {
    if (canAdmin) return true;
    setBanner({
      type: 'warning',
      title: 'ต้องมีสิทธิผู้ดูแลระบบ',
      subtext: 'บทบาทปัจจุบันดูข้อมูลการเชื่อมต่อได้อย่างเดียว',
    });
    return false;
  };

  const doSync = (id) => {
    if (!guardAdmin()) return;
    const res = syncSource(id);
    if (res.ok) { setToast(res.message); setBanner(null); }
    else setBanner({ type: 'destructive', title: 'ดึงข้อมูลไม่สำเร็จ', subtext: res.message });
  };

  const patchRule = (key) => (value) => {
    if (!guardAdmin()) return;
    setQueueSetting('appointmentRule', key, value);
    setToast('บันทึกกติกาแล้ว');
  };

  /* ────────────────────────────────────── tab 1: จุดบริการ ↔ ระบบต้นทาง */

  const sourceColumns = [
    {
      key: 'stations',
      label: 'จุดบริการที่ผูกไว้',
      flex: true,
      minWidth: 240,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
          {r.stationIds.length === 0 ? (
            <span style={{ color: 'var(--text-content-tertiary)' }}>ยังไม่ผูกจุดบริการ</span>
          ) : r.stationIds.slice(0, 4).map((id) => (
            <ColorfulBadge key={id} style='teal' size='small' hierarchy='secondary'>
              {getStation(id)?.label || id}
            </ColorfulBadge>
          ))}
          {r.stationIds.length > 4 ? (
            <Tooltip content={r.stationIds.slice(4).map((id) => getStation(id)?.label).join(' · ')} position='top'>
              <span className='inline-flex'>
                <ColorfulBadge style='grey' size='small' hierarchy='secondary'>{`+${r.stationIds.length - 4}`}</ColorfulBadge>
              </span>
            </Tooltip>
          ) : null}
        </div>
      ),
    },
    { key: 'label', label: 'ระบบต้นทาง', width: 200 },
    {
      key: 'path',
      label: 'เส้นทาง',
      width: 190,
      render: (r) => (
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-secondary)',
          }}
        >
          {r.path || '—'}
        </span>
      ),
    },
    { key: 'todayCount', label: 'คิวที่ดึงเข้ามาวันนี้', width: 168, render: (r) => `${r.todayCount} รายการ` },
    {
      key: 'connected',
      label: 'สถานะเชื่อมต่อ',
      width: 176,
      render: (r) => (
        <Tooltip content={r.message} position='top'>
          <span className='inline-flex'>
            <StatusBadge style={r.connected ? 'success' : r.enabled ? 'error' : 'neutral'} size='small'>
              {r.connected ? 'เชื่อมต่อสำเร็จ' : r.enabled ? 'เชื่อมต่อไม่สำเร็จ' : 'ปิดการเชื่อมต่อ'}
            </StatusBadge>
          </span>
        </Tooltip>
      ),
    },
    {
      key: 'lastSyncAt',
      label: 'ซิงก์ล่าสุด',
      width: 160,
      render: (r) => (r.lastSyncAt ? `${formatDateTh(r.lastSyncAt)} ${formatClock(r.lastSyncAt)} น.` : 'ยังไม่เคยซิงก์'),
    },
    {
      key: 'action',
      label: 'การดำเนินการ',
      width: 220,
      sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <Tooltip content={canAdmin ? (r.enabled ? 'ปิดการเชื่อมต่อ' : 'เปิดการเชื่อมต่อ') : 'ต้องมีสิทธิผู้ดูแลระบบ'} position='top'>
            <span className='inline-flex'>
              <Switch
                checked={r.enabled}
                disabled={!canAdmin}
                aria-label={`เปิด-ปิดการเชื่อมต่อ ${r.label}`}
                onChange={(next) => {
                  if (!guardAdmin()) return;
                  setIntegrationEnabled(r.id, typeof next === 'boolean' ? next : !r.enabled);
                  setToast(`${r.label} — ${(typeof next === 'boolean' ? next : !r.enabled) ? 'เปิด' : 'ปิด'}การเชื่อมต่อแล้ว`);
                }}
              />
            </span>
          </Tooltip>
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='sync'
            disabled={!canAdmin || !r.enabled}
            onClick={() => doSync(r.id)}
          >
            ดึงข้อมูลใหม่
          </NeutralSubdueButton>
        </div>
      ),
    },
  ];

  /* ─────────────────────────────────────────── tab 2: นัดหมาย → คิว */

  /* previewAppointmentOrder เป็น read-only แล้ว (คำนวณลำดับที่ "จะเป็น" ลงสำเนา
     ไม่เขียนกลับ store) — เดิมมันเรียก applyAppointmentOrdering ทำให้แค่ render
     หน้านี้ก็ไปรีเซ็ตลำดับคิวจริงโดยไม่ notify() */
  const previewRows = previewAppointmentOrder(previewStationId).slice(0, 8);

  /* ──────────────────────────────────────────────── tab 4: log table */

  const logColumns = [
    { key: 'at', label: 'วัน-เวลา', width: 190, render: (r) => `${formatDateTh(r.at)} ${formatClock(r.at)} น.` },
    { key: 'source', label: 'ระบบต้นทาง', width: 200, render: (r) => sources.find((s) => s.id === r.sourceId)?.label || 'ระบบคิวกลาง' },
    { key: 'action', label: 'รายการ', width: 190 },
    { key: 'actor', label: 'ผู้ทำรายการ', width: 190 },
    { key: 'role', label: 'บทบาท', width: 190 },
    {
      key: 'result',
      label: 'ผลลัพธ์',
      width: 140,
      render: (r) => (
        <StatusBadge style={r.result === 'success' ? 'success' : 'error'} size='small'>
          {r.result === 'success' ? 'สำเร็จ' : 'ไม่สำเร็จ'}
        </StatusBadge>
      ),
    },
    { key: 'detail', label: 'รายละเอียด', flex: true, minWidth: 220 },
  ];

  const tabs = [
    { key: 'sources', label: 'จุดบริการ ↔ ระบบต้นทาง', icon: 'hub' },
    { key: 'appointment', label: 'นัดหมาย → คิว', icon: 'event_upcoming' },
    { key: 'pharmacy', label: 'สถานะเตรียมยา', icon: 'medication' },
    { key: 'log', label: 'บันทึกการเชื่อมต่อ', icon: 'receipt_long' },
  ];

  const connectedCount = sources.filter((s) => s.connected).length;
  const summaryCards = [
    { key: 'connected', label: 'เชื่อมต่อสำเร็จ', value: connectedCount, indicator: `จากทั้งหมด ${sources.length} ระบบ`, color: 'positive', icon: 'link' },
    { key: 'failed', label: 'เชื่อมต่อไม่สำเร็จ', value: sources.filter((s) => s.enabled && !s.connected).length, indicator: 'ทำงานต่อในโหมด manual ได้', color: 'destructive', icon: 'link_off' },
    { key: 'pulled', label: 'คิวที่ดึงเข้ามาวันนี้', value: sources.reduce((sum, s) => sum + s.todayCount, 0), indicator: 'ทุกระบบต้นทาง', color: 'info', icon: 'download' },
    { key: 'rule', label: 'จัดลำดับตามนัดหมาย', value: settings.appointmentRule.sortByAppointment ? 'เปิด' : 'ปิด', indicator: `รอบละ ${settings.appointmentRule.roundWindowMinutes} นาที`, color: 'brand', icon: 'rule' },
  ];

  const auditOf = (section) => {
    const a = getSettingsAudit(section);
    return a ? { by: a.by, at: `${formatDateTh(a.at)} ${formatClock(a.at)} น.` } : null;
  };

  return (
    <>
      <QueuePageShell
        activeKey='queue-center'
        sidebarFallbackKey='opd'
        breadcrumb={breadcrumb}
        title='การเชื่อมต่อข้อมูลคิว'
        actions={<RoleSwitcher />}
        summaryTitle='ผูกคิวกลางเข้ากับระบบงานเดิม'
        summaryCards={summaryCards}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <div className='flex flex-col flex-1 min-w-0' style={PAGE_BODY_STYLE}>
          {/* เมนูย่อยของโมดูล — วางในเนื้อหาแทน slot belowSummary ของ shell
              เพราะ shell ทำให้ slot นั้นกับแถบแท็บ sticky ทับกันที่ตำแหน่งเดียวกัน */}
          <QueueCenterSubNav />

          {!canAdmin ? (
            <ReadOnlyBanner message='หน้าการเชื่อมต่อข้อมูลคิวต้องมีสิทธิผู้ดูแลระบบจึงจะแก้ไขได้ — ตอนนี้ดูข้อมูลและบันทึกการเชื่อมต่อได้อย่างเดียว' />
          ) : null}

          {banner ? (
            <Alert type={banner.type} title={banner.title} subtext={banner.subtext} onClose={() => setBanner(null)} />
          ) : null}

          {activeTab === 'sources' ? (
            <section className='w-full flex flex-col' style={CARD_STYLE}>
              <Alert
                type='info'
                title='คิวกลางไม่เขียนทับข้อมูลของระบบต้นทาง'
                subtext='หน้านี้กำหนดว่าจุดบริการใดรับคิวมาจากระบบใด เมื่อเชื่อมต่อไม่สำเร็จ คิวยังทำงานต่อได้ในโหมด manual (ออกคิวที่เคาน์เตอร์)'
              />
              <Table
                columns={sourceColumns}
                rows={sources}
                rowKey={(r) => r.id}
                emptyMessage='ยังไม่มีการตั้งค่าระบบต้นทาง'
              />
              <ConsentAuditBar
                recordedBy={actor.name}
                recordedAt={`${formatDateTh(new Date().toISOString())} ${formatClock(new Date().toISOString())} น.`}
              />
            </section>
          ) : null}

          {activeTab === 'appointment' ? (
            <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-600)' }}>
              <SectionCard
                icon='rule'
                title='กติกาแปลงนัดหมายเป็นลำดับคิว'
                subtitle='ใช้ทั้งตอนออกคิวจากนัดหมาย (1.3.6.1) และตอนออกคิวหน้าเคาน์เตอร์ (1.3.2.3)'
              >
                <div className='w-full flex items-start justify-between flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                  <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                    <FieldLabel>จัดลำดับตามช่วงเวลานัดหมาย</FieldLabel>
                    <HelperText>
                      เปิด = ผู้มีนัดในรอบเดียวกันถูกจัดไว้ก่อน Walk-in · ปิด = เรียงตามเวลามาก่อน-หลังล้วน
                    </HelperText>
                  </div>
                  <Switch
                    checked={settings.appointmentRule.sortByAppointment}
                    disabled={!canAdmin}
                    aria-label='จัดลำดับตามช่วงเวลานัดหมาย'
                    onChange={(next) => patchRule('sortByAppointment')(
                      typeof next === 'boolean' ? next : !settings.appointmentRule.sortByAppointment,
                    )}
                  />
                </div>

                <div className='w-full grid grid-cols-1 md:grid-cols-3' style={{ gap: 'var(--dim-space-400)' }}>
                  <DraftInputField
                    label='ช่วงเวลาที่นับเป็นรอบเดียวกัน (นาที)'
                    type='number'
                    value={settings.appointmentRule.roundWindowMinutes}
                    disabled={!canAdmin}
                    showLeadingIcon={false}
                    helperText='เช่น 30 = นัด 09:00–09:29 อยู่รอบเดียวกัน'
                    error={!(Number(settings.appointmentRule.roundWindowMinutes) >= 1) ? 'ต้องมากกว่า 0' : undefined}
                    parse={toNumberDraft}
                    onCommit={patchRule('roundWindowMinutes')}
                  />
                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                    <FieldLabel>กติกาแทรก Walk-in</FieldLabel>
                    <Dropdown
                      value={settings.appointmentRule.walkinRule}
                      onChange={patchRule('walkinRule')}
                      options={WALKIN_RULES}
                      state={canAdmin ? 'default' : 'disabled'}
                    />
                  </div>
                  <DraftInputField
                    label='ผ่อนผันมาสายได้ (นาที)'
                    type='number'
                    value={settings.appointmentRule.graceMinutes}
                    disabled={!canAdmin}
                    showLeadingIcon={false}
                    helperText='ค่าเตรียมไว้สำหรับการรับผู้มาสายจาก Kiosk/เคาน์เตอร์ — หน้านี้ยังไม่นำไปตัดสินสถานะ'
                    error={!(Number(settings.appointmentRule.graceMinutes) >= 0) ? 'ต้องเป็นตัวเลขตั้งแต่ 0' : undefined}
                    parse={toNumberDraft}
                    onCommit={patchRule('graceMinutes')}
                  />
                </div>

                <ConsentAuditBar
                  recordedBy={auditOf('appointmentRule')?.by || '—'}
                  recordedAt={auditOf('appointmentRule')?.at || 'ยังไม่เคยแก้ไข'}
                />
              </SectionCard>

              <SectionCard
                icon='preview'
                title='พรีวิวลำดับผลลัพธ์'
                subtitle='ลำดับที่ผู้รับบริการจะถูกเรียกจริงเมื่อใช้กติกาข้างบน'
                action={(
                  <Dropdown
                    value={previewStationId}
                    onChange={setPreviewStationId}
                    options={QUEUE_STATIONS.map((s) => ({ value: s.id, label: `${s.prefix} · ${s.label}` }))}
                    size='sm'
                    className='w-64'
                  />
                )}
              >
                {previewRows.length === 0 ? (
                  <EmptyState
                    icon='inbox'
                    title='จุดบริการนี้ยังไม่มีคิวรอเรียก'
                    description='เลือกจุดบริการอื่น หรือออกคิวเพิ่มจากหน้าการออกคิว'
                  />
                ) : (
                  <ol className='w-full flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                    {previewRows.map((q, i) => (
                      <li
                        key={q.id}
                        className='w-full flex items-center'
                        style={{
                          gap: 'var(--dim-space-300)',
                          border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
                          borderRadius: 'var(--dim-radius-200, 8px)',
                          paddingTop: 'var(--dim-space-200)',
                          paddingRight: 'var(--dim-space-300)',
                          paddingBottom: 'var(--dim-space-200)',
                          paddingLeft: 'var(--dim-space-300)',
                        }}
                      >
                        <span
                          className='inline-flex items-center justify-center shrink-0'
                          style={{
                            width: 'var(--dim-size-500, 24px)',
                            height: 'var(--dim-size-500, 24px)',
                            borderRadius: 'var(--dim-radius-full, 9999px)',
                            background: 'var(--surface-brandPrimary-quaternary)',
                            color: 'var(--text-brandPrimary-default)',
                            fontFamily: 'var(--type-family-body)',
                            fontSize: 'var(--type-size-xs, 12px)',
                            fontWeight: 'var(--type-weight-bold, 700)',
                          }}
                        >
                          {i + 1}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--type-family-body)',
                            fontSize: 'var(--type-size-base, 16px)',
                            fontWeight: 'var(--type-weight-bold, 700)',
                            color: 'var(--text-brandPrimary-default)',
                          }}
                        >
                          {q.code}
                        </span>
                        <span
                          className='flex-1 min-w-0 truncate'
                          style={{
                            fontFamily: 'var(--type-family-body)',
                            fontSize: 'var(--type-size-sm, 14px)',
                            color: 'var(--text-content-primary)',
                          }}
                        >
                          {q.patient?.name || 'ผู้รับบริการไม่ระบุตัวตน'}
                        </span>
                        <ColorfulBadge style={queueTypeMeta(q.queueType).color} size='small' hierarchy='secondary'>
                          {queueTypeMeta(q.queueType).label}
                        </ColorfulBadge>
                        <span
                          style={{
                            fontFamily: 'var(--type-family-body)',
                            fontSize: 'var(--type-size-xs, 12px)',
                            color: 'var(--text-content-tertiary)',
                          }}
                        >
                          {q.appointmentTime ? `นัด ${q.appointmentTime} น.` : `Walk-in ${formatClock(q.issuedAt)} น.`}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </SectionCard>
            </div>
          ) : null}

          {activeTab === 'pharmacy' ? (
            <SectionCard
              icon='medication'
              title='สถานะเตรียมยา → ป้ายที่แสดงบนคิวและจอ TV'
              subtitle='TOR 1.3.6.2 — คิวจุดรับยาแสดงสถานะจากห้องยาให้ผู้รับบริการเห็น'
            >
              <Alert
                type='info'
                title='ค่าที่ตั้งที่นี่ใช้ทั้งตารางคิวและจอแสดงคิว'
                subtext='โมดูลจอแสดงคิวอ่านชื่อป้ายจากคิวกลาง — เปลี่ยนที่นี่ที่เดียวแล้วเปลี่ยนพร้อมกันทั้งสองที่'
              />
              <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
                {PHARMACY_PREP_STATUSES.map((s) => (
                  <div
                    key={s.key}
                    className='w-full flex items-center flex-wrap'
                    style={{
                      gap: 'var(--dim-space-400)',
                      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
                      borderRadius: 'var(--dim-radius-200, 8px)',
                      paddingTop: 'var(--dim-space-300)',
                      paddingRight: 'var(--dim-space-400)',
                      paddingBottom: 'var(--dim-space-300)',
                      paddingLeft: 'var(--dim-space-400)',
                    }}
                  >
                    <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)', minWidth: 'var(--dim-size-2100, 160px)' }}>
                      <ColorfulBadge style={s.color} size='small' hierarchy='secondary'>{s.label}</ColorfulBadge>
                      <Icon name='arrow_forward' size={16} style={{ color: 'var(--text-content-tertiary)' }} />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <InputField
                        label={`ข้อความที่แสดงเมื่อสถานะ = ${s.label}`}
                        value={settings.pharmacyMap[s.key] || ''}
                        disabled={!canAdmin}
                        showLeadingIcon={false}
                        error={!String(settings.pharmacyMap[s.key] || '').trim() ? 'ต้องมีข้อความอย่างน้อย 1 ตัวอักษร' : undefined}
                        onChange={(val) => {
                          if (!guardAdmin()) return;
                          setQueueSetting('pharmacyMap', s.key, val);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <ConsentAuditBar
                recordedBy={auditOf('pharmacyMap')?.by || '—'}
                recordedAt={auditOf('pharmacyMap')?.at || 'ยังไม่เคยแก้ไข'}
              />
            </SectionCard>
          ) : null}

          {activeTab === 'log' ? (
            <section className='w-full flex flex-col' style={CARD_STYLE}>
              {log.length === 0 ? (
                <EmptyState
                  icon='receipt_long'
                  title='ยังไม่มีบันทึกการเชื่อมต่อ'
                  description='ทุกครั้งที่เปิด/ปิดการเชื่อมต่อ หรือกดดึงข้อมูลใหม่ ระบบจะบันทึกผู้ทำรายการ เวลา และผลลัพธ์ไว้ที่นี่'
                />
              ) : (
                <Table columns={logColumns} rows={log} rowKey={(r) => r.id} emptyMessage='ไม่พบรายการ' />
              )}
            </section>
          ) : null}
        </div>
      </QueuePageShell>

      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} topOffset='var(--dim-space-800, 32px)' />
    </>
  );
};

export default QueueIntegrationPage;
