import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import ActionList from '@/components/list/ActionList';
import Select from '@/components/forms/Select';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import NeutralIconButton from '@/components/button/NeutralIconButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import { Icon } from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Switch from '@/components/switch/Switch';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import ASSESS_NAV from '@/pages/assess/assessNav';
import {
  readActivities,
  writeActivities,
  computeActivityStats,
  createActivity,
  createSubActivity,
  sortSubActivities,
  isDuplicateActivityName,
} from '@/data/activityStore';

/* PHCIS | Assess-control — บทบาท (Activity-based Access Control).
   คำบนหน้า 25 ส.ค. 69: กลุ่ม = "Group Policy" · รายการย่อย = "บทบาท"
   (มติผู้ใช้) — route/key/ตัวแปรยังเป็น activity เหมือนเดิม.
   แทนหน้า Group Policy เดิม (Figma 4D3nTx53 · 3:18430) — โครงหน้าเดียวกัน:
   Empty state · summary cards · search · filters · การ์ดบทบาท (ยุบ-กางได้)
   + ตารางบทบาทเรียงตามตัวอักษร · แก้ชื่อ inline · confirm dialogs.

   ปรับตาม feedback 22 ส.ค. 2569: ตัดโหมด "แก้ไขลำดับ" ออก (บทบาท
   เรียงตามตัวอักษรไทยเสมอ) · หัวข้อบทบาท collapse ได้ · ชื่อบทบาทหลัก
   ฟอนต์ใหญ่ขึ้น · แก้ชื่อบทบาท/บทบาทตรงชื่อผ่าน icon ดินสอ. */

const breadcrumb = ['บทบาท'];

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

/* ชื่อ Group Policy บนหัวการ์ด — ใหญ่กว่าเนื้อตาราง ให้ลำดับชั้นชัด
   น้ำหนัก regular เท่าหัวการ์ดหน้าอื่น (ลดจาก medium — feedback 22 ส.ค. 2569) */
const ACTIVITY_TITLE = {
  color: 'var(--text-topic-secondary-title)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const STATUS_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'active', label: 'เปิดการใช้งาน' },
  { value: 'inactive', label: 'ปิดการใช้งาน' },
];

const DUPLICATE_ACTIVITY_ERROR = 'ชื่อ Group Policy ซ้ำกับที่มีอยู่ กรุณาเปลี่ยนชื่อใหม่';
const DUPLICATE_SUB_ERROR = 'ชื่อบทบาทซ้ำกับที่มีอยู่ใน Group Policy นี้';

/* นำส่งออกรายงาน — จัดกลุ่มตามบทบาท (คอลัมน์แรก) + แถวบทบาท
   ตาม context ที่เห็นบนหน้า (ค้นหา/ตัวกรอง/การเรียงตามตัวอักษร) */
const ACTIVITY_EXPORT_COLUMNS = [
  { key: 'activity', header: 'Group Policy', width: 220 },
  { key: 'order', header: 'ลำดับ', width: 80 },
  { key: 'name', header: 'ชื่อบทบาท', width: 300 },
  { key: 'status', header: 'สถานะการใช้งาน', width: 150 },
];

/* Figma 3:18431 Roles_Empty — Ambulance Lottie 160×160; list footer 6:21313 / 10:29241 — 128×128. */
const AMBULANCE_LOTTIE = '/illustration/ambulance.json';

/* เมนูใต้ปุ่ม "เพิ่ม Group Policy / บทบาท" — portal ไป <body> เพราะ SubHeader
   อยู่ในแถบที่ถูก scale ด้วย header morph (transform) ซึ่งกลายเป็น containing
   block ของ position:fixed ทำให้เมนูหลุดตำแหน่ง (บทเรียนเดียวกับ TabUnderline) */
