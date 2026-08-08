import React from 'react';
import Switch from '@/components/switch/Switch';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import Icon from '@/components/icons/Icon';
import Barcode128 from '@/components/lab/Barcode128';
import {
  CHECKUP_CENTER, CHECKUP_ITEM_GROUPS, REPORT_SECTIONS, REF_SOURCES,
  visitItems, visitRefOverrides, interpretValue, computeBmi, bmiBand,
  collectAbnormalFindings, formatRange, formatThaiDate, formatThaiDateTime,
  getPackage,
} from '@/data/checkupStore';
import { SectionHeader, SubCard, ReadField, EmptyState } from '@/pages/checkup/CheckupUi';

/* CheckupOnePageReport — TOR 1.19.21 "Health Reporting Automation".

   Two new module-scoped components, reported through the manifest:

   • ReportSectionEditor — a light editor rail that lets the physician reorder
     and hide/show report sections. Nothing in the design system does ordered
     visibility control (Table's drag-reorder moves DATA rows inside a worklist;
     this reorders DOCUMENT sections and toggles their visibility), so it is
     built here from Switch + icon buttons + token chrome.

   • OnePageReport — the generated one-page document itself. It follows the
     LabPatientReport layout idea (header · identity · result blocks · footer
     with signature/stamp) but is written for checkup content and honours the
     editor's order/visibility, the ฉบับร่าง watermark, and the authorize stamp.
     LabPatientReport is not imported: it is owned by the lab module and its
     content model is lab-order-shaped. */

/* ── editor rail ─────────────────────────────────────────────────── */

export const ReportSectionEditor = ({ report, onChange, locked }) => {
  const order = report.sectionOrder && report.sectionOrder.length
    ? report.sectionOrder
    : REPORT_SECTIONS.map((s) => s.key);

  const move = (key, dir) => {
    const idx = order.indexOf(key);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= order.length) return;
    const copy = [...order];
    copy.splice(idx, 1);
    copy.splice(next, 0, key);
    onChange({ sectionOrder: copy });
  };

  const toggle = (key, visible) => onChange({
    hidden: { ...(report.hidden || {}), [key]: !visible },
  });

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <SectionHeader
        icon='tune'
        title='จัดรูปแบบรายงาน'
        subtitle='จัดลำดับหัวข้อและเลือกซ่อน/แสดงแต่ละส่วน — หัวข้อที่ล็อกไว้ต้องมีในรายงานทุกฉบับ'
      />
      {order.map((key, idx) => {
        const section = REPORT_SECTIONS.find((s) => s.key === key);
        if (!section) return null;
        const visible = !(report.hidden || {})[key];
        return (
          <div
            key={key}
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-300)',
              background: visible ? 'var(--surface-card-100)' : 'var(--surface-card-200, #FDFDFD)',
              border: 'var(--dim-stroke-100) solid var(--border-neutral-tertiary, #E2E4E6)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              paddingTop: 'var(--dim-space-200)',
              paddingBottom: 'var(--dim-space-200)',
              paddingLeft: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-300)',
            }}
          >
            <span
              className='inline-flex items-center justify-center shrink-0'
              style={{
                width: 'var(--dim-size-500, 24px)',
                height: 'var(--dim-size-500, 24px)',
                borderRadius: 'var(--dim-radius-full)',
                background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                color: 'var(--text-brandPrimary-default, #007549)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
              }}
            >
              {idx + 1}
            </span>
            <span
              className='flex-1 min-w-0'
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                color: visible ? 'var(--text-content-default, #363B3F)' : 'var(--text-content-tertiary, #858C92)',
              }}
            >
              {section.label}
            </span>
            {section.locked ? (
              <ColorfulBadge style='grey' size='small' hierarchy='secondary' icon='lock'>บังคับแสดง</ColorfulBadge>
            ) : (
              <Switch
                checked={visible}
                disabled={locked}
                onChange={(v) => toggle(key, v)}
                aria-label={visible ? `ซ่อนส่วน ${section.label}` : `แสดงส่วน ${section.label}`}
              />
            )}
            <BrandSubdueIconButton
              variant='outline'
              size='sm'
              icon='arrow_upward'
              disabled={locked || idx === 0}
              aria-label={`เลื่อน ${section.label} ขึ้น`}
              onClick={() => move(key, -1)}
            />
            <BrandSubdueIconButton
              variant='outline'
              size='sm'
              icon='arrow_downward'
              disabled={locked || idx === order.length - 1}
              aria-label={`เลื่อน ${section.label} ลง`}
              onClick={() => move(key, 1)}
            />
          </div>
        );
      })}
    </div>
  );
};

