import React, { useMemo } from 'react';
import StatusBadge from '@/components/badge/StatusBadge';
import { formatBaht } from '@/data/financePaymentPrototype';
import { buildVisitJourney } from '@/data/treatmentVisitJourney';
import {
  InfoPair,
  PanelCard,
  Sym,
} from '@/pages/treat/panels/panelKit';

const STAGE_STATUS_BADGE = {
  completed: { style: 'success', label: 'เสร็จสิ้น' },
  'in-progress': { style: 'warning', label: 'กำลังดำเนินการ' },
  pending: { style: 'info', label: 'รอดำเนินการ' },
  skipped: { style: 'neutral', label: 'ข้าม' },
  voided: { style: 'error', label: 'ยกเลิก' },
  none: { style: 'neutral', label: 'ไม่มีข้อมูล' },
};

const StageHeader = ({ stage }) => {
  const badge = STAGE_STATUS_BADGE[stage.status] ?? STAGE_STATUS_BADGE.none;
  return (
    <div className='flex items-center w-full min-w-0' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      <div
        className='flex items-center justify-center shrink-0'
        style={{
          width: 'var(--dim-size-700, 36px)',
          height: 'var(--dim-size-700, 36px)',
          borderRadius: 'var(--dim-radius-full)',
          background: 'var(--surface-brandPrimary-quaternary, #E2F3EB)',
        }}
      >
        <Sym name={stage.icon} size={18} color='var(--icon-brandPrimary-default, #007549)' />
      </div>
      <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <span style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-heading-content)',
          fontWeight: 'var(--type-weight-bold)',
          fontSize: 'var(--type-size-sm, 14px)',
        }}>
          {`${stage.order}. ${stage.label}`}
        </span>
      </div>
      <StatusBadge style={badge.style} size='small'>{badge.label}</StatusBadge>
    </div>
  );
};

const FieldGrid = ({ fields = [] }) => (
  <div
    className='grid w-full min-w-0'
    style={{
      gap: 'var(--dim-space-400, 16px)',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    }}
  >
    {fields.map((f) => (
      <InfoPair key={`${f.label}-${f.value}`} label={f.label} value={f.value} />
    ))}
  </div>
);

