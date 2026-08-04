import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Table from '@/components/table/Table';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Pagination from '@/components/pagination/Pagination';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Tooltip from '@/components/tooltip/Tooltip';
import AlertDialog from '@/components/popup/AlertDialog';
import {
  PanelCard, PanelEmptyState, Sym, CancelledMark, strikeIf,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, AccessDeniedPanel,
  ReasonDialog, PanelAlert, CountLabel, MaskedValue, paginate,
} from '@/pages/treat/panels/panelHooks';
import {
  DOC_TEMPLATES, docTemplateMeta, docStatusMeta, DOC_CANCEL_SUGGESTIONS,
  subscribeDocuments, documentsForPatient,
  issueDocument, printDocument, cancelDocument, setDocumentConfidential,
} from '@/data/treatmentDocuments';

/* PHCIS | EMR §1.4.6.2 – §1.4.6.5 / §1.4.10.9 / §1.4.10.11 —
   ศูนย์เอกสารและ e-Document ของการตรวจครั้งนี้.

   ต่อยอดจากการ์ดใบรับรองแพทย์เดิมของขั้นตอนสุดท้าย (state ชุด certIssue /
   certType / certNo / restDays / certSignature / certSignedAt ยังอยู่ครบ
   และยังทำงานเหมือนเดิม) — ที่เพิ่มคือแบบเอกสารใหม่ 2 แบบที่ TOR ระบุชัด
   (แรงงานต่างด้าว / เดินทางต่างประเทศ), Medical Record แบบเลือกช่วง,
   Clinical Summary, บล็อกคำแนะนำสำหรับผู้รับบริการ (§1.4.10.9 ที่เดิม
   ซ่อนอยู่ใน orders) และทะเบียน e-Document.

   ข้อจำกัดตามจริง: การพิมพ์ทำผ่าน @media print — ไม่มี PDF engine. */

const PER_PAGE = 10;

const ADVICE_SUGGESTIONS = [
  'ดื่มน้ำสะอาดให้เพียงพอ พักผ่อนให้มาก และสังเกตอาการ 2–3 วัน หากไข้สูงเกิน 38.5 องศาเซลเซียส ให้กลับมาพบแพทย์',
  'รับประทานยาให้ครบตามที่แพทย์สั่ง ห้ามหยุดยาเองแม้อาการจะดีขึ้น',
  'ลดอาหารรสเค็มและอาหารแปรรูป ควบคุมน้ำหนัก และออกกำลังกายสม่ำเสมออย่างน้อยสัปดาห์ละ 150 นาที',
  'ตรวจวัดความดันโลหิตที่บ้านวันละครั้ง จดบันทึกไว้ และนำมาให้แพทย์ดูในการนัดครั้งถัดไป',
  'หากมีอาการเหนื่อยหอบ เจ็บแน่นหน้าอก หรือขาบวมมากขึ้น ให้รีบมาโรงพยาบาลทันที',
  'มาตามนัดเพื่อติดตามผลเลือดและประเมินการทำงานของไตซ้ำ',
];

const groupLabel = { cert: 'ใบรับรองแพทย์', record: 'ประวัติและสรุปการรักษา', refer: 'การส่งต่อ' };

