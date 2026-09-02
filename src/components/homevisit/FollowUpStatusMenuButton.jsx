import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Popover from '@/components/popup/Popover';
import Popup from '@/components/popup/Popup';
import ActionList from '@/components/list/ActionList';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import {
  findSwMaterial,
  getSwIssues,
  getSwRequesterByHn,
  resolveSwRequestStatus,
} from '@/data/socialWorkSupplies';

/* SubHeader "ติดตามสถานะ" split button (งานเยี่ยมบ้าน)
   ══════════════════════════════════════════════════════════════════
   ทีมเยี่ยมบ้านเป็นคนที่ถูกถามที่บ้านว่า "ผ้าอ้อมรอบหน้าได้เมื่อไหร่" — เดิมต้อง
   ออกจากบันทึกการเยี่ยมไปเปิดหน้าคลังของสังคมสงเคราะห์เอง (มติผู้ใช้ 2 ก.ย. 69)
   ปุ่มนี้จึงเปิดสถานะของโครงการที่ผู้รับบริการเข้าร่วมเป็นป๊อปอัปทับหน้าเดิม

   ตอนนี้มีรายการเดียวคือ "ติดตามโครงการผ้าอ้อม" — โครงการอื่น (นมผง ·
   อาหารทางการแพทย์ · กายอุปกรณ์) เพิ่มเป็นรายการถัดไปในเมนูเดียวกันได้
   ข้อมูลอ่านจากทะเบียนเดียวกับหน้าสังคมสงเคราะห์ (`socialWorkSupplies`)
   ไม่ได้ทำสำเนาชุดใหม่ */

const DIAPER_CATEGORY = 'diaper';

const MENU_ITEMS = [
  { key: 'diaper', label: 'ติดตามโครงการผ้าอ้อม', icon: 'child_care' },
];

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

const InfoRow = ({ label, value }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)', minWidth: 200 }}>
    <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
      {label}
    </span>
    <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
      {value || '—'}
    </span>
  </div>
);

export default function FollowUpStatusMenuButton({ hn, size = 'sm', className = '' }) {
  const routerHistory = useHistory();
  const [open, setOpen] = useState(false);
  const [diaperOpen, setDiaperOpen] = useState(false);
  const triggerRef = useRef(null);
  const [menuWidth, setMenuWidth] = useState(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    setMenuWidth(Math.max(240, Math.round(triggerRef.current.getBoundingClientRect().width)));
  }, [open]);

  const request = useMemo(() => (hn && diaperOpen ? getSwRequesterByHn(hn) : null), [hn, diaperOpen]);

  /* ประวัติการรับของ — เฉพาะหมวดผ้าอ้อม และตัดรายการที่ถูกยกเลิกออก */
  const issues = useMemo(() => {
    if (!hn || !diaperOpen) return [];
    return getSwIssues()
      .filter((r) => r.hn === hn && r.status !== 'cancelled')
      .filter((r) => findSwMaterial(r.materialCode)?.category === DIAPER_CATEGORY)
      .sort((a, b) => String(b.issueDate).localeCompare(String(a.issueDate)));
  }, [hn, diaperOpen]);

  const status = request ? resolveSwRequestStatus(request.status) : null;
  const diaperMaterials = (request?.materials || [])
    .map((code) => findSwMaterial(code))
    .filter((m) => m?.category === DIAPER_CATEGORY);

  return (
    <div className={`inline-flex shrink-0 ${className}`}>
      <BrandSubdueButton
        ref={triggerRef}
        variant='outline'
        size={size}
        leadingIcon='fact_check'
        trailingIcon='expand_more'
        active={open}
        aria-haspopup='menu'
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ติดตามสถานะ
      </BrandSubdueButton>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        style={{
          width: menuWidth ?? 240,
          background: 'var(--surface-dropdown-default)',
          border: 'var(--dim-stroke-100) solid var(--border-dropdown-default)',
          borderRadius: 'var(--dim-radius-500)',
          boxShadow: 'var(--shadow-dropdown)',
          padding: 'var(--dim-space-100)',
          zIndex: 'var(--sm-z-modal-popover, 1450)',
        }}
      >
        <div role='menu' aria-label='ติดตามสถานะ'>
          {MENU_ITEMS.map((item) => (
            <ActionList
              key={item.key}
              as='button'
              role='menuitem'
              label={item.label}
              leadingIcon={item.icon}
              showLeadingIcon
              showSubtext={false}
              showSwitch={false}
              showBadge={false}
              showCheck={false}
              showChevronRight={false}
              onClick={() => {
                setOpen(false);
                if (item.key === 'diaper') setDiaperOpen(true);
              }}
            />
          ))}
        </div>
      </Popover>

      <Popup
        open={diaperOpen}
        onClose={() => setDiaperOpen(false)}
        size='extraLarge'
        title='ติดตามโครงการผ้าอ้อม'
        subtitle='ผ้าอ้อมผู้ใหญ่ · เบิกผ่านงานสังคมสงเคราะห์ของศูนย์บริการ'
        tertiaryAction={{ label: 'ปิด', onClick: () => setDiaperOpen(false) }}
        primaryAction={{
          label: 'ไปหน้าคำขอวัสดุ',
          onClick: () => {
            setDiaperOpen(false);
            routerHistory.push({ pathname: '/clinic/social-work/supplies', state: { hn } });
          },
        }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
          {request ? (
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-600, 24px)' }}>
              <InfoRow label='เลขที่คำขอ' value={request.requestNo} />
              <InfoRow label='วันที่ยื่นคำขอ' value={fmtDate(request.requestDate)} />
              <InfoRow
                label='รายการผ้าอ้อมที่ขอ'
                value={diaperMaterials.map((m) => m.name).join(' · ') || 'ไม่มีรายการผ้าอ้อมในคำขอนี้'}
              />
              <InfoRow label='ผู้รับแทน' value={request.proxyName ? `${request.proxyName} (${request.proxyRelation})` : 'รับด้วยตนเอง'} />
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)', minWidth: 200 }}>
                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  สถานะคำขอ
                </span>
                <ColorfulBadge style={status.style} size='small' width='hug'>{status.label}</ColorfulBadge>
              </div>
              {request.decisionNote && (
                <InfoRow label='หมายเหตุการพิจารณา' value={request.decisionNote} />
              )}
            </div>
          ) : (
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
              ผู้รับบริการรายนี้ยังไม่มีคำขอรับวัสดุในทะเบียนงานสังคมสงเคราะห์ —
              ยื่นคำขอใหม่ได้ที่หน้า “คำขอวัสดุ”
            </span>
          )}

          <Table
            columns={[
              { key: 'issueDate', label: 'วันที่รับ', flex: true, minWidth: 140, render: (r) => fmtDate(r.issueDate) },
              { key: 'material', label: 'รายการ', flex: true, minWidth: 260, render: (r) => findSwMaterial(r.materialCode)?.name || r.materialCode },
              { key: 'qty', label: 'จำนวน', flex: true, minWidth: 110, render: (r) => `${r.qty} ${r.unit || ''}`.trim() },
              { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 240, render: (r) => r.note || '—' },
              { key: 'issuedBy', label: 'ผู้จ่าย', flex: true, minWidth: 220, render: (r) => r.issuedBy || '—' },
            ]}
            rows={issues}
            rowKey={(r) => r.id}
            emptyMessage='ยังไม่มีประวัติการรับผ้าอ้อมของผู้รับบริการรายนี้'
          />
        </div>
      </Popup>
    </div>
  );
}
