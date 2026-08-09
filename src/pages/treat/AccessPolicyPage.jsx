import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import Select from '@/components/forms/Select';
import Checkbox from '@/components/checkbox/Checkbox';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Tooltip from '@/components/tooltip/Tooltip';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Popup from '@/components/popup/Popup';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import {
  PanelCard, PanelEmptyState, strikeIf,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, AccessDeniedPanel,
  ReasonDialog, PanelAlert, CountLabel, MaskedValue, paginate,
} from '@/pages/treat/panels/panelHooks';
import {
  POLICY_EFFECTS, policyEffectMeta, POLICY_ROLES, policyRoleLabel,
  POLICY_UNITS, policyUnitLabel, POLICY_CATEGORIES, policyCategoryMeta,
  policyCategoryLabel, blankAccessPolicy, getAccessPolicies, subscribeAccessPolicies,
  saveAccessPolicy, setAccessPolicyActive, resolvePolicy, previewPolicyFor,
  defaultConfidentialCategories,
} from '@/data/treatmentAccess';
import { getTreatmentAudit, subscribeTreatmentAudit } from '@/data/treatmentAudit';

/* PHCIS | EMR §1.4.8.1 — นโยบายการเข้าถึงข้อมูล (ABAC).

   ปิดครึ่ง UI ของช่องว่างที่ gap report ระบุ: "ยังไม่มีการกำหนดสิทธิ์
   รายฟิลด์/รายเอกสารจากหน้าผู้ดูแลระบบ".

   หน้านี้ **ไม่ได้** เป็นเจ้าของนิยาม Role — /users ยังเป็นเจ้าของอยู่.
   สิ่งที่หน้านี้ทำคือ map คุณลักษณะ (role × หน่วยงาน × หมวดข้อมูล) ไปเป็น
   ระดับการเข้าถึง 4 ระดับ ซึ่งเป็นชุดเดียวกับที่ MaskedValue / GuardedAction
   ในหน้าบันทึกการรักษาใช้อยู่แล้ว จึงไม่ต้องเขียน gate ใหม่.

   ข้อจำกัดที่ต้องรายงานตามจริง: กั้นที่ชั้น UI เท่านั้น — การบังคับใช้จริง
   ต้องทำที่ API/DB และ field-level encryption at rest ยังไม่มี. */

const breadcrumb = ['ตั้งค่าระบบบันทึกการรักษา', 'นโยบายการเข้าถึงข้อมูล (ABAC)'];

const TABS = [
  { key: 'rules',   label: 'กฎการเข้าถึง' },
  { key: 'preview', label: 'ทดลองมุมมองตามบทบาท' },
  { key: 'confidential', label: 'ข้อมูลลับโดยค่าเริ่มต้น' },
  { key: 'audit',   label: 'ประวัติการแก้นโยบาย' },
];

const PER_PAGE = 10;

const EffectBadge = ({ effect }) => {
  const meta = policyEffectMeta(effect);
  return (
    <Tooltip content={meta.description} position='top'>
      <span style={{ display: 'inline-flex' }}>
        <StatusBadge style={meta.badge} size='small'>{meta.label}</StatusBadge>
      </span>
    </Tooltip>
  );
};

/* ── แท็บ 1: ตารางกฎ ─────────────────────────────────────────── */

