import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import {
  TELEMED_MED_CATALOG,
  TELEMED_LAB_CATALOG,
  TELEMED_XRAY_CATALOG,
  TELEMED_CONSULT_TARGETS,
  TELEMED_REFER_TARGETS,
  TELEMED_ORDER_KIND,
  formatClock,
} from '@/data/telemedVisits';
import { SUGGEST_REASON } from '@/data/telemedAssessments';
import { telemedCan, telemedDenyReason, telemedActor } from '@/utils/telemedAccess';

/* TelemedOrderStrip — แถบคำสั่งระหว่างสาย (TOR §4.3.3 + §1.13.3):
   สั่งยา · สั่ง LAB · สั่ง X-ray · ส่งปรึกษาภายใน · ส่งต่อภายนอก
   คำสั่งเขียนกลับเข้า visit แล้ว push ไปแสดงบนมือถือผู้ป่วย
   (ทั้งสองฝั่งอ่าน src/data/telemedVisits.js ชุดเดียวกัน).

   ยกเลิกคำสั่งได้ก่อนจบสาย — สถานะเปลี่ยนเป็น "ยกเลิกโดยแพทย์" ไม่ลบทิ้ง
   เพื่อให้ฝั่งผู้ป่วยเห็นว่ารายการหายไปเพราะอะไร และคงร่องรอยใน audit.

   ทำไมเป็น component ใหม่: ไม่มี "order bar" ใน src/components/ — CPOE เดิม
   อยู่ในหน้าเต็มของ src/pages/treat ซึ่งโมดูลนี้ import ข้ามไม่ได้.
   ดู manifest.newComponents + manifest.notes. */

const ORDER_KINDS = ['med', 'lab', 'xray', 'consult', 'refer'];

const optionsFor = (kind) => {
  switch (kind) {
    case 'med':     return TELEMED_MED_CATALOG.map((m) => ({ value: m.code, label: m.name, subtext: `${m.sig} · ${m.qty}` }));
    case 'lab':     return TELEMED_LAB_CATALOG.map((l) => ({ value: l.code, label: l.name, subtext: l.note }));
    case 'xray':    return TELEMED_XRAY_CATALOG.map((x) => ({ value: x.code, label: x.name, subtext: x.note }));
    case 'consult': return TELEMED_CONSULT_TARGETS.map((t) => ({ value: t, label: t }));
    case 'refer':   return TELEMED_REFER_TARGETS.map((t) => ({ value: t, label: t }));
    default:        return [];
  }
};

const detailFor = (kind, value) => {
  if (kind === 'med') {
    const m = TELEMED_MED_CATALOG.find((x) => x.code === value);
    return m ? { label: m.name, detail: `${m.sig} · ${m.qty}` } : null;
  }
  if (kind === 'lab') {
    const l = TELEMED_LAB_CATALOG.find((x) => x.code === value);
    return l ? { label: l.name, detail: l.note || 'ตรวจที่หน่วยบริการต้นทาง' } : null;
  }
  if (kind === 'xray') {
    const x = TELEMED_XRAY_CATALOG.find((i) => i.code === value);
    return x ? { label: x.name, detail: x.note || 'ตรวจที่หน่วยบริการที่มีเครื่องเอกซเรย์' } : null;
  }
  if (kind === 'consult') return { label: `ส่งปรึกษา ${value}`, detail: 'ปรึกษาภายในเครือข่ายศูนย์บริการ' };
  if (kind === 'refer')   return { label: `ส่งต่อ ${value}`, detail: 'ออกใบส่งต่อและนัดหมายปลายทาง' };
  return null;
};