function AddMenu({ anchorRef, open, onClose, items }) {
  const [pos, setPos] = useState({ top: 0, right: 0 });
  useEffect(() => {
    if (!open) return undefined;
    const btn = anchorRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      setPos({ top: Math.round(r.bottom + 4), right: Math.round(window.innerWidth - r.right) });
    }
    const close = (e) => {
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      const pop = document.getElementById('mih-activity-add-menu');
      if (pop && pop.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, anchorRef, onClose]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal((
    <div
      id='mih-activity-add-menu'
      role='menu'
      style={{
        position: 'fixed',
        top: pos.top,
        right: pos.right,
        minWidth: 'var(--dim-size-2450, 280px)',
        background: 'var(--surface-dropdown-default)',
        border: 'var(--dim-stroke-100) solid var(--border-dropdown-default)',
        borderRadius: 'var(--dim-radius-500)',
        boxShadow: 'var(--shadow-dropdown)',
        padding: 'var(--dim-space-100)',
        zIndex: 'var(--sm-z-popover, 1199)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {items.map((it) => (
        <ActionList
          key={it.key}
          label={it.label}
          subtext={it.subtext}
          showSubtext={!!it.subtext}
          /* เมนูคำสั่งล้วน — ไม่มีไอคอนหน้า/ท้ายแถว (มติผู้ใช้ 25 ส.ค. 69) */
          showLeadingIcon={false}
          showCheck={false}
          showChevronRight={false}
          onClick={() => { onClose(); it.onClick(); }}
        />
      ))}
    </div>
  ), document.body);
}

function EmptyIllustration({ size = 160, ariaLabel = 'ยังไม่มี Group Policy' }) {
  const [anim, setAnim] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(AMBULANCE_LOTTIE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setAnim(d); })
      .catch(() => { /* decorative — text still conveys empty state */ });
    return () => { alive = false; };
  }, []);

  if (!anim) {
    return <span style={{ width: size, height: size }} aria-hidden />;
  }
  return <LottieIllustration animationData={anim} size={size} loop ariaLabel={ariaLabel} />;
}

/* แก้ชื่อ inline — Enter/ปุ่ม ✓ บันทึก · Esc/ปุ่ม ✕ ยกเลิก.
   onSave คืน true = สำเร็จ (ปิดโหมดแก้) · false = ไม่ผ่าน validation (แก้ต่อ) */
function InlineNameEditor({ initial, onSave, onCancel, ariaLabel }) {
  const [draft, setDraft] = useState(initial);
  const submit = (e) => {
    e.preventDefault();
    onSave(draft);
  };
  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
      className='inline-flex items-center'
      style={{ gap: 'var(--dim-space-200)', minWidth: 240 }}
    >
      <InputField
        autoFocus
        showLabel={false}
        showHelperText={false}
        showLeadingIcon={false}
        size='medium'
        value={draft}
        onChange={setDraft}
        aria-label={ariaLabel}
      />
      {/* ปุ่ม alias จาก DS Icon Button ขนาดเท่ากัน (sm 36×36) —
          ✓ Brand fill (ยืนยัน) · ✕ Neutral Subdue outline */}
      <BrandIconButton icon='check' variant='fill' size='sm' aria-label='บันทึกชื่อ' onClick={submit} />
      <NeutralSubdueIconButton variant='outline' size='sm' aria-label='ยกเลิกการแก้ไขชื่อ' onClick={onCancel}>
        <Icon name='close' size={16} />
      </NeutralSubdueIconButton>
    </form>
  );
}