const ItemList = ({ title, items = [] }) => {
  if (!items.length) return null;
  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      <span style={{
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
        fontWeight: 'var(--type-weight-medium)',
      }}>
        {title}
      </span>
      <ul className='flex flex-col w-full min-w-0' style={{
        gap: 'var(--dim-space-150, 6px)',
        margin: 0,
        paddingLeft: 'var(--dim-space-400, 16px)',
      }}>
        {items.map((it, i) => (
          <li key={`${it.label}-${i}`} style={{
            color: 'var(--text-content-default)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            lineHeight: 1.5,
          }}>
            {typeof it === 'string' ? it : (
              <>
                <strong>{it.label}</strong>
                {it.detail ? ` — ${it.detail}` : ''}
                {it.qty != null ? ` (${it.qty} ${it.unit ?? 'หน่วย'})` : ''}
                {it.price != null ? ` · ${formatBaht(it.price)}` : ''}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

const ChargeTable = ({ lines = [] }) => {
  if (!lines.length) return null;
  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      <span style={{
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
        fontWeight: 'var(--type-weight-medium)',
      }}>
        รายการค่าใช้จ่าย
      </span>
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-150, 6px)' }}>
        {lines.map((line) => (
          <div
            key={line.label}
            className='flex items-start justify-between w-full min-w-0'
            style={{ gap: 'var(--dim-space-300, 12px)' }}
          >
            <span style={{
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              flex: 1,
            }}>
              {line.label}
            </span>
            <span style={{
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              whiteSpace: 'nowrap',
            }}>
              {formatBaht(line.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StageBody = ({ stage, listKey = null }) => {
  if (listKey === 'labs') {
    return stage.labs?.length
      ? <ItemList title='รายการแล็บ' items={stage.labs} />
      : null;
  }

  return (
  <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
    <FieldGrid fields={stage.fields} />
    {stage.orders?.length ? (
      <ItemList title='คำสั่งการพยาบาล' items={stage.orders} />
    ) : null}
    {stage.icdRows?.length ? (
      <ItemList
        title='รหัส ICD-10'
        items={stage.icdRows.map((r) => `${r.code} — ${r.name}`)}
      />
    ) : null}
    {stage.medications?.length ? (
      <ItemList title='รายการยา / หัตถการ' items={stage.medications} />
    ) : null}
    {stage.labs?.length ? (
      <ItemList title='รายการแล็บ' items={stage.labs} />
    ) : null}
    {stage.imaging?.length ? (
      <ItemList title='รายการ X-ray / RIS' items={stage.imaging} />
    ) : null}
    {stage.chargeLines?.length ? (
      <ChargeTable lines={stage.chargeLines} />
    ) : null}
  </div>
  );
};

/** ภาพรวมการรักษาครบวงจร — ลงทะเบียน → ชำระเงิน */
export default function VisitJourneyPanel({
  patient,
  visitDate,
  visitDetail,
  form,
  isCurrentVisit = false,
}) {
  const journey = useMemo(
    () => buildVisitJourney({
      hn: patient?.hn,
      visitDate,
      visitDetail,
      form,
      isCurrentVisit,
    }),
    [patient?.hn, visitDate, visitDetail, form, isCurrentVisit],
  );

  if (!patient?.hn) {
    return null;
  }

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      <PanelCard
        title='ภาพรวมการรักษา (ลงทะเบียน → ชำระเงิน)'
        subtitle={`HN ${patient.hn} · ${journey.visitDate}${journey.isCurrentVisit ? ' · ครั้งที่กำลังรักษา' : ''}`}
        tone='quaternary'
      >
        <span style={{
          color: 'var(--text-content-secondary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          lineHeight: 1.6,
        }}>
          สรุปข้อมูลทุกขั้นตอนตั้งแต่เปิด Visit จนถึงการชำระเงิน — ใช้ตรวจสอบเส้นทางการรักษาของผู้ป่วยก่อนบันทึก CPOE
        </span>
      </PanelCard>

      {journey.stages.map((stage) => (
        <PanelCard key={stage.key} tone='quaternary'>
          <StageHeader stage={stage} />
          <StageBody stage={stage} />
        </PanelCard>
      ))}
    </div>
  );
}

/** แท็บย่อย — แสดงเฉพาะ stage เดียวจาก journey (แล็บ / ตรวจร่างกาย / วินิจฉัย) */
export function VisitJourneyStagePanel({
  patient,
  visitDate,
  visitDetail,
  form,
  isCurrentVisit = false,
  stageKey,
  listKey = null,
  title,
  emptyTitle = 'ยังไม่มีข้อมูล',
}) {
  const journey = useMemo(
    () => buildVisitJourney({
      hn: patient?.hn,
      visitDate,
      visitDetail,
      form,
      isCurrentVisit,
    }),
    [patient?.hn, visitDate, visitDetail, form, isCurrentVisit],
  );

  const stage = journey.stages.find((s) => s.key === stageKey);
  if (!stage) return null;

  const listItems = listKey ? (stage[listKey] ?? []) : null;
  const hasContent = stage.fields?.some((f) => f.value && f.value !== '—')
    || (listItems?.length > 0)
    || (stage.medications?.length > 0)
    || (stage.icdRows?.length > 0);

  if (!hasContent && listKey) {
    return (
      <PanelCard title={title} tone='quaternary'>
        <span style={{
          color: 'var(--text-content-secondary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
        }}>
          {emptyTitle}
        </span>
      </PanelCard>
    );
  }

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      <PanelCard title={title} subtitle={journey.visitDate} tone='quaternary'>
        <StageHeader stage={stage} />
      </PanelCard>
      <PanelCard tone='quaternary'>
        <StageBody stage={stage} listKey={listKey} />
      </PanelCard>
    </div>
  );
}
