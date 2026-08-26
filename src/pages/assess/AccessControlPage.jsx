import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import RowMenu from '@/components/overflow/RowActionMenu';
import Switch from '@/components/switch/Switch';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import AlertDialog from '@/components/popup/AlertDialog';
import AccessControlCreatePage from '@/pages/assess/AccessControlCreatePage';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import ASSESS_NAV from '@/pages/assess/assessNav';
import {
  readAccessControls,
  writeAccessControls,
  computeAccessControlStats,
  duplicateAccessControl,
  latestVersion,
  formatVersion,
  APPROVAL_META,
  APPROVAL_DRAFT,
  APPROVAL_PENDING,
  APPROVAL_APPROVED,
  APPROVAL_REJECTED,
  approvalLabel,
  decideApproval,
  isAccessEffective,
  formatDailyWindow,
  usersHoldingTemplate,
  dataScopeLabel,
  PII_MASKED,
} from '@/data/accessControlStore';
import Popup from '@/components/popup/Popup';
import {
  ACCESS_SYSTEMS,
  menuLeafKeys,
  rollupLevel,
  permLabel,
  PERM_NONE,
  PERM_VIEW,
  PERM_MIXED,
} from '@/data/accessMenuCatalog';
import { readAssessUsers } from '@/data/assessUserStore';
import { PHCIS_CURRENT_USER } from '@/data/phcisCurrentUser';
import { readActivities } from '@/data/activityStore';
import { readDepartments } from '@/data/departmentStore';
import { readPositions, sortPositions } from '@/data/positionStore';

/* PHCIS | Assess-control — สิทธิ์การเข้าถึงระบบ list (Figma 4D3nTx53 · 16:43747). */

const breadcrumb = ['สิทธิ์การเข้าถึงระบบ'];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
};

const TEXT_CELL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const AMBULANCE_LOTTIE = '/illustration/ambulance.json';

function EmptyIllustration() {
  const [anim, setAnim] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(AMBULANCE_LOTTIE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setAnim(d); })
      .catch(() => { /* decorative */ });
    return () => { alive = false; };
  }, []);

  if (!anim) {
    return <span style={{ width: 160, height: 160 }} aria-hidden />;
  }
  return (
    <LottieIllustration
      animationData={anim}
      size={160}
      loop
      ariaLabel='ยังไม่มีสิทธิ์การเข้าถึงระบบ'
    />
  );
}

function PolicyBadge({ style, children }) {
  return (
    <ColorfulBadge style={style} size='small' hierarchy='secondary' width='hug'>
      {children}
    </ColorfulBadge>
  );
}

/* คุณลักษณะที่แม่แบบเว้นว่าง = ไม่จำกัด — เดิมวาดเป็นป้ายเปล่าจนดูเหมือน
   ข้อมูลหาย (26 ส.ค. 2569) ตอนนี้บอกตรง ๆ ว่า "ทุก…" */
/* ป๊อปอัปดูสิทธิ์ระดับเมนูของแม่แบบหนึ่ง — อ่านอย่างเดียว
   แสดงเฉพาะระบบ/เมนูที่ "ได้สิทธิ์จริง" เท่านั้น ไม่ไล่ทั้งต้นไม้ให้อ่านยาก
   (26 ส.ค. 2569 มติผู้ใช้ — ย้ายรายละเอียดสิทธิ์ออกจากตารางมาไว้ที่ปุ่มดู) */
