import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import TabPill from '@/components/tab/TabPill';
import Pagination from '@/components/pagination/Pagination';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  PanelCard, PanelEmptyState, Sym, InfoPair,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, AccessDeniedPanel,
  ReasonDialog, PanelAlert, CountLabel, paginate,
} from '@/pages/treat/panels/panelHooks';
import {
  AUDIT_CATEGORIES, auditCategoryMeta, subscribeTreatmentAudit,
  auditForVisit, markAuditErroneous, unmarkAuditErroneous, appendAudit,
  CURRENT_CLINICIAN,
} from '@/data/treatmentAudit';
import { subscribeTreatmentNotes, notesForPatient, noteTypeMeta } from '@/data/treatmentNotes';
import { subscribeDocuments, documentsForPatient, setDocumentConfidential } from '@/data/treatmentDocuments';
import { NO_CONFIDENTIAL_RIGHT_TOOLTIP } from '@/data/treatmentAccess';

/* PHCIS | EMR §1.4.3.16 — ประวัติการบันทึก แก้ไข และข้อมูลลับ.
   TOR ระบุครบ 4 เวลา: ผู้บันทึก / เวลาที่บันทึก / เวลาที่แก้ไข /
   เวลาที่ระบุว่าลงข้อมูลผิด — ตารางนี้แสดงทั้งสี่คอลัมน์ตรงตัว
   และการกด "ระบุว่าลงข้อมูลผิด" ไม่ลบค่าเดิมออกจาก log
   (markAuditErroneous เขียน audit row ใหม่ทับไว้อีกชั้น).

   ครึ่งล่างคือการจัดการข้อมูลลับ (§1.4.2.1) — prototype ทำได้แค่
   masking + reveal gate + access log; field-level encryption ต้องทำที่
   backend จึงยังรายงานเป็น partial. */

const PER_PAGE = 10;

