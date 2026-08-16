import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import Pagination from '@/components/pagination/Pagination';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { STAFF_AVATARS } from '@/data/avatarAssets';
import {
  PanelCard, PanelEmptyState, Sym,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, AccessDeniedPanel,
  ReasonDialog, paginate,
} from '@/pages/treat/panels/panelHooks';
import {
  auditCategoryMeta, subscribeTreatmentAudit,
  auditForVisit, markAuditErroneous, unmarkAuditErroneous,
} from '@/data/treatmentAudit';

/* PHCIS | EMR §1.4.3.16 — ประวัติการบันทึกและแก้ไข (Audit Trail).
   แสดงใน ระบบประวัติการใช้งาน (/audit/record-history). */

const PER_PAGE = 10;

const AuditRecordPanel = ({ patient }) => {
  const access = useTreatmentAccess();
  const hn = patient?.hn || '';

  const [audit] = useTreatmentStore(
    subscribeTreatmentAudit,
    () => auditForVisit(hn, ''),
    [hn],
  );

  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [markTarget, setMarkTarget] = useState(null);
  const [unmarkTarget, setUnmarkTarget] = useState(null);

  const filtered = audit;

  const { pageCount, page: safePage, slice } = paginate(filtered, page, PER_PAGE);
  const sortedSlice = useMemo(() => {
    if (!sortConfig.key) return slice;
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    return slice.slice().sort((a, b) => sign * String(a[sortConfig.key] ?? '').localeCompare(String(b[sortConfig.key] ?? ''), 'th'));
  }, [slice, sortConfig]);


  const columns = [
    {
      key: 'category', header: 'หมวด', sortable: true,
      render: (row) => {
        const meta = auditCategoryMeta(row.category);
        return <ColorfulBadge style={meta.tone} size='small' width='hug'>{meta.label}</ColorfulBadge>;
      },
    },
    {
      key: 'field', header: 'รายการที่เปลี่ยน', sortable: true, flex: 1,
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={PANEL_VALUE_STYLE}>{row.field}</span>
          <span className='inline-flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <span style={{ ...PANEL_LABEL_STYLE, textDecoration: 'line-through' }}>{row.oldValue}</span>
            <Sym name='arrow_forward' size={12} color='var(--icon-neutral-tertiary, #ADB2B7)' />
            <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-content-default)' }}>{row.newValue}</span>
          </span>
        </div>
      ),
    },
    { key: 'by', header: 'ผู้บันทึก', sortable: true, render: (row) => <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}><img src={row.byAvatarUrl || STAFF_AVATARS[0]} alt='' aria-hidden className='shrink-0 object-cover' style={{ width: 'var(--dim-size-500)', height: 'var(--dim-size-500)', borderRadius: 'var(--dim-radius-full)' }} /><span style={PANEL_VALUE_STYLE}>{row.by}</span></div> },
    { key: 'recordedAt', header: 'เวลาที่บันทึก', sortable: true },
    {
      key: 'amendedAt', header: 'เวลาที่แก้ไข',
      render: (row) => (row.amendedAt
        ? <span style={PANEL_VALUE_STYLE}>{row.amendedAt}</span>
        : <span style={PANEL_LABEL_STYLE}>ไม่เคยแก้ไข</span>),
    },
    {
      key: 'erroneousAt', header: 'ระบุว่าลงข้อมูลผิด',
      render: (row) => (row.erroneousAt ? (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <StatusBadge style='error' size='small' icon='report'>{row.erroneousAt}</StatusBadge>
          <span style={PANEL_LABEL_STYLE}>{row.erroneousReason}</span>
          {row.erroneousBy ? <span style={PANEL_LABEL_STYLE}>โดย {row.erroneousBy}</span> : null}
        </div>
      ) : <span style={PANEL_LABEL_STYLE}>—</span>),
    },
    {
      key: 'actions', header: '',
      render: (row) => (row.erroneousAt ? (
        <GuardedAction allowed={access.canEdit}>
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='undo' onClick={() => setUnmarkTarget(row)}>
            ยกเลิกการระบุ
          </NeutralSubdueButton>
        </GuardedAction>
      ) : (
        <GuardedAction allowed={access.canEdit}>
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='report' onClick={() => setMarkTarget(row)}>
            ระบุว่าลงข้อมูลผิด
          </NeutralSubdueButton>
        </GuardedAction>
      )),
    },
  ];

  if (!access.canView) return <AccessDeniedPanel what='ประวัติการบันทึกเวชระเบียน' />;

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      <PanelCard
        style={{ border: 'none', padding: 'var(--dim-space-0)' }}
      >
        {audit.length === 0 ? (
          <PanelEmptyState
            icon='history'
            title='ยังไม่มีประวัติการบันทึกของผู้รับบริการรายนี้'
            subtitle='ทุกการบันทึก แก้ไข และยกเลิกจะปรากฏที่นี่ทันทีภายในรอบการทำงานเดียวกัน'
          />
        ) : (
          <>
            <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
              <Table columns={columns} rows={sortedSlice} rowKey={(r) => r.id} sortConfig={sortConfig} onSort={(key) => setSortConfig((p) => (p.key === key ? { key, direction: p.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }))} />
            </div>
            {pageCount > 1 ? (
              <div className='flex justify-end w-full'>
                <Pagination currentPage={safePage} pageCount={pageCount} onPageChange={setPage} />
              </div>
            ) : null}
          </>
        )}
      </PanelCard>

      <ReasonDialog
        open={!!markTarget}
        type='warning'
        title='ระบุว่ารายการนี้ลงข้อมูลผิด'
        description={markTarget ? `${markTarget.field} — ค่าเดิมจะยังคงอยู่ในประวัติ ระบบเพียงประทับเวลาและเหตุผลกำกับไว้ ไม่ลบข้อมูลออกจาก log` : ''}
        confirmLabel='ระบุว่าลงข้อมูลผิด'
        suggestions={[
          'คีย์ข้อมูลผิดช่อง — บันทึกค่าที่ถูกต้องไว้ในรายการถัดไปแล้ว',
          'บันทึกข้อมูลของผู้รับบริการรายอื่นโดยผิดพลาด',
          'เลือกรายการผิดจากรายการแนะนำ ทำให้ค่าที่บันทึกไม่ตรงกับการตรวจจริง',
          'ค่าที่บันทึกมาจากอุปกรณ์ที่ยังไม่ได้สอบเทียบ',
        ]}
        onConfirm={(reason) => { markAuditErroneous(markTarget.id, { reason }); setMarkTarget(null); }}
        onClose={() => setMarkTarget(null)}
      />

      <ReasonDialog
        open={!!unmarkTarget}
        type='info'
        title='ยกเลิกการระบุว่าลงข้อมูลผิด'
        description={unmarkTarget ? `${unmarkTarget.field} — เดิมระบุว่า "${unmarkTarget.erroneousReason}". การยกเลิกจะถูกบันทึกเป็นรายการใหม่ในประวัติเช่นกัน` : ''}
        confirmLabel='ยกเลิกการระบุ'
        suggestions={[
          'ตรวจสอบซ้ำแล้วพบว่าค่าเดิมถูกต้อง',
          'ระบุว่าลงข้อมูลผิดโดยเข้าใจคลาดเคลื่อน',
        ]}
        onConfirm={(reason) => { unmarkAuditErroneous(unmarkTarget.id, { reason }); setUnmarkTarget(null); }}
        onClose={() => setUnmarkTarget(null)}
      />
    </div>
  );
};

export default AuditRecordPanel;
