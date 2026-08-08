import React, { useEffect, useMemo, useState } from 'react';
import Table, { EllipsisText } from '@/components/table/Table';
import FilterTag from '@/components/forms/FilterTag';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import RadioGroup from '@/components/radio/RadioGroup';
import Checkbox from '@/components/checkbox/Checkbox';
import Popup from '@/components/popup/Popup';
import Alert from '@/components/alert/Alert';
import Icon from '@/components/icons/Icon';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Pagination from '@/components/pagination/Pagination';
import BrandIconButton from '@/components/button/BrandIconButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  SectionCard,
  FieldGrid,
  ReadField,
  MetricTile,
  EmptyState,
  AuditNote,
  AuditList,
  LookupPopup,
  PermissionHint,
  T,
  useRightsClaimTick,
} from '@/pages/rights/rightsUi';
import {
  RIGHTS_VISITS,
  RIGHTS_MASTER,
  DEDUCTION_TYPES,
  CLAIM_CYCLES,
  CYCLE_STATUSES,
  VISIT_KINDS,
  PARENT_ORGS,
  PAYER_KINDS,
  CHARGE_CATEGORIES,
  rightsById,
  cycleById,
  cycleRangeLabel,
  parentOrgByCode,
  visitKindMeta,
  clinicLabelOf,
  computeVisitClaim,
  computeClaimTotals,
  saveVisitBilling,
  formatBaht,
  maskNationalId,
  submitStatusOf,
  submitStatusMeta,
} from '@/data/rightsClaimStore';

/* §1.7.4.1 – §1.7.4.9 — เรียกเก็บ Claim.

   §1.7.4.1 asks for "รายการค่าใช้จ่ายที่เป็นรายการผสมระหว่างรายการเรียกเก็บและ
   เงินสด" — a per-LINE payer, not a per-visit one. That is why the visit list
   is an accordion of cards rather than a flat <Table>: each row has to open
   in place to reveal its own charge lines with their own เรียกเก็บ/เงินสด
   badge, and <Table> is a flat-row component with no detail-row slot. The
   charge lines themselves, and the cycle view, do use <Table>.

   Every money figure on this screen comes from computeVisitClaim /
   computeClaimTotals in the store (§1.7.4.4), so the metric strip, the row
   totals, the cycle roll-up and the export preview can never disagree.
   Changing the billing rights (§1.7.4.3) re-splits the lines immediately
   because nothing is cached — the split is derived on every render. */

const PAGE_SIZE = 10;

const VIEWS = [
  { key: 'lines',  label: 'รายรายการ',        icon: 'list_alt' },
  { key: 'cycles', label: 'สรุปตามรอบส่งเบิก', icon: 'event_repeat' },
];

/* ── per-visit accordion card ───────────────────────────────── */

