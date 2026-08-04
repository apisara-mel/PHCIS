import React, { useEffect, useRef, useState } from 'react';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import {
  PanelCard, PanelEmptyState, MeterBar, Sym, CancelledMark, strikeIf,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, GuardedAction, AccessDeniedPanel,
  ReasonDialog, PanelAlert, CountLabel, MaskedValue,
} from '@/pages/treat/panels/panelHooks';
import {
  ATTACHMENT_KINDS, MAX_FILE_BYTES, MAX_VISIT_BYTES,
  formatBytes, validateAttachment, buildAttachmentEntry, logAttachmentEvent,
  addAttachmentDocument, cancelAttachmentDocument, setAttachmentDocumentConfidential,
} from '@/data/treatmentDocuments';

/* PHCIS | EMR §1.4.3.22 / §1.4.6.5 — ไฟล์แนบและเอกสารประกอบการตรวจ.
   อัปโหลด multimedia ระหว่างการรักษา (รูป / PDF / เสียง / วิดีโอ) พร้อม
   ตรวจโควตาจริง 2 ชั้น — 10 MB ต่อไฟล์ และ 50 MB ต่อ visit.

   หมายเหตุเรื่อง memory: พรีวิวใช้ object URL ผ่าน buildAttachmentEntry()
   ซึ่งต้อง revoke เมื่อ unmount ไม่งั้นรั่วเมื่อสลับผู้ป่วยไปมาใน
   QueueSubMenu — จัดการด้วย createdUrlsRef ด้านล่าง. */

const kindMeta = (key) => ATTACHMENT_KINDS.find((k) => k.key === key) || ATTACHMENT_KINDS[0];

const AttachmentPreview = ({ file }) => {
  if (!file.url) {
    return (
      <div
        className='flex items-center justify-center'
        style={{
          width: 'var(--dim-size-1800, 96px)', height: 'var(--dim-size-1800, 96px)',
          borderRadius: 'var(--dim-radius-200, 8px)',
          background: 'var(--surface-neutral-quaternary, #F9FBFB)',
        }}
      >
        <Sym name={kindMeta(file.kind).icon} size={28} color='var(--icon-neutral-tertiary, #ADB2B7)' />
      </div>
    );
  }
  if (file.kind === 'image') {
    return (
      <img
        src={file.url}
        alt={file.name}
        style={{
          width: 'var(--dim-size-1800, 96px)', height: 'var(--dim-size-1800, 96px)', objectFit: 'cover',
          borderRadius: 'var(--dim-radius-200, 8px)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
        }}
      />
    );
  }
  if (file.kind === 'audio') {
    return <audio controls src={file.url} style={{ width: 220 }}>เบราว์เซอร์ไม่รองรับการเล่นเสียง</audio>;
  }
  if (file.kind === 'pdf') {
    return (
      <a
        href={file.url}
        target='_blank'
        rel='noreferrer'
        className='flex flex-col items-center justify-center'
        style={{
          width: 'var(--dim-size-1800, 96px)', height: 'var(--dim-size-1800, 96px)',
          gap: 'var(--dim-space-100, 4px)',
          borderRadius: 'var(--dim-radius-200, 8px)',
          background: 'var(--surface-danger-quaternary, #FFF0F0)',
          textDecoration: 'none',
        }}
      >
        <Sym name='picture_as_pdf' size={28} color='var(--icon-dangerButton-default, #B91C1C)' />
        <span style={PANEL_LABEL_STYLE}>เปิด PDF</span>
      </a>
    );
  }
  return <video controls src={file.url} style={{ width: 220, borderRadius: 'var(--dim-radius-200, 8px)' }} />;
};

