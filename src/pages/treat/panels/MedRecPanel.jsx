import React, { useEffect, useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import {
  PanelCard, PanelEmptyState, MeterBar, Sym, strikeIf,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, AccessDeniedPanel,
  ReasonDialog, PanelAlert, CountLabel,
} from '@/pages/treat/panels/panelHooks';
import {
  medRecSourceMeta, MED_REC_DISPOSITIONS, dispositionMeta,
  MED_REC_REASON_SUGGESTIONS, buildPriorMedications, analyseMedRecSafety,
  subscribeMedRecSessions, medRecSessionsFor, summariseDispositions,
  saveMedRecSession, recordDisposition, addHomeMedication,
} from '@/data/treatmentMedRec';

/* PHCIS | EMR §1.4.3.5 / §1.4.3.6 — ประสานรายการยาเดิม (Medication
   Reconciliation). รวมยาเดิม 3 แหล่งตาม TOR — ใบสั่งยาครั้งก่อนในระบบ /
   ยาที่ผู้ป่วยใช้เองที่บ้าน / ยาที่ติดมากับใบส่งต่อขาเข้า — เป็นตารางเดียว
   แล้วบังคับให้ทุกแถวมี disposition ก่อนถือว่าประสานครบ.

   แถบความปลอดภัยด้านบนเรียก analyseMedRecSafety (แพ้ยาตรงตัว / แพ้ข้ามกลุ่ม /
   ซ้ำกลุ่มกับยาที่สั่งครั้งนี้) ซึ่งตรงกับเจตนา TOR "ตรวจสอบความปลอดภัย
   ในการใช้ยา". */

const DISPOSITION_OPTIONS = MED_REC_DISPOSITIONS.map((d) => ({ value: d.key, label: d.label }));

const SourceBadge = ({ source }) => {
  const meta = medRecSourceMeta(source);
  return <ColorfulBadge style={meta.tone} size='small' width='hug'>{meta.label}</ColorfulBadge>;
};

const WarningCell = ({ warnings }) => {
  if (!warnings || warnings.length === 0) {
    return <span style={PANEL_LABEL_STYLE}>—</span>;
  }
  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
      {warnings.map((w, i) => (
        <span
          key={i}
          className='inline-flex items-start'
          style={{ gap: 'var(--dim-space-100, 4px)' }}
        >
          <Sym
            name={w.level === 'critical' ? 'dangerous' : 'warning'}
            size={14}
            color={w.level === 'critical' ? 'var(--icon-dangerButton-default, #B91C1C)' : 'var(--icon-alertdialog-warning, #C2410C)'}
          />
          <span
            style={{
              ...PANEL_LABEL_STYLE,
              color: w.level === 'critical'
                ? 'var(--text-alert-error, #B91C1C)'
                : 'var(--text-colorfulbadge-yellow, #A16207)',
            }}
          >
            {w.text}
          </span>
        </span>
      ))}
    </div>
  );
};

/* ── ประวัติการประสานครั้งก่อน ─────────────────────────────── */

