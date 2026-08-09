import React, { useMemo, useState } from 'react';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Select from '@/components/forms/Select';
import Pagination from '@/components/pagination/Pagination';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandButton from '@/components/button/BrandButton';
import {
  PanelCard, PanelEmptyState, InfoPair, Sym, CancelledMark, strikeIf,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentStore, useTreatmentAccess, GuardedAction, CountLabel, paginate,
} from '@/pages/treat/panels/panelHooks';
import {
  subscribeReferrals, referralHistoryForPatient, referralHistorySummary,
  referStatusMeta, centerMeta, internalDestinationMeta,
} from '@/data/treatmentRefer';
import { NO_EDIT_RIGHT_TOOLTIP } from '@/data/treatmentAccess';

/* PHCIS | CPOE §1.5.8.2 + EMR §1.4.3.4 — ประวัติการส่งต่อรายผู้ป่วยข้าม visit.

   ตัวเดียวกันถูกใช้ 2 ที่:
     • /treat/refer  — popup "ประวัติการส่งต่อของผู้รับบริการรายนี้"
     • /treat/record Step 1 — การ์ด "ประวัติการส่งต่อ" ที่ TOR §1.4.3.4 ขาด
   ทั้งสองที่อ่านจาก store เดียวกัน (treatmentRefer) จึงไม่มีสำเนาข้อมูล.

   กติกาที่ต้องคงไว้:
     • เรียงตามเวลาเสมอแม้ข้ามทิศทาง (referralHistoryForPatient ทำให้แล้ว)
     • ใบที่ยกเลิกไม่หายไปจาก timeline — ขีดฆ่า + แสดงเหตุผล
     • ใบหมดอายุขึ้นป้าย
     • อ่านอย่างเดียว — ปุ่มสร้าง/แก้ต้องผ่าน GuardedAction ไม่ซ่อนเงียบ */

const PER_PAGE = 6;

export const DIRECTION_META = {
  out:      { label: 'ส่งต่อออก',              tone: 'orange', icon: 'call_made'    },
  in:       { label: 'รับเข้าจากสถานพยาบาลอื่น', tone: 'blue',   icon: 'call_received' },
  internal: { label: 'ส่งต่อภายในหน่วยงาน',      tone: 'teal',   icon: 'swap_horiz'   },
};

export const directionMeta = (key) => DIRECTION_META[key] || DIRECTION_META.out;

const DIRECTION_FILTERS = [
  { value: 'all',      label: 'ทุกทิศทาง' },
  { value: 'out',      label: 'ส่งต่อออก' },
  { value: 'in',       label: 'รับเข้าจากสถานพยาบาลอื่น' },
  { value: 'internal', label: 'ส่งต่อภายในหน่วยงาน' },
];

/* หนึ่งใบในเส้นเวลา — ไม่ใช้ <Table> เพราะข้อมูลต่อแถวยาวและมีบล็อกเหตุผล
   ยกเลิก/ผลตอบกลับ ซึ่งตารางจะบีบจนอ่านไม่ออก */