const TemplateCard = ({ tpl, disabled, disabledReason, onPick, selected }) => {
  const card = (
    <button
      type='button'
      disabled={disabled}
      onClick={onPick}
      className='flex flex-col items-start text-left w-full min-w-0'
      style={{
        gap: 'var(--dim-space-100, 4px)',
        minWidth: 240,
        borderRadius: 'var(--dim-radius-300, 10px)',
        border: `var(--dim-stroke-${selected ? '200' : '100'}, ${selected ? '2px' : '1px'}) solid ${
          selected ? 'var(--border-brandPrimary-default, #007549)' : 'var(--border-neutral-quaternary)'
        }`,
        background: disabled ? 'var(--surface-neutral-quaternary, #F9FBFB)' : 'var(--surface-card-100)',
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-300, 12px)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <Sym name={tpl.icon} size={18} color='var(--icon-brandPrimary-default, #007549)' />
        <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>{tpl.title}</span>
      </span>
      <span style={PANEL_LABEL_STYLE}>{tpl.subtitle}</span>
      <span style={PANEL_LABEL_STYLE}>{tpl.desc}</span>
      <span className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100, 4px)', marginTop: 'var(--dim-space-100, 4px)' }}>
        {tpl.requiresDiagnosis ? <ColorfulBadge style='blue' size='small' width='hug'>ต้องมีการวินิจฉัย</ColorfulBadge> : null}
        {tpl.requiresSignature ? <ColorfulBadge style='orange' size='small' width='hug'>ต้องมีลายเซ็น</ColorfulBadge> : null}
        {tpl.needsRange ? <ColorfulBadge style='teal' size='small' width='hug'>เลือกช่วงวันที่</ColorfulBadge> : null}
      </span>
    </button>
  );
  return disabled && disabledReason
    ? <Tooltip content={disabledReason} position='top' maxWidth={300}><span style={{ display: 'inline-flex', minWidth: 240 }}>{card}</span></Tooltip>
    : card;
};

