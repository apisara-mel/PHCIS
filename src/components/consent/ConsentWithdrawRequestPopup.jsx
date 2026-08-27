import React, { useMemo, useState } from 'react';

import Popup from '@/components/popup/Popup';
import Checkbox from '@/components/checkbox/Checkbox';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
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

const WITHDRAW_REASON_SUGGESTIONS = [
  'ผู้รับบริการขอถอนด้วยตนเองที่เคาน์เตอร์',
  'ไม่ประสงค์ให้เปิดเผยข้อมูลแก่หน่วยงานภายนอกแล้ว',
  'ให้ความยินยอมผิดฉบับ',
  'เปลี่ยนสถานพยาบาลประจำ',
];

const ConsentWithdrawRequestPopup = ({ open, onClose, hn, patientName, onSubmitted }) => {
  const [selected, setSelected] = useState([]);
  const [reason, setReason] = useState('');

  /* อ่านรายการใหม่ทุกครั้งที่เปิด — สถานะอาจเปลี่ยนจากแท็บอื่นระหว่างที่ค้างหน้าไว้ */
  const records = useMemo(() => {
    if (!open || !hn) return [];
    return getConsentRecords().filter((r) => (
      r.hn === hn && WITHDRAWABLE_CONSENT_STATUSES.includes(r.status)
    ));
  }, [open, hn]);

  const close = () => {
    setSelected([]);
    setReason('');
    onClose?.();
  };

  const toggle = (id) => setSelected((s) => (
    s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
  ));

  const canSubmit = selected.length > 0 && reason.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    const done = selected
      .map((id) => requestConsentWithdrawal(id, {
        reason: reason.trim(),
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
            <SuggestibleTextarea
              label='เหตุผลในการถอน'
              required
              value={reason}
              onChange={setReason}
              placeholder='ระบุเหตุผลที่ผู้รับบริการแจ้ง'
              suggestions={WITHDRAW_REASON_SUGGESTIONS}
              rows={3}
              style={{ maxWidth: 'none', width: '100%' }}
            />
            <Alert
              type='warning'
              title='คำขอนี้ยังไม่ตัดสิทธิ์ทันที'
              subtext='รายการจะเข้าสถานะ "ขอเพิกถอน" ในระบบจัดการความยินยอม รอเจ้าหน้าที่ผู้ดูแลอนุมัติ'
              showCloseButton={false}
              showBadge={false}
              showIndicator={false}
            />
          </>
        )}
      </div>
    </Popup>
  );
};

export default ConsentWithdrawRequestPopup;
