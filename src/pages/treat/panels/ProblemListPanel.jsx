import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import TabPill from '@/components/tab/TabPill';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import Pagination from '@/components/pagination/Pagination';
import {
  PanelCard, PanelEmptyState, CancelledMark, strikeIf,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, AccessDeniedPanel,
  ReasonDialog, PanelAlert, CountLabel, paginate,
} from '@/pages/treat/panels/panelHooks';
import {
  PROBLEM_STATUSES, problemStatusMeta, problemSourceMeta,
  PROBLEM_RESOLVE_SUGGESTIONS, PROBLEM_CANCEL_SUGGESTIONS,
  subscribeProblemList, problemsForPatient, findDuplicateProblem,
  addProblem, updateProblem, resolveProblem, reopenProblem, cancelProblem,
  importDiagnosesToProblems,
} from '@/data/treatmentProblemList';
import { CODE_SYSTEMS, UNCODED_LABEL } from '@/data/treatmentSnomed';

/* PHCIS | EMR §1.4.3.8 / §1.4.3.9 — รายการโรคที่รักษาอยู่ปัจจุบัน
   (Problem List). ปุ่ม "นำรหัสวินิจฉัยของ visit นี้เข้ารายการโรค" ทำให้
   โรคที่บันทึกจากการตรวจไปโผล่ในรายการโรคที่รักษาอยู่ (คู่มือ HCIS §2.6
   บันทึกโรคประจำตัว) โดยไม่สร้างแถวซ้ำ — findDuplicateProblem กันไว้แล้ว
   และรายงานกลับว่าเพิ่มใหม่กี่รายการ / ข้ามซ้ำกี่รายการ.

   โรคที่ status = active/watch จะถูกอ่านโดยแถบเฝ้าระวัง (§1.4.3.21)
   ผ่าน activeProblemsForPatient. */

const PER_PAGE = 10;

/* วันที่หายต้องไม่ก่อนวันที่เริ่มเป็น — เทียบแบบไทย (พ.ศ.) */
const TH_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const parseThaiFull = (s) => {
  const m = String(s || '').match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
  if (!m) return null;
  const mi = TH_MONTHS_FULL.indexOf(m[2]);
  if (mi < 0) return null;
  return new Date(Number(m[3]) - 543, mi, Number(m[1]));
};

const StatusPill = ({ status }) => {
  const meta = problemStatusMeta(status);
  return <StatusBadge style={meta.badge} size='small'>{meta.label}</StatusBadge>;
};