const TelemedOrderStrip = ({
  orders = [],
  role = 'doctor',
  onAddOrder,
  onCancelOrder,
  compact = false,
  /* ปิดทั้งแถบเมื่อบันทึกถูกล็อก (visit ปิดแล้ว / ยกเลิก / อยู่ในโหมดอ่านอย่างเดียว)
     — สิทธิ์ 'order' อย่างเดียวไม่พอ เพราะแพทย์มีสิทธิ์แต่ต้องขอแก้ไขย้อนหลังก่อน */
  disabled = false,
  disabledReason = 'บันทึกนี้ถูกปิดการแก้ไข — ขอแก้ไขย้อนหลังก่อนจึงจะสั่งการรักษาได้',
}) => {
  const [openKind, setOpenKind] = useState(null);
  const [selection, setSelection] = useState('');
  const [note, setNote] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const hasOrderCap = telemedCan(role, 'order');
  const canOrder = hasOrderCap && !disabled;
  const denyReason = hasOrderCap ? disabledReason : telemedDenyReason(role, 'order');

  const closeAdd = () => { setOpenKind(null); setSelection(''); setNote(''); };

  const confirmAdd = () => {
    if (!selection) return;
    const resolved = detailFor(openKind, selection);
    if (!resolved) return;
    onAddOrder?.({
      kind: openKind,
      label: resolved.label,
      detail: note.trim() ? `${resolved.detail} · ${note.trim()}` : resolved.detail,
    });
    closeAdd();
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) { setCancelError('ต้องระบุเหตุผลการยกเลิกคำสั่ง'); return; }
    onCancelOrder?.(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setCancelReason('');
    setCancelError('');
  };

  const active = orders.filter((o) => o.status !== 'cancelled');
  const cancelled = orders.filter((o) => o.status === 'cancelled');

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <span
          className='inline-flex items-center'
          style={{
            gap: 'var(--dim-space-100, 4px)',
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-tertiary, #858C92)',
          }}
        >
          <Icon name='prescriptions' size={14} />
          คำสั่งระหว่างสาย
        </span>
        {ORDER_KINDS.map((k) => (
          <BrandSubdueButton
            key={k}
            size='sm'
            variant='outline'
            leadingIcon={TELEMED_ORDER_KIND[k].icon}
            disabled={!canOrder}
            title={canOrder ? undefined : denyReason}
            onClick={() => { setOpenKind(k); setSelection(''); setNote(''); }}
          >
            {TELEMED_ORDER_KIND[k].label}
          </BrandSubdueButton>
        ))}
        {!canOrder && (
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-alert-warning, #C2410C)' }}>
            {denyReason}
          </span>
        )}
      </div>

      {orders.length === 0 ? (
        <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
          ยังไม่มีคำสั่งการรักษาในสายนี้
        </span>
      ) : (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          {[...active, ...cancelled].map((o) => (
            <div
              key={o.id}
              className='flex items-start w-full'
              style={{
                gap: 'var(--dim-space-200, 8px)',
                borderRadius: 'var(--dim-radius-200, 8px)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
                paddingTop: 'var(--dim-space-200, 8px)',
                paddingBottom: 'var(--dim-space-200, 8px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                background: o.status === 'cancelled'
                  ? 'var(--surface-neutral-tertiary, #F4F5F5)'
                  : 'var(--surface-card-100, #FFFFFF)',
                opacity: o.status === 'cancelled' ? 0.75 : 1,
              }}
            >
              <ColorfulBadge style={TELEMED_ORDER_KIND[o.kind]?.tone || 'grey'} size='small' hierarchy='secondary'>
                {TELEMED_ORDER_KIND[o.kind]?.label || 'คำสั่ง'}
              </ColorfulBadge>
              <div className='flex-1 min-w-0'>
                <div
                  style={{
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-medium, 500)',
                    color: 'var(--text-content-default, #363B3F)',
                    textDecoration: o.status === 'cancelled' ? 'line-through' : 'none',
                  }}
                >
                  {o.label}
                </div>
                <div style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
                  {o.detail}
                </div>
                <div style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary, #858C92)', marginTop: 'var(--dim-space-050, 2px)' }}>
                  {`ผู้สั่ง ${o.by || '—'} · ${formatClock(o.at)}`}
                  {o.editedAt ? ` · แก้ไขโดย ${o.editedBy} ${formatClock(o.editedAt)}` : ''}
                </div>
                {o.status === 'cancelled' && (
                  <div style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-alert-error, #B91C1C)', marginTop: 'var(--dim-space-050, 2px)' }}>
                    {`ยกเลิกโดยแพทย์ · ${o.cancelledBy || '—'} · ${o.cancelReason || ''} — ถอนออกจากรายการฝั่งผู้ป่วยแล้ว`}
                  </div>
                )}
              </div>
              {o.status !== 'cancelled' && (
                <NeutralSubdueButton
                  size='sm'
                  variant='outline'
                  leadingIcon='cancel'
                  disabled={!canOrder}
                  title={canOrder ? undefined : denyReason}
                  onClick={() => { setCancelTarget(o); setCancelReason(''); setCancelError(''); }}
                >
                  ยกเลิก
                </NeutralSubdueButton>
              )}
            </div>
          ))}
        </div>
      )}

      {/* เพิ่มคำสั่ง */}
      <Popup
        open={Boolean(openKind)}
        onClose={closeAdd}
        title={openKind ? TELEMED_ORDER_KIND[openKind].label : ''}
        subtitle={`ผู้สั่ง ${telemedActor(role)} · คำสั่งจะแสดงบนแอปผู้รับบริการทันที`}
        width={compact ? 460 : 520}
        secondaryAction={{ label: 'ยกเลิก', onClick: closeAdd }}
        primaryAction={{ label: 'บันทึกคำสั่ง', onClick: confirmAdd, disabled: !selection }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
              รายการ
            </span>
            <Select
              showLabel={false}
              size='lg'
              searchable
              value={selection}
              onChange={setSelection}
              options={openKind ? optionsFor(openKind) : []}
              placeholder='เลือกรายการ'
            />
          </div>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
              หมายเหตุถึงผู้รับบริการ
            </span>
            <SuggestibleTextarea
              voice
              minChars={3}
              suggestions={[
                'ให้มารับยาที่ศูนย์บริการภายใน 3 วัน',
                'งดอาหาร 8 ชั่วโมงก่อนเจาะเลือด',
                'ถ้ามีอาการแย่ลงให้ติดต่อเจ้าหน้าที่ทันที',
                'นำใบนัดและบัตรประชาชนไปด้วยทุกครั้ง',
              ]}
              value={note}
              onChange={setNote}
              placeholder='ข้อความที่จะแสดงคู่กับคำสั่งบนแอปผู้รับบริการ'
              height={110}
            />
          </div>
          <span
            className='inline-flex items-center'
            style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}
          >
            <Icon name='info' size={14} />
            แคตตาล็อกในหน้านี้เป็นชุดย่อสำหรับการปรึกษาทางไกล — เมื่อเชื่อมกับ CPOE จริง รายการจะดึงจากแคตตาล็อกกลาง
          </span>
        </div>
      </Popup>

      {/* ยกเลิกคำสั่ง */}
      <AlertDialog
        open={Boolean(cancelTarget)}
        type='destructive'
        title='ยกเลิกคำสั่งการรักษา'
        description={cancelTarget ? `${cancelTarget.label} — รายการจะถูกถอนออกจากแอปผู้รับบริการ และคงร่องรอยไว้ในประวัติการใช้งาน` : ''}
        cancelLabel='ไม่ยกเลิก'
        confirmLabel='ยืนยันยกเลิกคำสั่ง'
        onClose={() => setCancelTarget(null)}
        onCancel={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <SuggestibleTextarea
            voice
            minChars={3}
            suggestions={SUGGEST_REASON}
            value={cancelReason}
            onChange={(v) => { setCancelReason(v); if (cancelError) setCancelError(''); }}
            placeholder='เหตุผลการยกเลิกคำสั่ง'
            height={100}
          />
          {cancelError && (
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', color: 'var(--text-alert-error, #B91C1C)', fontSize: 'var(--type-size-xs, 12px)' }}>
              <Icon name='error' size={12} />
              {cancelError}
            </span>
          )}
        </div>
      </AlertDialog>
    </div>
  );
};

export default TelemedOrderStrip;
