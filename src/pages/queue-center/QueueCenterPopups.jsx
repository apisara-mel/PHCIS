import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Dropdown from '@/components/forms/Dropdown';
import InputField from '@/components/forms/InputField';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import Alert from '@/components/alert/Alert';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import QueueTicket from './QueueTicket';
import { FieldLabel, HelperText } from './queueCenterShared';
import {
  QUEUE_STATIONS,
  URGENCY_LEVELS,
  ENTRY_CHANNELS,
  VISITOR_TYPES,
  SERVICE_TIMES,
  getQueueTypes,
  getStation,
  getQueueHistory,
  formatClock,
  formatDateTh,
  isQueueClosed,
  nextQueues,
} from '@/data/queueCenterStore';

/* ════════════════════════════════════════════════════════════════════════
   Popup ทั้งหมดของ /queue-center — แยกออกจากหน้าคอนโซลตั้งแต่ต้นตามข้อกังวล
   เรื่องขนาดไฟล์ในสเปก (คอนโซลรวม TOR 1.3.1 / 1.3.3 / 1.3.5 ไว้หน้าเดียว)

     QueueReasonPopup     ทุก action ที่บังคับกรอกเหตุผล (โอน/ยกเลิก/แทรก/
                          ข้าม/พิมพ์ซ้ำ) — โหมด transfer เพิ่ม dropdown ปลายทาง
     QueueEditPopup       แก้ไขข้อมูลคิว (คิวที่ปิดแล้ว = read-only)
     QueueHistoryPopup    ประวัติคิว (audit trail ผู้ทำ + เวลา + เหตุผล)
     QueueTicketPopup     พรีวิว/พิมพ์บัตรคิว
   ════════════════════════════════════════════════════════════════════════ */

const REASON_SUGGESTIONS = {
  transfer: [
    'ส่งต่อให้แพทย์เฉพาะทางตามอาการ',
    'จุดบริการเดิมปิดชั่วคราว',
    'ผู้รับบริการแจ้งความประสงค์เปลี่ยนจุดบริการ',
    'เลือกจุดบริการผิดตอนกดบัตรคิว',
    'ปริมาณคิวหนาแน่น กระจายไปจุดบริการอื่น',
  ],
  cancel: [
    'ผู้รับบริการแจ้งขอยกเลิก ไม่รอรับบริการ',
    'ผู้รับบริการกลับก่อนโดยไม่แจ้ง',
    'ออกบัตรคิวซ้ำโดยไม่ตั้งใจ',
    'เลือกจุดบริการผิด จึงยกเลิกและออกใหม่',
    'ส่งต่อไปโรงพยาบาลอื่น',
  ],
  prioritize: [
    'ผู้รับบริการมีอาการเร่งด่วน (เจ็บแน่นหน้าอก)',
    'ผู้สูงอายุ/ผู้พิการ ควรได้รับบริการก่อน',
    'หญิงตั้งครรภ์ / เด็กเล็ก',
    'มาตามนัดหมายและถึงเวลานัดแล้ว',
    'ส่งกลับมาจากจุดบริการอื่นให้ทำต่อเนื่อง',
  ],
  skip: [
    'เรียก 3 ครั้งแล้วไม่มีผู้มาแสดงตน',
    'ผู้รับบริการออกไปทำธุระนอกอาคาร',
    'อยู่ระหว่างรอผลตรวจจากจุดบริการอื่น',
    'ผู้รับบริการขอเลื่อนไปคิวหลัง',
  ],
  reprint: [
    'บัตรคิวสูญหาย',
    'เครื่องพิมพ์ขัดข้องรอบแรก บัตรไม่ออก',
    'บัตรคิวพิมพ์ไม่ชัด อ่านไม่ออก',
    'ผู้รับบริการทำบัตรคิวเปียกน้ำ',
  ],
  pause: [
    'ผู้รับบริการขอพักไปทำธุระก่อน',
    'รอผลตรวจจากห้องปฏิบัติการ',
    'รอญาติมารับ',
    'จุดบริการพักกลางวัน',
  ],
  closeStation: [
    'พักกลางวันของเจ้าหน้าที่',
    'อุปกรณ์ขัดข้อง รอช่างเข้ามาแก้ไข',
    'เจ้าหน้าที่ไม่เพียงพอในช่วงเวลานี้',
  ],
};