const VisitClaimCard = ({ visit, expanded, onToggle, onEdit, role }) => {
  const claim = computeVisitClaim(visit);
  const rights = rightsById(visit.billingRightsId);
  const cycle = cycleById(visit.cycleId);
  const kind = visitKindMeta(visit.visitKind);
  const statusMeta = submitStatusMeta(submitStatusOf(visit));

  const lineColumns = [
    {
      key: 'category', label: 'หมวด', width: 190,
      render: (l) => (
        <span className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
          <Icon name={CHARGE_CATEGORIES[l.category].icon} size={16} />
          <EllipsisText text={CHARGE_CATEGORIES[l.category].label} />
        </span>
      ),
    },
    { key: 'label', label: 'รายการ', flex: true, minWidth: 200 },
    { key: 'qty', label: 'จำนวน', width: 80, align: 'center' },
    { key: 'amount', label: 'ราคาเต็ม', width: 110, render: (l) => <span style={T.value}>{formatBaht(l.amount)}</span> },
    {
      /* §1.7.4.1 — badge สีแยกว่าบรรทัดนี้เรียกเก็บหรือเก็บเงินสด */
      key: 'payer', label: 'ผู้รับผิดชอบ', width: 140,
      render: (l) => (
        <div className='flex flex-col items-start' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <ColorfulBadge badgeStyle={PAYER_KINDS[l.payer].badge} size='small'>{PAYER_KINDS[l.payer].label}</ColorfulBadge>
          {l.excluded && <span style={T.muted}>อยู่ในรายการยกเว้นของสิทธิ</span>}
        </div>
      ),
    },
    { key: 'claimAmount', label: 'ส่วนเรียกเก็บ', width: 130, render: (l) => <span style={{ ...T.value, color: 'var(--text-statusbadge-success, #196C65)' }}>{formatBaht(l.claimAmount)}</span> },
    { key: 'cashAmount', label: 'ส่วนเงินสด', width: 120, render: (l) => <span style={T.value}>{formatBaht(l.cashAmount)}</span> },
  ];

  return (
    <div
      className='flex flex-col w-full min-w-0'
      style={{
        borderRadius: 'var(--dim-radius-300, 10px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
        background: 'var(--surface-card-100, #FFFFFF)',
        overflow: 'hidden',
      }}
    >
      <div
        className='flex items-center w-full min-w-0'
        style={{
          gap: 'var(--dim-space-300)',
          background: expanded ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100, #FFFFFF)',
          paddingTop: 'var(--dim-space-300)',
          paddingRight: 'var(--dim-space-300)',
          paddingBottom: 'var(--dim-space-300)',
          paddingLeft: 'var(--dim-space-300)',
        }}
      >
        <button
          type='button'
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? 'ย่อรายการค่าใช้จ่าย' : 'ขยายดูรายการค่าใช้จ่าย'}
          className='inline-flex items-center justify-center shrink-0'
          style={{
            width: 'var(--dim-size-700, 36px)',
            height: 'var(--dim-size-700, 36px)',
            borderRadius: 'var(--dim-radius-full, 9999px)',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-content-secondary, #636B72)',
            cursor: 'pointer',
          }}
        >
          <Icon name={expanded ? 'expand_less' : 'expand_more'} size={20} />
        </button>

        <div className='flex flex-col shrink-0' style={{ width: 170 }}>
          <span style={T.value}>{visit.visitNo}</span>
          <span style={T.muted}>{visit.visitDate}</span>
        </div>

        <div className='flex flex-col min-w-0 flex-1'>
          <EllipsisText text={visit.patient.shortName} />
          <span style={T.muted}>HN {visit.hn} · {maskNationalId(visit.patient.nationalId)} · {clinicLabelOf(visit)}</span>
        </div>

        <div className='flex flex-col shrink-0 items-start' style={{ width: 150, gap: 'var(--dim-space-050, 2px)' }}>
          <ColorfulBadge badgeStyle={rights?.badge || 'grey'} size='small'>{rights?.code || '-'}</ColorfulBadge>
          <span style={T.muted}>{kind.label}</span>
        </div>

        <div className='flex flex-col shrink-0' style={{ width: 130 }}>
          <span style={T.label}>ค่าใช้จ่ายรวม</span>
          <span style={T.value}>{formatBaht(claim.totalCharge)}</span>
        </div>

        <div className='flex flex-col shrink-0' style={{ width: 140 }}>
          <span style={T.label}>ยอดเรียกเก็บ</span>
          <span style={{ ...T.value, color: 'var(--text-statusbadge-success, #196C65)' }}>{formatBaht(claim.claimTotal)}</span>
        </div>

        <div className='flex flex-col shrink-0' style={{ width: 130 }}>
          <span style={T.label}>ส่วนเงินสด</span>
          <span style={T.value}>{formatBaht(claim.cashTotal)}</span>
        </div>

        <div className='flex flex-col shrink-0 items-start' style={{ width: 150, gap: 'var(--dim-space-050, 2px)' }}>
          <StatusBadge style={CYCLE_STATUSES[cycle?.status || 'open'].color} size='small'>
            {cycle?.name || 'ยังไม่เข้ารอบ'}
          </StatusBadge>
          <span style={T.muted}>{statusMeta.label}</span>
        </div>

        <div className='shrink-0'>
          <BrandIconButton
            icon='edit'
            size='sm'
            variant={role.canEdit ? 'quaternary' : 'ghost'}
            disabled={!role.canEdit}
            aria-label='แก้ไขข้อมูลการเรียกเก็บ'
            title={role.canEdit ? 'แก้ไขข้อมูลการเรียกเก็บ' : 'ต้องเป็นเจ้าหน้าที่เบิกจ่าย'}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          />
        </div>
      </div>

      {expanded && (
        <div
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-300)',
            borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
            paddingTop: 'var(--dim-space-300)',
            paddingRight: 'var(--dim-space-300)',
            paddingBottom: 'var(--dim-space-300)',
            paddingLeft: 'var(--dim-space-300)',
          }}
        >
          {claim.selfPay && (
            <Alert
              type='warning'
              title={visit.rightsExpired ? 'สิทธิของครั้งบริการนี้หมดอายุ — ทุกบรรทัดตกเป็นเงินสด' : 'ครั้งบริการนี้เป็นชำระเงินเอง'}
              subtext='ไม่มีส่วนที่เรียกเก็บได้ ตรวจสอบ/ต่อสิทธิที่แท็บ “เช็คสิทธิ” แล้วเปลี่ยนสิทธิที่ใช้เรียกเก็บอีกครั้ง'
            />
          )}
          <Table columns={lineColumns} rows={claim.lines} rowKey={(l) => l.id} emptyMessage='ไม่มีรายการค่าใช้จ่าย' />

          <FieldGrid cols={4}>
            <ReadField label='เลขที่การมารับบริการ' value={visit.visitNo} />
            <ReadField label='สิทธิที่ใช้เรียกเก็บ' value={rights?.name} />
            <ReadField label='หน่วยงานต้นสังกัด' value={parentOrgByCode(visit.parentOrgCode)?.name || 'ยังไม่ระบุ'} />
            <ReadField label='รอบส่งเบิก' value={cycle ? `${cycle.name} (${cycleRangeLabel(cycle)})` : 'ยังไม่เข้ารอบ'} />
            <ReadField label='ค่าธรรมเนียมตามสิทธิ' value={claim.feeTotal > 0 ? formatBaht(claim.feeTotal) : 'ไม่มี'} />
            <ReadField label='ประเภทการลดหย่อน' value={claim.deduction ? claim.deduction.name : 'ไม่มี'} />
            <ReadField label='ส่วนลดที่ออกแล้ว' value={formatBaht(claim.discountAmount)} />
            <ReadField
              label='ค้างชำระ (เงินสด)'
              value={formatBaht(claim.cashOutstanding)}
              tone={claim.cashOutstanding > 0 ? 'var(--text-statusbadge-error, #B91C1C)' : undefined}
            />
          </FieldGrid>

          {claim.capTrimmed > 0 && (
            <Alert
              type='info'
              title={`ยอดเรียกเก็บถูกจำกัดด้วยเพดานต่อครั้งของสิทธิ (${formatBaht(rights.capPerVisit)})`}
              subtext={`ส่วนที่เกินเพดาน ${formatBaht(claim.capTrimmed)} ย้ายไปเป็นส่วนที่ผู้รับบริการจ่ายเอง`}
            />
          )}

          <AuditNote prefix='แก้ไขล่าสุดโดย' by={visit.savedBy} at={visit.savedAt} />
          <AuditList entries={visit.audit} emptyText='ยังไม่มีการแก้ไขการเรียกเก็บในรอบการใช้งานนี้' />
        </div>
      )}
    </div>
  );
};