const RulesTab = ({
  rows, allRows, canEdit, query, setQuery, roleFilter, setRoleFilter,
  categoryFilter, setCategoryFilter, page, setPage, onEdit, onToggle, onNew,
}) => {
  const { pageCount, page: safePage, slice } = paginate(rows, page, PER_PAGE);

  const columns = [
    {
      key: 'role', header: 'บทบาท (Role)',
      render: (r) => (
        <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(!r.active) }}>{policyRoleLabel(r.role)}</span>
      ),
    },
    {
      key: 'unit', header: 'คลินิก / หน่วยงาน',
      render: (r) => (
        <span style={{ ...PANEL_LABEL_STYLE, ...strikeIf(!r.active) }}>{policyUnitLabel(r.unit)}</span>
      ),
    },
    {
      key: 'category', header: 'หมวดข้อมูล', flex: 1,
      render: (r) => {
        const meta = policyCategoryMeta(r.category);
        return (
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(!r.active) }}>{policyCategoryLabel(r.category)}</span>
            <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <ColorfulBadge style={meta?.kind === 'document' ? 'purple' : 'blue'} size='small' width='hug'>
                {meta?.kind === 'document' ? 'รายเอกสาร' : 'รายฟิลด์'}
              </ColorfulBadge>
              {meta?.confidentialByDefault ? (
                <ColorfulBadge style='orange' size='small' width='hug'>ข้อมูลลับโดยค่าเริ่มต้น</ColorfulBadge>
              ) : null}
            </span>
          </div>
        );
      },
    },
    { key: 'effect', header: 'ระดับการเข้าถึง', render: (r) => <EffectBadge effect={r.effect} /> },
    {
      key: 'active', header: 'สถานะ',
      render: (r) => (r.active
        ? <StatusBadge style='success' size='small' icon='check_circle'>เปิดใช้งาน</StatusBadge>
        : (
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <StatusBadge style='neutral' size='small' icon='block'>ปิดใช้งาน</StatusBadge>
            {r.disabledReason ? <span style={PANEL_LABEL_STYLE}>เหตุผล: {r.disabledReason}</span> : null}
          </div>
        )),
    },
    {
      key: 'note', header: 'หมายเหตุ', flex: 1,
      render: (r) => <span style={PANEL_LABEL_STYLE}>{r.note || '—'}</span>,
    },
    {
      key: 'actions', header: 'การจัดการ',
      render: (r) => (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <GuardedAction allowed={canEdit}>
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => onEdit(r)}>
              แก้ไข
            </NeutralSubdueButton>
          </GuardedAction>
          <GuardedAction allowed={canEdit}>
            <NeutralSubdueButton
              variant='outline' size='sm'
              leadingIcon={r.active ? 'toggle_off' : 'toggle_on'}
              onClick={() => onToggle(r)}
            >
              {r.active ? 'ปิดใช้' : 'เปิดใช้'}
            </NeutralSubdueButton>
          </GuardedAction>
        </div>
      ),
    },
  ];

  return (
    <PanelCard
      title='กฎการเข้าถึงตามคุณลักษณะ (Attribute-based)'
      subtitle='หนึ่งกฎ = บทบาท × คลินิก/หน่วยงาน × หมวดข้อมูล → ระดับการเข้าถึง · เมื่อมีกฎชนกัน ระบบใช้กฎที่เข้มกว่าเสมอ'
      action={(
        <GuardedAction allowed={canEdit}>
          <BrandButton variant='fill' size='sm' leadingIcon='add' onClick={onNew}>เพิ่มกฎใหม่</BrandButton>
        </GuardedAction>
      )}
    >
      <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <PrimarySearch
          value={query}
          onChange={setQuery}
          width={420}
          placeholder='ค้นหาบทบาท / หน่วยงาน / หมวดข้อมูล'
        />
        <div style={{ minWidth: 200 }}>
          <Select
            value={roleFilter}
            onChange={setRoleFilter}
            options={[{ value: 'all', label: 'ทุกบทบาท' }, ...POLICY_ROLES]}
            placeholder='กรองตามบทบาท'
            showLabel={false}
            showHelperText={false}
          />
        </div>
        <div style={{ minWidth: 240 }}>
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[{ value: 'all', label: 'ทุกหมวดข้อมูล' }, ...POLICY_CATEGORIES]}
            placeholder='กรองตามหมวดข้อมูล'
            showLabel={false}
            showHelperText={false}
          />
        </div>
        {query || roleFilter !== 'all' || categoryFilter !== 'all' ? (
          <NeutralSubdueButton
            variant='outline' size='sm' leadingIcon='filter_alt_off'
            onClick={() => { setQuery(''); setRoleFilter('all'); setCategoryFilter('all'); }}
          >
            ล้างตัวกรอง
          </NeutralSubdueButton>
        ) : null}
        <CountLabel n={rows.length} unit='กฎ' />
      </div>

      <SearchResultCount found={rows.length} total={allRows.length} />

      {rows.length === 0 ? (
        <PanelEmptyState
          icon='policy'
          title={allRows.length === 0 ? 'ยังไม่มีกฎการเข้าถึงในระบบ' : 'ไม่พบกฎที่ตรงกับเงื่อนไขการค้นหา'}
          subtitle={allRows.length === 0
            ? 'เพิ่มกฎแรกเพื่อกำหนดว่าบทบาทใดเห็นหรือแก้ไขข้อมูลหมวดใดได้บ้าง — จนกว่าจะมีกฎ ระบบจะปฏิเสธทุกหมวดโดยปริยาย'
            : 'ลองปรับคำค้น หรือเลือก "ทุกบทบาท" / "ทุกหมวดข้อมูล"'}
          action={allRows.length === 0 ? (
            <GuardedAction allowed={canEdit}>
              <BrandButton variant='outline' size='sm' leadingIcon='add' onClick={onNew}>เพิ่มกฎแรก</BrandButton>
            </GuardedAction>
          ) : (
            <NeutralSubdueButton
              variant='outline' size='sm' leadingIcon='filter_alt_off'
              onClick={() => { setQuery(''); setRoleFilter('all'); setCategoryFilter('all'); }}
            >
              ล้างตัวกรอง
            </NeutralSubdueButton>
          )}
        />
      ) : (
        <>
          <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
            <Table columns={columns} rows={slice} rowKey={(r) => r.id} />
          </div>
          {pageCount > 1 ? (
            <div className='flex justify-end w-full'>
              <Pagination currentPage={safePage} pageCount={pageCount} onPageChange={setPage} />
            </div>
          ) : null}
        </>
      )}
    </PanelCard>
  );
};