const MODE_META = {
  transfer:   { title: 'โอนคิวไปจุดบริการอื่น', confirm: 'ยืนยันโอนคิว',   tone: 'brand',  icon: 'swap_horiz',   label: 'เหตุผลการโอนคิว' },
  cancel:     { title: 'ยกเลิกคิว',             confirm: 'ยืนยันยกเลิกคิว', tone: 'danger', icon: 'cancel',       label: 'เหตุผลการยกเลิก' },
  prioritize: { title: 'เรียกคิวนี้ก่อน (แทรกคิว)', confirm: 'ยืนยันแทรกคิว', tone: 'brand', icon: 'low_priority', label: 'เหตุผลการแทรกคิว' },
  skip:       { title: 'ข้ามคิว (ไม่มาตามเรียก)', confirm: 'ยืนยันข้ามคิว',  tone: 'brand',  icon: 'skip_next',    label: 'เหตุผลการข้ามคิว' },
  reprint:    { title: 'พิมพ์บัตรคิวซ้ำ',        confirm: 'พิมพ์ซ้ำ',        tone: 'brand',  icon: 'print',        label: 'เหตุผลการพิมพ์ซ้ำ' },
  pause:      { title: 'พักคิว',                confirm: 'ยืนยันพักคิว',     tone: 'brand',  icon: 'pause',        label: 'เหตุผลการพักคิว' },
  closeStation: { title: 'ปิดรับคิวชั่วคราว',     confirm: 'ยืนยันปิดรับคิว',  tone: 'danger', icon: 'block',       label: 'เหตุผล' },
};

/**
 * Popup สำหรับ action ที่บังคับกรอกเหตุผล (audit trail — playbook §5)
 *   mode      'transfer' | 'cancel' | 'prioritize' | 'skip' | 'reprint' | 'pause' | 'closeStation'
 *   onConfirm ({ reason, toStationId }) → { ok, message }
 */
export const QueueReasonPopup = ({ open, mode = 'cancel', queue, stationLabel, onClose, onConfirm }) => {
  const meta = MODE_META[mode] || MODE_META.cancel;
  const [reason, setReason] = useState('');
  const [toStationId, setToStationId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setReason(''); setToStationId(''); setError(''); }
  }, [open, mode, queue?.id]);

  const stationOptions = useMemo(() => QUEUE_STATIONS
    .filter((s) => s.active && s.id !== queue?.stationId)
    .map((s) => ({ value: s.id, label: `${s.prefix} · ${s.label} (${s.zone} ${s.floor})` })), [queue?.stationId]);

  const submit = () => {
    if (!reason.trim()) { setError('กรุณาระบุเหตุผล — ระบบบันทึกไว้ในประวัติคิว'); return; }
    if (mode === 'transfer' && !toStationId) { setError('กรุณาเลือกจุดบริการปลายทาง'); return; }
    const res = onConfirm?.({ reason: reason.trim(), toStationId });
    if (res && res.ok === false) { setError(res.message || 'ทำรายการไม่สำเร็จ'); return; }
    onClose?.();
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      title={meta.title}
      subtitle={queue
        ? `${queue.code} · ${queue.patient?.name || 'ผู้รับบริการไม่ระบุตัวตน'}${stationLabel ? ` · ${stationLabel}` : ''}`
        : stationLabel}
      size='default'
      tertiaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      primaryAction={{ label: meta.confirm, onClick: submit, tone: meta.tone === 'danger' ? 'danger' : undefined }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        {mode === 'transfer' ? (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
            <FieldLabel required>จุดบริการปลายทาง</FieldLabel>
            <Dropdown
              value={toStationId}
              onChange={setToStationId}
              options={stationOptions}
              placeholder='เลือกจุดบริการที่จะโอนไป'
            />
            <HelperText>
              ระบบจะออกรหัสคิวใหม่ตามจุดบริการปลายทาง และคิวเดิมจะถูกบันทึกไว้ในประวัติ
            </HelperText>
          </div>
        ) : null}

        {mode === 'reprint' && queue ? (
          <Alert
            type='info'
            title='ประวัติการพิมพ์บัตรคิวใบนี้'
            subtext={`พิมพ์ไปแล้ว ${queue.printCount || 0} ครั้ง · ครั้งล่าสุด ${formatClock(queue.lastPrintAt)} น. · พิมพ์ซ้ำได้ไม่เกิน 3 ครั้ง`}
          />
        ) : null}

        {mode === 'cancel' ? (
          <Alert
            type='warning'
            title='คิวที่ยกเลิกจะไม่ถูกลบทิ้ง'
            subtext='ระบบยังแสดงแถวนี้ในตารางแบบขีดฆ่า พร้อมเหตุผลและชื่อผู้ยกเลิก (ตามพฤติกรรมระบบงานส่งตรวจเดิม)'
          />
        ) : null}

        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
          <SuggestibleTextarea
            voice
            label={meta.label}
            required
            value={reason}
            onChange={(e) => setReason(e?.target ? e.target.value : e)}
            suggestions={REASON_SUGGESTIONS[mode] || REASON_SUGGESTIONS.cancel}
            minChars={2}
            placeholder='พิมพ์หรือพูดเหตุผล — ระบบจะบันทึกผู้ทำรายการและเวลาไว้ในประวัติคิว'
          />
          {error ? <HelperText tone='error'>{error}</HelperText> : null}
        </div>
      </div>
    </Popup>
  );
};

