import React, { useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';
import {
  bumpVersion,
} from '@/data/consentFormVersion';

/* Version Control ของเทมเพลตแบบฟอร์มความยินยอม — TOR ด.1.1.5.

   VersionHistoryPopup: timeline 5 เวอร์ชัน (mock คละประเภทการแก้ไข) +
   กู้คืนเวอร์ชันเก่า → สร้างเวอร์ชันใหม่จาก snapshot (mock toast). */

export { bumpVersion };

/** Mock 5 ครั้งแก้ไข — คละประเภท (เอกสาร · สิทธิ · ลายเซ็น · อายุความยินยอม ฯลฯ) */
const MOCK_EDIT_TEMPLATES = [
  {
    versionLabel: 'V 1.0',
    date: '5 ตุลาคม 2568',
    editor: 'ลดา ดีงาม',
    summary: 'จัดทำเอกสารฉบับแรกตามแบบสำนักอนามัย — กำหนดโครงสร้าง 4 ข้อและช่องข้อมูลผู้ป่วยพื้นฐาน',
    changes: ['ข้อมูลพื้นฐาน', 'โครงสร้างเอกสาร'],
    changeStyles: ['teal', 'blue'],
  },
  {
    versionLabel: 'V 1.1',
    date: '18 พฤศจิกายน 2568',
    editor: 'นที ทองคำ',
    summary: 'ปรับข้อความข้อ 2 (ความเสี่ยงและภาวะแทรกซ้อน) ตามคำแนะนำนิติกร — ไม่เปลี่ยนโครงสร้าง',
    changes: ['ข้อความเอกสาร'],
    changeStyles: ['purple'],
  },
  {
    versionLabel: 'V 1.2',
    date: '3 มกราคม 2569',
    editor: 'พว.สุชาดา แก้วมณี',
    summary: 'เพิ่ม Group Policy ห้องปฏิบัติการ · งานส่งเสริมสุขภาพ และจำกัดตำแหน่งพยาบาลวิชาชีพ',
    changes: ['Group Policy', 'ตำแหน่งที่เข้าถึงได้'],
    changeStyles: ['green', 'orange'],
  },
  {
    versionLabel: 'V 1.3',
    date: '20 กุมภาพันธ์ 2569',
    editor: 'สมชาย มั่นใจดี',
    summary: 'เปิด e-Signature 3 ช่องทาง (ผู้ป่วย · แพทย์ · พยาน) และเพิ่มช่องผู้แทนผู้เยาว์',
    changes: ['ลายมือชื่อ', 'ช่องข้อมูลผู้ป่วย'],
    changeStyles: ['blue', 'teal'],
  },
  {
    editor: 'พิมพ์ชนก ทองดี',
    summary: 'ปรับอายุความยินยอม 90 → 180 วัน · แก้ถ้อยคำการเพิกถอนให้สอดคล้อง PDPA มาตรา 19',
    changes: ['อายุความยินยอม', 'ข้อความเอกสาร'],
    changeStyles: ['orange', 'purple'],
  },
];

/** สร้าง timeline 5 เวอร์ชัน — เวอร์ชันล่าสุด = record.version */
export const buildVersionHistory = (record) => {
  const currentVersion = record.version || 'V 1.4';
  return MOCK_EDIT_TEMPLATES.map((tpl, i) => {
    const isCurrent = i === MOCK_EDIT_TEMPLATES.length - 1;
    return {
      id: `v-${i}`,
      version: isCurrent ? currentVersion : tpl.versionLabel,
      date: isCurrent ? record.updatedDate : tpl.date,
      editor: tpl.editor,
      summary: tpl.summary,
      changes: tpl.changes,
      changeStyles: tpl.changeStyles,
      status: isCurrent ? 'เผยแพร่ (ปัจจุบัน)' : 'เก็บถาวร',
      isCurrent,
    };
  }).reverse();
};

const LINE = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const CARD_BASE = {
  gap: 'var(--dim-space-200)',
  paddingTop: 'var(--dim-space-400)',
  paddingRight: 'var(--dim-space-500)',
  paddingBottom: 'var(--dim-space-400)',
  paddingLeft: 'var(--dim-space-500)',
  borderRadius: 'var(--dim-radius-400, 12px)',
  boxShadow: 'var(--shadow-card)',
  transition: 'border-color 160ms ease, box-shadow 160ms ease',
};

/** Vertical rail node — current = filled brand + ring; archived = outlined + icon. */
function VersionTimelineNode({ isCurrent, isFirst }) {
  if (isCurrent) {
    return (
      <span
        aria-hidden
        className='inline-flex items-center justify-center shrink-0'
        style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--dim-radius-full)',
          background: 'var(--surface-brandPrimary-default, #007549)',
          border: 'var(--dim-stroke-200, 2px) solid var(--surface-card-100, #FFFFFF)',
          boxShadow: '0 0 0 3px var(--border-brandPrimary-quaternary, #E2F3EB), var(--shadow-card)',
          color: 'var(--text-brandPrimary-on-brand, #FFFFFF)',
          zIndex: 1,
        }}
      >
        <Icon name={isFirst ? 'verified' : 'history'} size={16} />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: 24,
        height: 24,
        borderRadius: 'var(--dim-radius-full)',
        background: 'var(--surface-card-100, #FFFFFF)',
        border: 'var(--dim-stroke-200, 2px) solid var(--border-neutral-tertiary, #E2E4E6)',
        color: 'var(--icon-neutral-secondary, #6B7280)',
        boxShadow: 'var(--shadow-card)',
        zIndex: 1,
      }}
    >
      <Icon name='inventory_2' size={14} />
    </span>
  );
}

