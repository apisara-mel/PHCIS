import React, { useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
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

const STATUS_BADGE = {
  current: { style: 'green', label: 'ตรวจฟันแล้วในรอบนี้' },
  due: { style: 'orange', label: 'เกิน 6 เดือน — ควรตรวจซ้ำ' },
  never: { style: 'grey', label: 'ยังไม่เคยตรวจสุขภาพช่องปาก' },
  requested: { style: 'blue', label: 'ส่งตรวจทันตกรรมแล้ว — รอทันตแพทย์' },
};

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
  title = 'ผลการตรวจทันตกรรม (จากหน้าทันตกรรม)',
  readOnly = false,
}) => {
  /* bump ทำให้ summary คำนวณใหม่หลังส่ง/ยกเลิกคำขอ — สถานะเก็บใน
     sessionStorage จึงไม่มี subscription ให้ฟัง */
  const [bump, setBump] = useState(0);
  const [askOpen, setAskOpen] = useState(false);
  const [reason, setReason] = useState('');

  const summary = useMemo(() => getDentalCarrySummary(hn), [hn, bump]);
  const badge = STATUS_BADGE[summary.status] || STATUS_BADGE.never;

  const serviceRows = useMemo(() => {
    if (summary.procedures.length) {
      return summary.procedures.map((p) => ({
        ...p,
        toothLabel: p.teeth.length ? toothListLabelOf(p.teeth) : 'ทั้งปาก',
        amount: `${p.quantity} ${p.unit}`,
      }));
    }
    return summary.ledger.map((r) => ({
      id: r.id,
      name: r.procedure,
      toothLabel: `#${r.toothId}`,
      amount: r.surfaces?.length ? `${r.surfaces.length} ด้าน` : '1 ครั้ง',
      date: r.date,
      dentist: r.dentist,
    }));
  }, [summary]);

  const submit = () => {
    requestDentalCheck(hn, { from, fromLabel, reason, patientName });
    setAskOpen(false);
    setReason('');
    setBump((n) => n + 1);
  };

  return (
    <div
      className='flex flex-col w-full min-w-0'
      style={{
        gap: 'var(--dim-space-300)',
        paddingTop: 'var(--dim-space-400)',
        paddingBottom: 'var(--dim-space-400)',
        paddingLeft: 'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-400)',
        border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
        background: 'var(--surface-card-100, #FFFFFF)',
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
        <ColorfulBadge style={badge.style} size='small' hierarchy='secondary' width='hug'>
          {badge.label}
        </ColorfulBadge>
      </div>

      <Note icon='lock'>
        แผงนี้อ่านอย่างเดียว — ผลตรวจฟันบันทึกที่หน้าทันตกรรมที่เดียว
        คลินิกส่งเสริมไม่ต้องเปิด Visit ทันตกรรมใหม่เพื่อดูหรือลงข้อมูล
      </Note>

      {summary.hasAny ? (
        <>
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

          <Table
            columns={[
              { key: 'name', label: 'รายการบริการ/หัตถการ', flex: true, minWidth: 240 },
              { key: 'toothLabel', label: 'ตำแหน่งฟัน', flex: true, minWidth: 120 },
              { key: 'amount', label: 'จำนวน (หน่วยนับ)', flex: true, minWidth: 130 },
              { key: 'date', label: 'วันที่', flex: true, minWidth: 120 },
              { key: 'dentist', label: 'ผู้ทำหัตถการ', flex: true, minWidth: 180 },
            ]}
            rows={serviceRows}
            emptyMessage='ยังไม่มีรายการบริการทันตกรรม'
          />
        </>
      ) : (
        <Note tone='warning' icon='warning'>
          ยังไม่พบประวัติการตรวจสุขภาพช่องปากของผู้รับบริการรายนี้ในระบบ
        </Note>
      )}

      {summary.request ? (
        <Note icon='send'>
          {`ส่งตรวจทันตกรรมแล้วเมื่อ ${summary.request.requestedAt} จาก${summary.request.fromLabel} · เหตุผล: ${summary.request.reason} (ผู้ส่ง ${summary.request.requestedBy})`}
          {!readOnly && (
            <NeutralSubdueButton
              size='sm'
              leadingIcon='close'
              onClick={() => { cancelDentalCheckRequest(hn); setBump((n) => n + 1); }}
            >
              ยกเลิกคำขอ
            </NeutralSubdueButton>
          )}
        </Note>
      ) : (!readOnly && (
        <div className='flex w-full'>
          <BrandSubdueButton size='sm' leadingIcon='dentistry' onClick={() => setAskOpen(true)}>
            ส่งตรวจทันตกรรม (ไม่เปิด Visit ใหม่)
          </BrandSubdueButton>
        </div>
      ))}

      <Popup
        open={askOpen}
        onClose={() => setAskOpen(false)}
        size='large'
        title='ส่งตรวจทันตกรรม'
        subtitle={`${patientName || 'ผู้รับบริการ'}${hn ? ` · HN ${hn}` : ''} — คำขอนี้จะไปแสดงในคิวทันตกรรมให้ทันตแพทย์ดึงเข้าตรวจ ไม่ได้เปิด Visit ใหม่ให้ผู้รับบริการ`}
        primaryAction={{ label: 'ส่งตรวจ', onClick: submit, disabled: !reason.trim() }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setAskOpen(false) }}
      >
        <SuggestibleTextarea
          label='เหตุผลที่ส่งตรวจ'
          required
          value={reason}
          onChange={setReason}
          rows={4}
          placeholder='ระบุสิ่งที่พบระหว่างให้บริการ เช่น พบฟันผุหลายซี่ เหงือกบวม'
          suggestions={DENTAL_CHECK_REASON_SUGGESTIONS}
          minChars={2}
          voice
        />
      </Popup>
    </div>
  );
};

export default CarriedDentalPanel;
