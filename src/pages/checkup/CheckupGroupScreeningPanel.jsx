import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import Checkbox from '@/components/checkbox/Checkbox';
import Switch from '@/components/switch/Switch';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import Icon from '@/components/icons/Icon';
import {
  listTargetGroups, getScreening, saveScreening, listVisits,
} from '@/data/checkupStore';
import {
  SectionHeader, SubCard, EmptyState, NoticeBar, StatTile,
} from '@/pages/checkup/CheckupUi';
import { summariseScreening } from '@/pages/checkup/CheckupScreeningSteps';

/* CheckupGroupScreeningPanel — "บันทึกแบบกลุ่ม" for the 7 screening forms
   (TOR 1.19.7 "บันทึกผลการดำเนินกิจกรรมในรูปแบบกลุ่ม").

   NOT in the design system: no existing component lets a user pick many people
   from a roster and then push one form payload onto all of them while keeping
   per-person overrides visible. Reported via the manifest as a new component.

   Contract:
     • pick a target group → its active members become selectable rows
     • select members (select-all / per-row) → "ใช้ผลชุดนี้กับผู้ที่เลือก"
       writes the CURRENT wizard form to every selected member's visit
     • rows that already have their own screening are flagged so the operator
       sees whose per-person result would be overwritten
     • `perPersonOnly` steps (HIV) are excluded from the group write unless the
       operator explicitly opts in — HIV is ข้อมูลลับ + consent-bound per person */

/* Sections that must never be bulk-applied without an explicit opt-in. */
const CONSENT_BOUND_SECTIONS = ['hiv'];

