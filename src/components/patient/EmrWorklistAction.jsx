import React, { useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Select from '@/components/forms/Select';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { MedicalHistoryReadOnlyLayout } from '@/components/forms/TreatmentSteps';
import { PATIENT_PROFILES, getPatientByHN } from '@/data/patientProfiles';

/* ปุ่ม "ข้อมูลทางการแพทย์ (EMR)" ประจำ worklist ของระบบบันทึกการรักษา
   ══════════════════════════════════════════════════════════════════════════
   ทุกหน้าคิวในโมดูลนี้ต้องมีปุ่มนี้ และกดแล้วเปิดเป็นป๊อปอัป (มติผู้ใช้
   28 ส.ค. 69) — เดิมประวัติการรักษาเปิดได้จากในฟอร์มตรวจเท่านั้น แปลว่าถ้าจะ
   ดูประวัติสักคนต้องเปิดเคสของเขาขึ้นมาก่อน ทั้งที่บ่อยครั้งการดูประวัติคือสิ่งที่
   ทำ *ก่อน* ตัดสินใจว่าจะเปิดเคสไหน

   ต่างจากปุ่มเดียวกันบน PatientCard ตรงที่หน้าคิวยังไม่มี "ผู้ป่วยที่กำลังดูอยู่"
   ป๊อปอัปจึงต้องถามก่อนว่าจะดูของใคร ตัวเลือกตั้งต้นคือคนที่อยู่ในคิวหน้านั้น
   (ผู้เรียกส่ง `patients` มา) เพราะนั่นคือคนที่แพทย์กำลังมองอยู่จริง ๆ ถ้าไม่ส่งมา
   จะถอยไปใช้ทะเบียนผู้ป่วยทั้งหมด

   ตัวเนื้อประวัติใช้ `MedicalHistoryReadOnlyLayout` ตัวเดียวกับป๊อปอัปในฟอร์มตรวจ
   — สองทางเข้า แต่ต้องเห็นข้อมูลชุดเดียวกันเสมอ */

const EmrWorklistAction = ({
  /* [{ hn, name }] — แถวในคิวของหน้านั้น (จะซ้ำ HN ก็ได้ เดี๋ยวกรองให้) */
  patients = null,
  label = 'ดูข้อมูลทางการแพทย์ (EMR)',
}) => {
  const [open, setOpen] = useState(false);
  const [hn, setHn] = useState('');

  const options = useMemo(() => {
    const source = (patients && patients.length)
      ? patients
      : PATIENT_PROFILES.map((p) => ({ hn: p.hn, name: p.shortName }));
    const seen = new Set();
    return source
      .filter((p) => {
        const key = String(p?.hn || '').trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((p) => ({ value: p.hn, label: `${p.name || getPatientByHN(p.hn)?.shortName || ''} · HN ${p.hn}`.trim() }));
  }, [patients]);

  const patient = hn ? getPatientByHN(hn) : null;

  const close = () => setOpen(false);

  return (
    <>
      <BrandSubdueButton
        variant='outline'
        leadingIcon='history'
        onClick={() => setOpen(true)}
      >
        {label}
      </BrandSubdueButton>

      <Popup
        open={open}
        onClose={close}
        title='ข้อมูลทางการแพทย์ (EMR)'
        subtitle='ประวัติการรักษาแบบอ่านอย่างเดียว — การวินิจฉัย การสั่งยา ผลตรวจ และบันทึกทางการแพทย์'
        size='extraLarge'
        bodyScrollable={false}
        primaryAction={{ label: 'ปิด', onClick: close }}
      >
        <div
          className='flex flex-col w-full'
          style={{ height: '100%', minHeight: 0, gap: 'var(--dim-space-400)' }}
        >
          <div className='shrink-0' style={{ maxWidth: 420 }}>
            <Select
              label='ผู้รับบริการ'
              placeholder='เลือกผู้รับบริการเพื่อดูประวัติ'
              value={hn}
              onChange={setHn}
              options={options}
            />
          </div>

          {patient ? (
            <div className='flex-1 min-w-0' style={{ minHeight: 0 }}>
              <MedicalHistoryReadOnlyLayout
                patient={patient}
                hideSectionTitle
                independentScroll
                viewModes
              />
            </div>
          ) : (
            /* ยังไม่เลือกใคร — บอกตรง ๆ ว่าต้องทำอะไรต่อ ดีกว่าโชว์โครงประวัติเปล่า
               ที่อ่านเหมือนผู้ป่วยไม่มีประวัติ */
            <div
              className='flex-1 flex items-center justify-center w-full'
              style={{
                minHeight: 240,
                background: 'var(--surface-card-200)',
                borderRadius: 'var(--dim-radius-300)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-content-tertiary)',
              }}
            >
              เลือกผู้รับบริการจากช่องด้านบนเพื่อดูข้อมูลทางการแพทย์
            </div>
          )}
        </div>
      </Popup>
    </>
  );
};

export default EmrWorklistAction;