function ActivitySection({
  activity,
  search,
  filterStatus,
  onRenameActivity,
  onDeleteActivity,
  onAddSubActivity,
  onRenameSubActivity,
  onDeleteSubActivity,
  onToggleSubActive,
}) {
  /* เริ่มแบบกางออก — ยุบเก็บหัวข้อที่ไม่ได้ใช้ได้จาก chevron/ชื่อบทบาท */
  const [collapsed, setCollapsed] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingSubId, setEditingSubId] = useState(null);

  const hasSubActivities = (activity.subActivities || []).length > 0;
  const q = search.trim().toLowerCase();
  /* ระหว่างค้นหา/กรอง บังคับกางออก — ไม่งั้นแถวที่ match ถูกซ่อนใต้หัวข้อที่ยุบไว้ */
  const isOpen = !collapsed || !!q || !!filterStatus;

  const subActivities = useMemo(() => {
    const sorted = sortSubActivities(activity.subActivities);
    return sorted.filter((sub) => {
      const matchesSearch = !q
        || activity.name.toLowerCase().includes(q)
        || sub.name.toLowerCase().includes(q);
      const matchesStatus = !filterStatus
        || (filterStatus === 'active' && sub.active)
        || (filterStatus === 'inactive' && !sub.active);
      return matchesSearch && matchesStatus;
    });
  }, [activity, q, filterStatus]);

  const activityMatchesSearch = !q
    || activity.name.toLowerCase().includes(q)
    || (activity.subActivities || []).some((sub) => sub.name.toLowerCase().includes(q));

  const columns = useMemo(() => [
    {
      key: 'order',
      header: 'ลำดับ',
      /* ลำดับ = ตำแหน่งหลังเรียงตามตัวอักษร (ไม่มีการจัดลำดับเองแล้ว) */
      render: (_row, idx) => <span style={TEXT_CELL}>{idx + 1}</span>,
    },
    {
      key: 'name',
      header: 'ชื่อบทบาท',
      flex: 1,
      minWidth: 240,
      render: (row) => (row.id === editingSubId ? (
        <InlineNameEditor
          initial={row.name}
          ariaLabel={`แก้ไขชื่อ ${row.name}`}
          onSave={(name) => {
            if (onRenameSubActivity(activity.id, row.id, name)) setEditingSubId(null);
          }}
          onCancel={() => setEditingSubId(null)}
        />
      ) : (
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={TEXT_CELL}>{row.name}</span>
          <NeutralIconButton
            icon='edit'
            variant='ghost'
            size='sm'
            aria-label={`แก้ไขชื่อ ${row.name}`}
            onClick={() => setEditingSubId(row.id)}
            /* ดินสอเป็น affordance รอง — ใช้โทนอ่อน (icon/neutral/tertiary) ไม่แย่งสายตาจากชื่อ */
            style={{ color: 'var(--icon-neutral-tertiary, #ADB2B7)' }}
          />
        </span>
      )),
    },
    {
      key: 'active',
      header: 'สถานะการใช้งาน',
      render: (row) => (
        <Switch
          checked={row.active}
          onChange={(next) => onToggleSubActive(activity.id, row.id, next)}
          aria-label={`สถานะ ${row.name}`}
        />
      ),
    },
    {
      key: 'action',
      header: 'การดำเนินการ',
      render: (row) => (
        <NeutralSubdueIconButton
          variant='outline'
          size='sm'
          aria-label={`ลบ ${row.name}`}
          onClick={() => onDeleteSubActivity(activity, row)}
        >
          <Icon name='trash' size={16} />
        </NeutralSubdueIconButton>
      ),
    },
  ], [activity, editingSubId, onToggleSubActive, onRenameSubActivity, onDeleteSubActivity]);

  if (!hasSubActivities) {
    if (filterStatus) return null;
    if (q && !activityMatchesSearch) return null;
  } else if (subActivities.length === 0 && (q || filterStatus)) {
    return null;
  }

  const badgeLabel = `${(activity.subActivities || []).length} บทบาท`;

  return (
    <section
      className='w-full flex flex-col'
      style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}
    >
      <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
        <div className='flex items-center min-w-0 flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          {!editingName ? (
            <button
              type='button'
              aria-expanded={isOpen}
              aria-label={`${isOpen ? 'ยุบ' : 'กาง'} Group Policy ${activity.name}`}
              onClick={() => setCollapsed((c) => !c)}
              className='inline-flex items-center min-w-0'
              style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={ACTIVITY_TITLE}>{activity.name}</span>
            </button>
          ) : null}
          {editingName ? (
            <InlineNameEditor
              initial={activity.name}
              ariaLabel={`แก้ไขชื่อ Group Policy ${activity.name}`}
              onSave={(name) => {
                if (onRenameActivity(activity, name)) setEditingName(false);
              }}
              onCancel={() => setEditingName(false)}
            />
          ) : (
            <NeutralIconButton
              icon='edit'
              variant='ghost'
              size='sm'
              aria-label={`แก้ไขชื่อ Group Policy ${activity.name}`}
              onClick={() => setEditingName(true)}
              style={{ color: 'var(--icon-neutral-tertiary, #ADB2B7)' }}
            />
          )}
          <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>
            {badgeLabel}
          </ColorfulBadge>
        </div>
        <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueIconButton
            variant='outline'
            size='sm'
            aria-label={`ลบ Group Policy ${activity.name}`}
            onClick={() => onDeleteActivity(activity)}
          >
            <Icon name='trash' size={16} />
          </NeutralSubdueIconButton>
          {/* chevron ยุบ/กางอยู่ริมขวาสุดของหัวการ์ด (feedback 22 ส.ค. 2569) */}
          <NeutralIconButton
            icon={isOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
            variant='ghost'
            size='sm'
            aria-expanded={isOpen}
            aria-label={`${isOpen ? 'ยุบ' : 'กาง'} Group Policy ${activity.name}`}
            onClick={() => setCollapsed((c) => !c)}
          />
        </div>
      </div>

      {isOpen ? (
        <>
          {hasSubActivities ? (
            <Table
              columns={columns}
              rows={subActivities}
              rowKey={(row) => row.id}
              emptyMessage='ยังไม่มีบทบาท'
            />
          ) : null}
          <BrandDashedAddButton onClick={() => onAddSubActivity(activity)}>
            เพิ่มบทบาท
          </BrandDashedAddButton>
        </>
      ) : null}
    </section>
  );
}

