import React, { useMemo, useState } from 'react';
import StatusBadge from '@/components/badge/StatusBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  PanelCard, PanelEmptyState, InfoPair,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, AccessDeniedPanel,
  ReasonDialog, PanelAlert, CountLabel,
} from '@/pages/treat/panels/panelHooks';
import {
  subscribeTreatmentAudit, auditForVisit, appendAudit, CURRENT_CLINICIAN,
} from '@/data/treatmentAudit';
import { subscribeTreatmentNotes, notesForPatient, noteTypeMeta } from '@/data/treatmentNotes';
import { subscribeDocuments, documentsForPatient, setDocumentConfidential } from '@/data/treatmentDocuments';
import { NO_CONFIDENTIAL_RIGHT_TOOLTIP } from '@/data/treatmentAccess';

/* PHCIS | EMR §1.4.2.1 — การจัดการข้อมูลลับ (Confidential Data).
   แสดงใน ระบบจัดการระบบ (/admin/confidential-data). */

const ConfidentialDataPanel = ({ patient, visitId = '' }) => {
  const access = useTreatmentAccess();
  const hn = patient?.hn || '';

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

  const [revealTarget, setRevealTarget] = useState(null);
  const [revealedKeys, setRevealedKeys] = useState([]);

  const revealLog = useMemo(
    () => audit.filter((r) => r.category === 'confidential' && String(r.field || '').startsWith('ขอเปิดดู')),
    [audit],
  );

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

  if (!access.canView) return <AccessDeniedPanel what='การจัดการข้อมูลลับ' />;

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
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

export default ConfidentialDataPanel;
