import React, { useEffect, useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import Badge from '@/components/badge/Badge';
import Alert from '@/components/alert/Alert';
import Information from '@/components/information/Information';
import AlertDialog from '@/components/popup/AlertDialog';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import PasswordField from '@/components/forms/PasswordField';
import { Field, FieldGrid } from '@/components/forms/Fields';
import Switch from '@/components/switch/Switch';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import { Icon } from '@/components/icons/Icon';
import LabSubNav from '@/components/lab/LabSubNav';
import StickyStatusTabBar from '@/components/tab/StickyStatusTabBar';
import LabQcRunPopup from '@/components/lab/LabQcRunPopup';
import LabAnalyzerQcPanel from '@/components/lab/LabAnalyzerQcPanel';
import { LabCodeMappingPanel, LabMessageQueuePanel } from '@/components/lab/LabInterfacePanels';
import {
  LIS_PROTOCOLS, getConnection, validateConnection, testConnection, saveConnection,
  retryConnection, LAB_ANALYZERS, LAB_ANALYZER_BY_KEY,
  setAnalyzerReportMode, getMappings, removeMapping, getMessages,
  markMessageImported, bounceMessage, interfaceHealth, subscribeInterfaces,
} from '@/data/labInterfaces';
import {
  qcHealth, recordQcRun, amendQcRun, voidQcRun, recordCalibration,
  overrideQcBlock, clearQcOverride, isOutOfControl, isQcStale, subscribeQc,
} from '@/data/labQc';
import { useLabPermissions } from '@/data/labPermissions';

/* เชื่อมต่อ LIS และเครื่องตรวจวิเคราะห์ — TOR §1.15.1.

   ── HONEST LIMITATION, ON THE PAGE'S OWN FACE ───────────────────────────
   §1.15.1 asks the system to CONNECT to สำนักอนามัย's LIS. That cannot be
   satisfied by a frontend: there is no backend here, no HL7 v2.5.1 parser,
   no ASTM E1381/E1394 driver and no socket. What this screen delivers is
   the CONFIGURATION SURFACE the clause implies — endpoint, credentials, a
   connection test, the analyser roster, the analyser-code ↔ TMLT mapping
   table and an inbound/outbound message log — over mock transport.

   The manifest reports §1.15.1 as `partial`, and the banner below says the
   same thing to the user. Claiming `done` on the single most auditable
   clause in the section would be a false claim, and the page that carries
   the claim is the right place to disclose it.
   ────────────────────────────────────────────────────────────────────────

   Field names come from the MyHOSPITAL Lab manual (Kaebrain folder in the
   Obsidian vault): "ตั้งค่าเชื่อมต่อฐานข้อมูล" p.4 for host/port/database/
   user/password, and the per-instrument ประเภทการรายงานผล Normal / Manual /
   Automatic from the setup screen on p.8.

   QC lives at the top of the analyser tab rather than as a screen of its
   own, because its only consequence is on this page: an instrument whose
   daily control is out of range must not have its results imported, and
   that gate is enforced here. */

const breadcrumb = ['ห้องปฏิบัติการ', 'เชื่อมต่อ LIS'];
const TODAY = '2026-07-31';
const CURRENT_ACTOR = 'ทนพ.ญ. อารีย์ วงศ์สุข';

const TABS = [
  { key: 'connection', label: 'การเชื่อมต่อ LIS', icon: 'lan' },
  { key: 'analyzers',  label: 'เครื่องตรวจวิเคราะห์', icon: 'biotech' },
  { key: 'mapping',    label: 'จับคู่รหัส (TMLT)', icon: 'link' },
  { key: 'messages',   label: 'คิวข้อความ', icon: 'forum' },
];

const Card = ({ icon, title, subtitle, action, children }) => (
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
        <span style={{ fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
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

const LabInterfacePage = () => {
  /* Resolved, not hardcoded. `const canEdit = true` made the read-only state
     unreachable, which meant every disabled branch and every "สิทธิ์ไม่พอ"
     title below was code nobody could ever see. src/data/labPermissions.js
     reads a mock role off the URL (?role=viewer / ?role=tech) so the state is
     demonstrable without inventing an auth layer this frontend does not have. */
  const { canEdit, isAdmin, denyReason, denyAdminReason, roleLabel, readOnly } = useLabPermissions();

  const [version, setVersion] = useState(0);
  useEffect(() => subscribeInterfaces(() => setVersion((v) => v + 1)), []);
  useEffect(() => subscribeQc(() => setVersion((v) => v + 1)), []);

  const [tab, setTab] = useState('connection');
  const [toast, setToast] = useState('');

  /* ── Tab 1: connection draft ───────────────────────────────────────── */
  const stored = useMemo(() => getConnection(), [version]);
  const [draft, setDraft] = useState(() => getConnection());
  const [errors, setErrors] = useState({});
  /* The save gate. `testedOk` is FALSE until a test succeeds on the CURRENT
     draft, and any field edit resets it — otherwise a clerk edits the host
     after a green test and saves credentials that were never proven. */
  const [testedOk, setTestedOk] = useState(stored.lastTestOk);
  const [testResult, setTestResult] = useState(
    stored.lastTestAt ? { ok: stored.lastTestOk, message: stored.lastTestMessage, at: stored.lastTestAt } : null,
  );
  const [dirty, setDirty] = useState(false);
  const [discardTo, setDiscardTo] = useState(null);

  const setField = (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(patch).forEach((k) => { next[k] = undefined; });
      return next;
    });
    setTestedOk(false);
    setTestResult((r) => (r ? { ...r, stale: true } : r));
    setDirty(true);
  };

  const handleTest = () => {
    const check = validateConnection(draft);
    if (!check.ok) {
      setErrors(check.errors);
      setTestResult({ ok: false, message: 'ข้อมูลการเชื่อมต่อยังไม่ครบถ้วน — ตรวจสอบช่องที่มีข้อความสีแดง' });
      setTestedOk(false);
      return;
    }
    const result = testConnection(draft, { actor: CURRENT_ACTOR });
    setTestResult({ ok: result.ok, message: result.message, at: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) });
    setTestedOk(result.ok);
  };

  const handleSaveConnection = () => {
    const result = saveConnection(draft, { actor: CURRENT_ACTOR });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setDirty(false);
    setToast('บันทึกการตั้งค่าเชื่อมต่อ LIS แล้ว');
  };

  const handleDiscard = () => {
    /* Rebuilt from ONE read of the store. The previous version restored draft,
       errors, dirty and testedOk but left `testResult.stale` set by setField,
       so a discarded edit still showed "มีการแก้ไขหลังการทดสอบล่าสุด" next to
       a green "ทดสอบผ่านแล้ว" badge and an enabled Save button. */
    const s = getConnection();
    setDraft(s);
    setErrors({});
    setDirty(false);
    setTestedOk(s.lastTestOk);
    setTestResult(s.lastTestAt ? { ok: s.lastTestOk, message: s.lastTestMessage, at: s.lastTestAt } : null);
    if (discardTo) setTab(discardTo);
    setDiscardTo(null);
  };

  /* Leaving the connection tab with unsaved edits routes through a confirm
     rather than silently dropping them. */
  const handleTabChange = (next) => {
    if (tab === 'connection' && dirty && next !== 'connection') {
      setDiscardTo(next);
      return;
    }
    setTab(next);
  };

  /* ── Tab 2/3/4 state ───────────────────────────────────────────────── */
  const [qcTarget, setQcTarget] = useState(null);
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  /* AlertDialog has no confirmDisabled and does not self-close, so a confirm
     with an empty required reason used to be a DEAD CLICK: onConfirm fired,
     the handler returned early, and nothing at all happened — no error, no
     focus move, no message. `attempted` turns that silence into an error
     state on the field, and is cleared whenever the dialog opens or closes. */
  const [overrideAttempted, setOverrideAttempted] = useState(false);
  const [newMapping, setNewMapping] = useState({ code: '', analyzer: LAB_ANALYZERS[0].key, testId: '' });
  const [removeTarget, setRemoveTarget] = useState(null);
  const [bounceTarget, setBounceTarget] = useState(null);
  const [bounceReason, setBounceReason] = useState('');
  const [bounceAttempted, setBounceAttempted] = useState(false);

  const health = useMemo(() => interfaceHealth(), [version]);
  const qc = useMemo(() => qcHealth(TODAY), [version]);
  /* Read here only for the tab counts and the import gate — the mapping and
     message TABLES are owned by the panels in
     src/components/lab/LabInterfacePanels.jsx. */
  const mappings = useMemo(() => getMappings(), [version]);
  const messages = useMemo(() => getMessages(), [version]);

  const summaryCards = useMemo(() => [
    { key: 'conn', label: health.connected ? 'เชื่อมต่อ LIS สำเร็จ' : 'เชื่อมต่อ LIS ไม่สำเร็จ', value: health.queueDepth, indicator: 'ข้อความค้างในคิว', color: health.connected ? 'brand' : 'destructive', icon: health.connected ? 'lan' : 'wifi_off' },
    { key: 'pending', label: 'ผลรอนำเข้า', value: health.pendingIn, indicator: 'จากเครื่องตรวจวิเคราะห์', color: 'info', icon: 'download' },
    { key: 'unmapped', label: 'รหัสที่ยังไม่จับคู่', value: health.unmappedCodes + health.unmappedMessages, indicator: 'ผลที่เข้ามาจะถูกกักไว้', color: 'inprogress', icon: 'link_off' },
    { key: 'qc', label: 'เครื่องที่ QC ไม่ผ่าน / ค้างรันวันนี้', value: qc.blocked, indicator: qc.stale > 0 ? `ยังไม่ได้รัน QC วันนี้ ${qc.stale} เครื่อง` : 'บล็อกการนำเข้าผลอัตโนมัติ', color: 'destructive', icon: 'block' },
  ], [health, qc]);

  const tabs = useMemo(() => TABS.map((t) => ({
    ...t,
    count: t.key === 'analyzers' ? LAB_ANALYZERS.length
      : t.key === 'mapping' ? mappings.length
        : t.key === 'messages' ? messages.length
          : undefined,
  })), [mappings.length, messages.length]);

  const handleImport = (m) => {
    const mapped = mappings.find((x) => x.code === m.code && x.analyzer === m.analyzer)?.testId;
    if (!mapped) {
      setToast(`รหัส ${m.code} ยังไม่ได้จับคู่กับรายการตรวจ — จับคู่รหัสก่อนจึงจะนำเข้าผลได้`);
      setTab('mapping');
      setNewMapping({ code: m.code, analyzer: m.analyzer, testId: '' });
      return;
    }
    /* Same verdict the QC strip paints — TODAY is passed so a control from
       yesterday does not open the gate. */
    if (isOutOfControl(m.analyzer, TODAY)) {
      const name = LAB_ANALYZER_BY_KEY[m.analyzer]?.name;
      setToast(isQcStale(m.analyzer, TODAY)
        ? `${name} ยังไม่ได้รัน QC ของวันนี้ — รัน QC ก่อนจึงจะนำเข้าผลได้`
        : `${name} ยัง QC ไม่ผ่าน — แก้ไข QC หรือให้หัวหน้างานยกเว้นก่อน`);
      setTab('analyzers');
      return;
    }
    markMessageImported(m.id, { actor: CURRENT_ACTOR });
    setToast(`นำเข้าผล ${m.code} · ${m.accessionNo} แล้ว — ตรวจสอบและรับรองผลที่หน้าบันทึกผล`);
  };

  const handleBounce = () => {
    setBounceAttempted(true);
    if (!bounceTarget || !bounceReason.trim()) return;
    bounceMessage(bounceTarget.id, bounceReason.trim(), { actor: CURRENT_ACTOR });
    setBounceTarget(null);
    setBounceReason('');
    setBounceAttempted(false);
    setToast('ตีกลับข้อความแล้ว');
  };


  return (
    <>
      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} topOffset='var(--dim-space-800, 32px)' />

      <LabQcRunPopup
        open={!!qcTarget}
        analyzer={qcTarget?.key}
        analyzerName={qcTarget?.name}
        today={TODAY}
        canEdit={canEdit}
        denyReason={denyReason}
        actor={CURRENT_ACTOR}
        onClose={() => setQcTarget(null)}
        onSubmit={(qcDraft, amendOf) => {
          const result = amendOf
            ? amendQcRun(qcTarget.key, amendOf, qcDraft, { actor: CURRENT_ACTOR })
            : recordQcRun(qcTarget.key, qcDraft, { actor: CURRENT_ACTOR });
          if (!result.ok) { setToast('บันทึก QC ไม่สำเร็จ — ตรวจสอบค่าที่กรอก'); return; }
          setQcTarget(null);
          setToast(amendOf ? 'แก้ไขผลควบคุมคุณภาพแล้ว — รายการเดิมยังอยู่ในประวัติ' : 'บันทึกผลควบคุมคุณภาพแล้ว');
        }}
        onVoid={(runId, reason) => {
          const ok = voidQcRun(qcTarget.key, runId, { reason, actor: CURRENT_ACTOR });
          setToast(ok ? 'ยกเลิกรายการ QC แล้ว — รายการยังอยู่ในประวัติพร้อมเหตุผล' : 'ยกเลิกรายการ QC ไม่สำเร็จ');
        }}
      />

      <AlertDialog
        open={!!discardTo}
        type='warning'
        title='ทิ้งการแก้ไขการตั้งค่าเชื่อมต่อ?'
        description='ยังมีการแก้ไขที่ยังไม่ได้บันทึก หากออกจากแท็บนี้ ค่าที่แก้ไว้จะกลับไปเป็นค่าที่บันทึกล่าสุด'
        cancelLabel='อยู่ต่อเพื่อบันทึก'
        confirmLabel='ทิ้งการแก้ไข'
        onCancel={() => setDiscardTo(null)}
        onClose={() => setDiscardTo(null)}
        onConfirm={handleDiscard}
      />

      <AlertDialog
        open={!!overrideTarget}
        type='warning'
        title='ยกเว้นการบล็อกเครื่องที่ QC ไม่ผ่าน?'
        description={overrideTarget
          ? `${overrideTarget.analyzerName} จะสามารถนำเข้าผลได้ทั้งที่ผลควบคุมคุณภาพยังไม่ผ่าน — ต้องระบุเหตุผลและจะถูกบันทึกใน audit trail พร้อมชื่อผู้อนุมัติ`
          : ''}
        cancelLabel='ไม่ยกเว้น'
        confirmLabel='ยืนยันยกเว้น'
        onCancel={() => { setOverrideTarget(null); setOverrideReason(''); setOverrideAttempted(false); }}
        onClose={() => { setOverrideTarget(null); setOverrideReason(''); setOverrideAttempted(false); }}
        onConfirm={() => {
          setOverrideAttempted(true);
          if (!overrideTarget || !overrideReason.trim()) return;
          overrideQcBlock(overrideTarget.analyzer, { reason: overrideReason.trim(), actor: CURRENT_ACTOR });
          setOverrideTarget(null);
          setOverrideReason('');
          setOverrideAttempted(false);
          setToast('ยกเว้นการบล็อกแล้ว — บันทึกเหตุผลและผู้อนุมัติไว้ใน audit trail');
        }}
      >
        <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          <InputField
            label='เหตุผลที่ต้องยกเว้น'
            required
            showLeadingIcon={false}
            size='md'
            placeholder='เช่น ต้องตรวจ STAT potassium และไม่มีเครื่องสำรอง'
            value={overrideReason}
            error={overrideAttempted && !overrideReason.trim() ? 'ต้องระบุเหตุผลก่อนจึงจะยืนยันได้' : undefined}
            onChange={(v) => setOverrideReason(typeof v === 'string' ? v : v?.target?.value ?? '')}
          />
        </div>
      </AlertDialog>

      <AlertDialog
        open={!!removeTarget}
        type='destructive'
        title='ลบการจับคู่รหัสนี้?'
        description={removeTarget
          ? `รหัส ${removeTarget.code} (${removeTarget.analyzerName}) จะไม่ถูกจับคู่กับรายการตรวจใด ผลที่ส่งมาด้วยรหัสนี้จะถูกกักไว้ในคิวข้อความแทนที่จะเข้าระบบ`
          : ''}
        cancelLabel='ไม่ลบ'
        confirmLabel='ลบการจับคู่'
        onCancel={() => setRemoveTarget(null)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          removeMapping(removeTarget.code, removeTarget.analyzer, { actor: CURRENT_ACTOR });
          setRemoveTarget(null);
          setToast('ลบการจับคู่รหัสแล้ว');
        }}
      />

      <AlertDialog
        open={!!bounceTarget}
        type='warning'
        title='ตีกลับข้อความนี้?'
        description={bounceTarget ? `${bounceTarget.id} · ${bounceTarget.code} — ผลจะไม่ถูกนำเข้าและจะถูกส่งกลับพร้อมเหตุผล` : ''}
        cancelLabel='ไม่ตีกลับ'
        confirmLabel='ยืนยันตีกลับ'
        onCancel={() => { setBounceTarget(null); setBounceReason(''); setBounceAttempted(false); }}
        onClose={() => { setBounceTarget(null); setBounceReason(''); setBounceAttempted(false); }}
        onConfirm={handleBounce}
      >
        <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          <InputField
            label='เหตุผลที่ตีกลับ'
            required
            showLeadingIcon={false}
            size='md'
            placeholder='เช่น เครื่องรายงานก่อนอ่านผลควบคุมคุณภาพประจำวัน'
            value={bounceReason}
            error={bounceAttempted && !bounceReason.trim() ? 'ต้องระบุเหตุผลก่อนจึงจะยืนยันได้' : undefined}
            onChange={(v) => setBounceReason(typeof v === 'string' ? v : v?.target?.value ?? '')}
          />
          {!bounceAttempted && !bounceReason.trim() && (
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              ต้องระบุเหตุผลก่อนจึงจะยืนยันได้
            </span>
          )}
        </div>
      </AlertDialog>

      <QueuePageShell
        activeKey='lab'
        breadcrumb={breadcrumb}
        title='เชื่อมต่อ LIS และเครื่องตรวจวิเคราะห์'
        summaryFlushUnderSubHeader={false}
        belowSummary={<LabSubNav />}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            paddingTop: 'var(--dim-space-600)',
            paddingLeft: 'var(--dim-space-600)',
            paddingRight: 'var(--dim-space-600)',
            paddingBottom: 'var(--dim-space-1200)',
            gap: 'var(--dim-space-600)',
          }}
        >
          {/* The honesty banner. Sits above every tab, not hidden behind one. */}
          <Information
            hierarchy='secondary'
            text='ข้อจำกัดที่ต้องทราบ — หน้าจอนี้คือส่วนตั้งค่าและทดสอบการเชื่อมต่อ ไม่ใช่ตัวเชื่อมต่อจริง'
            subText='ระบบส่วนหน้าไม่มี HL7 v2.5.1 parser, ASTM E1381/E1394 driver หรือ socket จริง — การทดสอบและคิวข้อความในหน้านี้ทำงานบนข้อมูลจำลอง การเชื่อมต่อจริงกับ LIS ของสำนักอนามัยต้องพัฒนาที่ฝั่ง backend เพิ่มเติม'
            showBadge={false}
            maxWidth={1200}
          />

          {/* สิทธิ์ไม่พอ — stated once at the top instead of leaving the user
              to discover it by clicking greyed-out buttons. Reachable in the
              running app via ?role=viewer. */}
          {readOnly && (
            <Alert
              type='warning'
              iconName='lock'
              iconFill={1}
              title={`${roleLabel} — ดูข้อมูลได้อย่างเดียว`}
              subtext={denyReason}
              showBadge={false}
              showIndicator={false}
              showDetail={false}
            />
          )}

          <StickyStatusTabBar
            tabs={tabs}
            value={tab}
            onChange={handleTabChange}
            aria-label='ส่วนเชื่อมต่อ LIS'
          />

            {/* Summary counts moved below the tab strip (มติผู้ใช้ 28 ส.ค. 69):
                they describe the list the current tab is showing, so they now
                sit with it and scroll away with it instead of riding in the
                page header. Rendered as bare SummaryCard rows — the
                SummaryCardsBar chrome would be a second card inside this one. */}
            <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
              {summaryCards.map((c) => <SummaryCard key={c.key} card={c} />)}
            </div>

          {tab === 'connection' && (
            <>
              <Card
                icon='lan'
                title='ตั้งค่าเชื่อมต่อฐานข้อมูล LIS สำนักอนามัย'
                subtitle='ชื่อฟิลด์ตามหน้า "ตั้งค่าเชื่อมต่อฐานข้อมูล" ของระบบเดิม — ต้องทดสอบการเชื่อมต่อสำเร็จก่อนจึงจะบันทึกได้'
                action={(
                  <Badge style={testedOk ? 'success' : 'warning'} size='small' icon={testedOk ? 'check_circle' : 'pending'}>
                    {testedOk ? 'ทดสอบผ่านแล้ว' : 'ยังไม่ได้ทดสอบค่าปัจจุบัน'}
                  </Badge>
                )}
              >
                <FieldGrid cols={3}>
                  <Field label='Server Host' required>
                    <InputField
                      showLabel={false}
                      showLeadingIcon={false}
                      size='md'
                      placeholder='lis.bangkok.go.th'
                      value={draft.host}
                      error={errors.host}
                      disabled={!canEdit}
                      onChange={(v) => setField({ host: typeof v === 'string' ? v : v?.target?.value ?? '' })}
                    />
                  </Field>
                  <Field label='Port' required>
                    <InputField
                      showLabel={false}
                      showLeadingIcon={false}
                      size='md'
                      placeholder='5432'
                      value={String(draft.port ?? '')}
                      error={errors.port}
                      disabled={!canEdit}
                      onChange={(v) => setField({ port: typeof v === 'string' ? v : v?.target?.value ?? '' })}
                    />
                  </Field>
                  <Field label='ชื่อฐานข้อมูล (Database)' required>
                    <InputField
                      showLabel={false}
                      showLeadingIcon={false}
                      size='md'
                      placeholder='PHCIS_LIS'
                      value={draft.database}
                      error={errors.database}
                      disabled={!canEdit}
                      onChange={(v) => setField({ database: typeof v === 'string' ? v : v?.target?.value ?? '' })}
                    />
                  </Field>
                  <Field label='Username' required>
                    <InputField
                      showLabel={false}
                      showLeadingIcon={false}
                      size='md'
                      value={draft.username}
                      error={errors.username}
                      disabled={!canEdit}
                      onChange={(v) => setField({ username: typeof v === 'string' ? v : v?.target?.value ?? '' })}
                    />
                  </Field>
                  <Field
                    label='Password'
                    hint={denyAdminReason}
                  >
                    <PasswordField
                      label=''
                      showLabel={false}
                      size='md'
                      value={draft.password}
                      disabled={!canEdit || !isAdmin}
                      onChange={(v) => setField({ password: typeof v === 'string' ? v : v?.target?.value ?? '' })}
                    />
                  </Field>
                  <Field label='รหัสหน่วยบริการ (Site code)'>
                    <InputField
                      showLabel={false}
                      showLeadingIcon={false}
                      size='md'
                      value={draft.siteCode}
                      disabled={!canEdit}
                      onChange={(v) => setField({ siteCode: typeof v === 'string' ? v : v?.target?.value ?? '' })}
                    />
                  </Field>
                  <Field label='โปรโตคอล' span={1}>
                    <Select
                      value={draft.protocol}
                      options={LIS_PROTOCOLS.map((p) => ({ value: p.key, label: p.label, subtext: p.hint }))}
                      onChange={(v) => setField({ protocol: v })}
                      showLabel={false}
                      size='md'
                      disabled={!canEdit}
                      searchable={false}
                    />
                  </Field>
                  <Field label='Endpoint' span={2}>
                    <InputField
                      showLabel={false}
                      showLeadingIcon={false}
                      size='md'
                      value={draft.endpoint}
                      disabled={!canEdit}
                      onChange={(v) => setField({ endpoint: typeof v === 'string' ? v : v?.target?.value ?? '' })}
                    />
                  </Field>
                </FieldGrid>

                <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-400)' }}>
                  <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                    <Switch
                      checked={!!draft.autoRetry}
                      onChange={(v) => setField({ autoRetry: v })}
                      disabled={!canEdit}
                      aria-label='ลองเชื่อมต่อใหม่อัตโนมัติ'
                    />
                    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                      ลองเชื่อมต่อใหม่อัตโนมัติ
                    </span>
                  </span>
                  <div style={{ width: 200 }}>
                    <InputField
                      label='ระยะเวลาระหว่างการลองใหม่ (วินาที)'
                      size='md'
                      showLeadingIcon={false}
                      type='number'
                      value={String(draft.retryIntervalSec ?? '')}
                      disabled={!canEdit || !draft.autoRetry}
                      onChange={(v) => setField({ retryIntervalSec: Number(typeof v === 'string' ? v : v?.target?.value ?? 0) })}
                    />
                  </div>
                  <div className='flex-1' />
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                    ซิงก์ล่าสุด {stored.lastSyncAt} · คิวคงเหลือ {stored.queueDepth} ข้อความ
                  </span>
                </div>

                {testResult && (
                  <Alert
                    type={testResult.stale ? 'warning' : testResult.ok ? 'success' : 'destructive'}
                    iconName={testResult.stale ? 'sync_problem' : testResult.ok ? 'check_circle' : 'error'}
                    iconFill={1}
                    title={testResult.stale
                      ? 'มีการแก้ไขหลังการทดสอบล่าสุด — ต้องทดสอบใหม่ก่อนบันทึก'
                      : testResult.message}
                    subtext={testResult.at ? `ทดสอบเมื่อ ${testResult.at}` : undefined}
                    showSubtext={!!testResult.at}
                    showBadge={false}
                    showIndicator={false}
                    showDetail={false}
                  />
                )}

                <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  <NeutralSubdueButton variant='outline' size='md' leadingIcon='network_check' disabled={!canEdit} title={canEdit ? undefined : denyReason} onClick={handleTest}>
                    ทดสอบการเชื่อมต่อ
                  </NeutralSubdueButton>
                  <NeutralSubdueButton
                    variant='outline'
                    size='md'
                    leadingIcon='refresh'
                    disabled={!canEdit}
                    title={canEdit ? undefined : denyReason}
                    onClick={() => { retryConnection({ actor: CURRENT_ACTOR }); setToast('ส่งคำสั่งลองเชื่อมต่อใหม่แล้ว'); }}
                  >
                    ลองเชื่อมต่อใหม่
                  </NeutralSubdueButton>
                  <div className='flex-1' />
                  <NeutralSubdueButton variant='outline' size='md' disabled={!dirty} onClick={handleDiscard}>
                    ยกเลิกการแก้ไข
                  </NeutralSubdueButton>
                  <BrandPrimaryButton
                    size='md'
                    leadingIcon='save'
                    disabled={!canEdit || !testedOk}
                    title={canEdit ? (testedOk ? undefined : 'ต้องทดสอบการเชื่อมต่อให้สำเร็จก่อนจึงจะบันทึกได้') : denyReason}
                    onClick={handleSaveConnection}
                  >
                    บันทึกการตั้งค่า
                  </BrandPrimaryButton>
                </div>
                {!testedOk && (
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                    ต้องกด "ทดสอบการเชื่อมต่อ" แล้วสำเร็จก่อน จึงจะบันทึกได้ — กันการบันทึกค่าที่ยังไม่เคยพิสูจน์ว่าเชื่อมต่อได้
                  </span>
                )}
              </Card>
            </>
          )}

          {tab === 'analyzers' && (
            <LabAnalyzerQcPanel
              today={TODAY}
              actor={CURRENT_ACTOR}
              canEdit={canEdit}
              denyReason={denyReason}
              version={version}
              onRunQc={(analyzer) => setQcTarget(analyzer)}
              onRecordCalibration={(analyzer, draft) => {
                const ok = recordCalibration(analyzer, { ...draft, actor: CURRENT_ACTOR });
                setToast(ok ? 'บันทึกการสอบเทียบแล้ว' : 'บันทึกการสอบเทียบไม่สำเร็จ — ตรวจสอบวันที่และผู้สอบเทียบ');
              }}
              onOverride={(state) => { setOverrideTarget(state); setOverrideReason(''); setOverrideAttempted(false); }}
              onClearOverride={(analyzer) => { clearQcOverride(analyzer, { actor: CURRENT_ACTOR }); setToast('ยกเลิกการยกเว้นแล้ว — เครื่องกลับไปถูกบล็อก'); }}
              onReportModeChange={(a, mode) => { setAnalyzerReportMode(a.key, mode, { actor: CURRENT_ACTOR }); setToast(`เปลี่ยนโหมดรายงานผลของ ${a.name} แล้ว`); }}
            />
          )}
          {tab === 'mapping' && (
            <LabCodeMappingPanel
              canEdit={canEdit}
              denyReason={denyReason}
              version={version}
              actor={CURRENT_ACTOR}
              draft={newMapping}
              onDraftChange={setNewMapping}
              onRequestRemove={(m) => setRemoveTarget(m)}
              onToast={setToast}
            />
          )}

          {tab === 'messages' && (
            <LabMessageQueuePanel
              canEdit={canEdit}
              denyReason={denyReason}
              version={version}
              connected={health.connected}
              onImport={handleImport}
              onRequestBounce={(m) => { setBounceTarget(m); setBounceReason(''); setBounceAttempted(false); }}
            />
          )}
        </div>
      </QueuePageShell>
    </>
  );
};

export default LabInterfacePage;