/* ─────────────────────────────────────────── แก้ไขข้อมูลคิว (1.3.1.1) */

const SYMPTOM_SUGGESTIONS = [
  'ไข้ ไอ เจ็บคอ',
  'ปวดศีรษะ เวียนศีรษะ',
  'ตรวจติดตามความดันโลหิตสูง',
  'ตรวจติดตามเบาหวาน + รับยาต่อเนื่อง',
  'ปวดท้อง แน่นท้อง',
  'ผื่นคันตามลำตัว',
  'มารับวัคซีนตามนัด',
  'ปวดเข่า/ปวดหลังเรื้อรัง',
  'นอนไม่หลับ เครียด',
  'ตรวจสุขภาพประจำปี',
];

export const QueueEditPopup = ({ open, queue, onClose, onSave, canEdit = true }) => {
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (open && queue) {
      setForm({
        queueType: queue.queueType,
        urgency: queue.urgency,
        entryChannel: queue.entryChannel,
        visitorType: queue.visitorType,
        serviceTime: queue.serviceTime,
        symptom: queue.symptom || '',
        doctor: queue.doctor || '',
        order: queue.order,
        note: queue.note || '',
      });
      setReason('');
      setError('');
      setConfirmDiscard(false);
    }
  }, [open, queue?.id]);

  const readOnly = !canEdit || (queue ? isQueueClosed(queue) : true);

  const dirty = useMemo(() => {
    if (!form || !queue) return false;
    return Object.keys(form).some((k) => String(form[k] ?? '') !== String(queue[k] ?? ''))
      || reason.trim().length > 0;
  }, [form, queue, reason]);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleClose = () => {
    if (dirty && !readOnly) { setConfirmDiscard(true); return; }
    onClose?.();
  };

  const submit = () => {
    if (readOnly) { onClose?.(); return; }
    const orderNum = Number(form.order);
    if (!form.queueType) { setError('กรุณาเลือกประเภทคิว'); return; }
    if (!Number.isFinite(orderNum) || orderNum < 1) { setError('ลำดับคิวต้องเป็นตัวเลขตั้งแต่ 1 ขึ้นไป'); return; }
    const res = onSave?.({ ...form, order: orderNum }, reason.trim());
    if (res && res.ok === false) { setError(res.message || 'บันทึกไม่สำเร็จ'); return; }
    onClose?.();
  };

  if (!queue || !form) return null;
  const queueTypes = getQueueTypes();

  return (
    <>
      <Popup
        open={open && !confirmDiscard}
        onClose={handleClose}
        title='แก้ไขข้อมูลคิว'
        subtitle={`${queue.code} · ${queue.patient?.name || 'ผู้รับบริการไม่ระบุตัวตน'} · ${getStation(queue.stationId)?.label || ''}`}
        size='large'
        tertiaryAction={{ label: readOnly ? 'ปิด' : 'ยกเลิก', onClick: handleClose }}
        primaryAction={readOnly ? undefined : { label: 'บันทึกการแก้ไข', onClick: submit }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <div className='w-full grid grid-cols-1 md:grid-cols-2' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
              <FieldLabel required>ประเภทคิว</FieldLabel>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                {queueTypes.map((t) => (
                  <SelectableTag
                    key={t.key}
                    label={t.label}
                    selected={form.queueType === t.key}
                    onClick={readOnly ? undefined : () => set('queueType')(t.key)}
                  />
                ))}
              </div>
            </div>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
              <FieldLabel>ความเร่งด่วน</FieldLabel>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                {URGENCY_LEVELS.map((u) => (
                  <SelectableTag
                    key={u.key}
                    label={u.label}
                    selected={form.urgency === u.key}
                    onClick={readOnly ? undefined : () => set('urgency')(u.key)}
                  />
                ))}
              </div>
            </div>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
              <FieldLabel>การเข้ามาของผู้รับบริการ</FieldLabel>
              <Dropdown
                value={form.entryChannel}
                onChange={set('entryChannel')}
                options={ENTRY_CHANNELS.map((c) => ({ value: c.key, label: c.label }))}
                state={readOnly ? 'disabled' : 'default'}
              />
            </div>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
              <FieldLabel>ประเภทผู้มารับบริการ</FieldLabel>
              <Dropdown
                value={form.visitorType}
                onChange={set('visitorType')}
                options={VISITOR_TYPES.map((c) => ({ value: c.key, label: c.label }))}
                state={readOnly ? 'disabled' : 'default'}
              />
            </div>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
              <FieldLabel>เวลามารับบริการ</FieldLabel>
              <Dropdown
                value={form.serviceTime}
                onChange={set('serviceTime')}
                options={SERVICE_TIMES.map((c) => ({ value: c.key, label: c.label }))}
                state={readOnly ? 'disabled' : 'default'}
              />
            </div>

            <InputField
              label='ลำดับในคิว'
              type='number'
              value={String(form.order ?? '')}
              onChange={(val) => set('order')(val)}
              disabled={readOnly}
              helperText='ไม่มีการลากวางในระบบนี้ — ใช้เลขลำดับ หรือปุ่มเลื่อนขึ้น/ลงในตาราง'
              showLeadingIcon={false}
            />

            <InputField
              label='แพทย์/ผู้ให้บริการ'
              value={form.doctor}
              onChange={(val) => set('doctor')(val)}
              disabled={readOnly}
              showLeadingIcon={false}
              placeholder='เช่น พญ.สมหญิง รักษ์ดี'
            />
          </div>

          <SuggestibleTextarea
            voice
            label='อาการ / เหตุผลที่มารับบริการ'
            value={form.symptom}
            onChange={set('symptom')}
            suggestions={SYMPTOM_SUGGESTIONS}
            minChars={2}
            disabled={readOnly}
            placeholder='เช่น ไข้ ไอ เจ็บคอ 2 วัน / มาตามนัดรับยาความดัน'
          />

          {readOnly ? null : (
            <SuggestibleTextarea
              voice
              label='เหตุผลการแก้ไข (บันทึกในประวัติคิว)'
              value={reason}
              onChange={(e) => setReason(e?.target ? e.target.value : e)}
              suggestions={[
                'แก้ไขตามข้อมูลจริงที่เคาน์เตอร์',
                'เจ้าหน้าที่คีย์ประเภทคิวผิด',
                'ผู้รับบริการแจ้งอาการเพิ่มเติม',
                'ปรับความเร่งด่วนตามการคัดกรอง',
              ]}
              minChars={2}
              placeholder='ระบุเหตุผลสั้น ๆ'
            />
          )}

          {error ? <HelperText tone='error'>{error}</HelperText> : null}

          <ConsentAuditBar
            recordedBy={queue.audit?.[0]?.actor}
            recordedAt={queue.audit?.[0]?.at ? `${formatDateTh(queue.audit[0].at)} ${formatClock(queue.audit[0].at)} น.` : undefined}
            editedAt={queue.audit?.length > 1
              ? `${formatDateTh(queue.audit[queue.audit.length - 1].at)} ${formatClock(queue.audit[queue.audit.length - 1].at)} น.`
              : undefined}
          />
        </div>
      </Popup>

      <Popup
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title='ออกโดยไม่บันทึก ?'
        subtitle='ข้อมูลที่แก้ไว้จะหายไปทั้งหมด'
        size='default'
        tertiaryAction={{ label: 'กลับไปแก้ไข', onClick: () => setConfirmDiscard(false) }}
        primaryAction={{ label: 'ออกโดยไม่บันทึก', onClick: () => { setConfirmDiscard(false); onClose?.(); }, tone: 'danger' }}
      >
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            color: 'var(--text-content-secondary)',
          }}
        >
          คุณแก้ไขข้อมูลคิว {queue.code} ค้างไว้ ต้องการออกโดยไม่บันทึกหรือไม่
        </span>
      </Popup>
    </>
  );
};