const VisitAttachmentsPanel = ({ form, setForm, patient }) => {
  const access = useTreatmentAccess();
  const hn = patient?.hn || '';
  const visitId = form?.visitId || 'v-current';

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  /* object URL ที่หน้านี้สร้างเอง — ต้อง revoke ตอน unmount */
  const createdUrlsRef = useRef([]);

  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [overwriteTarget, setOverwriteTarget] = useState(null);

  const files = form?.visitAttachments || [];
  const activeFiles = files.filter((f) => !f.cancelledAt);
  const usedBytes = activeFiles.reduce((n, f) => n + (f.sizeBytes || 0), 0);

  useEffect(() => () => {
    createdUrlsRef.current.forEach((u) => {
      try { if (u && URL.revokeObjectURL) URL.revokeObjectURL(u); } catch (e) { /* ignore */ }
    });
    createdUrlsRef.current = [];
  }, []);

  const setFiles = (updater) => setForm((f) => ({
    ...f,
    visitAttachments: typeof updater === 'function' ? updater(f.visitAttachments || []) : updater,
  }));

  const acceptFiles = (fileList, { force } = {}) => {
    setError('');
    const incoming = Array.from(fileList || []);
    let running = usedBytes;

    for (let i = 0; i < incoming.length; i += 1) {
      const file = incoming[i];

      /* ชื่อซ้ำ — เตือนก่อนทับ */
      if (!force && activeFiles.some((f) => f.name === file.name)) {
        setOverwriteTarget({ file, list: incoming });
        return;
      }

      const check = validateAttachment(file, running);
      if (!check.ok) { setError(check.message); return; }

      const entry = buildAttachmentEntry(file, check.kind);
      if (entry.url) createdUrlsRef.current.push(entry.url);
      running += file.size;

      setFiles((fs) => [
        ...fs.filter((f) => f.name !== entry.name || f.cancelledAt),
        { ...entry, confidential: false },
      ]);
      logAttachmentEvent({ hn, visitId, action: 'แนบไฟล์', name: entry.name, reason: `${kindMeta(entry.kind).label} · ${formatBytes(entry.sizeBytes)}` });
      /* ลงทะเบียนในศูนย์เอกสารของขั้นตอนสุดท้ายด้วย — ไม่งั้นข้อความ
         "จะไปแสดงในทะเบียนเอกสาร" ด้านล่างเป็นคำกล่าวอ้างที่ไม่จริง */
      addAttachmentDocument({
        hn, visitId, attachmentId: entry.id, name: entry.name, kind: entry.kind, confidential: false,
      });
    }
  };

  const toggleConfidential = (file) => {
    setFiles((fs) => fs.map((f) => (f.id === file.id ? { ...f, confidential: !f.confidential } : f)));
    setAttachmentDocumentConfidential(file.id, !file.confidential);
    logAttachmentEvent({
      hn, visitId, action: 'เปลี่ยนสถานะข้อมูลลับ', name: file.name,
      reason: file.confidential ? 'ยกเลิกข้อมูลลับ' : 'กำหนดเป็นข้อมูลลับ',
    });
  };

  const doDelete = (reason) => {
    setFiles((fs) => fs.map((f) => (
      f.id === deleteTarget.id
        ? { ...f, cancelledAt: new Date().toLocaleString('th-TH'), cancelReason: reason }
        : f
    )));
    /* ขีดฆ่าในทะเบียนเอกสารด้วย ไม่ลบทิ้ง — ให้สองที่ตรงกัน */
    cancelAttachmentDocument(deleteTarget.id, reason);
    logAttachmentEvent({ hn, visitId, action: 'ลบไฟล์แนบ', name: deleteTarget.name, reason });
    setDeleteTarget(null);
  };

  /* แนะนำว่าไฟล์ใหญ่สุดคือไฟล์ไหน เมื่อโควตาเต็ม */
  const largest = [...activeFiles].sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0))[0];
  const quotaRatio = usedBytes / MAX_VISIT_BYTES;

  if (!access.canView) return <AccessDeniedPanel what='ไฟล์แนบของการตรวจครั้งนี้' />;

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      <PanelCard
        title='ไฟล์แนบและเอกสารประกอบการตรวจ'
        subtitle={`รองรับ ${ATTACHMENT_KINDS.map((k) => k.exts.join('/')).join(' · ')} — ไม่เกิน ${formatBytes(MAX_FILE_BYTES)} ต่อไฟล์ และ ${formatBytes(MAX_VISIT_BYTES)} ต่อการตรวจหนึ่งครั้ง`}
        action={
          <>
            <CountLabel n={activeFiles.length} unit='ไฟล์' />
            <GuardedAction allowed={access.canEdit}>
              <NeutralSubdueButton
                variant='outline' size='sm' leadingIcon='photo_camera'
                onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
              >
                ถ่ายภาพ
              </NeutralSubdueButton>
            </GuardedAction>
            <GuardedAction allowed={access.canEdit}>
              <BrandButton
                variant='fill' size='sm' leadingIcon='upload_file'
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                แนบไฟล์
              </BrandButton>
            </GuardedAction>
          </>
        }
      >
        {/* input จริง — ซ่อนไว้ ให้ปุ่มด้านบนเป็นตัวกด */}
        <input
          ref={fileInputRef}
          type='file'
          multiple
          accept={ATTACHMENT_KINDS.flatMap((k) => k.exts.map((e) => `.${e}`)).join(',')}
          style={{ display: 'none' }}
          onChange={(e) => { acceptFiles(e.target.files); e.target.value = ''; }}
        />
        <input
          ref={cameraInputRef}
          type='file'
          accept='image/*'
          capture='environment'
          style={{ display: 'none' }}
          onChange={(e) => { acceptFiles(e.target.files); e.target.value = ''; }}
        />

        {/* โควตารวมของ visit */}
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <div className='flex flex-wrap items-center justify-between w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={PANEL_VALUE_STYLE}>
              ใช้ไป {formatBytes(usedBytes)} จาก {formatBytes(MAX_VISIT_BYTES)}
            </span>
            <span style={PANEL_LABEL_STYLE}>
              เหลือ {formatBytes(Math.max(0, MAX_VISIT_BYTES - usedBytes))}
            </span>
          </div>
          <MeterBar ratio={quotaRatio} tone={quotaRatio > 0.9 ? 'error' : quotaRatio > 0.7 ? 'warning' : 'brand'} />
        </div>

        {error ? (
          <PanelAlert tone='error' icon='error' title='แนบไฟล์ไม่สำเร็จ' onDismiss={() => setError('')}>
            {error}
            {largest && /โควตา|เหลือ/.test(error) ? (
              <span style={{ display: 'block', marginTop: 'var(--dim-space-100, 4px)' }}>
                ไฟล์ที่ใหญ่ที่สุดของการตรวจครั้งนี้คือ "{largest.name}" ({formatBytes(largest.sizeBytes)}) — ลบไฟล์นี้ก่อนจะช่วยให้มีพื้นที่พอ
              </span>
            ) : null}
          </PanelAlert>
        ) : null}

        {activeFiles.length === 0 && files.length === 0 ? (
          <PanelEmptyState
            icon='attach_file'
            title='ยังไม่มีไฟล์แนบสำหรับการตรวจครั้งนี้'
            subtitle='แนบรูปแผล ผลตรวจจากที่อื่น ไฟล์เสียงบันทึกการซักประวัติ หรือถ่ายภาพจากกล้องได้โดยตรง'
            action={
              <GuardedAction allowed={access.canEdit}>
                <BrandButton variant='outline' size='sm' leadingIcon='upload_file' onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                  แนบไฟล์แรก
                </BrandButton>
              </GuardedAction>
            }
          />
        ) : (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            {files.map((file) => {
              const cancelled = !!file.cancelledAt;
              const masked = file.confidential && !access.canSeeConfidential;
              return (
                <div
                  key={file.id}
                  className='flex flex-wrap items-center w-full'
                  style={{
                    gap: 'var(--dim-space-300, 12px)',
                    borderRadius: 'var(--dim-radius-300, 10px)',
                    border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                    background: cancelled ? 'var(--surface-neutral-quaternary, #F9FBFB)' : 'var(--surface-card-100)',
                    paddingTop: 'var(--dim-space-300, 12px)',
                    paddingRight: 'var(--dim-space-300, 12px)',
                    paddingBottom: 'var(--dim-space-300, 12px)',
                    paddingLeft: 'var(--dim-space-300, 12px)',
                  }}
                >
                  {masked || cancelled ? (
                    <div
                      className='flex items-center justify-center'
                      style={{
                        width: 'var(--dim-size-1800, 96px)', height: 'var(--dim-size-1800, 96px)',
                        borderRadius: 'var(--dim-radius-200, 8px)',
                        background: 'var(--surface-neutral-quaternary, #F9FBFB)',
                      }}
                    >
                      <Sym name={cancelled ? 'block' : 'lock'} size={28} color='var(--icon-neutral-tertiary, #ADB2B7)' />
                    </div>
                  ) : (
                    <AttachmentPreview file={file} />
                  )}

                  <div className='flex flex-col min-w-0 flex-1' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                    <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(cancelled) }}>
                      <MaskedValue masked={masked}>{file.name}</MaskedValue>
                    </span>
                    <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      <ColorfulBadge style='grey' size='small' width='hug' icon={kindMeta(file.kind).icon}>
                        {kindMeta(file.kind).label}
                      </ColorfulBadge>
                      <span style={PANEL_LABEL_STYLE}>{formatBytes(file.sizeBytes)}</span>
                      {file.confidential ? <StatusBadge style='purple' size='small' icon='lock'>ข้อมูลลับ</StatusBadge> : null}
                    </div>
                    <span style={PANEL_LABEL_STYLE}>แนบโดย {file.uploadedBy} · {file.uploadedAt}</span>
                    {cancelled ? <CancelledMark at={file.cancelledAt} reason={file.cancelReason} label='ลบไฟล์แล้ว' /> : null}
                  </div>

                  {!cancelled ? (
                    <div className='flex flex-wrap items-center shrink-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      <GuardedAction allowed={access.canEdit && access.canSeeConfidential}>
                        <NeutralSubdueButton
                          variant='outline' size='sm'
                          leadingIcon={file.confidential ? 'lock_open' : 'lock'}
                          onClick={() => toggleConfidential(file)}
                        >
                          {file.confidential ? 'ยกเลิกข้อมูลลับ' : 'ข้อมูลลับ'}
                        </NeutralSubdueButton>
                      </GuardedAction>
                      <GuardedAction allowed={access.canEdit}>
                        <NeutralSubdueButton variant='outline' size='sm' leadingIcon='delete' onClick={() => setDeleteTarget(file)}>
                          ลบ
                        </NeutralSubdueButton>
                      </GuardedAction>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <span style={PANEL_LABEL_STYLE}>
          ไฟล์ที่แนบไว้ที่นี่จะไปแสดงในทะเบียนเอกสารของขั้นตอนสุดท้ายด้วย
        </span>
      </PanelCard>

      {/* ลบไฟล์ — บังคับเหตุผล และคงบันทึกใน log */}
      <ReasonDialog
        open={!!deleteTarget}
        type='destructive'
        title='ลบไฟล์แนบ'
        description={deleteTarget ? `"${deleteTarget.name}" (${formatBytes(deleteTarget.sizeBytes)}) — ระบบจะบันทึกการลบพร้อมเหตุผลไว้ในประวัติการแก้ไข ไม่ลบร่องรอยออกจาก log` : ''}
        confirmLabel='ยืนยันการลบ'
        suggestions={[
          'ถ่ายภาพซ้ำ ไฟล์นี้เบลอจนอ่านไม่ได้',
          'แนบไฟล์ผิดผู้รับบริการ',
          'ไฟล์ซ้ำกับที่แนบไว้แล้วก่อนหน้า',
          'ผู้รับบริการขอให้ลบภาพที่ไม่เกี่ยวข้องกับการรักษา',
        ]}
        onConfirm={doDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* ชื่อไฟล์ซ้ำ */}
      <AlertDialog
        open={!!overwriteTarget}
        type='warning'
        title='มีไฟล์ชื่อเดียวกันอยู่แล้ว'
        description={overwriteTarget ? `"${overwriteTarget.file.name}" ถูกแนบไว้แล้วในการตรวจครั้งนี้ — ต้องการแทนที่ไฟล์เดิมหรือไม่` : ''}
        confirmLabel='แทนที่ไฟล์เดิม'
        cancelLabel='ไม่แทนที่'
        onConfirm={() => { const t = overwriteTarget; setOverwriteTarget(null); acceptFiles(t.list, { force: true }); }}
        onCancel={() => setOverwriteTarget(null)}
        onClose={() => setOverwriteTarget(null)}
      />
    </div>
  );
};

export default VisitAttachmentsPanel;
