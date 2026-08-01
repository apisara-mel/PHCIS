import React, { useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import XrayReportSheet from '@/components/xray/XrayReportSheet';
import { XRAY_ORDERS, withExamLabel } from '@/data/xrayOrders';
import { XRAY_EXAM_BY_ID, claimFor, summariseSelection } from '@/data/xrayCatalog';
import { PATIENT_PROFILES } from '@/data/patientProfiles';
import { XRAY_RADIOLOGIST_BY_ID } from '@/data/xrayResultTemplates';

/* งานรังสีวินิจฉัย — printed paperwork sandbox · /preview/xray-sheets
   Standalone playground for <XrayReportSheet> in all four formats, on real
   mock orders, so the sheets can be reviewed (and actually printed with
   ⌘P) without walking the RIS flows first. Same purpose and shell idiom as
   /preview/cards and /preview/tabs.

   The RIS screens mount the same component: /xray/result prints ใบรายงานผล,
   /xray/order prints ใบส่งตรวจ · ใบนัด · ฉลากติดซองฟิล์ม. */

const CENTER = 'ศูนย์บริการสาธารณสุข 4 ดินแดง';
const PRINTED_AT = '31 กรกฎาคม 2569 · 17:10';

const VARIANTS = [
  { key: 'report', label: 'ใบรายงานผลการตรวจ', hint: 'TOR §1.12.6.5 — impression เป็นพระเอก + ตราประทับประเภทผล' },
  { key: 'request', label: 'ใบส่งตรวจ', hint: 'รายการตรวจ + ราคา/เบิกได้ + ข้อมูลคัดกรองก่อนฉายรังสี' },
  { key: 'appointment', label: 'ใบนัดตรวจ', hint: 'ผู้ป่วยถือ — วัน-เวลาตัวใหญ่ + สิ่งที่ต้องเตรียม' },
  { key: 'filmLabel', label: 'ฉลากติดซองฟิล์ม', hint: '70×40 mm' },
];

/* Pick orders that exercise the interesting states rather than the first
   rows in the array: a verified abnormal read (the stamp), an urgent one
   (double rule + escalation line), an amended one (§1.12.6.3 notice) and a
   reported-but-unverified one (the ฉบับร่าง ghost). */
const pickOrders = () => {
  const rows = XRAY_ORDERS.map(withExamLabel);
  const find = (fn) => rows.find(fn);
  return [
    { caption: 'ยืนยันผลแล้ว · ผิดปกติ', row: find((r) => r.status === 'verified' && r.resultType === 'abnormal') },
    { caption: 'ผิดปกติเร่งด่วน', row: find((r) => r.resultType === 'abnormalUrgent') },
    { caption: 'มีประวัติการแก้ไขผล', row: find((r) => (r.amendments || []).length > 0) },
    { caption: 'บันทึกผลแล้ว ยังไม่ยืนยัน → ลายน้ำ ฉบับร่าง', row: find((r) => r.status === 'reported') },
    { caption: 'นัดตรวจ', row: find((r) => r.status === 'scheduled') },
  ].filter((x) => x.row);
};

const patientFor = (row) => {
  const p = PATIENT_PROFILES.find((x) => x.hn === row?.hn);
  return {
    hn: row?.hn,
    fullName: p?.fullName || p?.name || row?.patient || '—',
    age: p?.age,
    sex: p?.sex || p?.gender,
    rightLabel: row?.rightLabel,
  };
};

/* Line items for the request / appointment formats, derived from the order's
   own exam so the totals on the paper agree with the catalog. */
const itemsFor = (row) => {
  const exam = XRAY_EXAM_BY_ID[row?.examId];
  if (!exam) return [];
  const money = claimFor(exam, row?.rightKey || 'CASH');
  return [{
    id: exam.id,
    name: exam.name,
    code: exam.code,
    regionLabel: row?.regionLabel,
    view: row?.view,
    price: money.price,
    claim: money.claim,
    patientPay: money.patientPay,
    prep: exam.prep,
  }];
};

const Section = ({ title, description, children }) => (
  <section
    className='w-full flex flex-col'
    style={{
      gap: 'var(--dim-space-400)',
      paddingTop: 'var(--dim-space-600)',
      paddingRight: 'var(--dim-space-600)',
      paddingBottom: 'var(--dim-space-600)',
      paddingLeft: 'var(--dim-space-600)',
      background: 'var(--surface-card-100)',
      borderRadius: 'var(--dim-radius-500)',
      boxShadow: 'var(--shadow-card)',
    }}
  >
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
      <h2 style={{
        margin: 0,
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-heading-content)',
        fontSize: 'var(--type-size-base)',
        fontWeight: 'var(--type-weight-bold)',
      }}>
        {title}
      </h2>
      {description ? (
        <p style={{
          margin: 0,
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
        }}>
          {description}
        </p>
      ) : null}
    </div>
    {children}
  </section>
);

