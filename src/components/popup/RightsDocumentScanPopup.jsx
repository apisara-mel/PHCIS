import React, { useEffect, useRef, useState } from 'react';

import Popup from '@/components/popup/Popup';
import Select from '@/components/forms/Select';

/* PHCIS | เวชระเบียน · สิทธิการรักษา — สแกนเอกสารสิทธิจากเครื่องสแกน

   ปุ่ม "สแกน" ในกล่องเอกสารประกอบเปิดป๊อปอัปนี้ เลือกเครื่องกับความละเอียด
   แล้วกดเริ่มสแกน ผลลัพธ์เดินเข้าไปเป็นเอกสารแนบของกลุ่มสิทธินั้นเหมือนไฟล์ที่
   อัปโหลดเอง — ปุ่มที่ไม่มีปลายทางบันทึกถือว่ายังไม่เสร็จ (D-019)

   เครื่องสแกนจริงต่อผ่านไดรเวอร์ของเครื่อง (TWAIN/eSCL) ซึ่งเบราว์เซอร์เข้าไม่ถึง
   ตรงนี้จึงยังเป็นการจำลอง — เปลี่ยน `runScan` เป็นการเรียกบริการฝั่งเครื่องเมื่อมีของจริง */

const SCANNER_OPTIONS = [
  { value: 'front-desk-1', label: 'Fujitsu fi-8170 (เคาน์เตอร์เวชระเบียน 1)' },
  { value: 'front-desk-2', label: 'Canon DR-C240 (เคาน์เตอร์เวชระเบียน 2)' },
  { value: 'mfp-2f', label: 'Ricoh IM C3000 (เครื่องรวม ชั้น 2)' },
];

const RESOLUTION_OPTIONS = [
  { value: '200', label: '200 dpi — เอกสารทั่วไป' },
  { value: '300', label: '300 dpi — อ่านตัวอักษรเล็ก' },
  { value: '600', label: '600 dpi — เก็บเป็นหลักฐาน' },
];

/** เวลาที่จำลองว่าเครื่องกำลังดึงกระดาษ (มิลลิวินาที) */
const SCAN_DURATION_MS = 1400;

const RightsDocumentScanPopup = ({ open, onClose, onScanned }) => {
  const [scanner, setScanner] = useState(SCANNER_OPTIONS[0].value);
  const [resolution, setResolution] = useState(RESOLUTION_OPTIONS[1].value);
  const [scanning, setScanning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setScanning(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open]);

  const runScan = () => {
    if (scanning) return;
    setScanning(true);
    timerRef.current = setTimeout(() => {
      const stamp = Date.now();
      const dpi = Number(resolution);
      onScanned?.({
        id: `rights-scan-${stamp}`,
        name: `สแกนเอกสาร_${stamp}.pdf`,
        /* ขนาดโดยประมาณตามความละเอียดที่เลือก — ของจริงมาจากไฟล์ที่เครื่องส่งกลับ */
        sizeLabel: `${(dpi / 200).toFixed(1)} MB`,
      });
      setScanning(false);
      onClose?.();
    }, SCAN_DURATION_MS);
  };

  return (
    <Popup
      open={open}
      onClose={scanning ? undefined : onClose}
      title='สแกนเอกสาร'
      subtitle='เลือกเครื่องสแกนและความละเอียด แล้ววางเอกสารบนเครื่องก่อนกดเริ่มสแกน'
      primaryAction={{
        label: scanning ? 'กำลังสแกน…' : 'เริ่มสแกน',
        onClick: runScan,
        disabled: scanning,
      }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose, disabled: scanning }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <Select
          label='เครื่องสแกน'
          value={scanner}
          onChange={setScanner}
          options={SCANNER_OPTIONS}
          disabled={scanning}
        />
        <Select
          label='ความละเอียด'
          value={resolution}
          onChange={setResolution}
          options={RESOLUTION_OPTIONS}
          disabled={scanning}
        />
        {scanning && (
          <span style={{
            color: 'var(--text-content-secondary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            lineHeight: 1.5,
          }}>
            กำลังดึงกระดาษจากเครื่อง — อย่าเพิ่งหยิบเอกสารออก
          </span>
        )}
      </div>
    </Popup>
  );
};

export default RightsDocumentScanPopup;
