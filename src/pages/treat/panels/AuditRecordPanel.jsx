import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import TabPill from '@/components/tab/TabPill';
import Pagination from '@/components/pagination/Pagination';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  PanelCard, PanelEmptyState, Sym,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, AccessDeniedPanel,
  ReasonDialog, CountLabel, paginate,
} from '@/pages/treat/panels/panelHooks';
import {
  AUDIT_CATEGORIES, auditCategoryMeta, subscribeTreatmentAudit,
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

  const [categoryFilter, setCategoryFilter] = useState([]);
  const [page, setPage] = useState(1);
  const [markTarget, setMarkTarget] = useState(null);
  const [unmarkTarget, setUnmarkTarget] = useState(null);

  const filtered = useMemo(
    () => audit.filter((r) => (categoryFilter.length === 0 ? true : categoryFilter.includes(r.category))),
    [audit, categoryFilter],
  );

  const { pageCount, page: safePage, slice } = paginate(filtered, page, PER_PAGE);

  const toggleCategory = (key) => {
    setCategoryFilter((f) => (f.includes(key) ? f.filter((k) => k !== key) : [...f, key]));
    setPage(1);
  };

  const columns = [
    {
      key: 'category', header: 'หมวด',
      render: (row) => {
        const meta = auditCategoryMeta(row.category);
        return <ColorfulBadge style={meta.tone} size='small' width='hug'>{meta.label}</ColorfulBadge>;
      },
    },
    {
      key: 'field', header: 'รายการที่เปลี่ยน', flex: 1,
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
    { key: 'by', header: 'ผู้บันทึก' },
    { key: 'recordedAt', header: 'เวลาที่บันทึก' },
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
        title='ประวัติการบันทึกและแก้ไข (Audit Trail)'
        subtitle='บันทึกครบ 4 เวลาตามข้อกำหนด — ผู้บันทึก · เวลาที่บันทึก · เวลาที่แก้ไข · เวลาที่ระบุว่าลงข้อมูลผิด'
        action={<CountLabel n={filtered.length} />}
      >
        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <TabPill selected={categoryFilter.length === 0} onClick={() => { setCategoryFilter([]); setPage(1); }}>
            ทุกหมวด
          </TabPill>
          {AUDIT_CATEGORIES.map((c) => (
            <TabPill key={c.key} selected={categoryFilter.includes(c.key)} onClick={() => toggleCategory(c.key)}>
              {c.label}
            </TabPill>
          ))}
        </div>

        {audit.length === 0 ? (
          <PanelEmptyState
            icon='history'
            title='ยังไม่มีประวัติการบันทึกของผู้รับบริการรายนี้'
            subtitle='ทุกการบันทึก แก้ไข และยกเลิกจะปรากฏที่นี่ทันทีภายในรอบการทำงานเดียวกัน'
          />
        ) : filtered.length === 0 ? (
          <PanelEmptyState
            icon='filter_alt_off'
            title='ไม่พบรายการในหมวดที่เลือก'
            subtitle={`มีประวัติทั้งหมด ${audit.length} รายการในหมวดอื่น — เลือก "ทุกหมวด" เพื่อดูทั้งหมด`}
            action={
              <NeutralSubdueButton variant='outline' size='sm' onClick={() => setCategoryFilter([])}>
                แสดงทุกหมวด
              </NeutralSubdueButton>
            }
          />
        ) : (
          <>
            <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
              <Table columns={columns} rows={slice} rowKey={(r) => r.id} />
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