/** Connector between nodes — brand tint fades toward neutral down the list. */
function VersionTimelineConnector({ fadeFromBrand = false }) {
  return (
    <span
      aria-hidden
      className='shrink-0'
      style={{
        width: 2,
        flex: 1,
        minHeight: 'var(--dim-space-500, 20px)',
        marginTop: 'var(--dim-space-100)',
        marginBottom: 'var(--dim-space-100)',
        borderRadius: 'var(--dim-radius-full)',
        background: fadeFromBrand
          ? 'linear-gradient(180deg, var(--surface-brandPrimary-default, #007549) 0%, var(--border-brandPrimary-quaternary, #E2F3EB) 45%, var(--border-neutral-tertiary, #E2E4E6) 100%)'
          : 'linear-gradient(180deg, var(--border-neutral-tertiary, #E2E4E6) 0%, var(--border-neutral-quaternary, #F4F5F5) 100%)',
      }}
    />
  );
}

function VersionTimelineCard({ entry, onRestore }) {
  const isCurrent = entry.isCurrent;

  return (
    <article
      className='flex flex-col flex-1 min-w-0'
      style={{
        ...CARD_BASE,
        marginBottom: 'var(--dim-space-400)',
        background: isCurrent
          ? 'linear-gradient(135deg, var(--surface-brandPrimary-quaternary, #F4FBF8) 0%, var(--surface-card-100, #FFFFFF) 72%)'
          : 'var(--surface-card-100, #FFFFFF)',
        border: `var(--dim-stroke-100, 1px) solid ${isCurrent ? 'var(--border-brandPrimary-tertiary, #A2EDDE)' : 'var(--border-neutral-quaternary, #F4F5F5)'}`,
        borderLeft: isCurrent
          ? 'var(--dim-stroke-400, 4px) solid var(--surface-brandPrimary-default, #007549)'
          : undefined,
      }}
    >
      <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <div className='flex items-center flex-wrap flex-1 min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
          <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{entry.version}</ColorfulBadge>
          <ColorfulBadge style={isCurrent ? 'green' : 'grey'} size='small' hierarchy='secondary' width='hug'>
            {entry.status}
          </ColorfulBadge>
        </div>
        <span
          className='inline-flex items-center shrink-0'
          style={{
            gap: 'var(--dim-space-100)',
            padding: 'var(--dim-space-050, 2px) var(--dim-space-200, 8px)',
            borderRadius: 'var(--dim-radius-full)',
            background: 'var(--surface-neutral-quaternary, #F4F5F5)',
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            lineHeight: 1.4,
          }}
        >
          <Icon name='calendar_today' size={12} color='var(--icon-neutral-secondary, #6B7280)' />
          {entry.date}
        </span>
      </div>

      <p style={{ ...LINE, margin: 0, color: 'var(--text-content-default)' }}>{entry.summary}</p>

      {entry.changes?.length > 0 && (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
          {entry.changes.map((label, ci) => (
            <ColorfulBadge
              key={label}
              style={entry.changeStyles?.[ci] || 'grey'}
              size='small'
              hierarchy='secondary'
              width='hug'
            >
              {label}
            </ColorfulBadge>
          ))}
        </div>
      )}

      <div
        className='flex items-center flex-wrap'
        style={{
          gap: 'var(--dim-space-200)',
          paddingTop: 'var(--dim-space-150)',
          borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
        }}
      >
        <span
          className='inline-flex items-center flex-1 min-w-0'
          style={{
            gap: 'var(--dim-space-100)',
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            lineHeight: 1.4,
          }}
        >
          <Icon name='person' size={14} color='var(--icon-neutral-secondary, #6B7280)' />
          {entry.editor}
          {!isCurrent && ' · read-only'}
        </span>
        {!isCurrent && (
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='restore'
            onClick={() => onRestore(entry)}
          >
            กู้คืนเวอร์ชันนี้
          </NeutralSubdueButton>
        )}
      </div>
    </article>
  );
}