/* ── แท็บ 2: ทดลองมุมมอง ─────────────────────────────────────── */

const PreviewTab = ({ role, setRole, unit, setUnit }) => {
  const rows = useMemo(
    () => (role ? previewPolicyFor(role, unit) : []),
    [role, unit],
  );

  const columns = [
    {
      key: 'category', header: 'หมวดข้อมูล', flex: 1,
      render: (r) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={PANEL_VALUE_STYLE}>{r.category.label}</span>
          <ColorfulBadge style={r.category.kind === 'document' ? 'purple' : 'blue'} size='small' width='hug'>
            {r.category.kind === 'document' ? 'รายเอกสาร' : 'รายฟิลด์'}
          </ColorfulBadge>
        </div>
      ),
    },
    { key: 'effect', header: 'ผลลัพธ์', render: (r) => <EffectBadge effect={r.effect} /> },
    {
      key: 'sample', header: 'ตัวอย่างที่ผู้ใช้เห็นจริง',
      render: (r) => (
        /* ใช้ MaskedValue ตัวจริงเพื่อให้เห็นผลแบบเดียวกับหน้าบันทึกการรักษา */
        <MaskedValue masked={r.effect === 'hidden'}>
          <span style={PANEL_VALUE_STYLE}>
            {r.category.value === 'labResult' ? 'Creatinine 2.4 mg/dL (H)'
              : r.category.value === 'diagnosis' ? 'E11.9 เบาหวานชนิดที่ 2'
                : r.category.value === 'billing' ? '฿ 1,250.00'
                  : r.category.value === 'hivStatus' ? 'Anti-HIV: Non-reactive'
                    : 'ค่าตัวอย่างของหมวดนี้'}
          </span>
        </MaskedValue>
      ),
    },
    {
      key: 'reason', header: 'กฎที่ใช้ตัดสิน', flex: 2,
      render: (r) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={PANEL_LABEL_STYLE}>{r.reason}</span>
          {r.considered.length > 1 ? (
            <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-alert-info, #1D4ED8)' }}>
              กฎที่เข้าเงื่อนไขทั้งหมด: {r.considered.map((c) => `${policyUnitLabel(c.unit)} → ${policyEffectMeta(c.effect).label}`).join(' · ')}
            </span>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <PanelCard
      title='ทดลองมุมมองตามบทบาท'
      subtitle='เลือกบทบาทและหน่วยงาน แล้วดูว่าผู้ใช้แบบนั้นจะเห็นข้อมูลแต่ละหมวดอย่างไรจริง ๆ ก่อนประกาศใช้นโยบาย'
    >
      <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <Select
            label='บทบาทที่ต้องการทดลอง'
            required
            value={role}
            onChange={setRole}
            options={POLICY_ROLES}
            placeholder='เลือกบทบาท'
          />
        </div>
        <div style={{ minWidth: 260, flex: 1 }}>
          <Select
            label='คลินิก / หน่วยงานที่สังกัด'
            value={unit}
            onChange={setUnit}
            options={POLICY_UNITS.filter((u) => u.value !== 'all')}
            placeholder='เลือกหน่วยงาน'
            helperText='กฎที่ตั้งไว้เป็น "ทุกหน่วยงาน" จะถูกนำมาคิดด้วยเสมอ'
          />
        </div>
      </div>

      {!role ? (
        <PanelEmptyState
          icon='person_search'
          title='ยังไม่ได้เลือกบทบาทที่จะทดลอง'
          subtitle='เลือกบทบาทด้านบนเพื่อดูผลลัพธ์ของนโยบายปัจจุบันแบบรายหมวดข้อมูล'
        />
      ) : (
        <>
          <PanelAlert tone='info' icon='visibility' title={`กำลังแสดงมุมมองของ: ${policyRoleLabel(role)} · ${policyUnitLabel(unit)}`}>
            นี่คือผลของนโยบายที่บันทึกไว้จริง ไม่ใช่ตัวอย่างจำลอง — คอลัมน์ "ตัวอย่างที่ผู้ใช้เห็นจริง"
            ใช้ตัวปิดบัง (MaskedValue) ตัวเดียวกับหน้าบันทึกการรักษา
          </PanelAlert>
          <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
            <Table columns={columns} rows={rows} rowKey={(r) => r.category.value} />
          </div>
        </>
      )}
    </PanelCard>
  );
};

/* ── แท็บ 3: ข้อมูลลับโดยค่าเริ่มต้น (§1.4.2.1 ฝั่ง UI) ──────────── */

const ConfidentialTab = () => {
  const confidential = defaultConfidentialCategories();
  const columns = [
    { key: 'label', header: 'หมวดข้อมูล', flex: 1, render: (r) => <span style={PANEL_VALUE_STYLE}>{r.label}</span> },
    {
      key: 'kind', header: 'ระดับ',
      render: (r) => (
        <ColorfulBadge style={r.kind === 'document' ? 'purple' : 'blue'} size='small' width='hug'>
          {r.kind === 'document' ? 'รายเอกสาร' : 'รายฟิลด์'}
        </ColorfulBadge>
      ),
    },
    {
      key: 'effect', header: 'พฤติกรรมเริ่มต้น',
      render: () => <StatusBadge style='error' size='small' icon='lock'>ปิดบัง (••••) จนกว่าจะขอเปิดดู</StatusBadge>,
    },
  ];

  return (
    <PanelCard
      title='หมวดข้อมูลที่เป็นความลับโดยค่าเริ่มต้น'
      subtitle='หมวดเหล่านี้ถูกปิดบังไว้ก่อนเสมอ ไม่ว่ากฎจะให้สิทธิ์ระดับใด ยกเว้นกฎที่ให้ระดับ "เต็ม"'
    >
      <PanelAlert tone='info' icon='shield_lock' title='ทำงานร่วมกับประตูขอเปิดดูในหน้าบันทึกการรักษา'>
        ผู้ใช้ที่สิทธิ์ไม่ถึงจะเห็นค่าเป็น •••• พร้อมปุ่ม "ขอเปิดดู" ซึ่งบังคับกรอกเหตุผลอย่างน้อย 10 ตัวอักษร
        และบันทึกลงประวัติการเข้าถึงทุกครั้ง — <b>ยังไม่มีการเข้ารหัสระดับฟิลด์ที่ชั้นจัดเก็บ (encryption at rest)</b>
        ซึ่งต้องทำที่ backend
      </PanelAlert>
      <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
        <Table columns={columns} rows={confidential} rowKey={(r) => r.value} />
      </div>
    </PanelCard>
  );
};

/* ── แท็บ 4: ประวัติการแก้นโยบาย ─────────────────────────────── */

const AuditTab = ({ rows, page, setPage }) => {
  const { pageCount, page: safePage, slice } = paginate(rows, page, PER_PAGE);
  const columns = [
    { key: 'recordedAt', header: 'เวลา', render: (r) => <span style={PANEL_LABEL_STYLE}>{r.recordedAt}</span> },
    { key: 'by', header: 'ผู้แก้ไข', render: (r) => <span style={PANEL_VALUE_STYLE}>{r.by}</span> },
    { key: 'field', header: 'รายการที่แก้', flex: 2, render: (r) => <span style={PANEL_VALUE_STYLE}>{r.field}</span> },
    { key: 'oldValue', header: 'ค่าเดิม', render: (r) => <span style={PANEL_LABEL_STYLE}>{r.oldValue}</span> },
    { key: 'newValue', header: 'ค่าใหม่', flex: 1, render: (r) => <span style={PANEL_VALUE_STYLE}>{r.newValue}</span> },
  ];

  return (
    <PanelCard
      title='ประวัติการแก้นโยบายการเข้าถึง'
      subtitle='ทุกการเพิ่ม / แก้ไข / เปิด-ปิดกฎถูกบันทึกพร้อมผู้แก้ เวลา และค่าเดิม → ค่าใหม่ ลบไม่ได้'
      action={<CountLabel n={rows.length} />}
    >
      {rows.length === 0 ? (
        <PanelEmptyState
          icon='history'
          title='ยังไม่มีการแก้ไขนโยบายในระบบ'
          subtitle='เมื่อมีการเพิ่ม แก้ไข หรือปิดใช้กฎ รายการจะปรากฏที่นี่ทันที'
        />
      ) : (
        <>
          <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
            <Table columns={columns} rows={slice} rowKey={(r) => r.id} />
          </div>
          {pageCount > 1 ? (
            <div className='flex justify-end w-full'>
              <Pagination currentPage={safePage} pageCount={pageCount} onPageChange={setPage} />
            </div>
          ) : null}
        </>
      )}
    </PanelCard>
  );
};

/* ── หน้าเพจ ─────────────────────────────────────────────────── */

const AccessPolicyPage = () => {
  const history = useHistory();
  const access = useTreatmentAccess();

  const [policies] = useTreatmentStore(subscribeAccessPolicies, getAccessPolicies, []);
  const [auditRows] = useTreatmentStore(
    subscribeTreatmentAudit,
    () => getTreatmentAudit().filter((r) => r.category === 'policy'),
    [],
  );

  const [tab, setTab] = useState('rules');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);

  const [previewRole, setPreviewRole] = useState('nurse');
  const [previewUnit, setPreviewUnit] = useState('opd');

  const [editTarget, setEditTarget] = useState(null);
  const [disableTarget, setDisableTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (variant, message) => setToast({ id: Date.now(), variant, message });

  useEffect(() => { setPage(1); }, [query, roleFilter, categoryFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return policies.filter((p) => {
      if (roleFilter !== 'all' && p.role !== roleFilter) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (!q) return true;
      const hay = [
        policyRoleLabel(p.role), policyUnitLabel(p.unit),
        policyCategoryLabel(p.category), policyEffectMeta(p.effect).label, p.note,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [policies, query, roleFilter, categoryFilter]);

  /* กฎที่ชนกัน — "ชนกัน" คือกฎที่มีผลพร้อมกันได้จริงเท่านั้น จึงต้องคิด
     แกนหน่วยงานด้วย: กฎของคนละคลินิก (เช่น แพทย์ × คลินิกสุขภาพจิต กับ
     แพทย์ × OPD) ไม่มีวันมีผลกับผู้ใช้คนเดียวกัน จึงไม่ใช่การชนกัน.

     ตัวตัดสินใช้ resolvePolicy() ตัวเดียวกับแท็บ "ทดลองมุมมอง" — banner
     กับตารางทดลองมุมมองจึงขัดกันเองไม่ได้ */
  const conflicts = useMemo(() => {
    const groups = new Map();
    policies.filter((p) => p.active).forEach((p) => {
      const key = `${p.role}|${p.category}`;
      groups.set(key, [...(groups.get(key) || []), p]);
    });
    const out = [];
    const seen = new Set();
    groups.forEach((list, key) => {
      if (list.length < 2) return;
      const [role, category] = key.split('|');
      /* ทดสอบเฉพาะหน่วยงานที่มีกฎอยู่จริง — กฎ "ทุกหน่วยงาน" จะไปโผล่ใน
         ทุกรอบอยู่แล้วเพราะ resolvePolicy() นับ unit='all' เสมอ */
      [...new Set(list.map((p) => p.unit))].forEach((unit) => {
        const res = resolvePolicy(role, unit, category);
        if (res.considered.length < 2) return;
        if (new Set(res.considered.map((p) => p.effect)).size < 2) return;
        const sig = res.considered.map((p) => p.id).sort().join('|');
        if (seen.has(sig)) return;
        seen.add(sig);
        out.push({ role, unit, category, list: res.considered, strictest: res.winner });
      });
    });
    return out;
  }, [policies]);

  const summaryCards = useMemo(() => {
    const count = (pred) => policies.filter(pred).length;
    return [
      { key: 'all',      label: 'กฎทั้งหมด',       value: policies.length,                          indicator: 'บทบาท × หน่วยงาน × หมวดข้อมูล', color: 'brand',       icon: 'policy' },
      { key: 'active',   label: 'เปิดใช้งาน',      value: count((p) => p.active),                   indicator: 'มีผลกับผู้ใช้จริง',            color: 'positive',    icon: 'check_circle' },
      { key: 'disabled', label: 'ปิดใช้งาน',       value: count((p) => !p.active),                  indicator: 'เก็บไว้พร้อมเหตุผล',           color: 'inprogress',  icon: 'block' },
      { key: 'hidden',   label: 'กฎระดับ "ซ่อน"',  value: count((p) => p.active && p.effect === 'hidden'), indicator: 'ปิดบังค่าเป็น ••••',      color: 'destructive', icon: 'lock' },
      { key: 'conflict', label: 'จุดที่กฎชนกัน',   value: conflicts.length,                         indicator: 'ใช้กฎที่เข้มกว่า',             color: 'info',        icon: 'rule' },
    ];
  }, [policies, conflicts]);

  /* หน้านี้เป็นหน้าผู้ดูแลระบบ — สิทธิ์ไม่พอต้องเห็นแบบอ่านอย่างเดียว
     พร้อม banner บอกเหตุผล ไม่ใช่ปฏิเสธทั้งหน้า (ยกเว้นโหมดไม่มีสิทธิ์เลย) */
  if (!access.canView) {
    return (
      <QueuePageShell activeKey='treat' breadcrumb={breadcrumb} title='นโยบายการเข้าถึงข้อมูล (ABAC)'>
        <div style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)' }}>
          <AccessDeniedPanel what='นโยบายการเข้าถึงข้อมูล' onBack={() => history.push('/treat/queue')} />
        </div>
      </QueuePageShell>
    );
  }

  const canEdit = access.canEdit;

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='นโยบายการเข้าถึงข้อมูล (ABAC)'
      onBack={() => history.push('/treat/queue')}
      backLabel='กลับไปหน้าคิว'
      summaryCards={summaryCards}
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />

      <div
        className='flex flex-col flex-1 min-w-0'
        style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-400, 16px)' }}
      >
        {/* สิทธิ์ไม่พอ → อ่านอย่างเดียว + บอกเหตุผล ไม่ซ่อนหน้า */}
        {!canEdit ? (
          <PanelAlert tone='info' icon='visibility' title='โหมดดูอย่างเดียว'>
            บัญชีปัจจุบันไม่มีสิทธิ์แก้ไขนโยบายการเข้าถึง — อ่านกฎและทดลองมุมมองได้ทั้งหมด
            แต่ปุ่มเพิ่ม/แก้ไข/ปิดใช้ถูกปิดไว้พร้อมเหตุผล ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์
          </PanelAlert>
        ) : null}

        {/* ขอบเขตจริงของหน้านี้ — กันเข้าใจผิดว่าปิด TOR ได้ทั้งข้อ */}
        <PanelAlert tone='warning' icon='info' title='ขอบเขตของหน้านี้'>
          หน้านี้กำหนด "การเข้าถึงระดับฟิลด์และเอกสาร" ในระบบบันทึกการรักษาเท่านั้น ·
          นิยามบทบาทและสิทธิ์ระดับโมดูลยังเป็นของหน้า
          {' '}
          <button
            type='button'
            onClick={() => history.push('/users')}
            style={{
              ...PANEL_LABEL_STYLE,
              color: 'var(--text-brandPrimary-default, #007549)',
              textDecoration: 'underline',
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
            }}
          >
            จัดการผู้ใช้งาน (/users)
          </button>
          {' · '}
          <b>นโยบายนี้บังคับใช้ที่ชั้นหน้าจอ</b> — การบังคับใช้จริงต้องทำที่ API/ฐานข้อมูล และยังไม่มีการเข้ารหัสระดับฟิลด์ที่ชั้นจัดเก็บ
        </PanelAlert>

        {/* กฎที่ชนกัน — บอกให้ชัดว่ากฎไหนชนะ */}
        {tab === 'rules' && conflicts.length > 0 ? (
          <PanelAlert tone='info' icon='rule' title={`มีจุดที่กฎชนกัน ${conflicts.length} จุด — ระบบใช้กฎที่เข้มกว่า`}>
            {conflicts.slice(0, 5).map((c) => (
              <span key={`${c.role}-${c.unit}-${c.category}`} style={{ display: 'block' }}>
                {policyRoleLabel(c.role)} × {policyUnitLabel(c.unit)} × {policyCategoryLabel(c.category)}:
                {' '}มี {c.list.length} กฎ ({c.list.map((p) => `${policyUnitLabel(p.unit)} → ${policyEffectMeta(p.effect).label}`).join(' · ')})
                {' '}→ <b>ใช้ "{policyEffectMeta(c.strictest.effect).label}" จากกฎ {policyUnitLabel(c.strictest.unit)}</b>
              </span>
            ))}
            {conflicts.length > 5 ? (
              <span style={{ display: 'block' }}>… และอีก {conflicts.length - 5} จุด (ดูรายละเอียดได้ในแท็บ "ทดลองมุมมองตามบทบาท")</span>
            ) : null}
          </PanelAlert>
        ) : null}

        {tab === 'rules' ? (
          <RulesTab
            rows={filtered}
            allRows={policies}
            canEdit={canEdit}
            query={query} setQuery={setQuery}
            roleFilter={roleFilter} setRoleFilter={setRoleFilter}
            categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
            page={page} setPage={setPage}
            onNew={() => setEditTarget(blankAccessPolicy())}
            onEdit={(r) => setEditTarget({ ...r })}
            onToggle={(r) => {
              if (r.active) { setDisableTarget(r); return; }
              const updated = setAccessPolicyActive(r.id, true);
              showToast('success', `เปิดใช้กฎ ${policyRoleLabel(updated.role)} × ${policyCategoryLabel(updated.category)} แล้ว`);
            }}
          />
        ) : tab === 'preview' ? (
          <PreviewTab role={previewRole} setRole={setPreviewRole} unit={previewUnit} setUnit={setPreviewUnit} />
        ) : tab === 'confidential' ? (
          <ConfidentialTab />
        ) : (
          <AuditTab rows={auditRows} page={auditPage} setPage={setAuditPage} />
        )}
      </div>

      {/* เพิ่ม / แก้ไขกฎ */}
      <PolicyEditPopup
        draft={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={(draft) => {
          const saved = saveAccessPolicy(draft);
          setEditTarget(null);
          showToast('success', `บันทึกกฎ ${policyRoleLabel(saved.role)} × ${policyUnitLabel(saved.unit)} × ${policyCategoryLabel(saved.category)} แล้ว`);
        }}
      />

      {/* ปิดใช้กฎ — บังคับเหตุผล */}
      <ReasonDialog
        open={!!disableTarget}
        type='warning'
        title='ปิดใช้กฎการเข้าถึง'
        description={disableTarget
          ? `กฎ "${policyRoleLabel(disableTarget.role)} × ${policyUnitLabel(disableTarget.unit)} × ${policyCategoryLabel(disableTarget.category)}" จะไม่ถูกนำมาคิดอีก — ผู้ใช้กลุ่มนี้อาจถูกปฏิเสธการเข้าถึงโดยปริยายถ้าไม่มีกฎอื่นรองรับ ระบบเก็บกฎไว้พร้อมเหตุผล ไม่ลบทิ้ง`
          : ''}
        confirmLabel='ยืนยันการปิดใช้'
        minLength={10}
        suggestions={[
          'สำนักอนามัยปรับระเบียบการเข้าถึงข้อมูลกลุ่มนี้ รอประกาศฉบับใหม่',
          'ตั้งกฎผิดหน่วยงาน — จะออกกฎฉบับใหม่ที่ถูกต้องแทน',
          'ปิดชั่วคราวระหว่างตรวจสอบเหตุการณ์การเข้าถึงข้อมูลผิดปกติ',
        ]}
        onConfirm={(reason) => {
          const updated = setAccessPolicyActive(disableTarget.id, false, reason);
          setDisableTarget(null);
          showToast('success', `ปิดใช้กฎ ${policyRoleLabel(updated.role)} × ${policyCategoryLabel(updated.category)} แล้ว (บันทึกเหตุผลไว้ในประวัติ)`);
        }}
        onClose={() => setDisableTarget(null)}
      />
    </QueuePageShell>
  );
};

/* ── Popup เพิ่ม/แก้ไขกฎ ─────────────────────────────────────── */

const PolicyEditPopup = ({ draft, onClose, onSave }) => {
  const [local, setLocal] = useState(draft);
  const [touched, setTouched] = useState(false);

  useEffect(() => { setLocal(draft); setTouched(false); }, [draft]);

  if (!local) return null;

  const set = (key) => (v) => setLocal((d) => ({ ...d, [key]: v }));
  const missing = [
    !local.role ? 'บทบาท' : '',
    !local.category ? 'หมวดข้อมูล' : '',
    !local.effect ? 'ระดับการเข้าถึง' : '',
  ].filter(Boolean);

  /* แสดงผลลัพธ์ที่จะเกิดขึ้นจริงหลังบันทึก (รวมกฎอื่นที่ชนกัน).

     ต้องคิดจาก "ชุดกฎหลังบันทึก" คือถอดกฎฉบับเดิมของแถวที่กำลังแก้ออก
     แล้วใส่ฉบับที่กำลังพิมพ์อยู่เข้าไปแทน — ถ้าอ่านจากสโตร์ตรง ๆ กฎฉบับเก่า
     ของตัวเองจะกลายเป็น "กฎอื่นที่เข้มกว่า" และกฎที่เพิ่งสร้างจะกลายเป็น
     deny by default ทั้งที่ยังไม่ทันบันทึก */
  const draftId = local.id || '__draft';
  const projected = (local.role && local.category)
    ? resolvePolicy(local.role, local.unit, local.category, [
      ...getAccessPolicies().filter((p) => p.id !== local.id),
      { ...local, id: draftId },
    ])
    : null;

  return (
    <Popup
      open={!!draft}
      onClose={onClose}
      size='large'
      title={local.id ? 'แก้ไขกฎการเข้าถึง' : 'เพิ่มกฎการเข้าถึงใหม่'}
      subtitle='กฎหนึ่งข้อผูกคุณลักษณะ 3 แกนเข้ากับระดับการเข้าถึงเดียว — ถ้ามีกฎอื่นชนกัน ระบบจะใช้กฎที่เข้มกว่า'
      primaryAction={{
        label: local.id ? 'บันทึกการแก้ไข' : 'เพิ่มกฎ',
        onClick: () => {
          setTouched(true);
          if (missing.length) return;
          onSave(local);
        },
      }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <div style={{ minWidth: 220, flex: 1 }}>
            <Select
              label='บทบาท (Role)'
              required
              value={local.role}
              onChange={set('role')}
              options={POLICY_ROLES}
              placeholder='เลือกบทบาท'
              error={touched && !local.role ? 'ต้องเลือกบทบาท' : undefined}
            />
          </div>
          <div style={{ minWidth: 220, flex: 1 }}>
            <Select
              label='คลินิก / หน่วยงาน'
              value={local.unit}
              onChange={set('unit')}
              options={POLICY_UNITS}
              placeholder='เลือกหน่วยงาน'
              helperText='เลือก "ทุกหน่วยงาน" เพื่อให้กฎมีผลกับทุกคลินิก'
            />
          </div>
        </div>

        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <div style={{ minWidth: 260, flex: 1 }}>
            <Select
              label='หมวดข้อมูล (รายฟิลด์ / รายเอกสาร)'
              required
              value={local.category}
              onChange={set('category')}
              options={POLICY_CATEGORIES.map((c) => ({
                value: c.value,
                label: `${c.label} · ${c.kind === 'document' ? 'รายเอกสาร' : 'รายฟิลด์'}`,
              }))}
              placeholder='เลือกหมวดข้อมูล'
              error={touched && !local.category ? 'ต้องเลือกหมวดข้อมูล' : undefined}
            />
          </div>
          <div style={{ minWidth: 220, flex: 1 }}>
            <Select
              label='ระดับการเข้าถึง'
              required
              value={local.effect}
              onChange={set('effect')}
              options={POLICY_EFFECTS.map((e) => ({ value: e.key, label: e.label }))}
              placeholder='เลือกระดับ'
              helperText={policyEffectMeta(local.effect).description}
            />
          </div>
        </div>

        <SuggestibleTextarea
          voice
          label='หมายเหตุ / เหตุผลเชิงนโยบาย'
          value={local.note}
          onChange={(e) => setLocal((d) => ({
            ...d, note: typeof e === 'string' ? e : e?.target?.value ?? '',
          }))}
          suggestions={[
            'ตามระเบียบสำนักอนามัยว่าด้วยการคุ้มครองข้อมูลส่วนบุคคลของผู้รับบริการ',
            'จำเป็นต่อการปฏิบัติงานประจำวันของหน่วยงานนี้',
            'จำกัดการเข้าถึงเท่าที่จำเป็น (least privilege) ตามหลักธรรมาภิบาลข้อมูล',
            'ข้อมูลอ่อนไหวสูง เปิดเฉพาะผู้ให้การรักษาโดยตรงเท่านั้น',
          ]}
          minChars={2}
          height={100}
          minHeight={88}
          popoverAriaLabel='ตัวอย่างเหตุผลเชิงนโยบาย'
          placeholder='อธิบายว่าทำไมบทบาทนี้จึงควรได้ระดับนี้ เพื่อให้ผู้ตรวจสอบเข้าใจภายหลัง'
        />

        <Checkbox
          checked={!!local.active}
          onChange={(v) => setLocal((d) => ({ ...d, active: typeof v === 'boolean' ? v : !d.active }))}
          label='เปิดใช้งานกฎนี้ทันทีหลังบันทึก'
        />

        {projected ? (
          <PanelAlert tone='info' icon='rule' title='ผลลัพธ์ที่จะเกิดขึ้นจริงหลังบันทึก'>
            {projected.reason}
            {!local.active ? (
              <span style={{ display: 'block', marginTop: 'var(--dim-space-100, 4px)' }}>
                กฎฉบับนี้ถูกตั้งเป็น <b>ปิดใช้งาน</b> — ผลด้านบนจึงเป็นผลของกฎอื่นที่เหลืออยู่
                ติ๊ก "เปิดใช้งานกฎนี้ทันทีหลังบันทึก" ถ้าต้องการให้มีผลจริง
              </span>
            ) : projected.winner && projected.winner.id !== draftId ? (
              <span style={{ display: 'block', marginTop: 'var(--dim-space-100, 4px)' }}>
                <b>โปรดทราบ:</b> มีกฎอื่นที่เข้มกว่าอยู่ ({policyEffectMeta(projected.winner.effect).label}
                {' '}จากกฎ {policyUnitLabel(projected.winner.unit)})
                — ระดับที่คุณเลือก ({policyEffectMeta(local.effect).label}) จะยังไม่มีผลจนกว่าจะปิดกฎนั้น
              </span>
            ) : (
              <span style={{ display: 'block', marginTop: 'var(--dim-space-100, 4px)' }}>
                กฎฉบับนี้จะเป็นกฎที่ชนะ — ผู้ใช้กลุ่มนี้จะได้ระดับ
                {' '}<b>{policyEffectMeta(local.effect).label}</b> ทันทีหลังบันทึก
              </span>
            )}
          </PanelAlert>
        ) : null}

        {touched && missing.length ? (
          <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-alert-error, #B91C1C)' }}>
            ยังกรอกไม่ครบ: {missing.join(' · ')}
          </span>
        ) : null}
      </div>
    </Popup>
  );
};

export default AccessPolicyPage;