/* ── edit popup (§1.7.4.3 / .5 / .6 / .7) ───────────────────── */

const BillingEditPopup = ({ visit, role, onClose }) => {
  const initial = useMemo(() => ({
    billingRightsId: visit.billingRightsId,
    visitKind: visit.visitKind,
    parentOrgCode: visit.parentOrgCode,
    deductionTypeId: visit.deductionTypeId,
    cycleId: visit.cycleId,
  }), [visit]);

  const [form, setForm] = useState(initial);
  const [orgLookup, setOrgLookup] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  /* Preview totals — the split is re-derived from a throwaway visit object
     so the operator sees the new เรียกเก็บ/เงินสด numbers BEFORE saving
     (§1.7.4.3 → §1.7.4.4). */
  const preview = useMemo(
    () => computeVisitClaim({ ...visit, ...form }),
    [visit, form],
  );

  const rightsOptions = RIGHTS_MASTER.filter((r) => r.active).map((r) => ({
    value: r.id,
    label: `${r.code} · ${r.name}`,
  }));

  const attemptClose = () => {
    if (dirty) { setConfirmDiscard(true); return; }
    onClose();
  };

  return (
    <>
      <Popup
        open
        onClose={attemptClose}
        size='extraLarge'
        width={1040}
        title='แก้ไขข้อมูลการเรียกเก็บ'
        subtitle={`${visit.visitNo} · ${visit.patient.shortName} · ${visit.visitDate}`}
        footer={(
          <div className='w-full flex items-center justify-between'>
            <span style={T.muted}>
              {role.canEdit
                ? 'ทุกการบันทึกจะเก็บชื่อผู้แก้ไขและเวลาไว้ในประวัติของครั้งบริการนี้'
                : 'บทบาทนี้ดูได้เท่านั้น — สลับเป็นเจ้าหน้าที่เบิกจ่ายเพื่อแก้ไข'}
            </span>
            <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
              <NeutralSubdueButton size='md' onClick={attemptClose}>ยกเลิก</NeutralSubdueButton>
              <BrandSubdueButton
                size='md'
                variant='outline'
                disabled={!dirty}
                onClick={() => setForm(initial)}
              >
                คืนค่าเดิม
              </BrandSubdueButton>
              <BrandSubdueButton
                size='md'
                variant='fill'
                disabled={!role.canEdit || !dirty}
                onClick={() => { saveVisitBilling(visit.id, form, role.userName); onClose(); }}
              >
                บันทึกการแก้ไข
              </BrandSubdueButton>
            </div>
          </div>
        )}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
          {/* §1.7.4.5 — เลขที่การมารับบริการ อ่านอย่างเดียว (เป็นตัวอ้างอิงการเรียกเก็บ) */}
          <SectionCard title='ข้อมูลอ้างอิงการเรียกเก็บ' subtitle='TOR §1.7.4.5' icon='receipt_long' tone='muted'>
            <FieldGrid cols={3}>
              <ReadField label='เลขที่การมารับบริการ (อ้างอิง)' value={visit.visitNo} />
              <ReadField label='HN / ชื่อ-สกุล' value={`${visit.hn} · ${visit.patient.shortName}`} />
              <ReadField label='วันที่-เวลารับบริการ' value={`${visit.visitDate} · ${visit.visitTime} น.`} />
            </FieldGrid>
          </SectionCard>

          {/* §1.7.4.3 — เปลี่ยนสิทธิที่ใช้เรียกเก็บ */}
          <SectionCard title='สิทธิการรักษาที่ใช้เรียกเก็บ' subtitle='TOR §1.7.4.3 — เปลี่ยนแล้วยอดเรียกเก็บคำนวณใหม่ทันที' icon='verified_user'>
            <RadioGroup
              legend='เลือกสิทธิที่จะใช้เรียกเก็บครั้งบริการนี้'
              value={form.billingRightsId}
              onChange={(v) => setForm((f) => ({ ...f, billingRightsId: v }))}
              options={rightsOptions}
            />
            {form.billingRightsId !== visit.billingRightsId && (
              <Alert
                type='info'
                title='สิทธิที่ใช้เรียกเก็บถูกเปลี่ยน'
                subtext={`${rightsById(visit.billingRightsId)?.name || '-'} → ${rightsById(form.billingRightsId)?.name || '-'} · ระบบแบ่งบรรทัดเรียกเก็บ/เงินสดใหม่ตามเงื่อนไขของสิทธิใหม่`}
              />
            )}
          </SectionCard>

          {/* §1.7.4.6 — ประเภทผู้รับบริการ */}
          <SectionCard title='ประเภทผู้รับบริการ' subtitle='TOR §1.7.4.6 — อุบัติเหตุ (AE) / ฉุกเฉิน (EMS) / ปกติ' icon='emergency'>
            <RadioGroup
              legend='ระบุประเภทของครั้งบริการ'
              direction='row'
              value={form.visitKind}
              onChange={(v) => setForm((f) => ({ ...f, visitKind: v }))}
              options={VISIT_KINDS.map((k) => ({ value: k.key, label: k.label }))}
            />
            {form.visitKind !== 'normal' && (
              <span style={T.muted}>ครั้งบริการที่เป็น AE/EMS จะถูกดึงเข้าแฟ้ม AER ของชุดข้อมูล 16 แฟ้ม</span>
            )}
          </SectionCard>

          {/* §1.7.4.7 — หน่วยงานต้นสังกัด */}
          <SectionCard title='หน่วยงานต้นสังกัดที่จะส่งเรื่องไปเรียกเก็บ' subtitle='TOR §1.7.4.7' icon='account_balance'>
            <div className='flex items-end flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <InputField
                label='หน่วยงานต้นสังกัด'
                value={parentOrgByCode(form.parentOrgCode)?.name || ''}
                placeholder='ยังไม่ระบุ — กดปุ่มเพื่อค้นหา'
                onChange={() => {}}
                showHelperText={false}
                state='disabled'
                disabled
                style={{ flex: '1 1 320px', minWidth: 280 }}
              />
              <BrandSubdueButton size='md' variant='outline' leadingIcon='search' onClick={() => setOrgLookup(true)}>
                ค้นหาหน่วยงาน
              </BrandSubdueButton>
            </div>
            {!form.parentOrgCode && (
              <span style={{ ...T.muted, color: 'var(--text-statusbadge-warning, #C2410C)' }}>
                ยังไม่ระบุหน่วยงานต้นสังกัด — ครั้งบริการนี้จะยังส่งเรื่องเรียกเก็บไม่ได้
              </span>
            )}
          </SectionCard>

          <SectionCard title='รอบส่งเบิกและการลดหย่อน' icon='event_repeat'>
            <div className='grid' style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--dim-space-400)' }}>
              <Select
                label='รอบส่งเบิก'
                searchable={false}
                showHelperText={false}
                showLeadingIcon={false}
                placeholder='เลือกรอบส่งเบิก'
                value={form.cycleId}
                options={CLAIM_CYCLES.map((c) => ({
                  value: c.id,
                  label: `${c.name} · ${cycleRangeLabel(c)} · ${CYCLE_STATUSES[c.status].label}`,
                }))}
                onChange={(v) => setForm((f) => ({ ...f, cycleId: v }))}
              />
              <Select
                label='ประเภทการลดหย่อน (ถ้ามี)'
                searchable={false}
                showHelperText={false}
                showLeadingIcon={false}
                placeholder='ไม่ใช้การลดหย่อน'
                value={form.deductionTypeId || ''}
                options={[
                  { value: '', label: 'ไม่ใช้การลดหย่อน' },
                  ...DEDUCTION_TYPES.filter((d) => d.active).map((d) => ({
                    value: d.id,
                    label: `${d.name} · ${d.mode === 'percent' ? `${d.value}%` : formatBaht(d.value)}`,
                  })),
                ]}
                onChange={(v) => setForm((f) => ({ ...f, deductionTypeId: v || null }))}
              />
            </div>
          </SectionCard>

          {/* §1.7.4.4 — ยอดที่ต้องเรียกเก็บ (คำนวณสด) */}
          <SectionCard title='ยอดที่ต้องเรียกเก็บ (คำนวณจากเงื่อนไขด้านบน)' subtitle='TOR §1.7.4.4' icon='calculate'>
            <div className='grid' style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'var(--dim-space-300)' }}>
              <MetricTile label='ค่าใช้จ่ายรวม' value={formatBaht(preview.totalCharge)} />
              <MetricTile label='ยอดเรียกเก็บ' value={formatBaht(preview.claimTotal)} tone='var(--text-statusbadge-success, #196C65)' hint={preview.capTrimmed > 0 ? `ถูกตัดด้วยเพดาน ${formatBaht(preview.capTrimmed)}` : undefined} />
              <MetricTile label='ส่วนเงินสด' value={formatBaht(preview.cashTotal)} hint={preview.feeTotal > 0 ? `รวมค่าธรรมเนียม ${formatBaht(preview.feeTotal)}` : undefined} />
              <MetricTile label='ส่วนลดที่ออก' value={formatBaht(preview.discountAmount)} hint={preview.deduction ? preview.deduction.name : 'ไม่มีการลดหย่อน'} />
            </div>
            <Table
              columns={[
                { key: 'label', label: 'รายการ', flex: true, minWidth: 200 },
                { key: 'payer', label: 'ผู้รับผิดชอบ', width: 130, render: (l) => <ColorfulBadge badgeStyle={PAYER_KINDS[l.payer].badge} size='small'>{PAYER_KINDS[l.payer].label}</ColorfulBadge> },
                { key: 'amount', label: 'ราคาเต็ม', width: 110, render: (l) => formatBaht(l.amount) },
                { key: 'claimAmount', label: 'ส่วนเรียกเก็บ', width: 130, render: (l) => formatBaht(l.claimAmount) },
                { key: 'cashAmount', label: 'ส่วนเงินสด', width: 120, render: (l) => formatBaht(l.cashAmount) },
              ]}
              rows={preview.lines}
              rowKey={(l) => l.id}
              emptyMessage='ไม่มีรายการค่าใช้จ่าย'
            />
          </SectionCard>

          <PermissionHint show={!role.canEdit} />
        </div>
      </Popup>

      <LookupPopup
        open={orgLookup}
        onClose={() => setOrgLookup(false)}
        onConfirm={(code) => setForm((f) => ({ ...f, parentOrgCode: code }))}
        title='เลือกหน่วยงานต้นสังกัด'
        subtitle='TOR §1.7.4.7 — หน่วยงานที่จะส่งเรื่องไปเรียกเก็บ'
        rows={PARENT_ORGS}
        value={form.parentOrgCode}
        getKey={(r) => r.code}
        getPrimary={(r) => r.name}
        getSecondary={() => null}
        allowClear
        searchPlaceholder='เช่น CGD หรือ กรมบัญชีกลาง'
      />

      <Popup
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title='ปิดหน้าต่างโดยไม่บันทึก?'
        subtitle='ค่าที่แก้ไว้ (สิทธิ / ประเภท / หน่วยงาน / รอบ / การลดหย่อน) จะไม่ถูกบันทึก'
        primaryAction={{ label: 'ปิดโดยไม่บันทึก', onClick: () => { setConfirmDiscard(false); onClose(); } }}
        secondaryAction={{ label: 'กลับไปแก้ต่อ', onClick: () => setConfirmDiscard(false) }}
      />
    </>
  );
};