const TimelineRow = ({ row, onOpen, canOpen, isLast }) => {
  const dir = directionMeta(row.direction);
  const status = referStatusMeta(row.status);
  const cancelled = row.status === 'cancelled';

  return (
    <div className='flex w-full min-w-0' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      {/* รางเส้นเวลา */}
      <div className='flex flex-col items-center shrink-0' style={{ width: 'var(--dim-size-500, 24px)' }}>
        <span
          className='inline-flex items-center justify-center shrink-0'
          style={{
            width: 'var(--dim-size-500, 24px)',
            height: 'var(--dim-size-500, 24px)',
            borderRadius: 'var(--dim-radius-full)',
            background: cancelled
              ? 'var(--surface-danger-quaternary, #FFF0F0)'
              : 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
          }}
        >
          <Sym
            name={cancelled ? 'block' : dir.icon}
            size={14}
            color={cancelled
              ? 'var(--icon-dangerButton-default, #B91C1C)'
              : 'var(--icon-brandPrimary-default, #007549)'}
          />
        </span>
        {!isLast ? (
          <span
            className='flex-1'
            style={{
              width: 'var(--dim-stroke-100, 1px)',
              minHeight: 'var(--dim-space-400, 16px)',
              background: 'var(--border-neutral-quaternary)',
            }}
          />
        ) : null}
      </div>

      {/* เนื้อหาใบ */}
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          gap: 'var(--dim-space-200, 8px)',
          borderRadius: 'var(--dim-radius-300, 10px)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
          background: 'var(--surface-card-100)',
          paddingTop: 'var(--dim-space-300, 12px)',
          paddingRight: 'var(--dim-space-300, 12px)',
          paddingBottom: 'var(--dim-space-300, 12px)',
          paddingLeft: 'var(--dim-space-300, 12px)',
          marginBottom: 'var(--dim-space-300, 12px)',
        }}
      >
        <div className='flex flex-wrap items-center justify-between w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <div className='flex flex-wrap items-center min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)', ...strikeIf(cancelled) }}>
              {row.referNo}
            </span>
            <ColorfulBadge style={dir.tone} size='small' width='hug'>{dir.label}</ColorfulBadge>
            <StatusBadge style={status.badge} size='small'>{status.label}</StatusBadge>
            {row.expired ? (
              <StatusBadge style='error' size='small' icon='event_busy'>หมดอายุ {row.validUntil}</StatusBadge>
            ) : null}
            {row.printCount ? (
              <span style={PANEL_LABEL_STYLE}>พิมพ์แล้ว {row.printCount} ครั้ง</span>
            ) : null}
          </div>
          {onOpen ? (
            <GuardedAction allowed={canOpen} reason='ไม่มีสิทธิ์เปิดรายละเอียดใบส่งต่อ'>
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='open_in_new' onClick={() => onOpen(row)}>
                เปิดรายละเอียด
              </NeutralSubdueButton>
            </GuardedAction>
          ) : null}
        </div>

        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <InfoPair
            label='ต้นทาง → ปลายทาง'
            value={`${centerMeta(row.fromCenter)?.label || '—'} → ${row.targetLabel}`}
            minWidth={280}
          />
          <InfoPair label='วันที่ส่ง' value={row.sentDate || row.lastVisitDate || 'ยังไม่ได้ส่ง'} minWidth={160} />
          <InfoPair label='อายุใบส่งต่อ' value={row.validUntil ? `ถึง ${row.validUntil}` : 'ไม่กำหนด'} minWidth={160} />
          {row.direction === 'internal' ? (
            <>
              <InfoPair label='ผู้รับมอบหมาย' value={row.assignee || 'ยังไม่มอบหมาย'} minWidth={220} />
              <InfoPair
                label={internalDestinationMeta(row.internalDestination)?.dueLabel || 'กำหนดวันเยี่ยม / วันนัด'}
                value={row.dueDate || 'ยังไม่กำหนด'}
                minWidth={200}
              />
            </>
          ) : (
            <>
              <InfoPair label='เลขที่ e-Referral' value={row.eReferralNo || 'ยังไม่ได้ส่งผ่าน e-Referral'} minWidth={200} />
              <InfoPair label='วันที่มารับบริการปลายทาง' value={row.appointmentDate || 'ยังไม่ได้รับแจ้ง'} minWidth={220} />
            </>
          )}
        </div>

        {row.requirement ? (
          <span style={{ ...PANEL_LABEL_STYLE, ...strikeIf(cancelled) }}>
            เหตุผลการส่ง: {row.requirement}
          </span>
        ) : null}

        {/* ผลตอบกลับจากปลายทาง — ใบที่ตอบกลับแล้วต้องเห็นได้จาก timeline ตรง ๆ */}
        {row.status === 'replied' ? (
          <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-alert-success, #196C65)' }}>
            ปลายทางรับเรื่องแล้ว{row.receivedDate ? ` เมื่อ ${row.receivedDate}` : ''}
            {row.direction === 'internal' && row.assignmentAcceptedAt
              ? ` · ผู้รับมอบหมายตอบรับ ${row.assignmentAcceptedAt}`
              : ''}
          </span>
        ) : null}

        {cancelled ? (
          <CancelledMark at={row.cancelledAt} reason={row.cancelReason} label='ใบส่งต่อถูกยกเลิก' />
        ) : null}
      </div>
    </div>
  );
};

