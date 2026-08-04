import React, { useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import InputField from '@/components/forms/InputField';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Alert from '@/components/alert/Alert';
import { CLINIC_OPTIONS } from '@/components/layout/HeaderClinicContext';
import { findCenterDetail } from '@/data/centerStore';

/* CenterSwitcherPopup — TOR §1.17.5.4 "สลับศูนย์บริการที่กำลังให้บริการ".

   ประกอบจาก DS เดิมล้วน (Popup + InputField + ColorfulBadge + Alert) — ไม่ใช่
   component ใหม่ของ design system แต่เป็น UI เฉพาะโมดูลผู้ดูแลระบบ.

   กติกาที่หน้าจอต้องบอกผู้ใช้ตรง ๆ (คู่มือ MIS หน้า 1-4 ระบุว่า "ศูนย์บริการ
   สาธารณสุขจะสามารถดูข้อมูลได้เฉพาะข้อมูลของศูนย์ฯ ตัวเองเท่านั้น"): การสลับ
   ศูนย์ = สลับ scope ข้อมูล — คิว, รายงาน, การแจ้งเตือน และหัวกระดาษพิมพ์
   จะเปลี่ยนตามศูนย์ใหม่ทั้งหมด ไม่ใช่แค่เปลี่ยนป้ายชื่อ. */

const RowButton = ({ option, selected, allowed, detail, onSelect }) => (
  <button
    type='button'
    onClick={() => allowed && onSelect(option.value)}
    disabled={!allowed}
    className='flex items-center w-full text-left'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      paddingTop: 'var(--dim-space-300, 12px)',
      paddingBottom: 'var(--dim-space-300, 12px)',
      paddingLeft: 'var(--dim-space-300, 12px)',
      paddingRight: 'var(--dim-space-300, 12px)',
      borderRadius: 'var(--dim-radius-300, 10px)',
      background: selected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
      border: `var(--dim-stroke-100, 1px) solid ${selected ? 'var(--border-brandPrimary-default)' : 'var(--border-input-default)'}`,
      cursor: allowed ? 'pointer' : 'not-allowed',
      opacity: allowed ? 1 : 0.55,
    }}
  >
    <span
      className='shrink-0 inline-flex items-center justify-center'
      style={{
        width: 'var(--dim-size-600, 32px)',
        height: 'var(--dim-size-600, 32px)',
        borderRadius: 'var(--dim-radius-full)',
        background: selected ? 'var(--surface-card-100)' : 'var(--surface-brandPrimary-quaternary)',
        color: 'var(--text-brandPrimary-default)',
      }}
    >
      <Icon name='location_on' size={18} />
    </span>
    <span className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span
        style={{
          color: 'var(--text-content-primary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-medium, 500)',
        }}
      >
        {option.label}
      </span>
      <span
        style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs, 12px)',
        }}
      >
        {allowed
          ? (detail ? `ในเวลา ${detail.hours?.inStart}-${detail.hours?.inEnd} น. · นอกเวลา ${detail.hours?.outStart}-${detail.hours?.outEnd} น.` : 'ศูนย์บริการสาธารณสุข สำนักอนามัย กรุงเทพมหานคร')
          : 'บัญชีของคุณไม่มีสิทธิ์ให้บริการที่ศูนย์นี้'}
      </span>
    </span>
    {selected ? <ColorfulBadge style='green' size='small' icon='check'>กำลังให้บริการ</ColorfulBadge> : null}
    {!allowed ? <Icon name='lock' size={16} /> : null}
  </button>
);

/**
 * @param {object}   props
 * @param {boolean}  props.open
 * @param {string}   props.current        ค่า `hc-N` ของศูนย์ที่กำลังให้บริการ
 * @param {string[]} props.allowedCenters ศูนย์ที่บัญชีนี้มีสิทธิ์สลับไป
 * @param {number}   props.pendingWork    จำนวนงานค้างที่ผูกกับศูนย์เดิม (เตือนก่อนสลับ)
 * @param {Function} props.onConfirm      (value) => void
 * @param {Function} props.onClose
 */
