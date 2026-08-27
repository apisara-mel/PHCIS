import React, { useMemo, useState } from 'react';

import Popup from '@/components/popup/Popup';
import Checkbox from '@/components/checkbox/Checkbox';
import SelectWithOther, {
  OTHER_OPTION_VALUE,
  isOtherSelected,
} from '@/components/forms/SelectWithOther';
import Alert from '@/components/alert/Alert';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import {
  getConsentRecords,
  requestConsentWithdrawal,
  WITHDRAWABLE_CONSENT_STATUSES,
} from '@/data/consentWorkflowStore';
import { AUTO_MR_REQUEST_CHANNEL } from '@/data/consentRecords';

/* PHCIS | เวชระเบียน · ขั้นที่ 1 — ขอถอนความยินยอม (ด.1.1.5 / TOR 1.5.11)

   ผู้รับบริการแจ้งถอนที่เคาน์เตอร์ เจ้าหน้าที่เลือกใบที่จะถอน + ระบุเหตุผล
   คำขอเดินเข้าสถานะ «ขอเพิกถอน» ในระบบจัดการความยินยอม (แท็บรอดำเนินการ)
   การเพิกถอนจริงยังเป็นขั้นอนุมัติของเจ้าหน้าที่ผู้ดูแล ไม่ใช่ผลทันทีจากหน้านี้

   ช่องทางบันทึกเป็น «เวชระเบียน» ต่างจากคำขอที่มาจาก Mobile App ของผู้รับบริการเอง */

/** ค่าที่ระบบใช้แทน "ไม่มีข้อมูล" ในทะเบียนความยินยอม */
const EMPTY_MARKS = ['', '-', '—'];

const hasFormIdentity = (r) => (
  !EMPTY_MARKS.includes(String(r.formName || '').trim())
  && !EMPTY_MARKS.includes(String(r.formCode || '').trim())
);

const WITHDRAW_REASONS = [
  'ผู้รับบริการขอถอนด้วยตนเองที่เคาน์เตอร์',
  'ไม่ประสงค์ให้เปิดเผยข้อมูลแก่หน่วยงานภายนอกแล้ว',
  'ให้ความยินยอมผิดฉบับ',
  'เปลี่ยนสถานพยาบาลประจำ',
  'ผู้รับบริการเพิกถอนตามสิทธิ PDPA',
  OTHER_OPTION_VALUE,
].map((label) => ({ value: label, label }));

const ConsentWithdrawRequestPopup = ({ open, onClose, hn, patientName, onSubmitted }) => {
  const [selected, setSelected] = useState([]);
  const [reason, setReason] = useState('');
  const [reasonOther, setReasonOther] = useState('');

  /* อ่านรายการใหม่ทุกครั้งที่เปิด — สถานะอาจเปลี่ยนจากแท็บอื่นระหว่างที่ค้างหน้าไว้

     แถวที่ไม่มีตัวตนของใบ (ชื่อ/รหัสเป็น '-' หรือว่าง) คือแถวที่ยังไม่เคยผูกกับ
     ใบยินยอมจริง — ไม่ใช่สิ่งที่ผู้รับบริการเคยเซ็น จึงไม่ควรให้เลือกถอน */
  const records = useMemo(() => {
    if (!open || !hn) return [];
    return getConsentRecords().filter((r) => (
      r.hn === hn
      && WITHDRAWABLE_CONSENT_STATUSES.includes(r.status)
      && hasFormIdentity(r)
    ));
  }, [open, hn]);

  const close = () => {
    setSelected([]);
    setReason('');
    setReasonOther('');
    onClose?.();
  };

  const toggle = (id) => setSelected((s) => (
    s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
  ));

  /* เลือก "อื่นๆ" แล้วไม่พิมพ์ = ไม่รู้เหตุผลจริง ปล่อยผ่านไม่ได้ (D-018) */
  const otherPicked = isOtherSelected(reason);
  const reasonText = otherPicked ? reasonOther.trim() : reason.trim();
  const canSubmit = selected.length > 0 && reasonText.length > 0;

  const submit = () => {
    if (!canSubmit) return;
    const done = selected
      .map((id) => requestConsentWithdrawal(id, {
        reason: reasonText,
        channel: AUTO_MR_REQUEST_CHANNEL,
      }))
      .filter(Boolean);
    close();
    onSubmitted?.(done);
  };

  return (
    <Popup
      open={open}
      onClose={close}
      size='large'
      title='ขอถอนความยินยอม'
      subtitle={patientName
        ? `${patientName}${hn ? ` · HN ${hn}` : ''} — เลือกใบยินยอมที่ต้องการถอนและระบุเหตุผล`
        : 'เลือกใบยินยอมที่ต้องการถอนและระบุเหตุผล'}
      primaryAction={{ label: 'ส่งคำขอถอน', onClick: submit, disabled: !canSubmit }}
      secondaryAction={{ label: 'ยกเลิก', onClick: close }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        {records.length === 0 ? (
          <Alert
            type='info'
            title='ยังไม่มีใบยินยอมที่ถอนได้'
            subtext='ผู้รับบริการรายนี้ยังไม่มีใบยินยอมที่มีผลอยู่ — ถอนได้เฉพาะใบที่สถานะ "ยินยอมแล้ว" หรือ "ใกล้หมดอายุ"'
            showCloseButton={false}
            showBadge={false}
            showIndicator={false}
          />
        ) : (
          <>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
              {records.map((r) => (
                <div
                  key={r.id}
                  className='flex items-center w-full'
                  style={{
                    gap: 'var(--dim-space-300)',
                    padding: 'var(--dim-space-300)',
                    borderRadius: 'var(--dim-radius-200)',
                    border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                  }}
                >
                  <Checkbox
                    className='flex-1 min-w-0'
                    checked={selected.includes(r.id)}
                    onChange={() => toggle(r.id)}
                    label={r.formName}
                    description={[r.formCode, r.version, r.signedDate].filter(Boolean).join(' · ')}
                  />
                  <ColorfulBadge badgeStyle='teal' hierarchy='secondary' size='small' width='hug'>
                    {r.status}
                  </ColorfulBadge>
                </div>
              ))}
            </div>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <span style={{
                color: 'var(--text-content-default)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                lineHeight: 1.5,
              }}>
                เหตุผลในการถอน
                <span style={{ color: 'var(--text-danger-default, #DC2626)' }}> *</span>
              </span>
              <SelectWithOther
                value={reason}
                onChange={setReason}
                otherValue={reasonOther}
                onOtherChange={setReasonOther}
                options={WITHDRAW_REASONS}
                placeholder='เลือกเหตุผล'
                otherPlaceholder='ระบุเหตุผลที่ผู้รับบริการแจ้ง'
                otherLabel='เหตุผลในการถอน (อื่นๆ)'
              />
            </div>
          </>
        )}
      </div>
    </Popup>
  );
};

export default ConsentWithdrawRequestPopup;
