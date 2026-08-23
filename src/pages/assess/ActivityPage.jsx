import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
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

/* PHCIS | Assess-control — กิจกรรม (Activity-based Access Control).
   แทนหน้า Group Policy เดิม (Figma 4D3nTx53 · 3:18430) — โครงหน้าเดียวกัน:
   Empty state · summary cards · search · filters · การ์ดกิจกรรม (ยุบ-กางได้)
   + ตารางกิจกรรมย่อยเรียงตามตัวอักษร · แก้ชื่อ inline · confirm dialogs.

   ปรับตาม feedback 22 ส.ค. 2569: ตัดโหมด "แก้ไขลำดับ" ออก (กิจกรรมย่อย
   เรียงตามตัวอักษรไทยเสมอ) · หัวข้อกิจกรรม collapse ได้ · ชื่อกิจกรรมหลัก
   ฟอนต์ใหญ่ขึ้น · แก้ชื่อกิจกรรม/กิจกรรมย่อยตรงชื่อผ่าน icon ดินสอ. */

const breadcrumb = ['กิจกรรม'];

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

/* ชื่อกิจกรรมหลักบนหัวการ์ด — ใหญ่กว่าเนื้อตาราง ให้ลำดับชั้นชัด
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

const DUPLICATE_ACTIVITY_ERROR = 'ชื่อกิจกรรมซ้ำกับที่มีอยู่ กรุณาเปลี่ยนชื่อกิจกรรมใหม่';
const DUPLICATE_SUB_ERROR = 'ชื่อกิจกรรมย่อยซ้ำกับที่มีอยู่ในกิจกรรมนี้';

/* นำส่งออกรายงาน — จัดกลุ่มตามกิจกรรม (คอลัมน์แรก) + แถวกิจกรรมย่อย
   ตาม context ที่เห็นบนหน้า (ค้นหา/ตัวกรอง/การเรียงตามตัวอักษร) */
const ACTIVITY_EXPORT_COLUMNS = [
  { key: 'activity', header: 'กิจกรรม', width: 220 },
  { key: 'order', header: 'ลำดับ', width: 80 },
  { key: 'name', header: 'ชื่อกิจกรรมย่อย', width: 300 },
  { key: 'status', header: 'สถานะการใช้งาน', width: 150 },
];

/* Figma 3:18431 Roles_Empty — Ambulance Lottie 160×160; list footer 6:21313 / 10:29241 — 128×128. */
const AMBULANCE_LOTTIE = '/illustration/ambulance.json';