/* ────────────────────────────────────────────────── ประวัติคิว (audit) */

export const QueueHistoryPopup = ({ open, queue, onClose }) => {
  const entries = queue ? getQueueHistory(queue.id) : [];
  return (
    <Popup
      open={open}
      onClose={onClose}
      title='ประวัติคิว'
      subtitle={queue ? `${queue.code} · ${queue.patient?.name || 'ผู้รับบริการไม่ระบุตัวตน'}` : ''}
      size='default'
      tertiaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      {entries.length === 0 ? (
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            color: 'var(--text-content-tertiary)',
          }}
        >
          ยังไม่มีประวัติการดำเนินการกับคิวนี้
        </span>
      ) : (
        <ol className='flex flex-col w-full' style={{ gap: 'var(--dim-space-0)' }}>
          {entries.map((e, i) => (
            <li
              key={`${e.at}-${i}`}
              className='flex w-full'
              style={{ gap: 'var(--dim-space-300)' }}
            >
              <div className='shrink-0 flex flex-col items-center' style={{ width: 'var(--dim-size-500, 24px)' }}>
                <span
                  style={{
                    width: 'var(--dim-space-300, 12px)',
                    height: 'var(--dim-space-300, 12px)',
                    borderRadius: 'var(--dim-radius-full, 9999px)',
                    background: i === 0 ? 'var(--surface-brandPrimaryButton-default, var(--brand-p700))' : 'var(--border-brandPrimary-tertiary)',
                    marginTop: 'var(--dim-space-150)',
                  }}
                />
                {i < entries.length - 1 ? (
                  <span
                    className='flex-1'
                    style={{
                      width: 'var(--dim-stroke-100, 1px)',
                      background: 'var(--border-neutral-tertiary)',
                      minHeight: 'var(--dim-space-600, 24px)',
                    }}
                  />
                ) : null}
              </div>
              <div
                className='flex-1 min-w-0 flex flex-col'
                style={{ gap: 'var(--dim-space-050)', paddingBottom: 'var(--dim-space-400)' }}
              >
                <span
                  style={{
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-bold, 700)',
                    color: 'var(--text-content-primary)',
                  }}
                >
                  {e.action}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs, 12px)',
                    color: 'var(--text-content-tertiary)',
                  }}
                >
                  {`${e.actor} · ${e.role} · ${formatDateTh(e.at)} ${formatClock(e.at)} น.`}
                </span>
                {e.reason ? (
                  <span
                    style={{
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xs, 12px)',
                      color: 'var(--text-content-secondary)',
                      background: 'var(--surface-neutral-quaternary)',
                      borderRadius: 'var(--dim-radius-150, 6px)',
                      paddingTop: 'var(--dim-space-100)',
                      paddingRight: 'var(--dim-space-200)',
                      paddingBottom: 'var(--dim-space-100)',
                      paddingLeft: 'var(--dim-space-200)',
                    }}
                  >
                    เหตุผล: {e.reason}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Popup>
  );
};