export function VersionHistoryPopup({
  open,
  record,
  onClose,
  onCreateVersion,
  onRestoreVersion,
  onToast,
}) {
  const [restoreTarget, setRestoreTarget] = useState(null);
  const entries = useMemo(() => (record ? buildVersionHistory(record) : []), [record]);

  const handleRestoreConfirm = () => {
    if (!record || !restoreTarget) return;
    const nextVersion = bumpVersion(record.version);
    onRestoreVersion?.(record, restoreTarget, nextVersion);
    onToast?.({
      id: Date.now(),
      variant: 'success',
      message: `กู้คืน ${record.code} จาก ${restoreTarget.version} แล้ว — ระบบสร้างเวอร์ชันใหม่ ${nextVersion} รอเผยแพร่`,
    });
    setRestoreTarget(null);
  };

  return (
    <>
      <Popup
        open={open}
        onClose={onClose}
        size='large'
        title='ประวัติเวอร์ชันแบบฟอร์ม'
        subtitle={record ? `${record.code} · ${record.name}` : undefined}
        primaryAction={{ label: 'สร้างเวอร์ชันใหม่', onClick: () => record && onCreateVersion?.(record) }}
        secondaryAction={{ label: 'ปิด', onClick: onClose }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <div
            className='flex items-start'
            style={{
              gap: 'var(--dim-space-200)',
              paddingTop: 'var(--dim-space-300)', paddingRight: 'var(--dim-space-400)',
              paddingBottom: 'var(--dim-space-300)', paddingLeft: 'var(--dim-space-400)',
              background: 'var(--surface-info-tertiary, #DBEAFE)',
              borderRadius: 'var(--dim-radius-300)',
            }}
          >
            <Icon name='info' size={18} color='var(--text-info-default, #1D4ED8)' />
            <span style={{ ...LINE, color: 'var(--text-info-default, #1D4ED8)' }}>
              แก้ไขเทมเพลตที่เผยแพร่แล้วต้อง &ldquo;สร้างเวอร์ชันใหม่&rdquo; เท่านั้น (ห้ามแก้ทับ) —
              กู้คืนเวอร์ชันเก่าจะสร้างเวอร์ชันใหม่จาก snapshot นั้น (record ที่เซ็นเวอร์ชันเก่ายังคงอยู่)
            </span>
          </div>

          <div
            className='flex flex-col w-full'
            style={{
              padding: 'var(--dim-space-400)',
              borderRadius: 'var(--dim-radius-400, 12px)',
              background: 'var(--surface-neutral-quaternary, #F9FAFB)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
            }}
          >
            {entries.map((e, i) => {
              const isLast = i === entries.length - 1;
              return (
                <div key={e.id} className='flex items-stretch min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
                  <div
                    className='flex flex-col items-center shrink-0'
                    style={{ width: 32, paddingTop: 'var(--dim-space-300)' }}
                  >
                    <VersionTimelineNode isCurrent={e.isCurrent} isFirst={i === 0} />
                    {!isLast && (
                      <VersionTimelineConnector fadeFromBrand={e.isCurrent} />
                    )}
                  </div>
                  <VersionTimelineCard entry={e} onRestore={setRestoreTarget} />
                </div>
              );
            })}
          </div>
        </div>
      </Popup>

      <AlertDialog
        open={Boolean(restoreTarget)}
        type='info'
        title='ยืนยันการกู้คืนเวอร์ชันแบบฟอร์ม'
        description={restoreTarget && record
          ? `${record.code} · ${restoreTarget.version} — ระบบจะสร้างเวอร์ชันใหม่ ${bumpVersion(record.version)} จากเนื้อหา snapshot นี้ (ไม่แก้ทับเวอร์ชันที่เผยแพร่แล้ว)`
          : undefined}
        confirmLabel='ยืนยันการกู้คืน'
        cancelLabel='ยกเลิก'
        onConfirm={handleRestoreConfirm}
        onCancel={() => setRestoreTarget(null)}
        onClose={() => setRestoreTarget(null)}
      />
    </>
  );
}

export default VersionHistoryPopup;
