import React, { useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import SuccessPopup from '@/components/popup/SuccessPopup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import { getPatientByHN } from '@/data/patientProfiles';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { DENTAL_PROCEDURES } from '@/data/dentalCatalog';
import {
  DENTAL_CHECK_REASON_SUGGESTIONS,
  cancelDentalCheckRequest,
  getDentalCarrySummary,
  requestDentalCheck,
  toothListLabelOf,
} from '@/data/dentalVisits';

/* ผลทันตกรรมที่ส่งมาจากหน้าทันตกรรม — อ่านอย่างเดียว (มติ คทง.6 ครั้งที่ 3)

   "ลงข้อมูลที่หน้าทันตกรรมที่เดียว แล้วส่งผลไปแสดงในหน้าคลินิกส่งเสริม
   ต่าง ๆ โดยไม่ต้องเปิด Visit ใหม่" — คลินิกส่งเสริม (ANC · เบาหวาน ·
   ผู้สูงอายุ · วัยทอง · เด็กดี · เยี่ยมบ้าน · อนามัยโรงเรียน) จึง **ไม่มี
   ฟอร์มลงผลตรวจฟันของตัวเอง** มีได้อย่างเดียวคือปุ่ม "ส่งตรวจทันตกรรม"
   ซึ่งเป็นคำขอ (flag) ไม่ใช่การเปิด Visit — ทันตแพทย์ดึงเข้าตรวจเองที่
   คิวทันตกรรม (Screen first, data entry later)

   §1.10.2.8 ใช้แผงเดียวกันนี้เป็น "การตรวจทันตกรรม" ในการติดตามผู้ป่วย
   โรคเฉพาะ คู่กับผล Lab / X-ray

   ทุกค่า visual alias token จาก design.md พร้อม fallback ที่ตรงค่าจริง
   และใช้ inline padding แบบ longhand เท่านั้น (CLAUDE.md)               */

/* คำขอที่ถูกยกเลิก — `cancelDentalCheckRequest` ของโมดูลทันตกรรมลบคำขอทิ้ง
   ไม่เหลือร่องรอย แผงนี้จึงเก็บ "ใบที่ยกเลิกแล้ว + เหตุผล" ไว้เองใน
   sessionStorage เพื่อให้ตารางยังแสดงสถานะ "ยกเลิก" พร้อมเหตุผลได้
   (มติผู้ใช้ 30 ส.ค. 69) — ของจริงต้องย้ายไปเก็บที่ store ของทันตกรรม */
const CANCELLED_KEY = 'mih:dental-check-cancelled';

const readCancelled = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(CANCELLED_KEY) || '{}') || {};
  } catch {
    return {};
  }
};

const writeCancelled = (map) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(CANCELLED_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode — หน้าจอยังทำงานต่อได้ */
  }
};

/* เหตุผลยกเลิกแบบ mock ให้เลือก — ของจริงต้องมาจากทะเบียนเหตุผลของทันตกรรม */
export const DENTAL_CANCEL_REASONS = [
  'ผู้รับบริการปฏิเสธการตรวจทันตกรรม',
  'ส่งตรวจซ้ำซ้อนกับคำขอที่มีอยู่แล้ว',
  'อาการดีขึ้นเอง ไม่จำเป็นต้องตรวจในรอบนี้',
  'ผู้รับบริการนัดตรวจกับคลินิกทันตกรรมนอกหน่วยแล้ว',
  'ส่งผิดคน/ผิดหน่วยงาน',
];

const STATUS_BADGE = {
  current: { style: 'green', label: 'ตรวจฟันแล้วในรอบนี้' },
  due: { style: 'orange', label: 'เกิน 6 เดือน — ควรตรวจซ้ำ' },
  never: { style: 'grey', label: 'ยังไม่เคยตรวจสุขภาพช่องปาก' },
  requested: { style: 'blue', label: 'ส่งตรวจทันตกรรมแล้ว — รอทันตแพทย์' },
};

/* หัวข้อย่อยของ section ในแผง — "ตรวจแล้ว" กับ "ส่งคำขอ" เป็นคนละเรื่อง
   (ผลที่เกิดขึ้นแล้ว vs. คำขอที่ยังไม่เกิด) จึงต้องแยกหัวข้อกัน ไม่ใช่ต่อท้าย
   ตารางเดียวกัน (มติผู้ใช้ 30 ส.ค. 69) */