/* ─────────────────────────────────────────────── พรีวิว/พิมพ์บัตรคิว */

export const QueueTicketPopup = ({ open, queue, onClose, onPrint, printError }) => {
  const ahead = queue ? nextQueues(queue.stationId).findIndex((q) => q.id === queue.id) : 0;
  return (
    <Popup
      open={open}
      onClose={onClose}
      title='บัตรคิว'
      subtitle={queue ? `${queue.code} · ${getStation(queue.stationId)?.label || ''}` : ''}
      size='default'
      tertiaryAction={{ label: 'ปิด', onClick: onClose }}
      primaryAction={{ label: 'พิมพ์บัตรคิว', onClick: onPrint }}
    >
      <div className='w-full flex flex-col items-center' style={{ gap: 'var(--dim-space-400)' }}>
        {printError ? (
          <Alert type='destructive' title='พิมพ์ไม่สำเร็จ' subtext={printError} />
        ) : null}
        <QueueTicket queue={queue} waitingAhead={Math.max(0, ahead)} />
      </div>
    </Popup>
  );
};

/* ───────────────────────────────────── ยืนยันการเปิดดูข้อมูลส่วนบุคคล */

export const RevealConfirmPopup = ({ open, target, onClose, onConfirm }) => (
  <Popup
    open={open}
    onClose={onClose}
    title='เปิดดูข้อมูลส่วนบุคคล'
    subtitle='ระบบจะบันทึกผู้เปิดดูและเวลาไว้ในบันทึกการเข้าถึงข้อมูล'
    size='default'
    tertiaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    primaryAction={{ label: 'เปิดดู', onClick: onConfirm }}
  >
    <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <Icon name='shield_person' size={20} style={{ color: 'var(--text-brandPrimary-default)' }} />
      <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            color: 'var(--text-content-secondary)',
          }}
        >
          กำลังจะเปิดดู <strong>{target?.field || 'ข้อมูลส่วนบุคคล'}</strong> ของคิวนี้
        </span>
        <ColorfulBadge style='yellow' size='default' hierarchy='secondary'>
          บันทึกลง log ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล
        </ColorfulBadge>
      </div>
    </div>
  </Popup>
);