const CenterSwitcherPopup = ({
  open,
  current,
  allowedCenters = [],
  pendingWork = 0,
  onConfirm,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(current);

  React.useEffect(() => {
    if (open) {
      setPicked(current);
      setQuery('');
    }
  }, [open, current]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const allowedFirst = CLINIC_OPTIONS.slice().sort((a, b) => {
      const aa = allowedCenters.includes(a.value) ? 0 : 1;
      const bb = allowedCenters.includes(b.value) ? 0 : 1;
      return aa - bb;
    });
    if (!q) return allowedFirst.slice(0, 24);
    return allowedFirst.filter((c) => c.label.toLowerCase().includes(q) || c.value.includes(q));
  }, [query, allowedCenters]);

  const single = allowedCenters.length <= 1;
  const changed = picked && picked !== current;
  const pickedAllowed = allowedCenters.includes(picked);

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='large'
      title='สลับศูนย์บริการที่กำลังให้บริการ'
      subtitle='เลือกศูนย์ที่ต้องการให้บริการในรอบนี้ — ข้อมูลทุกหน้าจะเปลี่ยนขอบเขตตามศูนย์ที่เลือก'
      tertiaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      primaryAction={{
        label: 'ยืนยันสลับศูนย์',
        onClick: () => onConfirm(picked),
        disabled: !changed || !pickedAllowed,
      }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        {single ? (
          <Alert
            type='info'
            title='บัญชีของคุณสังกัดศูนย์เดียว'
            subtext='ผู้ดูแลระบบต้องเพิ่ม "ศูนย์ที่มีสิทธิ์สลับไป" ในหน้าแก้ไขผู้ใช้ก่อน จึงจะสลับศูนย์ได้'
          />
        ) : null}

        <Alert
          type='warning'
          title='การสลับศูนย์เปลี่ยน "ขอบเขตข้อมูล" ไม่ใช่แค่ชื่อศูนย์'
          subtext={`หลังยืนยัน คิวผู้รับบริการ · รายงานการใช้งาน · การแจ้งเตือน · หัวกระดาษเอกสารที่พิมพ์ จะอ้างอิงศูนย์ใหม่ทั้งหมด${pendingWork > 0 ? ` — ขณะนี้มีงานค้างที่ผูกกับศูนย์เดิมอยู่ ${pendingWork} รายการ` : ''}`}
        />

        <InputField
          label='ค้นหาศูนย์บริการ'
          showLabel
          leadingIcon='search'
          value={query}
          onChange={setQuery}
          placeholder='พิมพ์ชื่อหรือเลขศูนย์ เช่น ดินแดง หรือ 4'
          helperText={`ศูนย์บริการสาธารณสุข สำนักอนามัย กทม. ทั้งหมด ${CLINIC_OPTIONS.length} ศูนย์ · บัญชีนี้มีสิทธิ์ ${allowedCenters.length} ศูนย์`}
        />

        <div
          className='flex flex-col w-full'
          style={{ gap: 'var(--dim-space-200, 8px)', maxHeight: 320, overflowY: 'auto' }}
        >
          {rows.length === 0 ? (
            <div
              className='flex flex-col items-center w-full text-center'
              style={{
                gap: 'var(--dim-space-150, 6px)',
                paddingTop: 'var(--dim-space-600, 24px)',
                paddingBottom: 'var(--dim-space-600, 24px)',
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
              }}
            >
              <Icon name='search_off' size={24} />
              ไม่พบศูนย์ที่ตรงกับคำค้น "{query}"
            </div>
          ) : rows.map((opt) => (
            <RowButton
              key={opt.value}
              option={opt}
              selected={picked === opt.value}
              allowed={allowedCenters.includes(opt.value)}
              detail={findCenterDetail(opt.value)}
              onSelect={setPicked}
            />
          ))}
        </div>

        {picked && !pickedAllowed ? (
          <Alert
            type='error'
            title='สลับไปศูนย์นี้ไม่ได้'
            subtext='บัญชีของคุณไม่มีสิทธิ์ให้บริการที่ศูนย์นี้ — ให้ผู้ดูแลระบบเพิ่มสิทธิ์ศูนย์ในหน้าแก้ไขผู้ใช้ก่อน'
          />
        ) : null}
      </div>
    </Popup>
  );
};

export default CenterSwitcherPopup;