const SubSectionTitle = ({ children }) => (
  <span style={{
    color: 'var(--text-content-default, #363B3F)',
    fontFamily: 'var(--type-family-heading-content)',
    fontSize: 'var(--type-size-sm)',
    fontWeight: 'var(--type-weight-medium, 500)',
  }}>
    {children}
  </span>
);

const Label = ({ children }) => (
  <span style={{
    color: 'var(--text-content-tertiary, #858C92)',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-xs)',
  }}>
    {children}
  </span>
);

const Value = ({ children }) => (
  <span style={{
    color: 'var(--text-content-default, #363B3F)',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm)',
    fontWeight: 'var(--type-weight-medium)',
  }}>
    {children ?? '—'}
  </span>
);

const InfoPair = ({ label, value, minWidth = 160 }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)', minWidth }}>
    <Label>{label}</Label>
    <Value>{value}</Value>
  </div>
);

const Note = ({ tone = 'info', icon = 'info', children, action }) => {
  const palette = tone === 'warning'
    ? { bg: 'var(--surface-alert-warning, #FFF9F0)', fg: 'var(--text-warning-default, #C2410C)' }
    : { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' };
  return (
    <div
      className='flex items-center flex-wrap w-full'
      style={{
        gap: 'var(--dim-space-200)',
        paddingTop: 'var(--dim-space-300)',
        paddingBottom: 'var(--dim-space-300)',
        paddingLeft: 'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: palette.bg,
        color: palette.fg,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
      }}
    >
      <Icon name={icon} size={18} />
      <span className='flex-1 min-w-0'>{children}</span>
      {action}
    </div>
  );
};

const CarriedDentalPanel = ({
  hn,
  patientName,
  from = 'other',
  fromLabel,
  /* ตัด "(จากหน้าทันตกรรม)" ออก (มติผู้ใช้ 30 ส.ค. 69) — ที่มาของข้อมูลบอก
     ไว้แล้วในแถบใต้หัวข้อ ไม่ต้องซ้ำในชื่อหัวข้อ */
  title = 'ผลการตรวจทันตกรรม',
  readOnly = false,
  /* แถบ "แผงนี้อ่านอย่างเดียว…" — ปิดได้สำหรับหน้าที่บอกเรื่องนี้ไว้แล้วที่อื่น
     ค่าเริ่มต้น true อีก 5 หน้าที่เรียกใช้อยู่จึงไม่เปลี่ยนพฤติกรรม
     (งานเยี่ยมบ้านปิด — มติผู้ใช้ 30 ส.ค. 69) */
  showReadOnlyNote = true,
  /* ยุบแถวสรุปด้านบน (วันที่ล่าสุด · ทันตแพทย์ · ระยะเวลา) เข้าไปในตาราง —
     ตารางมีคอลัมน์ "วันที่" กับ "ผู้ทำหัตถการ" อยู่แล้ว แถวสรุปจึงพูดซ้ำ
     ค่าเริ่มต้น true อีก 5 หน้าที่เรียกใช้จึงไม่เปลี่ยน (งานเยี่ยมบ้านปิด —
     มติผู้ใช้ 30 ส.ค. 69) */
  showSummaryRow = true,
  /* ป้ายสถานะข้างหัวข้อ (ตรวจฟันแล้วในรอบนี้ / เกิน 6 เดือน / …) — ปิดได้
     ค่าเริ่มต้น true อีก 5 หน้าที่เรียกใช้จึงไม่เปลี่ยน (งานเยี่ยมบ้านปิด —
     มติผู้ใช้ 30 ส.ค. 69) */
  showStatusBadge = true,
  /* กรอบเทา + พื้นขาวของแผงเอง — ปิดเมื่อแผงถูกวางในการ์ดขาวอยู่แล้ว
     (กล่องซ้อนกล่อง) ค่าเริ่มต้น true อีก 5 หน้าที่เรียกใช้จึงไม่เปลี่ยน
     (งานเยี่ยมบ้านปิด — มติผู้ใช้ 30 ส.ค. 69) */
  bordered = true,
}) => {
  /* bump ทำให้ summary คำนวณใหม่หลังส่ง/ยกเลิกคำขอ — สถานะเก็บใน
     sessionStorage จึงไม่มี subscription ให้ฟัง */
  const [bump, setBump] = useState(0);
  const [askOpen, setAskOpen] = useState(false);
  const [reason, setReason] = useState('');

  const summary = useMemo(() => getDentalCarrySummary(hn), [hn, bump]);
  const badge = STATUS_BADGE[summary.status] || STATUS_BADGE.never;
  /* หน้าที่เรียกใช้ส่งมาแค่ hn + patientName — ที่เหลือดึงจากทะเบียนกลางชุด
     เดียวกับที่ PatientCard ของทุกหน้าใช้ เพื่อให้การ์ดในป๊อปอัปตรงกับหัวแฟ้ม */
  const cardPatient = useMemo(() => (hn ? getPatientByHN(hn) : null), [hn]);

  /* รหัสมาตรฐานของหัตถการ (มติผู้ใช้ 30 ส.ค. 69) — ทันตกรรมใช้ **ICD-9-CM**
     สำหรับหัตถการ และ **ICD-10-TM** เป็นรหัสหัตถการไทยที่ใช้เบิกจ่าย
     ส่วนการวินิจฉัยใช้ ICD-10 (K00–K14) ซึ่งแสดงเป็นป้ายอยู่เหนือตารางแล้ว.
     สรุปจาก `getDentalCarrySummary` ไม่ได้ส่ง `procedureId` กลับมา จึงเทียบชื่อ
     กับแคตตาล็อกกลาง (ชื่อหัตถการไม่ซ้ำกัน) แทนการแก้ไฟล์ข้อมูลของโมดูลทันตกรรม */
  const codesOf = (name) => {
    const meta = DENTAL_PROCEDURES.find((x) => x.name === name);
    if (!meta) return '—';
    return [meta.icd9 && `ICD-9-CM ${meta.icd9}`, meta.icd10tm && `ICD-10-TM ${meta.icd10tm}`]
      .filter(Boolean).join(' · ') || '—';
  };

  const serviceRows = useMemo(() => {
    if (summary.procedures.length) {
      return summary.procedures.map((p) => ({
        ...p,
        toothLabel: p.teeth.length ? toothListLabelOf(p.teeth) : 'ทั้งปาก',
        amount: `${p.quantity} ${p.unit}`,
        codes: codesOf(p.name),
        note: p.note || '—',
      }));
    }
    return summary.ledger.map((r) => ({
      id: r.id,
      name: r.procedure,
      codes: codesOf(r.procedure),
      toothLabel: `#${r.toothId}`,
      amount: r.surfaces?.length ? `${r.surfaces.length} ด้าน` : '1 ครั้ง',
      date: r.date,
      dentist: r.dentist,
      note: r.note || '—',
    }));
  }, [summary]);

  /* ทุกการบันทึกใน popup ต้องยืนยันด้วยป๊อปอัปสำเร็จ ไม่ใช่ toast
     (มติผู้ใช้ 27 ส.ค. 69 · ย้ำอีกครั้ง 30 ส.ค. 69) */
  const [successOpen, setSuccessOpen] = useState(false);
  /* ยกเลิกคำขอเป็นการกระทำที่ย้อนไม่ได้ (คิวทันตกรรมจะไม่เห็นเคสนี้อีก) จึงต้อง
     ยืนยันก่อนเสมอ (มติผู้ใช้ 30 ส.ค. 69) */
  const [cancelOpen, setCancelOpen] = useState(false);

  const [cancelReason, setCancelReason] = useState('');

  const cancelledRecord = useMemo(() => (hn ? readCancelled()[hn] || null : null), [hn, bump]);

  const confirmCancel = () => {
    const req = summary.request;
    writeCancelled({
      ...readCancelled(),
      [hn]: {
        requestedAt: req?.requestedAt || '',
        fromLabel: req?.fromLabel || '',
        reason: req?.reason || '',
        requestedBy: req?.requestedBy || '',
        cancelledAt: new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }),
        cancelNote: cancelReason.trim() || DENTAL_CANCEL_REASONS[0],
      },
    });
    cancelDentalCheckRequest(hn);
    setCancelReason('');
    setBump((n) => n + 1);
    setCancelOpen(false);
  };

  const submit = () => {
    requestDentalCheck(hn, { from, fromLabel, reason, patientName });
    setAskOpen(false);
    setReason('');
    setBump((n) => n + 1);
    setSuccessOpen(true);
  };

  return (
    <div
      className='flex flex-col w-full min-w-0'
      style={{
        /* ระยะห่างระหว่างกลุ่มในแผง = 24px (มติผู้ใช้ 30 ส.ค. 69) */
        gap: 'var(--dim-space-600)',
        ...(bordered ? {
          paddingTop: 'var(--dim-space-400)',
          paddingBottom: 'var(--dim-space-400)',
          paddingLeft: 'var(--dim-space-400)',
          paddingRight: 'var(--dim-space-400)',
          borderRadius: 'var(--dim-radius-400)',
          border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
          background: 'var(--surface-card-100, #FFFFFF)',
        } : {}),
      }}
    >
      <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ color: 'var(--text-brandPrimary-default, #007549)', display: 'inline-flex' }}>
          <Icon name='dentistry' size={20} />
        </span>
        <h2
          className='flex-1 min-w-0'
          style={{
            color: 'var(--text-brandPrimary-default, #007549)',
            fontFamily: 'var(--type-family-heading-content)',
            fontSize: 'var(--type-size-base)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
          }}
        >
          {title}
        </h2>
        {showStatusBadge && (
          <ColorfulBadge style={badge.style} size='small' hierarchy='secondary' width='hug'>
            {badge.label}
          </ColorfulBadge>
        )}
        {/* ปุ่มส่งตรวจอยู่ขวาบนแถวหัวข้อ (มติผู้ใช้ 30 ส.ค. 69) — เดิมอยู่ใต้
            ตาราง ซึ่งอ่านเหมือนเป็นการกระทำต่อแถวสุดท้ายของตาราง ไม่ใช่ของทั้งแผง */}
        {!summary.request && !readOnly && (
          <>
            <div className='flex-1' />
            <BrandButton variant='outline' size='md' leadingIcon='dentistry' onClick={() => setAskOpen(true)}>
              ส่งตรวจทันตกรรม
            </BrandButton>
          </>
        )}
      </div>

      {showReadOnlyNote && (
        <Note icon='lock'>
          แผงนี้อ่านอย่างเดียว — ผลตรวจฟันบันทึกที่หน้าทันตกรรมที่เดียว
          คลินิกส่งเสริมไม่ต้องเปิด Visit ทันตกรรมใหม่เพื่อดูหรือลงข้อมูล
        </Note>
      )}

      {(summary.request || cancelledRecord) ? (
        <>
          {/* หนึ่งกลุ่ม = หัวข้อ + ตาราง ชิดกัน 8px ส่วนระยะห่าง "ระหว่างกลุ่ม"
              มาจาก gap ของตัวแผง 24px (มติผู้ใช้ 30 ส.ค. 69) */}
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <SubSectionTitle>ส่งคำขอแล้ว</SubSectionTitle>
          <Table
            columns={[
              { key: 'requestedAt', label: 'วันเวลาที่ส่ง', flex: true, minWidth: 170 },
              { key: 'fromLabel', label: 'ส่งจาก', flex: true, minWidth: 130 },
              { key: 'reason', label: 'เหตุผลที่ส่งตรวจ', flex: true, minWidth: 240 },
              { key: 'requestedBy', label: 'ผู้ส่ง', flex: true, minWidth: 150 },
              {
                key: 'status',
                label: 'สถานะ',
                sortable: false,
                minWidth: 140,
                render: (r) => (
                  <ColorfulBadge
                    style={r.cancelled ? 'grey' : 'blue'}
                    size='small'
                    hierarchy='secondary'
                    width='hug'
                  >
                    {r.cancelled ? 'ยกเลิก' : 'ส่งคำขอแล้ว'}
                  </ColorfulBadge>
                ),
              },
              /* "หมายเหตุ" = เหตุผลที่ยกเลิก หรือสิ่งที่ต้องรู้เพิ่มของแถวนั้น
                 (มติผู้ใช้ 30 ส.ค. 69 — ตั้งชื่อคอลัมน์ให้) */
              { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 240 },
              ...(readOnly ? [] : [{
                key: 'action',
                label: 'ดำเนินการ',
                sortable: false,
                minWidth: 140,
                render: (r) => (r.cancelled ? '—' : (
                  <NeutralSubdueButton
                    size='sm'
                    leadingIcon='close'
                    onClick={() => setCancelOpen(true)}
                  >
                    ยกเลิกคำขอ
                  </NeutralSubdueButton>
                )),
              }]),
            ]}
            rows={[
              ...(summary.request ? [{ id: 'req', ...summary.request, cancelled: false, note: '—' }] : []),
              ...(cancelledRecord ? [{
                id: 'req-cancelled',
                ...cancelledRecord,
                cancelled: true,
                note: `ยกเลิกเมื่อ ${cancelledRecord.cancelledAt} · ${cancelledRecord.cancelNote}`,
              }] : []),
            ]}
            rowKey={(r) => r.id}
            emptyMessage='ยังไม่มีคำขอตรวจทันตกรรม'
          />
          </div>
        </>
      ) : null}

      {summary.hasAny ? (
        <>
          {showSummaryRow && (
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-500)' }}>
              <InfoPair label='รับบริการทันตกรรมล่าสุด' value={summary.lastServiceLabel} />
              <InfoPair label='ทันตแพทย์/ผู้ทำหัตถการ' value={summary.dentist} minWidth={200} />
              <InfoPair
                label='ระยะเวลาตั้งแต่ครั้งล่าสุด'
                value={summary.monthsSinceLast === null ? '—'
                  : summary.monthsSinceLast < 1 ? 'ภายในเดือนนี้'
                    : `${summary.monthsSinceLast} เดือน`}
                minWidth={140}
              />
            </div>
          )}

          {summary.diagnoses.length > 0 && (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-100)' }}>
              <Label>การวินิจฉัยทางทันตกรรมล่าสุด</Label>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                {summary.diagnoses.map((d) => (
                  <ColorfulBadge key={d.code} style='teal' size='small' hierarchy='secondary' width='hug'>
                    {`${d.code} · ${d.name}`}
                  </ColorfulBadge>
                ))}
              </div>
            </div>
          )}

          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <SubSectionTitle>ตรวจแล้ว</SubSectionTitle>
          <Table
            columns={[
              /* วันที่ตรวจมาเป็นคอลัมน์แรก (มติผู้ใช้ 30 ส.ค. 69) — ตารางนี้อ่าน
                 เป็นไทม์ไลน์ ไม่ใช่รายการหัตถการลอย ๆ */
              { key: 'date', label: 'วันที่ตรวจ', flex: true, minWidth: 120 },
              { key: 'name', label: 'รายการบริการ/หัตถการ', flex: true, minWidth: 220 },
              { key: 'codes', label: 'รหัสมาตรฐาน', flex: true, minWidth: 220 },
              { key: 'toothLabel', label: 'ตำแหน่งฟัน', flex: true, minWidth: 110 },
              { key: 'amount', label: 'จำนวน (หน่วยนับ)', flex: true, minWidth: 130 },
              { key: 'dentist', label: 'ผู้ทำหัตถการ', flex: true, minWidth: 170 },
              {
                key: 'status',
                label: 'สถานะ',
                sortable: false,
                minWidth: 120,
                render: () => (
                  <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>
                    ตรวจแล้ว
                  </ColorfulBadge>
                ),
              },
              { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 220 },
            ]}
            rows={serviceRows}
            emptyMessage='ยังไม่มีรายการบริการทันตกรรม'
          />
          </div>
        </>
      ) : (
        <Note tone='warning' icon='warning'>
          ยังไม่พบประวัติการตรวจสุขภาพช่องปากของผู้รับบริการรายนี้ในระบบ
        </Note>
      )}


      <Popup
        open={askOpen}
        onClose={() => setAskOpen(false)}
        size='large'
        title='ส่งตรวจทันตกรรม'
        subtitle='คำขอนี้จะไปแสดงในคิวทันตกรรมให้ทันตแพทย์ดึงเข้าตรวจ ไม่ได้เปิด Visit ใหม่ให้ผู้รับบริการ'
        primaryAction={{ label: 'ส่งตรวจ', onClick: submit, disabled: !reason.trim() }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setAskOpen(false) }}
      >
        {/* แถบผู้รับบริการพื้นอ่อนแบบเดียวกับป๊อปอัป "ยืนยันรับผู้ป่วย"
            (มติผู้ใช้ 30 ส.ค. 69) — เดิมมีแค่ชื่อกับ HN เป็นข้อความใน subtitle
            ซึ่งอ่านข้ามง่าย ทั้งที่นี่คือจุดที่ต้องมั่นใจว่าส่งตรวจให้ "คนนี้"
            กว้างเต็มความกว้างของกล่องเหตุผลด้านล่าง */}
        <div className='w-full'>
          <PatientSummaryCard
            avatarUrl={cardPatient?.avatarUrl}
            avatarAlt={cardPatient?.fullName || patientName}
            cells={[
              { label: 'ชื่อ-นามสกุล', value: cardPatient?.fullName || patientName || 'ผู้รับบริการ' },
              { label: 'HN', value: hn || '—' },
              { label: 'อายุ/เพศ', value: [cardPatient?.age, cardPatient?.sex].filter(Boolean).join(' · ') || '—' },
            ]}
          />
        </div>

        <SuggestibleTextarea
          label='เหตุผลที่ส่งตรวจ'
          required
          value={reason}
          onChange={(e) => setReason(e?.target ? e.target.value : e)}
          rows={4}
          placeholder='ระบุสิ่งที่พบระหว่างให้บริการ เช่น พบฟันผุหลายซี่ เหงือกบวม'
          suggestions={DENTAL_CHECK_REASON_SUGGESTIONS}
          minChars={2}
          voice
        />
      </Popup>

      <Popup
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        size='large'
        title='ยกเลิกคำขอส่งตรวจทันตกรรม'
        subtitle='คำขอจะถูกถอนออกจากคิวทันตกรรม'
        tertiaryAction={{ label: 'ไม่ยกเลิก', onClick: () => setCancelOpen(false) }}
        primaryAction={{ label: 'ยืนยันยกเลิกคำขอ', onClick: confirmCancel }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <PatientSummaryCard
            avatarUrl={cardPatient?.avatarUrl}
            avatarAlt={cardPatient?.fullName || patientName}
            cells={[
              { label: 'ชื่อ-นามสกุล', value: cardPatient?.fullName || patientName || 'ผู้รับบริการ' },
              { label: 'HN', value: hn || '—' },
              { label: 'ส่งคำขอเมื่อ', value: summary.request?.requestedAt || '—' },
            ]}
          />
          <Label>เหตุผลที่ส่งตรวจ</Label>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
            {summary.request?.reason || '—'}
          </span>
          {/* เหตุผลที่ยกเลิกถูกเก็บเป็นหมายเหตุของแถวในตาราง — ถ้าไม่ระบุ
              ระบบใส่เหตุผลตั้งต้นให้ เพื่อไม่ให้มีใบยกเลิกที่ไม่มีที่มา */}
          <SuggestibleTextarea
            label='เหตุผลที่ยกเลิก'
            value={cancelReason}
            onChange={(e) => setCancelReason(e?.target ? e.target.value : e)}
            rows={3}
            placeholder='ระบุเหตุผลที่ยกเลิกคำขอ'
            suggestions={DENTAL_CANCEL_REASONS}
            minChars={2}
          />
        </div>
      </Popup>

      <SuccessPopup
        open={successOpen}
        title='ส่งตรวจทันตกรรมแล้ว'
        description={`คำขอของ${cardPatient?.fullName || patientName || 'ผู้รับบริการ'}${hn ? ` (HN ${hn})` : ''} เข้าคิวทันตกรรมแล้ว ทันตแพทย์จะดึงเข้าตรวจจากคิวโดยไม่ต้องเปิด Visit ใหม่`}
        onClose={() => setSuccessOpen(false)}
      />
    </div>
  );
};

export default CarriedDentalPanel;