/* ── the document ────────────────────────────────────────────────── */

const DocRow = ({ label, value, verdict, refInfo }) => (
  <div
    className='flex items-center w-full'
    style={{
      gap: 'var(--dim-space-300)',
      borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
      paddingTop: 'var(--dim-space-150)',
      paddingBottom: 'var(--dim-space-150)',
    }}
  >
    <span className='flex-1 min-w-0' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
      {label}
    </span>
    <span
      style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontVariantNumeric: 'tabular-nums',
        color: verdict === 'abnormal' ? 'var(--text-alert-error, #B91C1C)' : 'var(--text-content-default, #363B3F)',
        minWidth: 'var(--dim-size-2100, 160px)',
        textAlign: 'right',
      }}
    >
      {value}
    </span>
    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)', minWidth: 'var(--dim-size-2450, 280px)' }}>
      {refInfo}
    </span>
    <span style={{ minWidth: 'var(--dim-size-2100, 160px)' }}>
      {verdict === 'abnormal'
        ? <ColorfulBadge style='red' size='small' hierarchy='secondary'>ผิดปกติ</ColorfulBadge>
        : verdict === 'normal'
          ? <ColorfulBadge style='green' size='small' hierarchy='secondary'>ปกติ</ColorfulBadge>
          : <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', fontSize: 'var(--type-size-xs, 12px)' }}>—</span>}
    </span>
  </div>
);

const DocSection = ({ title, children }) => (
  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
    <span
      style={{
        fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        color: 'var(--text-brandPrimary-default, #007549)',
        borderBottom: 'var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        paddingBottom: 'var(--dim-space-100)',
      }}
    >
      {title}
    </span>
    {children}
  </div>
);