const CheckupGroupScreeningPanel = ({ form, currentVisit, onApplied }) => {
  const groups = useMemo(() => listTargetGroups().filter((g) => g.status !== 'cancelled'), []);
  const [groupId, setGroupId] = useState(currentVisit?.groupId || groups[0]?.id || '');
  const [selected, setSelected] = useState([]);
  const [includeConsentBound, setIncludeConsentBound] = useState(false);
  const [q, setQ] = useState('');
  const [result, setResult] = useState(null);

  const group = groups.find((g) => g.id === groupId) || null;
  const visits = useMemo(() => listVisits(), [result]);

  const rows = useMemo(() => {
    if (!group) return [];
    return (group.members || [])
      .filter((m) => m.status !== 'cancelled')
      .map((m) => {
        const visit = visits.find((v) => v.hn && v.hn === m.hn) || null;
        const existing = visit ? getScreening(visit.id) : null;
        return {
          ...m,
          visitId: visit?.id || null,
          existing,
          existingSummary: existing ? summariseScreening(existing).join(' · ') : '',
          isCurrent: !!visit && visit.id === currentVisit?.id,
        };
      })
      .filter((r) => {
        if (!q.trim()) return true;
        const needle = q.trim().toLowerCase();
        return [r.name, r.cid, r.hn].some((f) => f && String(f).toLowerCase().includes(needle));
      });
  }, [group, visits, q, currentVisit]);

  const eligible = rows.filter((r) => r.visitId);
  const allSelected = eligible.length > 0 && eligible.every((r) => selected.includes(r.visitId));

  const toggle = (visitId) => setSelected((s) => (s.includes(visitId) ? s.filter((x) => x !== visitId) : [...s, visitId]));
  const toggleAll = () => setSelected(allSelected ? [] : eligible.map((r) => r.visitId));

  const apply = () => {
    const payload = { ...JSON.parse(JSON.stringify(form)) };
    if (!includeConsentBound) {
      CONSENT_BOUND_SECTIONS.forEach((key) => { delete payload[key]; });
    }
    let written = 0;
    let skipped = 0;
    selected.forEach((visitId) => {
      const existing = getScreening(visitId);
      /* Keep whatever the person already has for sections the group write
         excludes, and never overwrite a section the person filled themselves
         with something the group form left blank. */
      const merged = { ...(existing || {}) };
      Object.entries(payload).forEach(([key, value]) => {
        merged[key] = value;
      });
      saveScreening(visitId, merged, { silent: true });
      written += 1;
      if (existing) skipped += 1;
    });
    setResult({ written, overwritten: skipped, at: new Date().toISOString() });
    setSelected([]);
    onApplied?.(written);
  };

  const columns = [
    {
      key: 'pick',
      label: '',
      sortable: false,
      render: (r) => (r.visitId ? (
        <Checkbox
          checked={selected.includes(r.visitId)}
          onChange={() => toggle(r.visitId)}
          aria-label={`เลือก ${r.name}`}
        />
      ) : (
        <span title='สมาชิกรายนี้ยังไม่มีใบสั่งตรวจในวันนี้' style={{ color: 'var(--icon-brandSecondary-quaternary, #ADB2B7)' }}>
          <Icon name='block' size={16} />
        </span>
      )),
    },
    { key: 'hn', label: 'HN', render: (r) => r.hn || '—' },
    {
      key: 'name',
      label: 'ชื่อ-นามสกุล',
      flex: true,
      minWidth: 200,
      render: (r) => (
        <span className='inline-flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
          <MaskedWorklistName name={r.name} recordKey={r.cid} />
          {r.isCurrent ? <ColorfulBadge style='teal' size='small' hierarchy='secondary'>กำลังบันทึกอยู่</ColorfulBadge> : null}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'สถานะการคัดกรอง',
      render: (r) => {
        if (!r.visitId) return <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่มีใบสั่งตรวจ</ColorfulBadge>;
        return r.existing
          ? <ColorfulBadge style='yellow' size='small' hierarchy='secondary' icon='warning'>มีผลรายบุคคลอยู่แล้ว</ColorfulBadge>
          : <ColorfulBadge style='green' size='small' hierarchy='secondary'>ยังไม่มีผลคัดกรอง</ColorfulBadge>;
      },
    },
    {
      key: 'existingSummary',
      label: 'ผลรายบุคคลที่มีอยู่',
      flex: true,
      minWidth: 280,
      sortable: false,
      render: (r) => (r.existingSummary
        ? <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>{r.existingSummary}</span>
        : <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>—</span>),
    },
  ];

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      <SectionHeader
        icon='groups'
        title='บันทึกแบบกลุ่ม'
        subtitle='เลือกสมาชิกหลายคนจากกลุ่มเป้าหมาย แล้วใช้ผลคัดกรองชุดเดียวกัน — ผลรายคนที่ต่างออกไปยังแก้ไขรายบุคคลได้'
      />

      {groups.length === 0 ? (
        <EmptyState
          icon='groups'
          title='ยังไม่มีกลุ่มเป้าหมายที่ใช้งานอยู่'
          subtitle='สร้างกลุ่มเป้าหมายและเพิ่มสมาชิกก่อนใช้โหมดบันทึกแบบกลุ่ม'
        />
      ) : (
        <>
          <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <Select
              label='กลุ่มเป้าหมาย'
              showHelperText={false}
              showLeadingIcon={false}
              size='md'
              options={groups.map((g) => ({ value: g.id, label: `${g.code} — ${g.name}` }))}
              value={groupId}
              onChange={(v) => { setGroupId(typeof v === 'string' ? v : v?.value); setSelected([]); }}
            />
            <InputField
              label='ค้นหาสมาชิก'
              showHelperText={false}
              leadingIcon='search'
              size='md'
              placeholder='ชื่อ / เลขบัตร / HN'
              value={q}
              onChange={(e) => setQ(e?.target ? e.target.value : e)}
            />
          </div>

          <SubCard tone='warning'>
            <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <Switch
                checked={includeConsentBound}
                onChange={setIncludeConsentBound}
                aria-label='รวมแบบคัดกรองที่ต้องขอความยินยอมรายบุคคล'
              />
              <span className='flex-1 min-w-0' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
                รวมแบบคัดกรองที่ต้องขอความยินยอมรายบุคคล (HIV — ข้อมูลลับ §1.4.2)
                <span style={{ display: 'block', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  ปิดไว้เป็นค่าเริ่มต้น เพราะความยินยอมต้องขอจากผู้รับบริการแต่ละคน — เปิดเฉพาะกรณีที่ขอความยินยอมครบทุกคนแล้ว
                </span>
              </span>
            </div>
          </SubCard>

          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <StatTile label='สมาชิกที่เลือกได้' value={eligible.length} unit='ราย' tone='info' icon='groups' />
            <StatTile label='เลือกไว้' value={selected.length} unit='ราย' tone='brand' icon='checklist' />
            <StatTile
              label='มีผลรายบุคคลอยู่แล้ว'
              value={eligible.filter((r) => r.existing && selected.includes(r.visitId)).length}
              unit='ราย'
              tone='warning'
              icon='warning'
            />
          </div>

          {rows.length === 0 ? (
            <EmptyState
              compact
              icon='search_off'
              title='ไม่พบสมาชิกที่ตรงกับคำค้นหา'
              subtitle='ลองล้างคำค้นหา หรือเลือกกลุ่มเป้าหมายอื่น'
              actionLabel='ล้างคำค้นหา'
              onAction={() => setQ('')}
            />
          ) : (
            <>
              <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <NeutralSubdueButton size='sm' leadingIcon={allSelected ? 'deselect' : 'select_all'} onClick={toggleAll}>
                  {allSelected ? 'ยกเลิกการเลือกทั้งหมด' : 'เลือกทั้งหมดที่มีใบสั่งตรวจ'}
                </NeutralSubdueButton>
                <div className='flex-1' />
                <BrandSubdueButton
                  variant='fill'
                  size='md'
                  leadingIcon='content_copy'
                  disabled={selected.length === 0}
                  onClick={apply}
                >
                  {`ใช้ผลชุดนี้กับผู้ที่เลือก (${selected.length})`}
                </BrandSubdueButton>
              </div>

              <Table
                columns={columns}
                rows={rows}
                rowKey={(r) => r.cid}
                stickyColCount={2}
                emptyMessage='ไม่พบสมาชิก'
              />
            </>
          )}

          {eligible.length < rows.length ? (
            <NoticeBar tone='info' icon='info'>
              {`สมาชิก ${rows.length - eligible.length} ราย ยังไม่มีใบสั่งตรวจในระบบ จึงยังใช้ผลแบบกลุ่มไม่ได้ — เปิดใบสั่งตรวจให้ก่อนจากหน้ากลุ่มเป้าหมาย`}
            </NoticeBar>
          ) : null}

          {result ? (
            <NoticeBar tone='success' icon='check_circle'>
              {`บันทึกผลคัดกรองแบบกลุ่มให้ ${result.written} ราย เรียบร้อยแล้ว${result.overwritten > 0 ? ` (ทับผลเดิมของ ${result.overwritten} ราย — แก้รายบุคคลได้ที่หน้าคัดกรองของแต่ละคน)` : ''}`}
            </NoticeBar>
          ) : null}
        </>
      )}
    </div>
  );
};

export default CheckupGroupScreeningPanel;