function AccessPermissionPopup({ record, onClose }) {
  const permissions = record?.permissions || {};
  const systems = ACCESS_SYSTEMS
    .map((sys) => ({
      key: sys.key,
      label: sys.label,
      menus: sys.menus
        .map((menu) => ({ key: menu.key, label: menu.label, level: rollupLevel(permissions, menuLeafKeys(menu)) }))
        .filter((m) => m.level !== PERM_NONE),
    }))
    .filter((sys) => sys.menus.length > 0);

  const toneOf = (level) => (level === PERM_MIXED ? 'yellow' : (level === PERM_VIEW ? 'blue' : 'green'));
  const labelOfLevel = (level) => (level === PERM_MIXED ? 'กำหนดรายเมนู' : permLabel(level));

  return (
    <Popup
      open={!!record}
      onClose={onClose}
      size='large'
      title='สิทธิ์การเข้าถึงระบบ'
      subtitle={record ? `${record.templateName || 'ไม่มีชื่อแม่แบบ'} · ${formatVersion(latestVersion(record))}` : ''}
      tertiaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        {systems.length === 0 ? (
          <span style={{ ...TEXT_CELL, color: 'var(--text-content-tertiary)' }}>
            แม่แบบนี้ยังไม่ได้ให้สิทธิ์เมนูใดเลย
          </span>
        ) : systems.map((sys) => (
          <div key={sys.key} className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={{ ...TEXT_CELL, fontFamily: 'var(--type-family-heading-graphic2)' }}>{sys.label}</span>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
              {sys.menus.map((m) => (
                <div key={m.key} className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  <span className='truncate' style={{ ...TEXT_CELL, flex: '1 1 auto', minWidth: 0 }}>{m.label}</span>
                  <PolicyBadge style={toneOf(m.level)}>{labelOfLevel(m.level)}</PolicyBadge>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Popup>
  );
}

function AttrCell({ value, style, emptyLabel }) {
  if (value) return <PolicyBadge style={style}>{value}</PolicyBadge>;
  return (
    <span style={{ ...TEXT_CELL, color: 'var(--text-content-tertiary)' }}>{emptyLabel}</span>
  );
}

export default function AccessControlPage() {
  const navigate = useHistory();
  const [records, setRecords] = useState(() => readAccessControls());
  const [createOpen, setCreateOpen] = useState(false);
  const [permView, setPermView] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  /* ทะเบียนบุคลากร — ใช้นับว่าแม่แบบนี้มีคนถือสิทธิ์อยู่กี่คน */
  const [assessUsers] = useState(() => readAssessUsers());
  const [filterPosition, setFilterPosition] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [filterSub, setFilterSub] = useState('');
  const [filterDept, setFilterDept] = useState('');
  /* คทง.13 §1.3 — คิวอนุมัติสิทธิ์ต้องกรองดูได้ว่าอะไรค้างรออนุมัติ */
  const [filterApproval, setFilterApproval] = useState('');
  const [decision, setDecision] = useState(null); // { row, approved }
  const [toast, setToast] = useState(null);

  const persist = useCallback((next) => {
    writeAccessControls(next);
    setRecords(next);
  }, []);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const stats = useMemo(() => computeAccessControlStats(records), [records]);

  const summaryCards = useMemo(() => [
    { key: 'total', icon: 'clipboard-list', color: 'info', value: String(stats.total), label: 'สิทธิ์การเข้าถึงระบบทั้งหมด' },
    { key: 'active', icon: 'clipboard-list', color: 'positive', value: String(stats.active), label: 'สิทธิ์การเข้าถึงระบบที่เปิดใช้งาน' },
    {
      key: 'inactive',
      icon: 'clipboard-list',
      value: String(stats.inactive),
      label: 'สิทธิ์การเข้าถึงระบบที่ปิดใช้งาน',
      tileBg: 'var(--surface-danger-tertiary, #FEE2E2)',
      iconInk: 'var(--text-danger-default, #B91C1C)',
    },
  ], [stats]);

  const activities = useMemo(() => readActivities(), [records]);
  const positions = useMemo(() => sortPositions(readPositions()).filter((p) => p.active !== false), [records]);
  const departments = useMemo(() => readDepartments(), [records]);

  const subActivityOptions = useMemo(() => {
    const subs = activities.flatMap((a) => (a.subActivities || []).map((sub) => ({
      value: sub.id,
      label: sub.name,
    })));
    return subs;
  }, [activities]);

  const filteredRows = useMemo(() => records.filter((r) => {
    if (filterPosition && r.positionId !== filterPosition) return false;
    if (filterActivity && r.activityId !== filterActivity) return false;
    if (filterSub && r.subActivityId !== filterSub) return false;
    if (filterDept && r.departmentId !== filterDept) return false;
    if (filterApproval && (r.approvalStatus || APPROVAL_DRAFT) !== filterApproval) return false;
    return true;
  }), [records, filterPosition, filterActivity, filterSub, filterDept, filterApproval]);

  const hasRecords = records.length > 0;
  const isAllFilters = !filterPosition && !filterActivity && !filterSub && !filterDept && !filterApproval;
  const filtersActive = !isAllFilters;
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setFilterPosition('');
      setFilterActivity('');
      setFilterSub('');
      setFilterDept('');
      setFilterApproval('');
    },
  );

  /* อนุมัติ/ไม่อนุมัติแม่แบบสิทธิ์ — บันทึกผู้อนุมัติและเวลาไว้ตรวจสอบย้อนหลัง */
  const applyDecision = () => {
    if (!decision) return;
    const { row, approved } = decision;
    const next = records.map((r) => (
      r.id === row.id ? decideApproval(r, approved, PHCIS_CURRENT_USER.displayName) : r
    ));
    persist(next);
    setDecision(null);
    showToast(approved
      ? `อนุมัติ "${row.templateName}" แล้ว — สิทธิ์มีผลตามช่วงเวลาที่กำหนด`
      : `บันทึกไม่อนุมัติ "${row.templateName}" แล้ว`);
  };

  /* เรียงแม่แบบด้วยบทบาท → ชื่อแม่แบบ ในตารางเดียว — เดิมแยกตารางย่อยตาม
     Group Policy ทำให้หัวคอลัมน์ซ้ำหลายชุดและเทียบข้ามกลุ่มไม่ได้
     (26 ส.ค. 2569 มติผู้ใช้) */
  const sortedRows = useMemo(() => [...filteredRows].sort((a, b) => (
    String(a.activity || 'ฮ').localeCompare(String(b.activity || 'ฮ'), 'th')
      || String(a.templateName || '').localeCompare(String(b.templateName || ''), 'th')
  )), [filteredRows]);

  const openCreate = () => setCreateOpen(true);
  const openDetail = (row) => navigate.push(`/assess/access-control/${row.id}`);
  /* แก้ไขเปิดเป็นป๊อปอัปชุดเดียวกับ "เพิ่มสิทธิ์" แค่มีข้อมูลเดิมกรอกไว้ให้แล้ว
     (26 ส.ค. 69 มติผู้ใช้) route /:id/edit ยังเข้าได้ตามลิงก์เดิม */
  const openEdit = (row) => setEditRecord(row);

  const applyToggleActive = (id, next) => {
    persist(records.map((r) => (r.id === id ? { ...r, active: next } : r)));
    showToast(next ? 'เปิดใช้งานสิทธิ์การเข้าถึงระบบแล้ว' : 'ปิดใช้งานสิทธิ์การเข้าถึงระบบแล้ว');
  };

  /* ทำสำเนาแม่แบบ — id ใหม่ ชื่อต่อท้าย (สำเนา) และเริ่มนับเวอร์ชันใหม่ที่ v1 */
  const handleDuplicate = (row) => {
    const copy = duplicateAccessControl(row);
    persist([...records, copy]);
    showToast(`ทำสำเนา "${copy.templateName}" แล้ว`);
  };

  const columns = useMemo(() => [
    /* แม่แบบตั้งชื่อไว้ก่อนผูกกิจกรรม ชื่อ+เวอร์ชันจึงเป็นคอลัมน์แรก */
    {
      key: 'template',
      header: 'แม่แบบ',
      sortable: true,
      minWidth: 200,
      /* เลขเวอร์ชันถอดออกจากตาราง 26 ส.ค. 2569 (มติผู้ใช้) — ระบบใช้เวอร์ชัน
         ล่าสุดเสมอ ตัวเลขในทะเบียนจึงเป็นสัญญาณรบกวน ยังดูย้อนหลังได้ที่หน้า
         รายละเอียดและหัวป๊อปอัปตอนแก้ไข */
      render: (row) => <span style={TEXT_CELL}>{row.templateName || 'ไม่มีชื่อแม่แบบ'}</span>,
    },
    /* สิทธิ์กำหนดตาม ตำแหน่ง · บทบาท · แผนก (26 ส.ค. 2569 มติผู้ใช้) —
       คอลัมน์ "ศูนย์บริการ" ถอดออก ศูนย์เป็นขอบเขตข้อมูล ไม่ใช่ตัวกำหนดสิทธิ์ */
    /* คอลัมน์ ศูนย์/สาขา/แผนก/ตำแหน่ง/บทบาท ถอดออก 26 ส.ค. 2569 (มติผู้ใช้) —
       แม่แบบไม่ผูกคุณสมบัติเหล่านี้แล้ว ใครได้ใช้แม่แบบไหนไปเลือกตอนเพิ่มบุคลากร */
    /* คอลัมน์ "สถานะอนุมัติ" ถอดออก 26 ส.ค. 2569 (มติผู้ใช้) — ยังกรองด้วยสถานะ
       ได้จากชิปด้านบน และอนุมัติ/ไม่อนุมัติได้จากเมนู ⋮ ท้ายแถวเหมือนเดิม */
    /* มติ คทง.2/3/4/10/11 — ขอบเขตข้อมูล + การเห็นข้อมูลระบุตัวตน */
    {
      key: 'scope',
      header: 'ขอบเขตข้อมูล',
      minWidth: 180,
      render: (row) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
          <span style={TEXT_CELL}>{dataScopeLabel(row.dataScope)}</span>
          {/* เขียนเต็มคำ ไม่ใช้ตัวย่อ PII — คนอ่านตารางไม่ได้รู้จักคำนี้ทุกคน
              (26 ส.ค. 2569 มติผู้ใช้) */}
          {row.piiVisibility === PII_MASKED ? (
            <PolicyBadge style='yellow'>ปิดบังข้อมูลระบุตัวตน</PolicyBadge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'period',
      header: 'ช่วงเวลาที่มีผล',
      minWidth: 170,
      render: (row) => (
        <span style={TEXT_CELL}>
          {row.effectiveFrom || row.effectiveTo
            ? `${row.effectiveFrom || 'ทันที'} – ${row.effectiveTo || 'ไม่กำหนด'}`
            : 'ไม่กำหนด'}
        </span>
      ),
    },
    {
      key: 'holders',
      header: 'บุคลากรที่ใช้แม่แบบนี้',
      align: 'center',
      minWidth: 180,
      render: (row) => {
        const n = usersHoldingTemplate(row, assessUsers).length;
        return <span style={TEXT_CELL}>{`${n} คน`}</span>;
      },
    },
    {
      key: 'daily',
      header: 'เวลาที่ใช้งานได้',
      minWidth: 150,
      render: (row) => <span style={TEXT_CELL}>{formatDailyWindow(row)}</span>,
    },
    {
      key: 'active',
      header: 'สถานะการใช้งาน',
      render: (row) => (
        <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role='presentation'>
          <Switch
            checked={row.active}
            onChange={(next) => applyToggleActive(row.id, next)}
            aria-label={`สถานะ ${row.templateName || row.activity || 'แม่แบบ'}`}
          />
        </span>
      ),
    },
    {
      key: 'action',
      header: 'การดำเนินการ',
      minWidth: 340,
      render: (row) => (
        <span
          className='inline-flex items-center'
          style={{ gap: 'var(--dim-space-200)' }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role='presentation'
        >
          {/* รายละเอียดสิทธิ์ระดับเมนูยาวเกินกว่าจะยัดเป็นคอลัมน์ — เปิดดูเป็น
              popup แทนตัวเลขสรุป 3 คอลัมน์เดิม (26 ส.ค. 2569 มติผู้ใช้) */}
          <NeutralSubdueButton
            leadingIcon='visibility'
            size='sm'
            onClick={() => setPermView(row)}
          >
            ดูสิทธิ์
          </NeutralSubdueButton>
          <NeutralSubdueButton
            leadingIcon='edit'
            size='sm'
            onClick={() => openEdit(row)}
          >
            แก้ไข
          </NeutralSubdueButton>
          {/* ทำสำเนาเป็นปุ่มเต็ม ไม่ซ่อนใต้เมนู ⋮ — ใช้บ่อยพอ ๆ กับแก้ไข
              เมนู ⋮ จึงเหลือเฉพาะอนุมัติ/ไม่อนุมัติ และโผล่เฉพาะแถวที่รออนุมัติ
              (26 ส.ค. 2569 มติผู้ใช้) */}
          <NeutralSubdueButton
            leadingIcon='content_copy'
            size='sm'
            onClick={() => handleDuplicate(row)}
          >
            ทำสำเนา
          </NeutralSubdueButton>
          {(row.approvalStatus || APPROVAL_DRAFT) === APPROVAL_PENDING ? (
            <RowMenu
              ariaLabel={`ตัวเลือก ${row.templateName || 'แม่แบบ'}`}
              items={[
                /* คทง.13 §1.3 — ผู้มีอำนาจอนุมัติ/ไม่อนุมัติได้จากคิวนี้ */
                { key: 'approve', icon: 'check_circle', label: 'อนุมัติสิทธิ์', onClick: () => setDecision({ row, approved: true }) },
                { key: 'reject', icon: 'cancel', label: 'ไม่อนุมัติ', onClick: () => setDecision({ row, approved: false }) },
              ]}
            />
          ) : null}
        </span>
      ),
    },
  ], [records, assessUsers]);

  const filterOpts = {
    position: [{ value: '', label: 'ทั้งหมด' }, ...positions.map((p) => ({ value: p.id, label: p.name }))],
    activity: [{ value: '', label: 'ทั้งหมด' }, ...activities.map((a) => ({ value: a.id, label: a.name }))],
    sub: [{ value: '', label: 'ทั้งหมด' }, ...subActivityOptions],
    dept: [{ value: '', label: 'ทั้งหมด' }, ...departments.map((d) => ({ value: d.id, label: d.name }))],
    approval: [
      { value: '', label: 'ทั้งหมด' },
      ...[APPROVAL_PENDING, APPROVAL_APPROVED, APPROVAL_DRAFT, APPROVAL_REJECTED]
        .map((s) => ({ value: s, label: approvalLabel(s) })),
    ],
  };

  return (
    <>
      <QueuePageShell
        activeKey='assess-access-control'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='assess-access-control'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        /* ชื่อหน้า + ปุ่มเพิ่มอยู่ใน SubHeader มาตรฐาน — ระยะบนจึงเท่ากันทุกหน้า
           และปุ่มยัง sticky ตอนเลื่อนตาราง (แก้พร้อมกันทุกหน้า 10 ส.ค. 2569) */
        title='สิทธิ์การเข้าถึงระบบ'
        actions={hasRecords ? (
          <BrandButton variant='fill' size='md' leadingIcon='add' onClick={openCreate}>
            เพิ่มสิทธิ์การเข้าถึงระบบ
          </BrandButton>
        ) : undefined}
        headerInfo={hasRecords ? (
          <section
            className='flex flex-col w-full'
            /* ระยะบนเท่ากับหน้าอื่น (26 ส.ค. 2569) — เดิม space-600 ทำให้การ์ดสรุปห่างจากแถวชื่อหน้ากว่าหน้าอื่น 24px */
            style={{ gap: 'var(--dim-space-400)' }}
          >
            <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
              {summaryCards.map((c) => (
                <SummaryCard key={c.key} card={c} variant='panel' />
              ))}
            </div>
          </section>
        ) : null}
      >
        {!hasRecords ? (
          <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)' }}>
            <section
              className='flex flex-col items-center justify-center flex-1 w-full'
              style={{ ...CARD, padding: 'var(--dim-space-900, 48px)', gap: 'var(--dim-space-400)', minHeight: 480 }}
            >
              <EmptyIllustration />
              <span
                style={{
                  color: 'var(--text-brandPrimary-default)',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                ในระบบยังไม่มีการสร้างสิทธิ์การเข้าถึงระบบ
              </span>
              <BrandButton variant='fill' size='lg' leadingIcon='add' onClick={openCreate}>
                เพิ่มสิทธิ์การเข้าถึงระบบ
              </BrandButton>
            </section>
          </div>
        ) : (
          <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}>
            {/* ตัวกรองกับตารางอยู่ในการ์ดขาวใบเดียวกัน (26 ส.ค. 2569) — เดิมแยก
                สองใบทำให้แถวตัวกรองลอยเป็นกล่องของตัวเอง ทั้งที่กรองตารางใบล่าง */}
            <section
              className='w-full flex flex-col'
              style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}
            >
              <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                {/* ชิปตัวกรอง ตำแหน่ง/บทบาท/บทบาทย่อย/แผนก/สถานะอนุมัติ ถอดออก
                    26 ส.ค. 2569 (มติผู้ใช้) — แม่แบบไม่ผูกคุณสมบัติพวกนี้แล้ว
                    ตัวกรองจึงกรองอะไรไม่ได้จริง */}
                <div className='flex-1' />
                <NeutralSubdueButton leadingIcon='ios_share' size='sm' collapseLabelBelow='lg'>
                  นำส่งออกรายงาน
                </NeutralSubdueButton>
              </div>

              <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
                <SmoothFilterResults opaque={resultsOpaque}>
                <Table
                  columns={columns}
                  rows={sortedRows}
                  rowKey={(row) => row.id}
                  onRowClick={openDetail}
                  stickyColCount={1}
                  emptyMessage='ไม่พบสิทธิ์การเข้าถึงระบบ'
                />
                </SmoothFilterResults>

                <BrandDashedAddButton onClick={openCreate}>
                  เพิ่มสิทธิ์การเข้าถึงระบบ
                </BrandDashedAddButton>
              </div>
            </section>
          </div>
        )}
      </QueuePageShell>

      {/* ยืนยันก่อนอนุมัติ/ไม่อนุมัติ — มีผลต่อการเข้าถึงข้อมูลผู้ป่วยจริง */}
      <AlertDialog
        open={!!decision}
        onClose={() => setDecision(null)}
        type={decision?.approved ? 'success' : 'warning'}
        alignment='center'
        title={decision?.approved ? 'อนุมัติสิทธิ์การเข้าถึงระบบ?' : 'ไม่อนุมัติสิทธิ์การเข้าถึงระบบ?'}
        description={decision ? `แม่แบบ "${decision.row.templateName}" — ${dataScopeLabel(decision.row.dataScope)}${decision.row.piiVisibility === PII_MASKED ? ' · ปิดบังข้อมูลระบุตัวตน' : ''}${decision.row.effectiveFrom || decision.row.effectiveTo ? ` · มีผล ${decision.row.effectiveFrom || 'ทันที'} ถึง ${decision.row.effectiveTo || 'ไม่กำหนด'}` : ''}${decision.row.approvalNote ? ` · เหตุผล: ${decision.row.approvalNote}` : ''}` : ''}
        confirmLabel={decision?.approved ? 'อนุมัติ' : 'ไม่อนุมัติ'}
        cancelLabel='ยกเลิก'
        onConfirm={applyDecision}
      />

      {/* ดูสิทธิ์ระดับเมนูของแม่แบบนั้น — อ่านอย่างเดียว แก้ไขที่ปุ่ม "แก้ไข" */}
      <AccessPermissionPopup record={permView} onClose={() => setPermView(null)} />

      {/* แก้ไข — ป๊อปอัปชุดเดียวกัน มีข้อมูลเดิมกรอกไว้ให้แล้ว */}
      {editRecord ? (
        <AccessControlCreatePage
          key={editRecord.id}
          asPopup
          existingId={editRecord.id}
          onClose={() => setEditRecord(null)}
          onSaved={(message) => {
            setRecords(readAccessControls());
            showToast(message || 'บันทึกการแก้ไขสิทธิ์แล้ว');
          }}
        />
      ) : null}

      {/* mount ใหม่ทุกครั้งที่เปิด ฟอร์มจะได้เริ่มจากว่างเสมอ */}
      {createOpen ? (
        <AccessControlCreatePage
          asPopup
          onClose={() => setCreateOpen(false)}
          onSaved={(message) => {
            setRecords(readAccessControls());
            showToast(message || 'บันทึกสิทธิ์การเข้าถึงระบบแล้ว');
          }}
        />
      ) : null}

      {/* แจ้งผลอยู่บนหัวจอเหมือนหน้าอื่นของระบบ — ของเดิมลอยอยู่ล่างจอทับตาราง
          (26 ส.ค. 2569 มติผู้ใช้) */}
      <PhcisTopToast session={toast ? { message: toast } : null} onDismiss={() => setToast(null)} />
    </>
  );
}