/* Panel เดี่ยว ๆ (ไม่มี PanelCard ห่อ) — ใช้ในทั้ง popup และการ์ด Step 1 */
export const ReferralHistoryTimeline = ({ hn, onOpen, onCreate, compact = false }) => {
  const access = useTreatmentAccess();
  const [rows] = useTreatmentStore(
    subscribeReferrals,
    () => referralHistoryForPatient(hn),
    [hn],
  );
  const [directionFilter, setDirectionFilter] = useState('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => (directionFilter === 'all' ? rows : rows.filter((r) => r.direction === directionFilter)),
    [rows, directionFilter],
  );

  /* กรองใหม่แล้วต้องกลับหน้า 1 เสมอ — คำนวณจาก paginate ที่ clamp ให้อยู่แล้ว */
  const perPage = compact ? 3 : PER_PAGE;
  const { pageCount, page: safePage, slice } = paginate(filtered, page, perPage);

  if (!String(hn || '').trim()) {
    return (
      <PanelEmptyState
        icon='badge'
        title='ยังไม่ทราบ HN ของผู้รับบริการ'
        subtitle='เปิดประวัติการส่งต่อได้เมื่อผู้รับบริการมี HN ในระบบแล้ว'
      />
    );
  }

  if (rows.length === 0) {
    return (
      <PanelEmptyState
        icon='send'
        title='ผู้รับบริการรายนี้ยังไม่เคยถูกส่งต่อ'
        subtitle='เมื่อมีการออกใบส่งต่อออก รับเข้า หรือส่งต่อภายในหน่วยงาน รายการจะเรียงตามเวลาที่นี่'
        action={onCreate ? (
          <GuardedAction allowed={access.canEdit} reason={NO_EDIT_RIGHT_TOOLTIP}>
            <BrandButton variant='outline' size='sm' leadingIcon='add' onClick={onCreate}>
              ออกใบส่งต่อใบแรก
            </BrandButton>
          </GuardedAction>
        ) : null}
      />
    );
  }

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      <div className='flex flex-wrap items-center justify-between w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <div style={{ minWidth: 240, maxWidth: 320 }}>
          <Select
            value={directionFilter}
            onChange={(v) => { setDirectionFilter(v); setPage(1); }}
            options={DIRECTION_FILTERS}
            placeholder='กรองตามทิศทาง'
            showLabel={false}
            showHelperText={false}
          />
        </div>
        <CountLabel n={filtered.length} unit='ใบ' />
      </div>

      {filtered.length === 0 ? (
        <PanelEmptyState
          icon='filter_alt_off'
          title='ไม่มีใบส่งต่อในทิศทางที่เลือก'
          subtitle='ผู้รับบริการรายนี้มีใบส่งต่อในทิศทางอื่น — เลือก "ทุกทิศทาง" เพื่อดูทั้งหมด'
          action={(
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='filter_alt_off' onClick={() => setDirectionFilter('all')}>
              ล้างตัวกรอง
            </NeutralSubdueButton>
          )}
        />
      ) : (
        <div className='flex flex-col w-full min-w-0'>
          {slice.map((row, i) => (
            <TimelineRow
              key={row.id}
              row={row}
              onOpen={onOpen}
              canOpen={access.canView}
              isLast={i === slice.length - 1}
            />
          ))}
        </div>
      )}

      {pageCount > 1 ? (
        <div className='flex justify-end w-full'>
          <Pagination currentPage={safePage} pageCount={pageCount} onPageChange={setPage} />
        </div>
      ) : null}
    </div>
  );
};

/* การ์ดพร้อมหัวข้อ + สรุปตัวเลข — เวอร์ชันที่ Step 1 ใช้ (§1.4.3.4) */
const ReferralHistoryPanel = ({ patient, onOpenRegister, compact = false }) => {
  const access = useTreatmentAccess();
  const hn = patient?.hn || '';
  const [summary] = useTreatmentStore(
    subscribeReferrals,
    () => referralHistorySummary(hn),
    [hn],
  );

  return (
    <PanelCard
      title='ประวัติการส่งต่อของผู้รับบริการ'
      subtitle='ทุกใบส่งต่อของ HN นี้ข้ามครั้งที่มารับบริการ — ส่งต่อออก / รับเข้า / ส่งต่อภายในหน่วยงาน เรียงตามเวลา'
      action={onOpenRegister ? (
        <GuardedAction allowed={access.canView} reason='ไม่มีสิทธิ์เข้าถึงทะเบียนการส่งต่อ'>
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='list_alt' onClick={onOpenRegister}>
            ไปทะเบียนการส่งต่อ
          </NeutralSubdueButton>
        </GuardedAction>
      ) : null}
    >
      {summary.total > 0 ? (
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <InfoPair label='ใบส่งต่อทั้งหมด' value={`${summary.total} ใบ`} minWidth={140} />
          <InfoPair label='ส่งต่อออก' value={`${summary.out} ใบ`} minWidth={120} />
          <InfoPair label='รับเข้า' value={`${summary.incoming} ใบ`} minWidth={120} />
          <InfoPair label='ส่งต่อภายใน' value={`${summary.internal} ใบ`} minWidth={140} />
          <InfoPair label='ยกเลิก (คงไว้เป็นหลักฐาน)' value={`${summary.cancelled} ใบ`} minWidth={200} />
          <InfoPair label='หมดอายุแล้ว' value={`${summary.expired} ใบ`} minWidth={140} />
        </div>
      ) : null}

      <ReferralHistoryTimeline hn={hn} onCreate={onOpenRegister} compact={compact} />
    </PanelCard>
  );
};

export default ReferralHistoryPanel;