export default function ActivityPage() {
  const [activities, setActivities] = useState(() => readActivities());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [addSubFor, setAddSubFor] = useState(null); // activity object | { pick: true } เมื่อเปิดจากปุ่มบนหัวหน้า
  const [subParentId, setSubParentId] = useState('');
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addBtnRef = useRef(null);
  const [toggleConfirm, setToggleConfirm] = useState(null); // { activityId, subId, next }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { activityId, subId, subName }
  const [deleteActivityConfirm, setDeleteActivityConfirm] = useState(null); // activity object

  const [activityNameDraft, setActivityNameDraft] = useState('');
  const [activityNameError, setActivityNameError] = useState('');
  const [subActivityDraft, setSubActivityDraft] = useState('');
  const [exportReport, setExportReport] = useState(null);

  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:activity');

  const persist = useCallback((next) => {
    writeActivities(next);
    setActivities(next);
  }, []);

  const showToast = (message) => {
    setToast({ id: Date.now(), variant: 'success', message });
  };
  const showError = (message) => {
    setToast({ id: Date.now(), variant: 'error', message });
  };

  const stats = useMemo(() => computeActivityStats(activities), [activities]);

  /* การ์ดใบแรกนับจำนวน Group Policy ส่วน active/inactive นับที่ระดับ "บทบาท"
     (สถานะเปิด/ปิดอยู่ที่บทบาท ไม่ใช่ที่ Group Policy) */
  const summaryCards = useMemo(() => [
    { key: 'total', icon: 'clipboard-list', color: 'info', value: String(stats.total), label: 'Group Policy ทั้งหมด' },
    { key: 'active', icon: 'clipboard-list', color: 'positive', value: String(stats.active), label: 'บทบาทที่เปิดใช้งาน' },
    {
      key: 'inactive',
      icon: 'clipboard-list',
      color: 'destructive',
      value: String(stats.inactive),
      label: 'บทบาทที่ปิดใช้งาน',
    },
  ], [stats]);

  const visibleActivities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities.filter((a) => {
      if (!q) return true;
      if (a.name.toLowerCase().includes(q)) return true;
      return (a.subActivities || []).some((sub) => sub.name.toLowerCase().includes(q));
    });
  }, [activities, search]);

  const filtersActive = !!filterStatus || !!search.trim();
  /* ตัวกรองสถานะถูกถอดออกจากหน้า 25 ส.ค. 69 — เหลือแค่ช่องค้นหา จึงใช้เฉพาะ
     resultsOpaque (เฟดผลลัพธ์ตอนล้างคำค้น) */
  const { resultsOpaque } = useSmoothClearFilters(
    filtersActive,
    () => {
      setSearch('');
      setFilterStatus('');
    },
  );
  const hasActivities = activities.length > 0;
  const hasAnySubActivity = useMemo(
    () => activities.some((a) => (a.subActivities || []).length > 0),
    [activities],
  );
  const showListChrome = hasActivities && hasAnySubActivity;

  const validateActivityName = (name, excludeId = null) => {
    const trimmed = name.trim();
    if (!trimmed) return '';
    if (isDuplicateActivityName(activities, trimmed, excludeId)) return DUPLICATE_ACTIVITY_ERROR;
    return '';
  };

  const handleActivityNameChange = (next) => {
    setActivityNameDraft(next);
    setActivityNameError(validateActivityName(next));
  };

  const closeAddActivity = () => {
    setAddActivityOpen(false);
    setActivityNameDraft('');
    setActivityNameError('');
  };

  /* "เพิ่มบทบาท" จากปุ่มบนหัวหน้า — ต้องเลือก Group Policy ปลายทางในฟอร์ม */
  const openAddSubFromHeader = () => {
    if (!activities.length) {
      showError('เพิ่ม Group Policy ก่อน แล้วจึงเพิ่มบทบาทเข้าไปได้');
      return;
    }
    setSubParentId(activities[0].id);
    setSubActivityDraft('');
    setAddSubFor({ pick: true });
  };

  const openAddActivity = () => {
    setActivityNameDraft('');
    setActivityNameError('');
    setAddActivityOpen(true);
  };

  const openAddSubActivity = (activity) => {
    setSubActivityDraft('');
    setAddSubFor(activity);
  };

  const handleSubmitSearch = (value) => {
    const q = (value || '').trim();
    if (q) pushHistory({ label: q, value: q });
    setSearch(q);
  };

  /* รายงาน **ทั้งหมด** — ทุก Group Policy / บทบาทในทะเบียน (ไม่ตัดตาม
     ตัวกรอง/คำค้นบนหน้า) แบ่งเป็นกลุ่ม (Group Policy) → บทบาท
     เรียงตามตัวอักษรทั้งสองระดับ */
  const buildExportReport = () => {
    const rows = [];
    [...activities]
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'))
      .forEach((a) => {
        sortSubActivities(a.subActivities).forEach((sub, idx) => {
          rows.push({
            _id: `${a.id}|${sub.id}`,
            activity: a.name,
            order: idx + 1,
            name: sub.name,
            status: sub.active ? 'เปิดการใช้งาน' : 'ปิดการใช้งาน',
          });
        });
      });
    return {
      key: 'assess-activities',
      title: 'ทะเบียน Group Policy และบทบาท',
      subtitle: `ทั้งหมด ${activities.length} Group Policy · ${rows.length} บทบาท`,
      table: { columns: ACTIVITY_EXPORT_COLUMNS, rows },
    };
  };

  const canSaveActivityName = activityNameDraft.trim() && !activityNameError;

  const saveNewActivity = () => {
    const trimmed = activityNameDraft.trim();
    const err = validateActivityName(trimmed);
    if (!trimmed || err) {
      setActivityNameError(err || 'กรุณาระบุชื่อ Group Policy');
      return;
    }
    const next = [...activities, createActivity(trimmed)];
    persist(next);
    closeAddActivity();
    showToast('เพิ่ม Group Policy สำเร็จ');
  };

  /* แก้ชื่อ Group Policy inline — คืน true เมื่อบันทึกแล้ว (หรือชื่อไม่เปลี่ยน) */
  const renameActivity = (activity, name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      showError('กรุณาระบุชื่อ Group Policy');
      return false;
    }
    if (trimmed === activity.name.trim()) return true;
    if (isDuplicateActivityName(activities, trimmed, activity.id)) {
      showError(DUPLICATE_ACTIVITY_ERROR);
      return false;
    }
    persist(activities.map((a) => (a.id === activity.id ? { ...a, name: trimmed } : a)));
    showToast('แก้ไขชื่อ Group Policy สำเร็จ');
    return true;
  };

  /* แก้ชื่อบทบาท inline — กันชื่อซ้ำภายใน Group Policy เดียวกัน */
  const renameSubActivity = (activityId, subId, name) => {
    const trimmed = name.trim();
    const activity = activities.find((a) => a.id === activityId);
    if (!trimmed) {
      showError('กรุณาระบุชื่อบทบาท');
      return false;
    }
    const current = (activity?.subActivities || []).find((s) => s.id === subId);
    if (current && trimmed === current.name.trim()) return true;
    const dupe = (activity?.subActivities || []).some(
      (s) => s.id !== subId && s.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (dupe) {
      showError(DUPLICATE_SUB_ERROR);
      return false;
    }
    persist(activities.map((a) => {
      if (a.id !== activityId) return a;
      return {
        ...a,
        subActivities: (a.subActivities || []).map((s) => (
          s.id === subId ? { ...s, name: trimmed } : s
        )),
      };
    }));
    showToast('บันทึกบทบาทสำเร็จ');
    return true;
  };

  const applyDeleteActivity = () => {
    if (!deleteActivityConfirm) return;
    const next = activities.filter((a) => a.id !== deleteActivityConfirm.id);
    persist(next);
    setDeleteActivityConfirm(null);
    showToast('ลบ Group Policy สำเร็จ');
  };

  /* ชื่อบทบาทต้องไม่ซ้ำ "ภายใน Group Policy เดียวกัน" — เช็คสดระหว่างพิมพ์
     เพื่อบอกก่อนกดตกลง (ยังคงเช็คซ้ำอีกครั้งตอนบันทึกกันแข่งกันแก้) */
  const subParentForDraft = addSubFor?.pick
    ? activities.find((a) => a.id === subParentId)
    : addSubFor;
  const subDraftError = (() => {
    const name = subActivityDraft.trim();
    if (!name || !subParentForDraft) return '';
    const dupe = (subParentForDraft.subActivities || []).some(
      (x) => x.name.trim().toLowerCase() === name.toLowerCase(),
    );
    return dupe ? `มีบทบาทชื่อนี้อยู่แล้วใน "${subParentForDraft.name}"` : '';
  })();

  const saveSubActivity = () => {
    const name = subActivityDraft.trim();
    if (!name || !addSubFor) return;
    /* เปิดจากปุ่มบนหัวหน้า → parent มาจาก Select ในฟอร์ม; เปิดจากการ์ด → ใช้การ์ดนั้น */
    const parent = addSubFor.pick
      ? activities.find((a) => a.id === subParentId)
      : addSubFor;
    if (!parent) return;
    const dupe = (parent.subActivities || []).some(
      (s) => s.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (dupe) {
      showError(DUPLICATE_SUB_ERROR);
      return;
    }
    const next = activities.map((a) => {
      if (a.id !== parent.id) return a;
      const order = (a.subActivities?.length || 0) + 1;
      return { ...a, subActivities: [...(a.subActivities || []), createSubActivity(name, order)] };
    });
    persist(next);
    setAddSubFor(null);
    setSubActivityDraft('');
    showToast('เพิ่มบทบาทสำเร็จ');
  };

  const applyToggleSubActive = (activityId, subId, next) => {
    const nextActivities = activities.map((a) => {
      if (a.id !== activityId) return a;
      return {
        ...a,
        subActivities: (a.subActivities || []).map((s) => (
          s.id === subId ? { ...s, active: next } : s
        )),
      };
    });
    persist(nextActivities);
    setToggleConfirm(null);
    showToast(next ? 'เปิดใช้งานบทบาทแล้ว' : 'ปิดใช้งานบทบาทแล้ว');
  };

  const handleToggleSubActive = (activityId, subId, next) => {
    if (!next) {
      setToggleConfirm({ activityId, subId, next });
      return;
    }
    applyToggleSubActive(activityId, subId, next);
  };

  const handleDeleteSubActivity = (activity, sub) => {
    setDeleteConfirm({ activityId: activity.id, subId: sub.id, subName: sub.name });
  };

  const applyDeleteSubActivity = () => {
    if (!deleteConfirm) return;
    const { activityId, subId } = deleteConfirm;
    const next = activities.map((a) => {
      if (a.id !== activityId) return a;
      return { ...a, subActivities: (a.subActivities || []).filter((s) => s.id !== subId) };
    });
    persist(next);
    setDeleteConfirm(null);
    showToast('ลบบทบาทสำเร็จ');
  };

  return (
    <>
      <QueuePageShell
        activeKey='assess-activity'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='assess-activity'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        /* ชื่อหน้า + ปุ่มเพิ่มอยู่ใน SubHeader มาตรฐาน (เหมือนหน้าศูนย์บริการ)
           ระยะบนจึงเท่ากับหน้าอื่น และปุ่มยัง sticky ตอนเลื่อนตาราง */
        title='บทบาท'
        actions={showListChrome ? (
          <>
            <BrandButton
              ref={addBtnRef}
              variant='fill'
              size='md'
              leadingIcon='add'
              trailingIcon='expand_more'
              onClick={() => setAddMenuOpen((v) => !v)}
            >
              เพิ่ม Group Policy / บทบาท
            </BrandButton>
            <AddMenu
              anchorRef={addBtnRef}
              open={addMenuOpen}
              onClose={() => setAddMenuOpen(false)}
              items={[
                { key: 'group', label: 'เพิ่ม Group Policy', subtext: 'กลุ่มบทบาทหลัก เช่น แพทย์ · พยาบาล', onClick: openAddActivity },
                { key: 'role', label: 'เพิ่มบทบาท', subtext: 'บทบาทภายใต้ Group Policy ที่เลือก', onClick: openAddSubFromHeader },
              ]}
            />
          </>
        ) : undefined}
        headerInfo={showListChrome ? (
          <section
            className='flex flex-col w-full'
            /* ระยะบนเท่ากับหน้าศูนย์บริการ/แดชบอร์ด (25 ส.ค. 69) — เดิม space-600 ทำให้ห่างกว่าหน้าอื่น 24px */
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
        {!hasActivities ? (
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
                ในระบบยังไม่มีบทบาท
              </span>
              <BrandButton variant='fill' size='lg' leadingIcon='add' onClick={openAddActivity}>
                เพิ่ม Group Policy
              </BrandButton>
            </section>
          </div>
        ) : (
          <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}>
            {showListChrome ? (
              <section
                className='w-full flex flex-col items-center'
                style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}
              >
                {/* ปุ่มนำส่งออกรายงานอยู่ข้างกล่องค้นหา (ย้ายจากแถวตัวกรอง — 16 ส.ค. 2569) */}
                <div className='w-full flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
                  {/* spacer ซ้ายสมดุลกับกลุ่มปุ่มขวา — กล่องค้นหาอยู่กึ่งกลางจริง */}
                  <div className='flex-1' />
                  <PrimarySearch
                    value={search}
                    onChange={setSearch}
                    onSubmit={handleSubmitSearch}
                    placeholder='ค้นหาชื่อบทบาท / ชื่อบทบาท'
                    width={640}
                    history={searchHistory}
                    onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                  />
                  <div className='flex-1 flex justify-end'>
                  <NeutralSubdueButton
                    leadingIcon='ios_share'
                    size='sm'
                    collapseLabelBelow='lg'
                    onClick={() => setExportReport(buildExportReport())}
                  >
                    นำส่งออกรายงาน
                  </NeutralSubdueButton>
                  </div>
                </div>

              </section>
            ) : null}

            <SmoothFilterResults opaque={resultsOpaque}>
            {visibleActivities.map((activity) => (
              <ActivitySection
                key={activity.id}
                activity={activity}
                search={search}
                filterStatus={filterStatus}
                onRenameActivity={renameActivity}
                onDeleteActivity={setDeleteActivityConfirm}
                onAddSubActivity={openAddSubActivity}
                onRenameSubActivity={renameSubActivity}
                onDeleteSubActivity={handleDeleteSubActivity}
                onToggleSubActive={handleToggleSubActive}
              />
            ))}
            </SmoothFilterResults>

            <section
              className='flex flex-col items-center w-full'
              style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}
            >
              <EmptyIllustration size={128} ariaLabel='เพิ่ม Group Policy' />
              <BrandButton variant='fill' size='lg' leadingIcon='add' onClick={openAddActivity}>
                เพิ่ม Group Policy
              </BrandButton>
            </section>
          </div>
        )}
      </QueuePageShell>

      {/* นำส่งออกรายงาน — popup มาตรฐานเดียวกับหน้ารายงานอื่น */}
      <ExportFormatPopup
        open={!!exportReport}
        report={exportReport}
        onClose={() => setExportReport(null)}
        onExported={() => showToast('นำส่งออกรายงานบทบาทแล้ว — ระบบบันทึก log การส่งออกข้อมูล')}
      />

      {/* Add activity — Figma 8:11704 */}
      <Popup
        open={addActivityOpen}
        onClose={closeAddActivity}
        size='large'
        title='ชื่อ Group Policy'
        subtitle='ใส่ชื่อ Group Policy — กลุ่มบทบาทหลักของบุคลากร'
        tertiaryAction={{ label: 'ยกเลิก', onClick: closeAddActivity }}
        primaryAction={{
          label: 'ตกลง',
          onClick: saveNewActivity,
          disabled: !canSaveActivityName,
        }}
      >
        <InputField
          autoFocus
          showLabel={false}
          showHelperText={!!activityNameError}
          showLeadingIcon={false}
          placeholder='เช่น แพทย์, นักสังคมสงเคราะห์'
          value={activityNameDraft}
          onChange={handleActivityNameChange}
          error={activityNameError || undefined}
        />
      </Popup>

      {/* Add sub-activity — Figma 8:11833 (แก้ชื่อทำ inline ที่ชื่อในตารางแทน) */}
      <Popup
        open={!!addSubFor}
        onClose={() => setAddSubFor(null)}
        size='large'
        title={addSubFor?.pick ? 'เพิ่มบทบาท' : `บทบาทสำหรับ${addSubFor?.name || ''}`}
        subtitle={addSubFor?.pick
          ? 'เลือก Group Policy ที่จะเพิ่มบทบาทเข้าไป แล้วระบุชื่อบทบาท'
          : 'ระบุชื่อบทบาทภายใต้บทบาทนี้'}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setAddSubFor(null) }}
        primaryAction={{
          label: 'ตกลง',
          onClick: saveSubActivity,
          disabled: !subActivityDraft.trim() || !!subDraftError || (addSubFor?.pick && !subParentId),
        }}
      >
        {addSubFor?.pick && (
          <div style={{ marginBottom: 'var(--dim-space-400)' }}>
            <Select
              label='Group Policy'
              required
              options={activities.map((a) => ({ value: a.id, label: a.name }))}
              value={subParentId}
              onChange={setSubParentId}
              searchable={false}
              showHelperText={false}
            />
          </div>
        )}
        <InputField
          autoFocus
          label='บทบาท'
          required
          showLeadingIcon={false}
          placeholder='เช่น นักสังคมสงเคราะห์ศูนย์'
          value={subActivityDraft}
          onChange={setSubActivityDraft}
          error={subDraftError || undefined}
          showHelperText={!!subDraftError}
        />
      </Popup>

      <AlertDialog
        open={!!toggleConfirm}
        onClose={() => setToggleConfirm(null)}
        type='warning'
        alignment='center'
        title='ปิดการใช้งานบทบาท?'
        description='การปิดใช้งานจะทำให้บทบาทนี้ไม่สามารถใช้งานได้จนกว่าจะเปิดอีกครั้ง'
        confirmLabel='ปิดการใช้งาน'
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          if (toggleConfirm) {
            applyToggleSubActive(toggleConfirm.activityId, toggleConfirm.subId, toggleConfirm.next);
          }
        }}
      />

      <AlertDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        type='warning'
        alignment='center'
        title='ลบบทบาท?'
        description={deleteConfirm ? `ต้องการลบ "${deleteConfirm.subName}" ออกจากระบบหรือไม่` : ''}
        confirmLabel='ลบ'
        cancelLabel='ยกเลิก'
        onConfirm={applyDeleteSubActivity}
      />

      <AlertDialog
        open={!!deleteActivityConfirm}
        onClose={() => setDeleteActivityConfirm(null)}
        type='warning'
        alignment='center'
        title='ลบ Group Policy?'
        description={deleteActivityConfirm
          ? `ต้องการลบ "${deleteActivityConfirm.name}" และบทบาททั้งหมดออกจากระบบหรือไม่`
          : ''}
        confirmLabel='ลบ'
        cancelLabel='ยกเลิก'
        onConfirm={applyDeleteActivity}
      />

      <PhcisTopToast session={toast} onDismiss={dismissToast} />
    </>
  );
}