const XraySheetsPreviewPage = () => {
  const history = useHistory();
  const location = useLocation();
  /* The format lives in the URL so a specific sheet can be linked, reloaded
     and print-tested directly (`/preview/xray-sheets?variant=request`). */
  const urlVariant = new URLSearchParams(location.search).get('variant');
  const variant = VARIANTS.some((v) => v.key === urlVariant) ? urlVariant : 'report';
  const setVariant = (key) => history.replace(`${location.pathname}?variant=${key}`);
  const orders = useMemo(pickOrders, []);

  return (
    <div
      className='w-full min-h-screen flex flex-col'
      style={{
        gap: 'var(--dim-space-600)',
        paddingTop: 'var(--dim-space-800)',
        paddingRight: 'var(--dim-space-800)',
        paddingBottom: 'var(--dim-space-800)',
        paddingLeft: 'var(--dim-space-800)',
        background: 'var(--background-screen-brand-100, #F4FBF8)',
      }}
    >
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
        <h1 style={{
          margin: 0,
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-heading-content)',
          fontSize: 'var(--type-size-xl)',
          fontWeight: 'var(--type-weight-bold)',
        }}>
          เอกสารพิมพ์ของงานรังสีวินิจฉัย
        </h1>
        <p style={{
          margin: 0,
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
        }}>
          ใบเดียวกันนี้ถูกใช้ใน /xray/result และ /xray/order — กดพิมพ์เพื่อดูผลจริงบนกระดาษ A4
        </p>
        <div>
          <button
            type='button'
            onClick={() => window.print()}
            style={{
              paddingTop: 'var(--dim-space-200)',
              paddingRight: 'var(--dim-space-400)',
              paddingBottom: 'var(--dim-space-200)',
              paddingLeft: 'var(--dim-space-400)',
              borderRadius: 'var(--dim-radius-300)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-default, #007549)',
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              color: 'var(--text-brandPrimary-default, #007549)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-medium)',
              cursor: 'pointer',
            }}
          >
            พิมพ์เอกสารที่แสดงอยู่
          </button>
        </div>
      </div>

      <div
        role='radiogroup'
        aria-label='รูปแบบเอกสาร'
        className='flex items-center flex-wrap'
        style={{ gap: 'var(--dim-space-200)' }}
      >
        {VARIANTS.map((v, i) => {
          const selected = variant === v.key;
          return (
            <button
              key={v.key}
              type='button'
              role='radio'
              aria-checked={selected}
              /* Roving tabindex + arrow keys — a radiogroup that only
                 responds to clicks is a radiogroup in name only (WCAG 2.1.1). */
              tabIndex={selected ? 0 : -1}
              onKeyDown={(e) => {
                const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
                  : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
                if (!step) return;
                e.preventDefault();
                const next = VARIANTS[(i + step + VARIANTS.length) % VARIANTS.length];
                setVariant(next.key);
              }}
              onClick={() => setVariant(v.key)}
              title={v.hint}
              style={{
                paddingTop: 'var(--dim-space-200)',
                paddingRight: 'var(--dim-space-400)',
                paddingBottom: 'var(--dim-space-200)',
                paddingLeft: 'var(--dim-space-400)',
                borderRadius: 'var(--dim-radius-300)',
                border: `var(--dim-stroke-100, 1px) solid ${selected
                  ? 'var(--border-brandPrimary-default, #007549)'
                  : 'var(--border-neutral-tertiary, #E2E4E6)'}`,
                background: selected
                  ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
                  : 'var(--surface-card-100, #FFFFFF)',
                color: selected
                  ? 'var(--text-brandPrimary-default, #007549)'
                  : 'var(--text-content-secondary, #636B72)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                fontWeight: 'var(--type-weight-medium)',
                cursor: 'pointer',
              }}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {/* The appointment sheet only makes sense on an order that HAS a
          นัด, so that format previews the scheduled rows instead. */}
      {(variant === 'appointment'
        ? orders.filter(({ row }) => row.scheduledAt)
        : orders
      ).map(({ caption, row }) => (
        <Section
          key={`${variant}-${row.id}`}
          title={caption}
          description={`เลข XN ${row.xn} · ${row.examLabel}`}
        >
          <div className='mih-xray-print-area w-full flex justify-center'>
            <div style={{
              width: '100%',
              maxWidth: '210mm',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary, #E2E4E6)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              overflow: 'hidden',
            }}>
              <XrayReportSheet
                variant={variant}
                order={{
                  ...row,
                  radiologistLicense: Object.values(XRAY_RADIOLOGIST_BY_ID)
                    .find((d) => d.name === row.radiologist)?.license,
                }}
                patient={patientFor(row)}
                items={itemsFor(row)}
                totals={summariseSelection([row.examId], row.rightKey || 'CASH')}
                center={CENTER}
                printedAt={PRINTED_AT}
              />
            </div>
          </div>
        </Section>
      ))}
    </div>
  );
};

export default XraySheetsPreviewPage;