const DocumentCenterPanel = ({ form, setForm, patient }) => {
  const history = useHistory();
  const access = useTreatmentAccess();
  const hn = patient?.hn || '';

  const [documents] = useTreatmentStore(
    subscribeDocuments,
    () => documentsForPatient(hn),
    [hn],
  );

  const [picked, setPicked] = useState('');
  const [page, setPage] = useState(1);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [printTarget, setPrintTarget] = useState(null);
  const [printCopies, setPrintCopies] = useState(1);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [issueResult, setIssueResult] = useState(null);
  const [emptyRangeWarn, setEmptyRangeWarn] = useState(false);
  const [signatureGuard, setSignatureGuard] = useState(null);

  const hasDiagnosis = (form?.diagnoses || []).length > 0;
  const hasSignature = !!form?.certSignature;

  const { pageCount, page: safePage, slice } = paginate(documents, page, PER_PAGE);

  const grouped = useMemo(() => {
    const map = {};
    DOC_TEMPLATES.forEach((t) => {
      if (!map[t.group]) map[t.group] = [];
      map[t.group].push(t);
    });
    return map;
  }, []);

  const disabledReasonFor = (tpl) => {
    if (tpl.requiresDiagnosis && !hasDiagnosis) {
      return 'ยังไม่มีการวินิจฉัยในการตรวจครั้งนี้ — บันทึกรหัสวินิจฉัยในขั้นตอนวินิจฉัยก่อนจึงจะออกเอกสารนี้ได้';
    }
    return '';
  };

  const doIssue = () => {
    const tpl = docTemplateMeta(picked);
    if (!tpl) return;

    /* ใบส่งต่อ → deep-link ไปทะเบียนการส่งต่อ */
    if (tpl.deepLink) {
      history.push({
        pathname: tpl.deepLink,
        state: { newForPatient: { hn, name: patient?.name, nationalId: patient?.nationalId, rights: patient?.rights, phone: patient?.phone } },
      });
      return;
    }

    /* Medical Record แบบเลือกช่วง — เตือนก่อนพิมพ์หน้าเปล่า */
    if (tpl.needsRange && (!rangeFrom.trim() || !rangeTo.trim())) {
      setEmptyRangeWarn(true);
      return;
    }

    /* ต้องมีลายเซ็นก่อนจึงพิมพ์ได้ */
    if (tpl.requiresSignature && !hasSignature) {
      setSignatureGuard(tpl);
      return;
    }

    const title = tpl.needsRange && rangeFrom && rangeTo
      ? `${tpl.title} (${rangeFrom} – ${rangeTo})`
      : tpl.title;
    const row = issueDocument({ hn, visitId: form?.visitId || 'v-current', templateKey: tpl.key, title });
    setIssueResult(row);
  };

  const doPrint = () => {
    printDocument(printTarget.id, printCopies);
    setPrintTarget(null);
    if (typeof window !== 'undefined' && window.print) window.print();
  };

  const columns = [
    {
      key: 'docNo', header: 'เลขที่เอกสาร', width: 160,
      render: (row) => (
        <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(row.status === 'cancelled') }}>{row.docNo}</span>
      ),
    },
    {
      key: 'title', header: 'ชนิดเอกสาร', flex: 1,
      render: (row) => {
        const masked = row.confidential && !access.canSeeConfidential;
        return (
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(row.status === 'cancelled') }}>
              <MaskedValue masked={masked}>{row.title}</MaskedValue>
            </span>
            <span className='inline-flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span style={PANEL_LABEL_STYLE}>{row.type}</span>
              {row.confidential ? <StatusBadge style='purple' size='small' icon='lock'>ข้อมูลลับ</StatusBadge> : null}
            </span>
            {row.cancelledAt ? <CancelledMark at={row.cancelledAt} reason={row.cancelReason} /> : null}
          </div>
        );
      },
    },
    { key: 'issuedBy', header: 'ผู้ออกเอกสาร', width: 170 },
    { key: 'issuedAt', header: 'วันเวลาที่ออก', width: 160 },
    {
      key: 'status', header: 'สถานะ', width: 110,
      render: (row) => {
        const meta = docStatusMeta(row.status);
        return <StatusBadge style={meta.badge} size='small'>{meta.label}</StatusBadge>;
      },
    },
    {
      key: 'printCount', header: 'พิมพ์แล้ว', width: 110,
      render: (row) => <span style={PANEL_LABEL_STYLE}>{row.printCount || 0} ครั้ง</span>,
    },
    {
      key: 'actions', header: '', width: 260,
      render: (row) => (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <GuardedAction allowed={access.canEdit && row.status !== 'cancelled'}>
            <NeutralSubdueButton
              variant='outline' size='sm' leadingIcon='print'
              onClick={() => { setPrintTarget(row); setPrintCopies(1); }}
            >
              พิมพ์ซ้ำ
            </NeutralSubdueButton>
          </GuardedAction>
          <GuardedAction allowed={access.canEdit && access.canSeeConfidential}>
            <NeutralSubdueButton
              variant='outline' size='sm'
              leadingIcon={row.confidential ? 'lock_open' : 'lock'}
              onClick={() => setDocumentConfidential(row.id, !row.confidential)}
            >
              {row.confidential ? 'ยกเลิกลับ' : 'ข้อมูลลับ'}
            </NeutralSubdueButton>
          </GuardedAction>
          <GuardedAction allowed={access.canEdit && row.status !== 'cancelled'}>
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='block' onClick={() => setCancelTarget(row)}>
              ยกเลิก
            </NeutralSubdueButton>
          </GuardedAction>
        </div>
      ),
    },
  ];

  if (!access.canView) return <AccessDeniedPanel what='ศูนย์เอกสารของผู้รับบริการ' />;

  const pickedTpl = docTemplateMeta(picked);

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      {/* ── เลือกแบบเอกสาร ─────────────────────────────── */}
      <PanelCard
        title='ออกเอกสารสำหรับการตรวจครั้งนี้'
        subtitle='เลือกแบบเอกสารที่ต้องการ — แบบที่ต้องมีการวินิจฉัยหรือลายเซ็นจะถูกปิดไว้พร้อมเหตุผลจนกว่าจะพร้อม'
        action={
          <GuardedAction allowed={access.canEdit && !!picked}>
            <BrandButton variant='fill' size='sm' leadingIcon='post_add' onClick={doIssue}>
              {pickedTpl?.deepLink ? 'ไปออกใบส่งต่อ' : 'ออกเอกสาร'}
            </BrandButton>
          </GuardedAction>
        }
      >
        {!hasDiagnosis ? (
          <PanelAlert tone='warning' icon='clinical_notes' title='ยังไม่มีการวินิจฉัยในการตรวจครั้งนี้'>
            ใบรับรองแพทย์ที่ต้องอ้างอิงผลการวินิจฉัยจะยังออกไม่ได้ — บันทึกรหัสวินิจฉัยในขั้นตอนวินิจฉัยก่อน
          </PanelAlert>
        ) : null}
        {!hasSignature ? (
          <PanelAlert tone='info' icon='draw' title='ยังไม่ได้ยืนยันลายเซ็นแพทย์'>
            แบบเอกสารที่ต้องมีลายเซ็นจะพิมพ์ไม่ได้จนกว่าจะยืนยันลายเซ็นในการ์ดใบรับรองแพทย์ด้านบน
          </PanelAlert>
        ) : null}

        {Object.keys(grouped).map((g) => (
          <div key={g} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>
              {groupLabel[g] || g}
            </span>
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              {grouped[g].map((tpl) => {
                const reason = disabledReasonFor(tpl);
                return (
                  <TemplateCard
                    key={tpl.key}
                    tpl={tpl}
                    selected={picked === tpl.key}
                    disabled={!!reason}
                    disabledReason={reason}
                    onPick={() => setPicked(tpl.key)}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* ช่วง visit สำหรับ Medical Record */}
        {pickedTpl?.needsRange ? (
          <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <div style={{ minWidth: 220, flex: 1 }}>
              <InputField label='ตั้งแต่วันที่' value={rangeFrom} onChange={setRangeFrom} showLeadingIcon={false} placeholder='เช่น 1 มกราคม 2569' />
            </div>
            <div style={{ minWidth: 220, flex: 1 }}>
              <InputField label='ถึงวันที่' value={rangeTo} onChange={setRangeTo} showLeadingIcon={false} placeholder='เช่น 30 เมษายน 2569' />
            </div>
          </div>
        ) : null}
      </PanelCard>

      {/* ── คำแนะนำสำหรับผู้รับบริการ (§1.4.10.9) ────────── */}
      <PanelCard
        title='คำแนะนำสำหรับผู้รับบริการ'
        subtitle='ข้อความนี้จะถูกพิมพ์ลงทั้ง Clinical Summary และใบสรุปการรักษาที่ผู้รับบริการนำกลับบ้าน'
      >
        <SuggestibleTextarea
          voice
          label='คำแนะนำที่แพทย์ให้'
          value={form?.patientAdvice || ''}
          onChange={(e) => setForm((f) => ({
            ...f, patientAdvice: typeof e === 'string' ? e : e?.target?.value ?? '',
          }))}
          suggestions={ADVICE_SUGGESTIONS}
          minChars={2}
          height={150}
          minHeight={104}
          disabled={!access.canEdit}
          popoverAriaLabel='ตัวอย่างคำแนะนำสำหรับผู้รับบริการ'
          placeholder='พิมพ์คำแนะนำการปฏิบัติตัว การใช้ยา และอาการที่ต้องกลับมาพบแพทย์'
        />
        {!String(form?.patientAdvice || '').trim() ? (
          <span style={PANEL_LABEL_STYLE}>
            ยังไม่ได้ระบุคำแนะนำ — ส่วนนี้จะเว้นว่างในเอกสารที่พิมพ์
          </span>
        ) : null}
      </PanelCard>

      {/* ── ทะเบียน e-Document ─────────────────────────── */}
      <PanelCard
        title='ทะเบียนเอกสารของผู้รับบริการ (e-Document)'
        subtitle='เก็บทุกฉบับที่เคยออก รวมถึงฉบับที่ยกเลิกไปแล้ว พร้อมจำนวนครั้งที่พิมพ์เพื่อใช้เป็นหลักฐาน'
        action={<CountLabel n={documents.length} unit='ฉบับ' />}
      >
        {documents.length === 0 ? (
          <PanelEmptyState
            icon='folder_open'
            title='ยังไม่เคยออกเอกสารให้ผู้รับบริการรายนี้'
            subtitle='เลือกแบบเอกสารด้านบนแล้วกด "ออกเอกสาร" — รายการจะมาปรากฏในทะเบียนนี้ทันที'
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

        <PanelAlert tone='info' icon='print' title='วิธีการพิมพ์ในเวอร์ชันนี้'>
          เอกสารพิมพ์ผ่านสไตล์ชีต <code>@media print</code> ของเบราว์เซอร์ — ยังไม่มีตัวสร้างไฟล์ PDF ในระบบ
        </PanelAlert>
      </PanelCard>

      {/* ผลการออกเอกสาร */}
      <AlertDialog
        open={!!issueResult}
        type='success'
        title='ออกเอกสารเรียบร้อย'
        description={issueResult ? `${issueResult.title} · เลขที่ ${issueResult.docNo} · ออกโดย ${issueResult.issuedBy} เมื่อ ${issueResult.issuedAt}` : ''}
        confirmLabel='พิมพ์เลย'
        cancelLabel='ปิด'
        onConfirm={() => { setPrintTarget(issueResult); setPrintCopies(1); setIssueResult(null); }}
        onCancel={() => setIssueResult(null)}
        onClose={() => setIssueResult(null)}
      />

      {/* เลือกจำนวนชุดก่อนพิมพ์ */}
      <AlertDialog
        open={!!printTarget}
        type='info'
        title='พิมพ์เอกสาร'
        description={printTarget ? `${printTarget.title} (${printTarget.docNo}) — พิมพ์ไปแล้ว ${printTarget.printCount || 0} ครั้ง ระบบจะนับเพิ่มและบันทึกลงประวัติการแก้ไข` : ''}
        confirmLabel='พิมพ์'
        cancelLabel='ยกเลิก'
        onConfirm={doPrint}
        onCancel={() => setPrintTarget(null)}
        onClose={() => setPrintTarget(null)}
      >
        <div style={{ minWidth: 220 }}>
          <Select
            label='จำนวนชุดที่พิมพ์'
            value={String(printCopies)}
            onChange={(v) => setPrintCopies(Number(v))}
            options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n} ชุด` }))}
            placeholder='เลือกจำนวนชุด'
          />
        </div>
      </AlertDialog>

      {/* ยกเลิกเอกสาร — บังคับเหตุผล คงจำนวนครั้งที่พิมพ์ไว้ */}
      <ReasonDialog
        open={!!cancelTarget}
        type='destructive'
        title='ยกเลิกเอกสาร'
        description={
          cancelTarget
            ? `${cancelTarget.title} (${cancelTarget.docNo})${
              cancelTarget.printCount
                ? ` — เอกสารนี้พิมพ์ออกไปแล้ว ${cancelTarget.printCount} ครั้ง อาจอยู่ในมือผู้รับบริการแล้ว ระบบจะคงจำนวนครั้งที่พิมพ์ไว้เป็นหลักฐาน`
                : ''
            }`
            : ''
        }
        confirmLabel='ยืนยันการยกเลิก'
        suggestions={DOC_CANCEL_SUGGESTIONS}
        onConfirm={(reason) => { cancelDocument(cancelTarget.id, reason); setCancelTarget(null); }}
        onClose={() => setCancelTarget(null)}
      />

      {/* เตือนช่วงวันที่ว่าง */}
      <AlertDialog
        open={emptyRangeWarn}
        type='warning'
        title='ยังไม่ได้เลือกช่วงวันที่'
        description='การพิมพ์ประวัติการตรวจรักษาโดยไม่ระบุช่วงวันที่จะได้เอกสารหน้าเปล่า — กรุณาระบุวันที่เริ่มต้นและสิ้นสุดก่อน'
        confirmLabel='กลับไปเลือกช่วงวันที่'
        showCancel={false}
        onConfirm={() => setEmptyRangeWarn(false)}
        onClose={() => setEmptyRangeWarn(false)}
      />

      {/* บล็อกการพิมพ์เมื่อยังไม่มีลายเซ็น */}
      <AlertDialog
        open={!!signatureGuard}
        type='warning'
        title='ต้องยืนยันลายเซ็นก่อนออกเอกสารนี้'
        description={signatureGuard ? `"${signatureGuard.title}" ต้องมีลายเซ็นแพทย์กำกับ — กลับไปยืนยันลายเซ็นในการ์ดใบรับรองแพทย์ด้านบนก่อน` : ''}
        confirmLabel='เข้าใจแล้ว'
        showCancel={false}
        onConfirm={() => setSignatureGuard(null)}
        onClose={() => setSignatureGuard(null)}
      />
    </div>
  );
};

export default DocumentCenterPanel;