const SessionHistory = ({ sessions }) => {
  if (sessions.length === 0) {
    return (
      <PanelEmptyState
        icon='history'
        title='ยังไม่เคยประสานรายการยาให้ผู้รับบริการรายนี้'
        subtitle='เมื่อบันทึกการประสานครั้งแรก ประวัติจะแสดงที่นี่พร้อมผู้ประสานและเวลา'
      />
    );
  }
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      {sessions.map((s) => (
        <div
          key={s.id}
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-200, 8px)',
            borderRadius: 'var(--dim-radius-300, 10px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
            background: 'var(--surface-neutral-quaternary, #F9FBFB)',
            paddingTop: 'var(--dim-space-300, 12px)',
            paddingRight: 'var(--dim-space-300, 12px)',
            paddingBottom: 'var(--dim-space-300, 12px)',
            paddingLeft: 'var(--dim-space-300, 12px)',
          }}
        >
          <div className='flex flex-wrap items-center justify-between w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>{s.by}</span>
            <span style={PANEL_LABEL_STYLE}>{s.date}</span>
          </div>
          <span style={PANEL_LABEL_STYLE}>
            ประสานแล้ว {s.reconciled} จาก {s.total} รายการ — {s.summary}
          </span>
          <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {s.items.filter((i) => i.disposition).map((i, idx) => {
              const meta = dispositionMeta(i.disposition);
              return (
                <StatusBadge key={idx} style={meta?.badge || 'neutral'} size='small' icon={meta?.icon}>
                  {i.name} · {meta?.label}
                </StatusBadge>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── panel หลัก ─────────────────────────────────────────────── */

const MedRecPanel = ({ form, setForm, patient }) => {
  const access = useTreatmentAccess();
  const hn = patient?.hn || '';

  const [sessions] = useTreatmentStore(
    subscribeMedRecSessions,
    () => medRecSessionsFor(hn),
    [hn],
  );

  /* dispositions: { [rowKey]: { disposition, reason } } — เก็บใน form
     ของ visit เพื่อไม่ให้หายเมื่อสลับ step (TreatmentFormPage ถือ state) */
  const dispositions = form?.medRecDispositions || {};
  const setDispositions = (updater) => setForm((f) => ({
    ...f,
    medRecDispositions: typeof updater === 'function' ? updater(f.medRecDispositions || {}) : updater,
  }));

  /* addHomeMedication() เขียนลง HOME_MEDICATIONS โดยตรง ดังนั้น
     buildPriorMedications() จะเห็นแถวใหม่เองในการเรียกครั้งถัดไป —
     ห้ามเก็บสำเนาไว้ใน state ซ้ำ (จะกลายเป็นสองแถว). ใช้ tick บังคับ
     ให้ useMemo คำนวณใหม่แทน. */
  const [homeTick, setHomeTick] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState({ name: '', strength: '', usage: '', startedOn: '' });
  const [reasonTarget, setReasonTarget] = useState(null);
  const [copyGuard, setCopyGuard] = useState(null);
  const [safetyDismissed, setSafetyDismissed] = useState(false);
  const [saved, setSaved] = useState(null);

  /* rows = 3 แหล่งรวมกัน (previous / home / external) — buildPriorMedications
     คืนทั้งหมดให้แล้ว รวมยาที่เพิ่งเพิ่มจากปุ่มในหน้านี้ */
  const priorRows = useMemo(
    () => buildPriorMedications(hn),
    [hn, homeTick],
  );

  const analysed = useMemo(() => analyseMedRecSafety({
    priorRows,
    currentMedications: form?.medications || [],
    drugAllergies: patient?.drugAllergies || [],
  }), [priorRows, form?.medications, patient?.drugAllergies]);

  const reconciled = analysed.filter((r) => dispositions[r.key]?.disposition).length;
  const pending = analysed.length - reconciled;

  const criticalRows = analysed.filter((r) => (r.warnings || []).some((w) => w.level === 'critical'));
  const warnRows = analysed.filter((r) => (r.warnings || []).length > 0);

  /* เตือน "ยังประสานไม่ครบ" เมื่อจะออกจาก Step 5 — เตือน ไม่บล็อก.
     เขียนธงไว้ใน form ให้ TreatmentFormPage/Shell อ่านได้ */
  useEffect(() => {
    setForm((f) => (f.medRecPending === pending ? f : { ...f, medRecPending: pending }));
  }, [pending, setForm]);

  const setDisposition = (row, value) => {
    const meta = dispositionMeta(value);
    if (meta?.needsReason) {
      setReasonTarget({ row, disposition: value });
      return;
    }
    setDispositions((d) => ({ ...d, [row.key]: { disposition: value, reason: '' } }));
    recordDisposition({ hn, row, disposition: value, reason: '' });
  };

  /* คัดลอกเข้าตารางสั่งยาของ visit — ต้องยืนยันถ้าแถวมีคำเตือน */
  const copyToOrders = (row, force = false) => {
    const hasWarning = (row.warnings || []).length > 0;
    if (hasWarning && !force) { setCopyGuard(row); return; }
    setForm((f) => {
      const already = (f.medications || []).some((m) => m.name === row.name);
      if (already) return f;
      return {
        ...f,
        medications: [
          ...(f.medications || []),
          {
            id: `medrec-${row.key}`,
            name: row.name,
            dosePerTake: '',
            unit: '',
            usage: row.usage || '',
            frequency: '',
            when: '',
            qty: '',
            note: `นำเข้าจากการประสานรายการยา (${medRecSourceMeta(row.source).label})`,
          },
        ],
      };
    });
    setCopyGuard(null);
  };

  const doSave = () => {
    const session = saveMedRecSession({ hn, rows: analysed, dispositions });
    setSaved({ id: Date.now(), summary: session.summary, reconciled: session.reconciled, total: session.total });
  };

  const columns = [
    {
      key: 'name', header: 'รายการยาเดิม', flex: 1,
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(dispositions[row.key]?.disposition === 'stop') }}>
            {row.name}
          </span>
          <span style={PANEL_LABEL_STYLE}>
            {[row.strength, row.usage].filter(Boolean).join(' · ') || 'ไม่ทราบขนาด/วิธีใช้'}
          </span>
          {row.drugClass ? <span style={PANEL_LABEL_STYLE}>กลุ่มยา: {row.drugClass}</span> : null}
        </div>
      ),
    },
    { key: 'source', header: 'แหล่งข้อมูล', render: (row) => <SourceBadge source={row.source} /> },
    {
      key: 'startedOn', header: 'เริ่มใช้ / ผู้สั่ง',
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={PANEL_VALUE_STYLE}>{row.startedOn || '—'}</span>
          <span style={PANEL_LABEL_STYLE}>{row.prescriber || '—'}</span>
        </div>
      ),
    },
    { key: 'warnings', header: 'ความปลอดภัย', render: (row) => <WarningCell warnings={row.warnings} /> },
    {
      key: 'disposition', header: 'การตัดสินใจ',
      render: (row) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <Select
            value={dispositions[row.key]?.disposition || ''}
            onChange={(v) => setDisposition(row, v)}
            options={DISPOSITION_OPTIONS}
            placeholder='เลือกการตัดสินใจ'
            showLabel={false}
            showHelperText={false}
            disabled={!access.canEdit}
            size='md'
          />
          {dispositions[row.key]?.reason ? (
            <span style={PANEL_LABEL_STYLE}>เหตุผล: {dispositions[row.key].reason}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'actions', header: '',
      render: (row) => {
        const disp = dispositions[row.key]?.disposition;
        const meta = dispositionMeta(disp);
        if (!meta?.copiesToOrders) return <span style={PANEL_LABEL_STYLE}>—</span>;
        const already = (form?.medications || []).some((m) => m.name === row.name);
        return (
          <GuardedAction allowed={access.canEdit}>
            <NeutralSubdueButton
              variant='outline'
              size='sm'
              leadingIcon={already ? 'check' : 'content_copy'}
              disabled={already}
              onClick={() => copyToOrders(row)}
            >
              {already ? 'สั่งแล้ว' : 'คัดลอก'}
            </NeutralSubdueButton>
          </GuardedAction>
        );
      },
    },
  ];

  if (!access.canView) {
    return <AccessDeniedPanel what='การประสานรายการยา' />;
  }

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      {/* แถบความปลอดภัย (ปิดได้ต่อ visit) */}
      {warnRows.length > 0 && !safetyDismissed ? (
        <PanelAlert
          tone={criticalRows.length ? 'error' : 'warning'}
          icon={criticalRows.length ? 'dangerous' : 'warning'}
          title={
            criticalRows.length
              ? `พบยาเดิม ${criticalRows.length} รายการที่ชนกับประวัติแพ้ยา`
              : `พบยาเดิม ${warnRows.length} รายการที่ควรทบทวนก่อนใช้ต่อ`
          }
          onDismiss={() => setSafetyDismissed(true)}
        >
          {warnRows.map((r) => `${r.name}: ${(r.warnings || []).map((w) => w.text).join(' / ')}`).join(' · ')}
        </PanelAlert>
      ) : null}

      <PanelCard
        title='ประสานรายการยาเดิม (Medication Reconciliation)'
        subtitle='รวมยาเดิมจาก 3 แหล่ง — ใบสั่งยาครั้งก่อนในระบบ · ยาที่ผู้รับบริการใช้เองที่บ้าน · ยาจากสถานพยาบาลที่ส่งตัวมา'
        action={
          <>
            <CountLabel n={analysed.length} />
            <GuardedAction allowed={access.canEdit}>
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={() => setAddOpen(true)}>
                เพิ่มยาที่ผู้ป่วยแจ้งว่าใช้เอง
              </NeutralSubdueButton>
            </GuardedAction>
            <GuardedAction allowed={access.canEdit && analysed.length > 0}>
              <BrandButton variant='fill' size='sm' leadingIcon='save' onClick={doSave}>
                บันทึกการประสาน
              </BrandButton>
            </GuardedAction>
          </>
        }
      >
        {analysed.length === 0 ? (
          <PanelEmptyState
            icon='medication'
            title='ไม่พบรายการยาเดิมจากทั้ง 3 แหล่ง'
            subtitle='ผู้รับบริการไม่มีใบสั่งยาครั้งก่อนในระบบ ไม่มียาที่แจ้งว่าใช้เอง และไม่มีใบส่งต่อขาเข้าที่แนบยามาด้วย'
            action={
              <GuardedAction allowed={access.canEdit}>
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={() => setAddOpen(true)}>
                  เพิ่มยาที่ผู้ป่วยแจ้งว่าใช้เอง
                </BrandSubdueButton>
              </GuardedAction>
            }
          />
        ) : (
          <>
            {/* ตัวนับความคืบหน้า n/N */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <div className='flex flex-wrap items-center justify-between w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <span style={PANEL_VALUE_STYLE}>
                  ประสานแล้ว {reconciled} จาก {analysed.length} รายการ
                </span>
                <span style={PANEL_LABEL_STYLE}>{summariseDispositions(dispositions)}</span>
              </div>
              <MeterBar
                ratio={analysed.length ? reconciled / analysed.length : 0}
                tone={pending === 0 ? 'brand' : 'warning'}
              />
              {pending > 0 ? (
                <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-colorfulbadge-yellow, #A16207)' }}>
                  ยังเหลือ {pending} รายการที่ยังไม่ระบุการตัดสินใจ — ระบบจะเตือนอีกครั้งเมื่อกด "ถัดไป" ออกจากขั้นตอนสั่งการรักษา
                </span>
              ) : (
                <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-alert-success, #196C65)' }}>
                  ประสานรายการยาครบทุกแถวแล้ว
                </span>
              )}
            </div>

            <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
              <Table columns={columns} rows={analysed} rowKey={(r) => r.key} />
            </div>
          </>
        )}
      </PanelCard>

      <PanelCard
        title='ประวัติการประสานรายการยาครั้งก่อน'
        subtitle='เก็บทุกครั้งที่บันทึก พร้อมผู้ประสานและเวลา — ใช้ตรวจย้อนหลังว่ายาใดถูกหยุดเพราะเหตุใด'
        action={<CountLabel n={sessions.length} unit='ครั้ง' />}
      >
        <SessionHistory sessions={sessions} />
      </PanelCard>

      {/* เหตุผลบังคับสำหรับ หยุดยา / ปรับขนาด */}
      <ReasonDialog
        open={!!reasonTarget}
        type='warning'
        title={`ระบุเหตุผล — ${dispositionMeta(reasonTarget?.disposition)?.label || ''}`}
        description={`ยา "${reasonTarget?.row?.name || ''}" — TOR กำหนดให้การหยุดยาและการปรับขนาดต้องมีเหตุผลกำกับเสมอ`}
        confirmLabel='บันทึกการตัดสินใจ'
        suggestions={MED_REC_REASON_SUGGESTIONS}
        onConfirm={(reason) => {
          const { row, disposition } = reasonTarget;
          setDispositions((d) => ({ ...d, [row.key]: { disposition, reason } }));
          recordDisposition({ hn, row, disposition, reason });
          setReasonTarget(null);
        }}
        onClose={() => setReasonTarget(null)}
      />

      {/* ยืนยันก่อนคัดลอกยาที่มีคำเตือนเข้าตารางสั่งยา */}
      <AlertDialog
        open={!!copyGuard}
        type='warning'
        title='ยานี้มีคำเตือนด้านความปลอดภัย'
        description={
          copyGuard
            ? `${copyGuard.name} — ${(copyGuard.warnings || []).map((w) => w.text).join(' / ')}\n\nยืนยันว่าทบทวนแล้วและต้องการคัดลอกเข้าตารางสั่งยาของครั้งนี้`
            : ''
        }
        confirmLabel='ทบทวนแล้ว — คัดลอก'
        cancelLabel='ไม่คัดลอก'
        onConfirm={() => copyToOrders(copyGuard, true)}
        onCancel={() => setCopyGuard(null)}
        onClose={() => setCopyGuard(null)}
      />

      {/* เพิ่มยาที่ผู้ป่วยแจ้งว่าใช้เอง */}
      <AlertDialog
        open={addOpen}
        type='info'
        title='เพิ่มยาที่ผู้รับบริการแจ้งว่าใช้เอง'
        description='ใช้บันทึกยาที่ซื้อเอง ยาสมุนไพร หรือยาจากคลินิกอื่นที่ผู้รับบริการแจ้งด้วยวาจา'
        confirmLabel='เพิ่มเข้าตาราง'
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          if (!addDraft.name.trim()) return;
          addHomeMedication(hn, { ...addDraft, prescriber: 'ผู้รับบริการแจ้งด้วยวาจา' });
          setHomeTick((t) => t + 1);
          setAddDraft({ name: '', strength: '', usage: '', startedOn: '' });
          setAddOpen(false);
        }}
        onCancel={() => { setAddDraft({ name: '', strength: '', usage: '', startedOn: '' }); setAddOpen(false); }}
        onClose={() => setAddOpen(false)}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <InputField
            label='ชื่อยา'
            required
            value={addDraft.name}
            onChange={(v) => setAddDraft((d) => ({ ...d, name: v }))}
            showLeadingIcon={false}
            placeholder='เช่น Ibuprofen 400 mg (ซื้อเองจากร้านขายยา)'
            error={addDraft.name.trim() ? undefined : 'ต้องระบุชื่อยา'}
          />
          <InputField label='ขนาด / ความแรง' value={addDraft.strength} onChange={(v) => setAddDraft((d) => ({ ...d, strength: v }))} showLeadingIcon={false} placeholder='เช่น 400 mg หรือ "ไม่ทราบ"' />
          <InputField label='วิธีใช้ที่ผู้รับบริการแจ้ง' value={addDraft.usage} onChange={(v) => setAddDraft((d) => ({ ...d, usage: v }))} showLeadingIcon={false} placeholder='เช่น รับประทานเมื่อปวด วันละ 2–3 ครั้ง' />
          <InputField label='เริ่มใช้เมื่อ' value={addDraft.startedOn} onChange={(v) => setAddDraft((d) => ({ ...d, startedOn: v }))} showLeadingIcon={false} placeholder='เช่น ประมาณต้นปี 2569' />
        </div>
      </AlertDialog>

      {/* ผลการบันทึก */}
      <AlertDialog
        open={!!saved}
        type='success'
        title='บันทึกการประสานรายการยาแล้ว'
        description={saved ? `ประสานแล้ว ${saved.reconciled} จาก ${saved.total} รายการ — ${saved.summary}` : ''}
        confirmLabel='ตกลง'
        showCancel={false}
        onConfirm={() => setSaved(null)}
        onClose={() => setSaved(null)}
      />
    </div>
  );
};

export default MedRecPanel;
