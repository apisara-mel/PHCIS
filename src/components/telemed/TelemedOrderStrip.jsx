import React, { useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import InputField from '@/components/forms/InputField';
import { TELEMED_ORDER_KIND, formatClock } from '@/data/telemedVisits';
import { SUGGEST_REASON } from '@/data/telemedAssessments';
import { telemedCan, telemedDenyReason, telemedActor } from '@/utils/telemedAccess';
import {
  TELEMED_CATALOG_SOURCE_LABEL,
  catalogCounts,
  describeStoredOrder,
  optionsForKind,
  resolveCatalogItem,
} from '@/utils/telemedOrderCatalog';

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

/* จำนวนรายการที่ค้นได้ต่อประเภท — บอกผู้ใช้ว่าค้นจากแคตตาล็อกกลางกี่รายการ */
const CATALOG_COUNTS = catalogCounts();

const CATALOG_HINT = {
  med:  `ยาในทะเบียนกลาง ${CATALOG_COUNTS.med} รายการ`,
  lab:  `รายการตรวจ LAB กลาง ${CATALOG_COUNTS.lab} รายการ`,
  xray: `รายการเอกซเรย์กลาง ${CATALOG_COUNTS.xray} รายการ`,
};

const TelemedOrderStrip = ({
  orders = [],
  role = 'doctor',
  onAddOrder,
  onCancelOrder,
  onEditOrder,
  compact = false,
  /* ปิดทั้งแถบเมื่อบันทึกถูกล็อก (visit ปิดแล้ว / ยกเลิก / อยู่ในโหมดอ่านอย่างเดียว)
     — สิทธิ์ 'order' อย่างเดียวไม่พอ เพราะแพทย์มีสิทธิ์แต่ต้องขอแก้ไขย้อนหลังก่อน */
  disabled = false,
  disabledReason = 'บันทึกนี้ถูกปิดการแก้ไข — ขอแก้ไขย้อนหลังก่อนจึงจะสั่งการรักษาได้',
}) => {
  const [openKind, setOpenKind] = useState(null);
  const [selection, setSelection] = useState('');
  const [sig, setSig] = useState('');
  const [qty, setQty] = useState('');
  const [addError, setAddError] = useState('');
  const [note, setNote] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [editDetail, setEditDetail] = useState('');
  const [editError, setEditError] = useState('');

  const hasOrderCap = telemedCan(role, 'order');
  const canOrder = hasOrderCap && !disabled;
  const denyReason = hasOrderCap ? disabledReason : telemedDenyReason(role, 'order');

  /* คำสั่งที่บันทึกไว้แล้ว → เติมรหัส/ราคาจากแคตตาล็อกกลาง โดยไม่ทิ้งแถวเดิม
     (คำสั่งเก่าที่ใช้รหัสย่อของโมดูลยังอ่านออกผ่าน alias) */
  const described = useMemo(() => orders.map((o) => describeStoredOrder(o)), [orders]);

  const options = useMemo(() => (openKind ? optionsForKind(openKind) : []), [openKind]);
  const picked = useMemo(
    () => (openKind && selection ? resolveCatalogItem(openKind, selection) : null),
    [openKind, selection],
  );

  const closeAdd = () => {
    setOpenKind(null); setSelection(''); setNote(''); setSig(''); setQty(''); setAddError('');
  };

  const handlePick = (value) => {
    setSelection(value);
    setAddError('');
    const item = resolveCatalogItem(openKind, value);
    /* ยาเติมค่าตั้งต้นให้ แต่แพทย์แก้ได้ทุกครั้งก่อนบันทึก */
    setSig(item?.sig || '');
    setQty(item?.qty || '');
  };

  const confirmAdd = () => {
    if (!selection) { setAddError('ต้องเลือกรายการก่อนบันทึกคำสั่ง'); return; }
    const resolved = resolveCatalogItem(openKind, selection);
    if (!resolved) { setAddError('ไม่พบรายการนี้ในแคตตาล็อกกลาง — เลือกรายการใหม่'); return; }
    if (openKind === 'med' && (!sig.trim() || !qty.trim())) {
      setAddError('ยาต้องระบุวิธีใช้ (sig) และจำนวนก่อนบันทึก');
      return;
    }
    const baseDetail = openKind === 'med'
      ? `${sig.trim()} · ${qty.trim()}`
      : resolved.detail;
    onAddOrder?.({
      kind: openKind,
      code: resolved.code,
      label: resolved.label,
      detail: note.trim() ? `${baseDetail} · ${note.trim()}` : baseDetail,
      priceLabel: resolved.priceLabel,
      catalogSource: resolved.source,
    });
    closeAdd();
  };

  const confirmEdit = () => {
    if (!editDetail.trim()) { setEditError('ต้องระบุรายละเอียดคำสั่งที่แก้ไข'); return; }
    onEditOrder?.(editTarget.id, { detail: editDetail.trim() });
    setEditTarget(null);
    setEditDetail('');
    setEditError('');
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) { setCancelError('ต้องระบุเหตุผลการยกเลิกคำสั่ง'); return; }
    onCancelOrder?.(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setCancelReason('');
    setCancelError('');
  };

  const active = described.filter((o) => o.status !== 'cancelled');
  const cancelled = described.filter((o) => o.status === 'cancelled');

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
                  {o.catalogLabel || o.label}
                </div>
                <div style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
                  {o.catalogDetail || o.detail}
                </div>
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)', marginTop: 'var(--dim-space-050, 2px)' }}>
                  {o.code && (
                    <ColorfulBadge style='grey' size='small' hierarchy='secondary'>{`รหัส ${o.code}`}</ColorfulBadge>
                  )}
                  {o.priceLabel && (
                    <span style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                      {o.priceLabel}
                    </span>
                  )}
                  {o.unresolved && (
                    <ColorfulBadge style='orange' size='small' hierarchy='secondary'>
                      รายการเดิมที่ยังไม่ผูกแคตตาล็อกกลาง
                    </ColorfulBadge>
                  )}
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
                <div className='flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                  {onEditOrder && (
                    <NeutralSubdueButton
                      size='sm'
                      variant='outline'
                      leadingIcon='edit'
                      disabled={!canOrder}
                      title={canOrder ? undefined : denyReason}
                      onClick={() => { setEditTarget(o); setEditDetail(o.detail || ''); setEditError(''); }}
                    >
                      แก้ไข
                    </NeutralSubdueButton>
                  )}
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
                </div>
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
              {`รายการ${CATALOG_HINT[openKind] ? ` — ค้นจาก${CATALOG_HINT[openKind]}` : ''}`}
            </span>
            <Select
              showLabel={false}
              size='lg'
              searchable
              value={selection}
              onChange={handlePick}
              options={options}
              placeholder='พิมพ์ชื่อหรือรหัสเพื่อค้นหารายการ'
            />
            {options.length === 0 && (
              <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-alert-warning, #C2410C)' }}>
                ยังไม่มีรายการในแคตตาล็อกประเภทนี้ — ติดต่อผู้ดูแลทะเบียนรายการกลาง
              </span>
            )}
            {picked && (
              <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                {`รหัส ${picked.code} · ${picked.priceLabel}`}
                {picked.source === 'legacy' ? ' · รายการเดิมของโมดูล (ยังไม่ผูกแคตตาล็อกกลาง)' : ''}
              </span>
            )}
          </div>

          {/* ยาเท่านั้น: วิธีใช้ + จำนวน — บังคับกรอกก่อนบันทึก */}
          {openKind === 'med' && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
                  วิธีใช้ (sig)
                </span>
                <InputField
                  size='lg'
                  showLabel={false}
                  showHelperText={false}
                  value={sig}
                  onChange={(v) => { setSig(typeof v === 'string' ? v : v?.target?.value ?? ''); setAddError(''); }}
                  placeholder='เช่น รับประทาน 1 เม็ด หลังอาหารเช้า-เย็น'
                />
              </div>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
                  จำนวนที่จ่าย
                </span>
                <InputField
                  size='lg'
                  showLabel={false}
                  showHelperText={false}
                  value={qty}
                  onChange={(v) => { setQty(typeof v === 'string' ? v : v?.target?.value ?? ''); setAddError(''); }}
                  placeholder='เช่น 60 เม็ด'
                />
              </div>
            </div>
          )}

          {addError && (
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', color: 'var(--text-alert-error, #B91C1C)', fontSize: 'var(--type-size-xs, 12px)' }}>
              <Icon name='error' size={12} />
              {addError}
            </span>
          )}
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
              onChange={(e) => setNote(e?.target ? e.target.value : e)}
              placeholder='ข้อความที่จะแสดงคู่กับคำสั่งบนแอปผู้รับบริการ'
              height={110}
            />
          </div>
          <span
            className='inline-flex items-center'
            style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}
          >
            <Icon name='info' size={14} />
            {`รายการทั้งหมดอ่านจาก${TELEMED_CATALOG_SOURCE_LABEL} — ชื่อ รหัส และราคาตรงกับ CPOE ของหน่วยบริการ`}
          </span>
        </div>
      </Popup>

      {/* แก้ไขคำสั่ง (ก่อนจบสาย) — เก็บค่าเดิมไว้เป็นร่องรอย */}
      <Popup
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title='แก้ไขคำสั่งการรักษา'
        subtitle={editTarget ? `${editTarget.catalogLabel || editTarget.label} · ผู้แก้ไข ${telemedActor(role)}` : ''}
        width={compact ? 460 : 520}
        secondaryAction={{ label: 'ไม่แก้ไข', onClick: () => setEditTarget(null) }}
        primaryAction={{ label: 'บันทึกการแก้ไข', onClick: confirmEdit }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {`ค่าเดิม: ${editTarget?.detail || '—'}`}
          </span>
          <SuggestibleTextarea
            voice
            minChars={3}
            suggestions={[
              'รับประทาน 1 เม็ด หลังอาหารเช้า-เย็น · 60 เม็ด',
              'รับประทาน 1 เม็ด ก่อนนอน · 30 เม็ด',
              'งดอาหาร 8 ชั่วโมงก่อนเจาะเลือด',
              'เลื่อนไปตรวจที่หน่วยบริการใกล้บ้านแทน',
            ]}
            value={editDetail}
            onChange={(v) => { setEditDetail(v); if (editError) setEditError(''); }}
            placeholder='วิธีใช้ / จำนวน / คำแนะนำที่แก้ไข'
            height={110}
          />
          {editError && (
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', color: 'var(--text-alert-error, #B91C1C)', fontSize: 'var(--type-size-xs, 12px)' }}>
              <Icon name='error' size={12} />
              {editError}
            </span>
          )}
        </div>
      </Popup>

      {/* ยกเลิกคำสั่ง */}
      <AlertDialog
        open={Boolean(cancelTarget)}
        type='destructive'
        title='ยกเลิกคำสั่งการรักษา'
        description={cancelTarget ? `${cancelTarget.catalogLabel || cancelTarget.label} — รายการจะถูกถอนออกจากแอปผู้รับบริการ และคงร่องรอยไว้ในประวัติการใช้งาน` : ''}
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