const ProblemListPanel = ({ form, patient }) => {
  const access = useTreatmentAccess();
  const hn = patient?.hn || '';

  const [problems] = useTreatmentStore(
    subscribeProblemList,
    () => problemsForPatient(hn),
    [hn],
  );

  const [statusFilter, setStatusFilter] = useState('current'); /* current | all | resolved | cancelled */
  const [page, setPage] = useState(1);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolvedDate, setResolvedDate] = useState('');
  const [resolveError, setResolveError] = useState('');
  const [reopenTarget, setReopenTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState({ system: 'ICD-10', code: '', name: '', onsetDate: '', status: 'active' });
  const [importResult, setImportResult] = useState(null);
  const [dupWarn, setDupWarn] = useState(null);

  const filtered = useMemo(() => problems.filter((p) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'current') return p.status === 'active' || p.status === 'watch';
    return p.status === statusFilter;
  }), [problems, statusFilter]);

  const { pageCount, page: safePage, slice } = paginate(filtered, page, PER_PAGE);

  const activeCount = problems.filter((p) => p.status === 'active' || p.status === 'watch').length;

  const doImport = () => {
    const diagnoses = form?.diagnoses || [];
    const result = importDiagnosesToProblems(hn, diagnoses);
    setImportResult(result);
  };

  const doResolve = (reason) => {
    if (!resolvedDate.trim()) { setResolveError('ต้องระบุวันที่หายก่อนจึงจะบันทึกได้'); return; }
    const onset = parseThaiFull(resolveTarget.onsetDate);
    const resolved = parseThaiFull(resolvedDate);
    if (onset && resolved && resolved.getTime() < onset.getTime()) {
      setResolveError(`วันที่หาย (${resolvedDate}) ต้องไม่ก่อนวันที่เริ่มเป็น (${resolveTarget.onsetDate})`);
      return;
    }
    resolveProblem(resolveTarget.id, { resolvedDate: resolvedDate.trim(), reason });
    setResolveTarget(null); setResolvedDate(''); setResolveError('');
  };

  const columns = [
    {
      key: 'code', header: 'รหัส', width: 130,
      render: (row) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge style={row.system === 'SNOMED-CT' ? 'purple' : 'blue'} size='small' width='hug' hierarchy='primary'>
            {row.code || UNCODED_LABEL}
          </ColorfulBadge>
          <span style={PANEL_LABEL_STYLE}>{row.system}</span>
        </div>
      ),
    },
    {
      key: 'name', header: 'ชื่อโรค / ปัญหา', flex: 1,
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(row.status === 'cancelled') }}>{row.name}</span>
          {row.clinicName ? <span style={PANEL_LABEL_STYLE}>{row.clinicName}</span> : null}
          {row.status === 'resolved' && row.resolveReason ? (
            <span style={PANEL_LABEL_STYLE}>หายแล้ว {row.resolvedDate} — {row.resolveReason}</span>
          ) : null}
          {row.cancelledAt ? <CancelledMark at={row.cancelledAt} reason={row.cancelReason} /> : null}
        </div>
      ),
    },
    {
      key: 'source', header: 'ที่มา', width: 190,
      render: (row) => <span style={PANEL_LABEL_STYLE}>{problemSourceMeta(row.source).label}</span>,
    },
    { key: 'onsetDate', header: 'เริ่มเป็นเมื่อ', width: 150, render: (row) => row.onsetDate || '—' },
    { key: 'status', header: 'สถานะ', width: 120, render: (row) => <StatusPill status={row.status} /> },
    {
      key: 'recorded', header: 'ผู้บันทึก / เวลา', width: 200,
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={PANEL_VALUE_STYLE}>{row.recordedBy}</span>
          <span style={PANEL_LABEL_STYLE}>{row.recordedAt}</span>
          {row.amendedAt ? <span style={PANEL_LABEL_STYLE}>แก้ไข {row.amendedAt}</span> : null}
        </div>
      ),
    },
    {
      key: 'actions', header: '', width: 230,
      render: (row) => {
        const editableSource = problemSourceMeta(row.source).editable;
        if (row.status === 'cancelled') return <span style={PANEL_LABEL_STYLE}>ยกเลิกแล้ว</span>;
        return (
          <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {row.status === 'resolved' ? (
              <GuardedAction allowed={access.canEdit}>
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='restart_alt' onClick={() => setReopenTarget(row)}>
                  เปิดใหม่
                </NeutralSubdueButton>
              </GuardedAction>
            ) : (
              <GuardedAction allowed={access.canEdit}>
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='check_circle' onClick={() => { setResolveTarget(row); setResolvedDate(''); setResolveError(''); }}>
                  หายแล้ว
                </NeutralSubdueButton>
              </GuardedAction>
            )}
            <GuardedAction
              allowed={access.canEdit && editableSource}
              reason={editableSource ? undefined : `รายการนี้มาจาก${problemSourceMeta(row.source).label} — แก้ไขได้ที่คลินิกเจ้าของข้อมูลเท่านั้น`}
            >
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => { setEditTarget(row); setEditDraft({ ...row }); }}>
                แก้ไข
              </NeutralSubdueButton>
            </GuardedAction>
            <GuardedAction allowed={access.canEdit}>
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='block' onClick={() => setCancelTarget(row)}>
                ยกเลิก
              </NeutralSubdueButton>
            </GuardedAction>
          </div>
        );
      },
    },
  ];

  if (!access.canView) return <AccessDeniedPanel what='รายการโรคที่รักษาอยู่' />;

  const visitDiagnoses = form?.diagnoses || [];

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      <PanelCard
        title='รายการโรคที่รักษาอยู่ปัจจุบัน (Problem List)'
        subtitle='โรคที่ "กำลังรักษา" และ "เฝ้าระวัง" จะแสดงบนบัตรผู้รับบริการและแถบเฝ้าระวังระหว่างการตรวจรักษา'
        action={
          <>
            <CountLabel n={filtered.length} />
            <GuardedAction
              allowed={access.canEdit && visitDiagnoses.length > 0}
              reason={visitDiagnoses.length === 0 ? 'ยังไม่มีรหัสการวินิจฉัยใน visit นี้ — บันทึกการวินิจฉัยก่อน' : undefined}
            >
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='playlist_add' onClick={doImport}>
                นำรหัสวินิจฉัยเข้ารายการโรค ({visitDiagnoses.length})
              </NeutralSubdueButton>
            </GuardedAction>
            <GuardedAction allowed={access.canEdit}>
              <BrandButton variant='fill' size='sm' leadingIcon='add' onClick={() => setAddOpen(true)}>
                เพิ่มรายการโรค
              </BrandButton>
            </GuardedAction>
          </>
        }
      >
        {activeCount > 0 ? (
          <PanelAlert tone='info' icon='fact_check' title={`ผู้รับบริการมีโรคที่รักษาอยู่ ${activeCount} รายการ`}>
            {problems.filter((p) => p.status === 'active' || p.status === 'watch').map((p) => `${p.name} (${p.code})`).join(' · ')}
          </PanelAlert>
        ) : null}

        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <TabPill selected={statusFilter === 'current'} onClick={() => { setStatusFilter('current'); setPage(1); }}>
            กำลังรักษา / เฝ้าระวัง
          </TabPill>
          <TabPill selected={statusFilter === 'resolved'} onClick={() => { setStatusFilter('resolved'); setPage(1); }}>
            หายแล้ว
          </TabPill>
          <TabPill selected={statusFilter === 'cancelled'} onClick={() => { setStatusFilter('cancelled'); setPage(1); }}>
            ยกเลิกรายการ
          </TabPill>
          <TabPill selected={statusFilter === 'all'} onClick={() => { setStatusFilter('all'); setPage(1); }}>
            ทั้งหมด
          </TabPill>
        </div>

        {problems.length === 0 ? (
          <PanelEmptyState
            icon='fact_check'
            title='ยังไม่มีรายการโรคของผู้รับบริการรายนี้'
            subtitle='เพิ่มด้วยตนเอง หรือกด "นำรหัสวินิจฉัยเข้ารายการโรค" เพื่อดึงการวินิจฉัยของการตรวจครั้งนี้เข้ามา'
            action={
              <GuardedAction allowed={access.canEdit}>
                <BrandButton variant='outline' size='sm' leadingIcon='add' onClick={() => setAddOpen(true)}>
                  เพิ่มรายการโรค
                </BrandButton>
              </GuardedAction>
            }
          />
        ) : filtered.length === 0 ? (
          <PanelEmptyState
            icon='filter_alt_off'
            title='ไม่พบรายการโรคในตัวกรองนี้'
            subtitle='ผู้รับบริการมีรายการโรคอยู่ในสถานะอื่น — เลือก "ทั้งหมด" เพื่อดูทุกรายการ'
            action={
              <NeutralSubdueButton variant='outline' size='sm' onClick={() => setStatusFilter('all')}>
                แสดงทั้งหมด
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

      {/* ── ผลการนำเข้า: เพิ่มใหม่ n / ข้ามซ้ำ m ─────────────── */}
      <AlertDialog
        open={!!importResult}
        type={importResult && importResult.added.length ? 'success' : 'info'}
        title='ผลการนำรหัสวินิจฉัยเข้ารายการโรค'
        description={
          importResult
            ? `เพิ่มใหม่ ${importResult.added.length} รายการ · ข้ามเพราะมีอยู่แล้ว ${importResult.skipped.length} รายการ${
              importResult.skipped.length
                ? `\nรายการที่ข้าม: ${importResult.skipped.map((d) => `${d.code} ${d.name || d.label || ''}`).join(' · ')}`
                : ''
            }`
            : ''
        }
        confirmLabel='ตกลง'
        showCancel={false}
        onConfirm={() => setImportResult(null)}
        onClose={() => setImportResult(null)}
      />

      {/* ── ปรับเป็นหายแล้ว: บังคับวันที่หาย + เหตุผล ─────────── */}
      <ReasonDialog
        open={!!resolveTarget}
        type='info'
        title='ปรับสถานะเป็น "หายแล้ว"'
        description={resolveTarget ? `${resolveTarget.name} (${resolveTarget.code}) — เริ่มเป็นเมื่อ ${resolveTarget.onsetDate || 'ไม่ระบุ'}` : ''}
        confirmLabel='บันทึกสถานะ'
        suggestions={PROBLEM_RESOLVE_SUGGESTIONS}
        onConfirm={doResolve}
        onClose={() => { setResolveTarget(null); setResolvedDate(''); setResolveError(''); }}
        extra={
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <InputField
              label='วันที่หาย'
              required
              value={resolvedDate}
              onChange={(v) => { setResolvedDate(v); setResolveError(''); }}
              showLeadingIcon={false}
              placeholder='เช่น 12 เมษายน 2569'
              error={resolveError || undefined}
            />
          </div>
        }
      />

      {/* ── เปิดใหม่: ต้องระบุเหตุผล คงประวัติเดิม ─────────────── */}
      <ReasonDialog
        open={!!reopenTarget}
        type='warning'
        title='เปิดรายการโรคนี้อีกครั้ง'
        description={reopenTarget ? `${reopenTarget.name} — เดิมบันทึกว่าหายแล้วเมื่อ ${reopenTarget.resolvedDate}. ประวัติเดิมจะยังคงอยู่ในประวัติการแก้ไข` : ''}
        confirmLabel='เปิดรายการใหม่'
        suggestions={[
          'ผู้รับบริการกลับมาเป็นซ้ำด้วยอาการเดิม',
          'ผลตรวจติดตามพบว่ายังไม่หายสนิท',
          'บันทึกว่าหายแล้วโดยผิดพลาด — โรคยังอยู่ระหว่างการรักษา',
        ]}
        onConfirm={(reason) => { reopenProblem(reopenTarget.id, reason); setReopenTarget(null); }}
        onClose={() => setReopenTarget(null)}
      />

      {/* ── ยกเลิกรายการที่ลงผิด: ขีดฆ่า ไม่ลบ ───────────────── */}
      <ReasonDialog
        open={!!cancelTarget}
        type='destructive'
        title='ยกเลิกรายการโรค'
        description={cancelTarget ? `${cancelTarget.name} (${cancelTarget.code}) — ระบบจะขีดฆ่ารายการนี้ไว้พร้อมเหตุผล ไม่ลบออกจากประวัติ` : ''}
        confirmLabel='ยืนยันการยกเลิก'
        suggestions={PROBLEM_CANCEL_SUGGESTIONS}
        onConfirm={(reason) => { cancelProblem(cancelTarget.id, reason); setCancelTarget(null); }}
        onClose={() => setCancelTarget(null)}
      />

      {/* ── แก้ไขรายการ ─────────────────────────────────────── */}
      <AlertDialog
        open={!!editTarget}
        type='info'
        title='แก้ไขรายการโรค'
        description='ระบบจะประทับเวลาที่แก้ไขเพิ่ม โดยไม่ทับเวลาที่บันทึกครั้งแรก'
        confirmLabel='บันทึกการแก้ไข'
        cancelLabel='ยกเลิกการแก้ไข'
        onConfirm={() => {
          updateProblem(editTarget.id, {
            name: editDraft.name,
            code: editDraft.code,
            system: editDraft.system,
            onsetDate: editDraft.onsetDate,
            status: editDraft.status,
          });
          setEditTarget(null); setEditDraft(null);
        }}
        onCancel={() => { setEditTarget(null); setEditDraft(null); }}
        onClose={() => { setEditTarget(null); setEditDraft(null); }}
      >
        {editDraft ? (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <Select
              label='ระบบรหัส'
              value={editDraft.system}
              onChange={(v) => setEditDraft((d) => ({ ...d, system: v }))}
              options={CODE_SYSTEMS.map((c) => ({ value: c.label || c.key, label: c.label || c.key }))}
              placeholder='เลือกระบบรหัส'
            />
            <InputField label='รหัส' value={editDraft.code} onChange={(v) => setEditDraft((d) => ({ ...d, code: v }))} showLeadingIcon={false} placeholder='เช่น I10' />
            <InputField label='ชื่อโรค / ปัญหา' value={editDraft.name} onChange={(v) => setEditDraft((d) => ({ ...d, name: v }))} showLeadingIcon={false} placeholder='ชื่อโรค' />
            <InputField label='เริ่มเป็นเมื่อ' value={editDraft.onsetDate} onChange={(v) => setEditDraft((d) => ({ ...d, onsetDate: v }))} showLeadingIcon={false} placeholder='เช่น 12 มีนาคม 2565' />
            <Select
              label='สถานะ'
              value={editDraft.status}
              onChange={(v) => setEditDraft((d) => ({ ...d, status: v }))}
              options={PROBLEM_STATUSES.filter((s) => s.key !== 'cancelled').map((s) => ({ value: s.key, label: s.label }))}
              placeholder='เลือกสถานะ'
            />
          </div>
        ) : null}
      </AlertDialog>

      {/* ── เพิ่มรายการโรคด้วยตนเอง ─────────────────────────── */}
      <AlertDialog
        open={addOpen}
        type='info'
        title='เพิ่มรายการโรคเข้ารายการที่รักษาอยู่'
        description='ใช้เมื่อโรคประจำตัวยังไม่ถูกบันทึกไว้ในระบบ หรือรับข้อมูลมาจากสถานพยาบาลอื่น'
        confirmLabel='เพิ่มรายการ'
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          if (!addDraft.name.trim()) return;
          const dup = addDraft.code ? findDuplicateProblem(hn, addDraft.code) : null;
          if (dup) { setDupWarn(dup); return; }
          addProblem({ hn, ...addDraft, source: 'chronic' });
          setAddDraft({ system: 'ICD-10', code: '', name: '', onsetDate: '', status: 'active' });
          setAddOpen(false);
        }}
        onCancel={() => { setAddDraft({ system: 'ICD-10', code: '', name: '', onsetDate: '', status: 'active' }); setAddOpen(false); }}
        onClose={() => setAddOpen(false)}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <Select
            label='ระบบรหัส'
            value={addDraft.system}
            onChange={(v) => setAddDraft((d) => ({ ...d, system: v }))}
            options={CODE_SYSTEMS.map((c) => ({ value: c.label || c.key, label: c.label || c.key }))}
            placeholder='เลือกระบบรหัส'
          />
          <InputField label='รหัส (เว้นว่างได้หากยังไม่ทราบ)' value={addDraft.code} onChange={(v) => setAddDraft((d) => ({ ...d, code: v }))} showLeadingIcon={false} placeholder='เช่น I10' />
          <InputField
            label='ชื่อโรค / ปัญหา'
            required
            value={addDraft.name}
            onChange={(v) => setAddDraft((d) => ({ ...d, name: v }))}
            showLeadingIcon={false}
            placeholder='เช่น ความดันโลหิตสูงชนิดไม่ทราบสาเหตุ'
            error={addDraft.name.trim() ? undefined : 'ต้องระบุชื่อโรค'}
          />
          <InputField label='เริ่มเป็นเมื่อ' value={addDraft.onsetDate} onChange={(v) => setAddDraft((d) => ({ ...d, onsetDate: v }))} showLeadingIcon={false} placeholder='เช่น 12 มีนาคม 2565' />
          <Select
            label='สถานะ'
            value={addDraft.status}
            onChange={(v) => setAddDraft((d) => ({ ...d, status: v }))}
            options={PROBLEM_STATUSES.filter((s) => s.key !== 'cancelled').map((s) => ({ value: s.key, label: s.label }))}
            placeholder='เลือกสถานะ'
          />
          {!addDraft.code ? (
            <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-colorfulbadge-yellow, #A16207)' }}>
              ไม่ได้ระบุรหัส — รายการจะถูกบันทึกเป็น "{UNCODED_LABEL}" และควรกลับมาลงรหัสภายหลัง
            </span>
          ) : null}
        </div>
      </AlertDialog>

      {/* ── เตือนซ้ำตอนเพิ่มด้วยตนเอง ────────────────────────── */}
      <AlertDialog
        open={!!dupWarn}
        type='warning'
        title='รหัสนี้มีอยู่ในรายการโรคแล้ว'
        description={dupWarn ? `${dupWarn.code} — ${dupWarn.name} (${problemStatusMeta(dupWarn.status).label}) บันทึกไว้เมื่อ ${dupWarn.recordedAt} จึงไม่เพิ่มแถวซ้ำ` : ''}
        confirmLabel='เข้าใจแล้ว'
        showCancel={false}
        onConfirm={() => { setDupWarn(null); setAddOpen(false); }}
        onClose={() => setDupWarn(null)}
      />
    </div>
  );
};

export default ProblemListPanel;