/* ── section ─────────────────────────────────────────────────── */

const ClaimBillingSection = ({ role }) => {
  /* Store arrays mutate in place — `tick` is what invalidates the memos. */
  const tick = useRightsClaimTick();
  const [view, setView] = useState('lines');
  const [query, setQuery] = useState('');
  const [cycleFilter, setCycleFilter] = useState('all');
  const [onlyClaimable, setOnlyClaimable] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editVisitId, setEditVisitId] = useState(null);
  const [expandedCycle, setExpandedCycle] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [query, cycleFilter, onlyClaimable, view]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RIGHTS_VISITS.filter((v) => {
      if (cycleFilter !== 'all' && v.cycleId !== cycleFilter) return false;
      if (onlyClaimable && computeVisitClaim(v).claimTotal <= 0) return false;
      if (!q) return true;
      return [v.visitNo, v.hn, v.patient.shortName, clinicLabelOf(v)]
        .some((f) => f && String(f).toLowerCase().includes(q));
    });
  }, [query, cycleFilter, onlyClaimable, tick]);

  const totals = useMemo(() => computeClaimTotals(rows), [rows, tick]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const editVisit = editVisitId ? RIGHTS_VISITS.find((v) => v.id === editVisitId) : null;

  /* §1.7.4.8 — สรุปผู้รับบริการเรียกเก็บตามรอบการส่งเบิก */
  const cycleRows = useMemo(() => CLAIM_CYCLES.map((c) => {
    const visits = RIGHTS_VISITS.filter((v) => v.cycleId === c.id);
    const t = computeClaimTotals(visits);
    return { ...c, visits, totals: t };
  }), [tick]);

  const cycleGrandTotal = useMemo(
    () => cycleRows.reduce((a, c) => ({
      visitCount: a.visitCount + c.totals.visitCount,
      claimTotal: a.claimTotal + c.totals.claimTotal,
      totalCharge: a.totalCharge + c.totals.totalCharge,
      cashTotal: a.cashTotal + c.totals.cashTotal,
    }), { visitCount: 0, claimTotal: 0, totalCharge: 0, cashTotal: 0 }),
    [cycleRows],
  );

  const cycleColumns = [
    {
      key: 'expand', label: '', width: 56, sortable: false,
      render: (c) => (
        <BrandIconButton
          icon={expandedCycle === c.id ? 'expand_less' : 'expand_more'}
          size='sm'
          variant='ghost'
          aria-label={expandedCycle === c.id ? 'ย่อรายชื่อในรอบ' : 'ขยายดูรายชื่อในรอบ'}
          onClick={(e) => { e.stopPropagation(); setExpandedCycle((prev) => (prev === c.id ? null : c.id)); }}
        />
      ),
    },
    { key: 'name', label: 'งวดส่งเบิก', width: 150 },
    { key: 'range', label: 'ช่วงวันที่', width: 240, render: (c) => cycleRangeLabel(c) },
    { key: 'visitCount', label: 'จำนวนผู้รับบริการ', width: 160, align: 'center', render: (c) => `${c.totals.visitCount} ราย` },
    { key: 'totalCharge', label: 'ค่าใช้จ่ายรวม', width: 150, render: (c) => formatBaht(c.totals.totalCharge) },
    { key: 'claimTotal', label: 'ยอดเรียกเก็บรวม', flex: true, minWidth: 160, render: (c) => <span style={{ ...T.value, color: 'var(--text-statusbadge-success, #196C65)' }}>{formatBaht(c.totals.claimTotal)}</span> },
    {
      key: 'status', label: 'สถานะรอบ', width: 160,
      render: (c) => <StatusBadge style={CYCLE_STATUSES[c.status].color} size='small'>{CYCLE_STATUSES[c.status].label}</StatusBadge>,
    },
    {
      key: 'submitted', label: 'ส่งเบิกเมื่อ', width: 220, sortable: false,
      render: (c) => (c.submittedAt
        ? <div className='flex flex-col min-w-0'><EllipsisText text={c.submittedBy} /><span style={T.muted}>{c.submittedAt}</span></div>
        : <span style={T.muted}>ยังไม่ส่ง</span>),
    },
  ];

  const expandedCycleRow = expandedCycle ? cycleRows.find((c) => c.id === expandedCycle) : null;

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-500)' }}>
      {/* §1.7.4.2 — รายงานทางการเงิน */}
      <SectionCard title='รายงานทางการเงินของการเรียกเก็บ' subtitle='TOR §1.7.4.2 — คำนวณจากรายการที่ผ่านตัวกรองด้านล่าง' icon='monitoring'>
        <div className='grid' style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'var(--dim-space-300)' }}>
          <MetricTile label='จำนวนเงินค่าใช้จ่ายรวม' value={formatBaht(totals.totalCharge)} hint={`${totals.visitCount} ครั้งบริการ`} />
          <MetricTile label='จำนวนเงินเรียกเก็บรวม' value={formatBaht(totals.claimTotal)} tone='var(--text-statusbadge-success, #196C65)' hint='ส่วนที่ผู้เรียกเก็บรับผิดชอบ' />
          <MetricTile label='จำนวนเงินที่เรียกเก็บแล้ว' value={formatBaht(totals.billedTotal)} hint='อยู่ในรอบที่ส่งเบิกแล้ว' />
          <MetricTile label='จำนวนเงินคงเหลือ' value={formatBaht(totals.remainingTotal)} hint='ยังอยู่ในรอบที่เปิดรับ' />
          <MetricTile label='คงเหลือค้างชำระ (เงินสด)' value={formatBaht(totals.outstandingTotal)} tone={totals.outstandingTotal > 0 ? 'var(--text-statusbadge-error, #B91C1C)' : undefined} hint='รอเก็บจากผู้รับบริการ' />
          <MetricTile label='จำนวนเงินส่วนลดรวม' value={formatBaht(totals.discountTotal)} hint={`${totals.discountedVisits} ครั้งบริการที่ได้ส่วนลด`} />
          <MetricTile label='% ส่วนลดที่ออกไปแล้ว' value={`${totals.discountPct}%`} hint='เทียบกับค่าใช้จ่ายรวม' />
          <MetricTile label='ค่าธรรมเนียมรวม' value={formatBaht(totals.feeTotal)} hint='ตามเงื่อนไขปลีกย่อยของสิทธิ' />
        </div>
      </SectionCard>

      {/* view switch + filters */}
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        {VIEWS.map((v) => (
          <FilterTag key={v.key} leadingIcon={v.icon} selected={view === v.key} onClick={() => setView(v.key)} value={v.label} />
        ))}
        <span style={{ width: 'var(--dim-space-300)' }} />
        <FilterTag
          leadingIcon='event_repeat'
          selected={cycleFilter === 'all'}
          onClick={() => setCycleFilter('all')}
          value={`ทุกรอบ (${RIGHTS_VISITS.length})`}
        />
        {CLAIM_CYCLES.map((c) => (
          <FilterTag
            key={c.id}
            selected={cycleFilter === c.id}
            onClick={() => setCycleFilter(c.id)}
            value={`${c.name} (${RIGHTS_VISITS.filter((v) => v.cycleId === c.id).length})`}
          />
        ))}
      </div>

      {view === 'lines' && (
        <>
          <div className='flex items-end flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <InputField
              label='ค้นหา'
              leadingIcon='search'
              placeholder='เลขที่การมารับบริการ / HN / ชื่อ / คลินิก'
              value={query}
              onChange={setQuery}
              showHelperText={false}
              style={{ flex: '1 1 320px', minWidth: 280 }}
            />
            <label className='flex items-center' style={{ gap: 'var(--dim-space-200)', paddingBottom: 'var(--dim-space-200)' }}>
              <Checkbox checked={onlyClaimable} onChange={() => setOnlyClaimable((v) => !v)} />
              <span style={T.body}>แสดงเฉพาะรายการที่มีส่วนเรียกเก็บ</span>
            </label>
            {(query || cycleFilter !== 'all' || onlyClaimable) && (
              <NeutralSubdueButton
                size='sm'
                variant='outline'
                onClick={() => { setQuery(''); setCycleFilter('all'); setOnlyClaimable(false); }}
              >
                ล้างตัวกรอง
              </NeutralSubdueButton>
            )}
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon='search_off'
              title='ไม่พบรายการเรียกเก็บที่ตรงกับเงื่อนไข'
              subtext='ลองล้างตัวกรองรอบส่งเบิก หรือค้นด้วยเลขที่การมารับบริการแทน'
            />
          ) : (
            <>
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                {pageRows.map((v) => (
                  <VisitClaimCard
                    key={v.id}
                    visit={v}
                    role={role}
                    expanded={expandedId === v.id}
                    onToggle={() => setExpandedId((prev) => (prev === v.id ? null : v.id))}
                    onEdit={() => setEditVisitId(v.id)}
                  />
                ))}
              </div>

              {/* §1.7.4.9 — สรุปยอดเรียกเก็บของชุดที่แสดงอยู่ */}
              <div
                className='flex items-center flex-wrap w-full'
                style={{
                  gap: 'var(--dim-space-500)',
                  borderRadius: 'var(--dim-radius-300, 10px)',
                  background: 'var(--surface-brandPrimary-quaternary)',
                  paddingTop: 'var(--dim-space-300)',
                  paddingRight: 'var(--dim-space-400)',
                  paddingBottom: 'var(--dim-space-300)',
                  paddingLeft: 'var(--dim-space-400)',
                }}
              >
                <span style={T.heading}>รวมทั้งหมด {totals.visitCount} ครั้งบริการ</span>
                <div className='flex-1' />
                <span style={T.body}>ค่าใช้จ่ายรวม {formatBaht(totals.totalCharge)}</span>
                <span style={{ ...T.value, color: 'var(--text-statusbadge-success, #196C65)' }}>ยอดเรียกเก็บรวม {formatBaht(totals.claimTotal)}</span>
                <span style={T.body}>เงินสดรวม {formatBaht(totals.cashTotal)}</span>
              </div>

              {pageCount > 1 && (
                <div className='w-full flex items-center justify-between' style={{ gap: 'var(--dim-space-300)' }}>
                  <span style={T.muted}>
                    แสดง {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, rows.length)} จาก {rows.length} รายการ
                  </span>
                  <Pagination currentPage={safePage} pageCount={pageCount} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </>
      )}

      {view === 'cycles' && (
        <>
          <Table
            columns={cycleColumns}
            rows={cycleRows}
            rowKey={(c) => c.id}
            onRowClick={(c) => setExpandedCycle((prev) => (prev === c.id ? null : c.id))}
            emptyMessage='ยังไม่มีรอบส่งเบิก'
          />

          {/* §1.7.4.9 — แถวรวมยอดท้ายตาราง */}
          <div
            className='flex items-center flex-wrap w-full'
            style={{
              gap: 'var(--dim-space-500)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              background: 'var(--surface-brandPrimary-quaternary)',
              paddingTop: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-400)',
              paddingBottom: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-400)',
            }}
          >
            <span style={T.heading}>รวมทุกงวด</span>
            <div className='flex-1' />
            <span style={T.body}>{cycleGrandTotal.visitCount} ราย</span>
            <span style={T.body}>ค่าใช้จ่ายรวม {formatBaht(cycleGrandTotal.totalCharge)}</span>
            <span style={{ ...T.value, color: 'var(--text-statusbadge-success, #196C65)' }}>ยอดเรียกเก็บรวม {formatBaht(cycleGrandTotal.claimTotal)}</span>
          </div>

          {/* §1.7.4.8 — รายชื่อผู้รับบริการในรอบที่เลือก */}
          {expandedCycleRow && (
            <SectionCard
              title={`ผู้รับบริการในรอบ ${expandedCycleRow.name}`}
              subtitle={`${cycleRangeLabel(expandedCycleRow)} · ${CYCLE_STATUSES[expandedCycleRow.status].label}`}
              icon='groups'
              actions={<NeutralSubdueButton size='sm' variant='outline' onClick={() => setExpandedCycle(null)}>ปิดรายการ</NeutralSubdueButton>}
            >
              {expandedCycleRow.visits.length === 0 ? (
                <EmptyState icon='inbox' title='ยังไม่มีผู้รับบริการในรอบนี้' subtext='ย้ายครั้งบริการเข้ารอบนี้ได้จากปุ่มแก้ไขในมุมมองรายรายการ' />
              ) : (
                <Table
                  columns={[
                    { key: 'visitNo', label: 'เลขที่การมารับบริการ', width: 180 },
                    { key: 'visitDate', label: 'วันที่รับบริการ', width: 150 },
                    {
                      key: 'patient', label: 'HN / ชื่อ-สกุล', flex: true, minWidth: 200,
                      render: (v) => (
                        <div className='flex flex-col min-w-0'>
                          <EllipsisText text={v.patient.shortName} />
                          <span style={T.muted}>HN {v.hn} · {maskNationalId(v.patient.nationalId)}</span>
                        </div>
                      ),
                    },
                    {
                      key: 'rights', label: 'สิทธิ', width: 130,
                      render: (v) => {
                        const r = rightsById(v.billingRightsId);
                        return <ColorfulBadge badgeStyle={r?.badge || 'grey'} size='small'>{r?.code || '-'}</ColorfulBadge>;
                      },
                    },
                    { key: 'kind', label: 'ประเภท', width: 130, render: (v) => visitKindMeta(v.visitKind).label },
                    { key: 'org', label: 'หน่วยงานต้นสังกัด', width: 240, render: (v) => <EllipsisText text={parentOrgByCode(v.parentOrgCode)?.name || 'ยังไม่ระบุ'} /> },
                    { key: 'claim', label: 'ยอดเรียกเก็บ', width: 140, render: (v) => <span style={{ ...T.value, color: 'var(--text-statusbadge-success, #196C65)' }}>{formatBaht(computeVisitClaim(v).claimTotal)}</span> },
                  ]}
                  rows={expandedCycleRow.visits}
                  rowKey={(v) => v.id}
                  stickyColCount={1}
                  emptyMessage='ยังไม่มีผู้รับบริการในรอบนี้'
                />
              )}
              <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
                <span style={T.body}>รวมในรอบนี้ {expandedCycleRow.totals.visitCount} ราย</span>
                <span style={{ ...T.value, color: 'var(--text-statusbadge-success, #196C65)' }}>ยอดเรียกเก็บรวม {formatBaht(expandedCycleRow.totals.claimTotal)}</span>
                <span style={T.body}>เงินสดรวม {formatBaht(expandedCycleRow.totals.cashTotal)}</span>
              </div>
            </SectionCard>
          )}
        </>
      )}

      {editVisit && (
        <BillingEditPopup visit={editVisit} role={role} onClose={() => setEditVisitId(null)} />
      )}
    </div>
  );
};

export default ClaimBillingSection;