const AuditConfidentialPanel = ({ form, patient }) => {
  const access = useTreatmentAccess();
  const hn = patient?.hn || '';
  const visitId = form?.visitId || '';

  const [audit] = useTreatmentStore(
    subscribeTreatmentAudit,
    () => auditForVisit(hn, ''),
    [hn],
  );
  const [notes] = useTreatmentStore(
    subscribeTreatmentNotes,
    () => notesForPatient(hn),
    [hn],
  );
  const [documents] = useTreatmentStore(
    subscribeDocuments,
    () => documentsForPatient(hn),
    [hn],
  );

  const [categoryFilter, setCategoryFilter] = useState([]);
  const [page, setPage] = useState(1);
  const [markTarget, setMarkTarget] = useState(null);
  const [unmarkTarget, setUnmarkTarget] = useState(null);
  const [revealTarget, setRevealTarget] = useState(null);
  /* ชุด "เปิดดูแล้วในรอบนี้" — ตัว log จริงเขียนลง TREATMENT_AUDIT
     ไม่เก็บใน state เพราะจะหายทุกครั้งที่สลับขั้นตอน/ผู้ป่วย */
  const [revealedKeys, setRevealedKeys] = useState([]);

  /* ประวัติการขอเปิดดู — อ่านจาก audit จริง จึงอยู่รอดข้าม remount
     และปรากฏในตาราง Audit Trail ด้านบนพร้อมกัน */
  const revealLog = useMemo(
    () => audit.filter((r) => r.category === 'confidential' && String(r.field || '').startsWith('ขอเปิดดู')),
    [audit],
  );

  const filtered = useMemo(
    () => audit.filter((r) => (categoryFilter.length === 0 ? true : categoryFilter.includes(r.category))),
    [audit, categoryFilter],
  );

  const { pageCount, page: safePage, slice } = paginate(filtered, page, PER_PAGE);

  const toggleCategory = (key) => {
    setCategoryFilter((f) => (f.includes(key) ? f.filter((k) => k !== key) : [...f, key]));
    setPage(1);
  };

  /* รายการที่ถูกตั้งเป็นความลับ — รวมจาก note + เอกสาร */
  const confidentialItems = useMemo(() => [
    ...notes.filter((n) => n.confidential).map((n) => ({
      id: n.id, kind: 'note', label: `${noteTypeMeta(n.type).label} — ${n.recordedAt}`,
      by: n.author, at: n.recordedAt,
    })),
    ...documents.filter((d) => d.confidential).map((d) => ({
      id: d.id, kind: 'document', label: `${d.title} (${d.docNo})`,
      by: d.issuedBy, at: d.issuedAt,
    })),
  ], [notes, documents]);

  const columns = [
    {
      key: 'category', header: 'หมวด', width: 170,
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
          {/* ค่าเดิม → ค่าใหม่ (pattern RegistrationEditHistoryPanel) */}
          <span className='inline-flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <span style={{ ...PANEL_LABEL_STYLE, textDecoration: 'line-through' }}>{row.oldValue}</span>
            <Sym name='arrow_forward' size={12} color='var(--icon-neutral-tertiary, #ADB2B7)' />
            <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-content-default)' }}>{row.newValue}</span>
          </span>
        </div>
      ),
    },
    { key: 'by', header: 'ผู้บันทึก', width: 160 },
    { key: 'recordedAt', header: 'เวลาที่บันทึก', width: 150 },
    {
      key: 'amendedAt', header: 'เวลาที่แก้ไข', width: 150,
      render: (row) => (row.amendedAt
        ? <span style={PANEL_VALUE_STYLE}>{row.amendedAt}</span>
        : <span style={PANEL_LABEL_STYLE}>ไม่เคยแก้ไข</span>),
    },
    {
      key: 'erroneousAt', header: 'ระบุว่าลงข้อมูลผิด', width: 230,
      render: (row) => (row.erroneousAt ? (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <StatusBadge style='error' size='small' icon='report'>{row.erroneousAt}</StatusBadge>
          <span style={PANEL_LABEL_STYLE}>{row.erroneousReason}</span>
          {row.erroneousBy ? <span style={PANEL_LABEL_STYLE}>โดย {row.erroneousBy}</span> : null}
        </div>
      ) : <span style={PANEL_LABEL_STYLE}>—</span>),
    },
    {
      key: 'actions', header: '', width: 180,
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

  if (!access.canView) return <AccessDeniedPanel what='ประวัติการบันทึกและข้อมูลลับ' />;

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      {/* ── Audit trail ─────────────────────────────────── */}
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

      {/* ── ข้อมูลลับ ────────────────────────────────────── */}
      <PanelCard
        title='การจัดการข้อมูลลับ (Confidential Data)'
        subtitle='รายการที่ถูกทำเครื่องหมายว่าเป็นความลับ พร้อมบันทึกว่าใครขอเปิดดูเมื่อไร'
        action={<CountLabel n={confidentialItems.length} />}
      >
        <PanelAlert tone='warning' icon='enhanced_encryption' title='ขอบเขตของการปกปิดในเวอร์ชันนี้'>
          ระบบทำได้ในระดับ <strong>ปิดบังการแสดงผล (masking) + ประตูขอเปิดดู + บันทึกการเข้าถึง</strong> เท่านั้น —
          การเข้ารหัสข้อมูลรายฟิลด์ (field-level encryption at rest) ต้องทำที่ฝั่งเซิร์ฟเวอร์ จึงยังไม่ครบตามข้อกำหนดในเวฟนี้
        </PanelAlert>

        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <InfoPair label='สิทธิ์ระดับข้อมูลลับของบัญชีปัจจุบัน' value={access.canSeeConfidential ? 'เห็นข้อมูลลับได้' : 'ไม่เห็นข้อมูลลับ'} minWidth={240} />
          <InfoPair label='ผู้ใช้ปัจจุบัน' value={`${CURRENT_CLINICIAN.name} (${CURRENT_CLINICIAN.roleLabel})`} minWidth={240} />
        </div>

        {confidentialItems.length === 0 ? (
          <PanelEmptyState
            icon='lock_open'
            title='ยังไม่มีรายการที่ถูกกำหนดเป็นข้อมูลลับ'
            subtitle='ทำเครื่องหมาย "ข้อมูลลับ" ได้จากบันทึกทางคลินิก ไฟล์แนบ หรือทะเบียนเอกสาร'
          />
        ) : (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {confidentialItems.map((item) => {
              const itemKey = `${item.kind}-${item.id}`;
              const unmasked = access.canSeeConfidential || revealedKeys.includes(itemKey);
              return (
              <div
                key={itemKey}
                className='flex flex-wrap items-center justify-between w-full'
                style={{
                  gap: 'var(--dim-space-200, 8px)',
                  borderRadius: 'var(--dim-radius-300, 10px)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                  paddingTop: 'var(--dim-space-200, 8px)',
                  paddingRight: 'var(--dim-space-300, 12px)',
                  paddingBottom: 'var(--dim-space-200, 8px)',
                  paddingLeft: 'var(--dim-space-300, 12px)',
                }}
              >
                <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                  <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <StatusBadge style='purple' size='small' icon='lock'>
                      {item.kind === 'note' ? 'บันทึกทางคลินิก' : 'เอกสาร'}
                    </StatusBadge>
                    <span style={PANEL_VALUE_STYLE}>
                      {unmasked ? item.label : '••••••••••••'}
                    </span>
                  </span>
                  <span style={PANEL_LABEL_STYLE}>โดย {item.by} · {item.at}</span>
                </div>
                <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  {access.canSeeConfidential ? (
                    <StatusBadge style='success' size='small' icon='visibility'>เปิดดูได้ตามสิทธิ์</StatusBadge>
                  ) : revealedKeys.includes(itemKey) ? (
                    <StatusBadge style='warning' size='small' icon='visibility'>เปิดดูแล้ว — บันทึกในประวัติการเข้าถึง</StatusBadge>
                  ) : (
                    <NeutralSubdueButton variant='outline' size='sm' leadingIcon='key' onClick={() => setRevealTarget(item)}>
                      ขอเปิดดู
                    </NeutralSubdueButton>
                  )}
                  {item.kind === 'document' ? (
                    <GuardedAction allowed={access.canEdit && access.canSeeConfidential} reason={NO_CONFIDENTIAL_RIGHT_TOOLTIP}>
                      <NeutralSubdueButton
                        variant='outline' size='sm' leadingIcon='lock_open'
                        onClick={() => setDocumentConfidential(item.id, false)}
                      >
                        ยกเลิกข้อมูลลับ
                      </NeutralSubdueButton>
                    </GuardedAction>
                  ) : null}
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* ประวัติการเข้าถึงข้อมูลลับ — อ่านจาก audit trail จริง */}
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>
            ประวัติการขอเปิดดูข้อมูลลับ
          </span>
          {revealLog.length === 0 ? (
            <span style={PANEL_LABEL_STYLE}>ยังไม่มีการขอเปิดดูข้อมูลลับของผู้รับบริการรายนี้</span>
          ) : (
            revealLog.map((l) => (
              <span key={l.id} style={PANEL_LABEL_STYLE}>
                {l.recordedAt} · {l.by} — {String(l.field || '').replace(/^ขอเปิดดู\s*—?\s*/, '')} · {l.newValue}
              </span>
            ))
          )}
        </div>
      </PanelCard>

      {/* ระบุว่าลงข้อมูลผิด */}
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

      {/* ยกเลิกการระบุ */}
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

      {/* ขอเปิดดูข้อมูลลับ — บันทึก access log */}
      <ReasonDialog
        open={!!revealTarget}
        type='warning'
        title='ขอเปิดดูข้อมูลลับ'
        description='ทุกครั้งที่เปิดดู ระบบจะบันทึกชื่อผู้ขอ เวลา และเหตุผลลงประวัติการเข้าถึงอย่างถาวร'
        confirmLabel='ขอเปิดดู'
        minLength={10}
        suggestions={[
          'จำเป็นต่อการวางแผนการรักษาต่อเนื่องของผู้รับบริการรายนี้',
          'ตรวจสอบความถูกต้องก่อนออกเอกสารรับรอง',
          'ผู้รับบริการร้องขอสำเนาเวชระเบียนด้วยตนเอง',
          'ตรวจสอบตามคำร้องเรียนที่ได้รับมอบหมายจากผู้บริหารหน่วยงาน',
        ]}
        onConfirm={(reason) => {
          /* เขียนลง audit trail จริง — ไม่ใช่ state ที่หายตอน unmount */
          appendAudit({
            hn,
            visitId,
            category: 'confidential',
            field: `ขอเปิดดู — ${revealTarget.label}`,
            oldValue: 'ปิดบัง (••••)',
            newValue: `เปิดดูโดย ${CURRENT_CLINICIAN.name} — ${reason}`,
          });
          setRevealedKeys((keys) => {
            const key = `${revealTarget.kind}-${revealTarget.id}`;
            return keys.includes(key) ? keys : [...keys, key];
          });
          setRevealTarget(null);
        }}
        onClose={() => setRevealTarget(null)}
      />
    </div>
  );
};

export default AuditConfidentialPanel;