export const OnePageReport = ({ visit, record, report, patient }) => {
  if (!visit || !record) {
    return (
      <EmptyState
        icon='description'
        title='ยังไม่มีผลตรวจสำหรับสร้างรายงาน'
        subtitle='บันทึกผลตรวจสุขภาพให้ครบก่อน ระบบจะสร้างรายงานผลหน้าเดียวให้อัตโนมัติ'
      />
    );
  }

  const overrides = visitRefOverrides(visit);
  const items = visitItems(visit);
  const findings = collectAbnormalFindings(visit, record);
  const bmi = computeBmi(record.vitals?.weight, record.vitals?.height);
  const band = bmiBand(bmi);
  const hidden = report.hidden || {};
  const order = report.sectionOrder && report.sectionOrder.length
    ? report.sectionOrder
    : REPORT_SECTIONS.map((s) => s.key);
  const isDraft = report.status !== 'authorized' && report.status !== 'sent';

  const numericRow = (code, label, value) => {
    const verdict = interpretValue(code, value, overrides);
    return (
      <DocRow
        key={code}
        label={label}
        value={value === '' || value == null ? '—' : `${value}${verdict.unit ? ` ${verdict.unit}` : ''}`}
        verdict={verdict.status === 'empty' ? null : verdict.status}
        refInfo={verdict.range
          ? `ค่าอ้างอิง ${formatRange(verdict.range)} · ที่มา ${REF_SOURCES[verdict.source]?.short || '—'}`
          : 'ยังไม่ตั้งเกณฑ์แปลผล'}
      />
    );
  };

  const groupRows = (groupKey) => items
    .filter((i) => i.group === groupKey)
    .map((item) => {
      const value = record.results?.[item.code] ?? '';
      if (item.resultType === 'numeric') return numericRow(item.code, item.name, value);
      const empty = value === '' || value == null;
      const isNormal = !empty && /ปกติ|^ลบ|Negative|Non-reactive|ไม่พบรอยโรค|ไม่พบความผิดปกติ/i.test(String(value));
      return (
        <DocRow
          key={item.code}
          label={item.name}
          value={empty ? '—' : String(value)}
          verdict={empty ? null : (isNormal ? 'normal' : 'abnormal')}
          refInfo={item.resultType === 'choice' ? 'แปลผลจากตัวเลือก' : 'สรุปผลโดยแพทย์ผู้อ่านผล'}
        />
      );
    });

  const sectionBody = {
    identity: (
      <DocSection title='ข้อมูลผู้รับบริการและชุดตรวจ'>
        <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-500)' }}>
          <ReadField label='HN' value={visit.hn} minWidth={110} />
          <ReadField label='ชื่อ-นามสกุล' value={patient?.fullName || visit.name} minWidth={220} />
          <ReadField label='เพศ / อายุ' value={`${visit.sex || '—'} · ${visit.age || '—'} ปี`} minWidth={140} />
          <ReadField label='สิทธิการรักษา' value={visit.rights} minWidth={260} />
          <ReadField label='โปรแกรมตรวจ' value={`${visit.programName} (ครั้งที่ ${visit.round || 1})`} minWidth={320} />
          <ReadField label='ชุดตรวจ' value={`${getPackage(visit.packageId)?.code || '—'} — ${getPackage(visit.packageId)?.name || ''}`} minWidth={360} />
          <ReadField label='วันที่ตรวจ' value={`${formatThaiDate(visit.visitDate)} · ${visit.visitTime}`} minWidth={220} />
          <ReadField label='แพทย์ผู้ตรวจ' value={visit.doctor} minWidth={190} />
        </div>
      </DocSection>
    ),
    vitals: (
      <DocSection title='สัญญาณชีพ / BMI / รอบเอว / สายตา'>
        {numericRow('SBP', 'ความดันโลหิตตัวบน (SBP)', record.vitals?.sbp)}
        {numericRow('DBP', 'ความดันโลหิตตัวล่าง (DBP)', record.vitals?.dbp)}
        <DocRow
          label='น้ำหนัก / ส่วนสูง'
          value={record.vitals?.weight ? `${record.vitals.weight} กก. / ${record.vitals.height} ซม.` : '—'}
          verdict={null}
          refInfo='ใช้คำนวณดัชนีมวลกาย'
        />
        {bmi != null ? numericRow('BMI', `ดัชนีมวลกาย (BMI) — ${band?.label || ''}`, bmi) : null}
        {numericRow(visit.sex === 'หญิง' ? 'WAIST_F' : 'WAIST_M', 'รอบเอว', record.vitals?.waist)}
        <DocRow
          label='สายตา (ซ้าย / ขวา)'
          value={record.vitals?.visionL ? `${record.vitals.visionL} / ${record.vitals.visionR}` : '—'}
          verdict={null}
          refInfo='Snellen chart'
        />
      </DocSection>
    ),
    lab: (
      <DocSection title='ผลตรวจทางห้องปฏิบัติการ'>
        {groupRows('lab').length > 0
          ? groupRows('lab')
          : <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>ไม่มีรายการตรวจทางห้องปฏิบัติการในชุดตรวจนี้</span>}
      </DocSection>
    ),
    imaging: (
      <DocSection title='ผลตรวจรังสีและคลื่นไฟฟ้าหัวใจ'>
        {[...groupRows('radiology'), ...groupRows('other').filter((n) => n.key === 'EKG')].length > 0
          ? [...groupRows('radiology'), ...groupRows('other').filter((n) => n.key === 'EKG')]
          : <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>ไม่มีรายการตรวจรังสีหรือ EKG ในชุดตรวจนี้</span>}
      </DocSection>
    ),
    other: (
      <DocSection title='รายการตรวจอื่นๆ และหัตถการ'>
        {[...groupRows('other').filter((n) => n.key !== 'EKG'), ...groupRows('procedure')].length > 0
          ? [...groupRows('other').filter((n) => n.key !== 'EKG'), ...groupRows('procedure')]
          : <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>ไม่มีรายการตรวจอื่นๆ ในชุดตรวจนี้</span>}
      </DocSection>
    ),
    physical: (
      <DocSection title='ผลการตรวจร่างกาย'>
        <DocRow
          label='สรุปผลการตรวจร่างกายโดยแพทย์'
          value={record.physical?.overall === 'abnormal' ? 'ผิดปกติ' : 'ปกติ'}
          verdict={record.physical?.overall === 'abnormal' ? 'abnormal' : 'normal'}
          refInfo={record.physical?.detail || 'ไม่มีรายละเอียดเพิ่มเติม'}
        />
      </DocSection>
    ),
    summary: (
      <DocSection title='สรุปผลและข้อแนะนำ'>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
            สรุปผลการตรวจ
          </span>
          {record.summaryVerdict === 'abnormal'
            ? <ColorfulBadge style='red' size='small' hierarchy='secondary'>ผิดปกติ</ColorfulBadge>
            : <ColorfulBadge style='green' size='small' hierarchy='secondary'>ปกติ</ColorfulBadge>}
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {`พบรายการผิดปกติ ${findings.length} รายการ`}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', whiteSpace: 'pre-wrap', color: 'var(--text-content-default, #363B3F)' }}>
          {report.summaryText || record.summaryText || 'ไม่มีสรุปผล'}
        </span>
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            whiteSpace: 'pre-wrap',
            color: 'var(--text-content-secondary, #636B72)',
          }}
        >
          {report.adviceText || record.adviceText || 'ไม่มีข้อแนะนำ'}
        </span>
      </DocSection>
    ),
  };

  return (
    <div
      className='w-full flex flex-col'
      style={{
        position: 'relative',
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100) solid var(--border-neutral-tertiary, #E2E4E6)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        paddingTop: 'var(--dim-space-600)',
        paddingBottom: 'var(--dim-space-600)',
        paddingLeft: 'var(--dim-space-600)',
        paddingRight: 'var(--dim-space-600)',
        gap: 'var(--dim-space-500)',
        overflow: 'hidden',
      }}
    >
      {isDraft ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: '42%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-24deg)',
            fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
            fontSize: 'var(--type-size-6xl, 60px)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            color: 'var(--text-content-quaternary, #ADB2B7)',
            opacity: 0.18,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 1,
          }}
        >
          ฉบับร่าง — ยังไม่อนุมัติ
        </span>
      ) : null}

      <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-400)', position: 'relative', zIndex: 2 }}>
        <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
          <span style={{ fontFamily: 'var(--type-family-heading-content, var(--type-family-body))', fontSize: 'var(--type-size-lg, 18px)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))', color: 'var(--text-content-default, #363B3F)' }}>
            รายงานผลการตรวจสุขภาพ (ฉบับผู้รับบริการ)
          </span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
            {`${CHECKUP_CENTER} · สำนักอนามัย กรุงเทพมหานคร`}
          </span>
        </div>
        <div className='flex flex-col items-end' style={{ gap: 'var(--dim-space-150)' }}>
          <Barcode128 value={visit.orderNo} height={36} showText />
        </div>
      </div>

      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)', position: 'relative', zIndex: 2 }}>
        {order.map((key) => {
          const section = REPORT_SECTIONS.find((s) => s.key === key);
          if (!section) return null;
          if (hidden[key] && !section.locked) return null;
          return <React.Fragment key={key}>{sectionBody[key]}</React.Fragment>;
        })}
      </div>

      <div
        className='flex items-start flex-wrap w-full'
        style={{
          gap: 'var(--dim-space-600)',
          position: 'relative',
          zIndex: 2,
          paddingTop: 'var(--dim-space-400)',
          borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        }}
      >
        <ReadField label='แพทย์ผู้ตรวจ' value={visit.doctor} minWidth={200} />
        <ReadField label='ผู้บันทึกผลตรวจ' value={record.savedBy} minWidth={200} />
        <ReadField label='วันเวลาที่บันทึกผล' value={formatThaiDateTime(record.savedAt)} minWidth={240} />
        {report.status === 'authorized' || report.status === 'sent' ? (
          <SubCard tone='success' style={{ flex: '1 1 320px' }}>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <Icon name='verified' size={18} />
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)' }}>
                อนุมัติรายงานแล้ว
              </span>
            </div>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
              {`อนุมัติโดย ${report.authorizedBy} · ${formatThaiDateTime(report.authorizedAt)}`}
            </span>
            {report.status === 'sent' ? (
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
                {`ส่งถึงผู้รับบริการทาง ${report.sentChannel} · ${formatThaiDateTime(report.sentAt)}`}
              </span>
            ) : null}
          </SubCard>
        ) : (
          <SubCard tone='warning' style={{ flex: '1 1 320px' }}>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <Icon name='pending' size={18} />
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
                {report.status === 'pending' ? 'รอแพทย์อนุมัติรายงาน' : 'ฉบับร่าง — ยังไม่ส่งให้แพทย์อนุมัติ'}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
              รายงานที่ยังไม่อนุมัติจะพิมพ์ด้วยลายน้ำ "ฉบับร่าง" และยังส่งถึงผู้รับบริการไม่ได้
            </span>
          </SubCard>
        )}
      </div>

      <span
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xxs, 10px)',
          color: 'var(--text-content-tertiary, #858C92)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {`รายงานนี้ถูกสร้างโดยระบบอัตโนมัติจากผลตรวจในระบบงานตรวจสุขภาพ · จำนวนรายการตรวจทั้งหมด ${items.length} รายการ · กลุ่มรายการ ${CHECKUP_ITEM_GROUPS.length} กลุ่ม`}
      </span>
    </div>
  );
};

export default OnePageReport;