function EmptyIllustration({ size = 160, ariaLabel = 'ยังไม่มีกิจกรรม' }) {
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
  /* เริ่มแบบกางออก — ยุบเก็บหัวข้อที่ไม่ได้ใช้ได้จาก chevron/ชื่อกิจกรรม */
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
      header: 'ชื่อกิจกรรมย่อย',
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

  const badgeLabel = `${(activity.subActivities || []).length} กิจกรรมย่อย`;

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
              aria-label={`${isOpen ? 'ยุบ' : 'กาง'}กิจกรรม ${activity.name}`}
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
              ariaLabel={`แก้ไขชื่อกิจกรรม ${activity.name}`}
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
              aria-label={`แก้ไขชื่อกิจกรรม ${activity.name}`}
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
            aria-label={`ลบกิจกรรม ${activity.name}`}
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
            aria-label={`${isOpen ? 'ยุบ' : 'กาง'}กิจกรรม ${activity.name}`}
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
              emptyMessage='ยังไม่มีกิจกรรมย่อย'
            />
          ) : null}
          <BrandDashedAddButton onClick={() => onAddSubActivity(activity)}>
            เพิ่มกิจกรรมย่อย
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
  const [addSubFor, setAddSubFor] = useState(null); // activity object
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

  /* ค่า active/inactive นับระดับกิจกรรมย่อย (สถานะเปิด/ปิดอยู่ที่กิจกรรมย่อย)
     — label จึงต้องพูดว่า "กิจกรรมย่อย" ไม่ใช่ "กิจกรรม" */
  const summaryCards = useMemo(() => [
    { key: 'total', icon: 'clipboard-list', color: 'info', value: String(stats.total), label: 'กิจกรรมทั้งหมด' },
    { key: 'active', icon: 'clipboard-list', color: 'positive', value: String(stats.active), label: 'กิจกรรมย่อยที่เปิดใช้งาน' },
    {
      key: 'inactive',
      icon: 'clipboard-list',
      color: 'destructive',
      value: String(stats.inactive),
      label: 'กิจกรรมย่อยที่ปิดใช้งาน',
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
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
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

  /* รายงาน **ทั้งหมด** — ทุกกิจกรรม/กิจกรรมย่อยในทะเบียน (ไม่ตัดตาม
     ตัวกรอง/คำค้นบนหน้า) แบ่งเป็นกลุ่มหลัก (กิจกรรม) → กลุ่มย่อย
     (กิจกรรมย่อย) เรียงตามตัวอักษรทั้งสองระดับ */
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
      title: 'ทะเบียนกิจกรรมและกิจกรรมย่อย',
      subtitle: `ทั้งหมด ${activities.length} กิจกรรมหลัก · ${rows.length} กิจกรรมย่อย`,
      table: { columns: ACTIVITY_EXPORT_COLUMNS, rows },
    };
  };

  const canSaveActivityName = activityNameDraft.trim() && !activityNameError;

  const saveNewActivity = () => {
    const trimmed = activityNameDraft.trim();
    const err = validateActivityName(trimmed);
    if (!trimmed || err) {
      setActivityNameError(err || 'กรุณาระบุชื่อกิจกรรม');
      return;
    }
    const next = [...activities, createActivity(trimmed)];
    persist(next);
    closeAddActivity();
    showToast('เพิ่มกิจกรรมสำเร็จ');
  };

  /* แก้ชื่อกิจกรรมหลัก inline — คืน true เมื่อบันทึกแล้ว (หรือชื่อไม่เปลี่ยน) */
  const renameActivity = (activity, name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      showError('กรุณาระบุชื่อกิจกรรม');
      return false;
    }
    if (trimmed === activity.name.trim()) return true;
    if (isDuplicateActivityName(activities, trimmed, activity.id)) {
      showError(DUPLICATE_ACTIVITY_ERROR);
      return false;
    }
    persist(activities.map((a) => (a.id === activity.id ? { ...a, name: trimmed } : a)));
    showToast('แก้ไขชื่อกิจกรรมสำเร็จ');
    return true;
  };

  /* แก้ชื่อกิจกรรมย่อย inline — กันชื่อซ้ำภายในกิจกรรมเดียวกัน */
  const renameSubActivity = (activityId, subId, name) => {
    const trimmed = name.trim();
    const activity = activities.find((a) => a.id === activityId);
    if (!trimmed) {
      showError('กรุณาระบุชื่อกิจกรรมย่อย');
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
    showToast('บันทึกกิจกรรมย่อยสำเร็จ');
    return true;
  };

  const applyDeleteActivity = () => {
    if (!deleteActivityConfirm) return;
    const next = activities.filter((a) => a.id !== deleteActivityConfirm.id);
    persist(next);
    setDeleteActivityConfirm(null);
    showToast('ลบกิจกรรมสำเร็จ');
  };

  const saveSubActivity = () => {
    const name = subActivityDraft.trim();
    if (!name || !addSubFor) return;
    const dupe = (addSubFor.subActivities || []).some(
      (s) => s.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (dupe) {
      showError(DUPLICATE_SUB_ERROR);
      return;
    }
    const next = activities.map((a) => {
      if (a.id !== addSubFor.id) return a;
      const order = (a.subActivities?.length || 0) + 1;
      return { ...a, subActivities: [...(a.subActivities || []), createSubActivity(name, order)] };
    });
    persist(next);
    setAddSubFor(null);
    setSubActivityDraft('');
    showToast('เพิ่มกิจกรรมย่อยสำเร็จ');
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
    showToast(next ? 'เปิดใช้งานกิจกรรมย่อยแล้ว' : 'ปิดใช้งานกิจกรรมย่อยแล้ว');
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
    showToast('ลบกิจกรรมย่อยสำเร็จ');
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
        title='กิจกรรม'
        actions={showListChrome ? (
          <BrandButton variant='fill' size='md' leadingIcon='add' onClick={openAddActivity}>
            เพิ่มกิจกรรม
          </BrandButton>
        ) : undefined}
        headerInfo={showListChrome ? (
          <section
            className='flex flex-col w-full'
            style={{ gap: 'var(--dim-space-400)', paddingTop: 'var(--dim-space-600)' }}
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
                ในระบบยังไม่มีกิจกรรม
              </span>
              <BrandButton variant='fill' size='lg' leadingIcon='add' onClick={openAddActivity}>
                เพิ่มกิจกรรม
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
                    placeholder='ค้นหาชื่อกิจกรรม / ชื่อกิจกรรมย่อย'
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

                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                  <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                    <FilterDropdown
                      prefix='สถานะ:'
                      options={STATUS_OPTIONS.filter((o) => o.value !== '')}
                      value={filterStatus}
                      onChange={setFilterStatus}
                      placeholder='ทั้งหมด'
                    />
                    <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
                  </div>
                  <div className='flex-1' />
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
              <EmptyIllustration size={128} ariaLabel='เพิ่มกิจกรรม' />
              <BrandButton variant='fill' size='lg' leadingIcon='add' onClick={openAddActivity}>
                เพิ่มกิจกรรม
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
        onExported={() => showToast('นำส่งออกรายงานกิจกรรมแล้ว — ระบบบันทึก log การส่งออกข้อมูล')}
      />

      {/* Add activity — Figma 8:11704 */}
      <Popup
        open={addActivityOpen}
        onClose={closeAddActivity}
        size='large'
        title='ชื่อกิจกรรม'
        subtitle='ใส่ชื่อกิจกรรมหลักของบุคลากร'
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
        title={`กิจกรรมย่อยสำหรับ${addSubFor?.name || ''}`}
        subtitle='ระบุชื่อกิจกรรมย่อยภายใต้กิจกรรมนี้'
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setAddSubFor(null) }}
        primaryAction={{
          label: 'ตกลง',
          onClick: saveSubActivity,
          disabled: !subActivityDraft.trim(),
        }}
      >
        <InputField
          autoFocus
          label='กิจกรรมย่อย'
          required
          showLeadingIcon={false}
          placeholder='เช่น นักสังคมสงเคราะห์ศูนย์'
          value={subActivityDraft}
          onChange={setSubActivityDraft}
        />
      </Popup>

      <AlertDialog
        open={!!toggleConfirm}
        onClose={() => setToggleConfirm(null)}
        type='warning'
        alignment='center'
        title='ปิดการใช้งานกิจกรรมย่อย?'
        description='การปิดใช้งานจะทำให้กิจกรรมย่อยนี้ไม่สามารถใช้งานได้จนกว่าจะเปิดอีกครั้ง'
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
        title='ลบกิจกรรมย่อย?'
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
        title='ลบกิจกรรม?'
        description={deleteActivityConfirm
          ? `ต้องการลบ "${deleteActivityConfirm.name}" และกิจกรรมย่อยทั้งหมดออกจากระบบหรือไม่`
          : ''}
        confirmLabel='ลบ'
        cancelLabel='ยกเลิก'
        onConfirm={applyDeleteActivity}
      />

      <PhcisTopToast session={toast} onDismiss={dismissToast} />
    </>
  );
}
