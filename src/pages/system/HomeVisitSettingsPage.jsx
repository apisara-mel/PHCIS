import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Textarea from '@/components/forms/Textarea';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import FilterTag from '@/components/forms/FilterTag';
import Stepper from '@/components/stepper/Stepper';
import Switch from '@/components/switch/Switch';
import Alert from '@/components/alert/Alert';
import Popup from '@/components/popup/Popup';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import Footer from '@/components/layout/Footer';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import SYSTEM_NAV from '@/pages/system/systemNav';
import { HOMEVISIT_GROUPS } from '@/data/homevisitVisits';
import {
  getHomeVisitQuotaSettings,
  getHomeVisitQuotaAudit,
  saveHomeVisitQuotaSettings,
} from '@/data/homevisitQuotaSettings';
import {
  getHomeVisitCareActivities,
  getHomeVisitCareTemplates,
  getHomeVisitCareTemplateAudit,
  saveHomeVisitCareCatalog,
} from '@/data/homevisitCareTemplates';
import {
  getHomeVisitFlagCatalog,
  getHomeVisitFlagAudit,
  saveHomeVisitFlagCatalog,
} from '@/data/homevisitFlagSettings';
import { COLORFUL_BADGE_STYLES } from '@/components/badge/ColorfulBadge';
import { currentUserName, isBureauAdmin } from '@/pages/users/usersShared';

/* ระบบจัดการระบบ · ตั้งค่าการเยี่ยมบ้าน
   มาสเตอร์เพดาน สปสช. ระดับสำนักอนามัยตามมติ คทง.4 ครั้งที่ 6 ต่อ TOR §1.18.1.
   ไม่มีข้อมูลคิวหรือการลงเยี่ยมในหน้านี้ — workflow นั้นอยู่ที่ /homevisit. */

const breadcrumb = ['จัดการระบบ', 'ตั้งค่าการเยี่ยมบ้าน'];
const PAGE_TABS = [
  { key: 'quota', label: 'ตั้งค่าโควตา' },
  { key: 'templates', label: 'เทมเพลตกิจกรรม/เป้าหมาย' },
  { key: 'flags', label: 'Flag เยี่ยมบ้าน' },
  { key: 'audit', label: 'ประวัติการแก้ไข' },
];

const HORIZON_OPTIONS = [
  { value: 'short', label: 'ระยะสั้น · ไม่เกิน 3 เดือน' },
  { value: 'long', label: 'ระยะยาว · 6 เดือน' },
];

const emptyTemplate = (sortOrder = 1) => ({
  id: `care-template-${Date.now()}`,
  active: true,
  problem: '',
  goal: '',
  horizon: 'short',
  evaluation: '',
  activityIds: [],
  sortOrder,
});
const emptyFlag = (sortOrder = 1) => ({ value: `custom-${Date.now()}`, label: '', badge: 'teal', active: true, sortOrder, note: '' });

const sameCatalog = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
};

const TEXT = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
};

const SUBTEXT = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  fontWeight: 'var(--type-weight-regular)',
};

const sameRows = (left = [], right = []) => left.every((row) => {
  const compare = right.find((item) => item.group === row.group);
  return compare
    && Number(row.quota) === Number(compare.quota)
    && Number(row.followUpDays) === Number(compare.followUpDays);
});

const groupMeta = (group) => HOMEVISIT_GROUPS.find((item) => item.value === group);

const auditTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function HomeVisitSettingsPage() {
  const history = useHistory();
  const [settings, setSettings] = useState(() => getHomeVisitQuotaSettings());
  const [draftRows, setDraftRows] = useState(() => getHomeVisitQuotaSettings().rows);
  const [auditRows, setAuditRows] = useState(() => getHomeVisitQuotaAudit());
  const [careCatalog, setCareCatalog] = useState(() => ({
    activities: getHomeVisitCareActivities(),
    templates: getHomeVisitCareTemplates(),
  }));
  const [savedCareCatalog, setSavedCareCatalog] = useState(() => ({
    activities: getHomeVisitCareActivities(),
    templates: getHomeVisitCareTemplates(),
  }));
  const [careAuditRows, setCareAuditRows] = useState(() => getHomeVisitCareTemplateAudit());
  const [flagCatalog, setFlagCatalog] = useState(() => getHomeVisitFlagCatalog());
  const [savedFlagCatalog, setSavedFlagCatalog] = useState(() => getHomeVisitFlagCatalog());
  const [flagAuditRows, setFlagAuditRows] = useState(() => getHomeVisitFlagAudit());
  const [flagPopupOpen, setFlagPopupOpen] = useState(false);
  const [flagDraft, setFlagDraft] = useState(null);
  const [flagReasonPopupOpen, setFlagReasonPopupOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagErrors, setFlagErrors] = useState({});
  const [templatePopupOpen, setTemplatePopupOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState(null);
  const [templateReasonPopupOpen, setTemplateReasonPopupOpen] = useState(false);
  const [templateReason, setTemplateReason] = useState('');
  const [templateErrors, setTemplateErrors] = useState({});
  const [statusToggle, setStatusToggle] = useState(null);
  const [activeTab, setActiveTab] = useState('quota');
  const [auditTypeFilter, setAuditTypeFilter] = useState('all');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [reasonPopupOpen, setReasonPopupOpen] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);
  const [leaveAfterSave, setLeaveAfterSave] = useState(false);
  const [toast, setToast] = useState('');

  /* ผู้ดูแลระดับสำนักเท่านั้นเป็นเจ้าของ master ชุดนี้; บุคลากรบทบาทอื่นเห็น
     ค่าเดียวกันแบบอ่านอย่างเดียว เพื่อไม่ให้แก้เพดานจากงานปฏิบัติการได้. */
  const isAdmin = isBureauAdmin();
  const dirty = !sameRows(draftRows, settings.rows);
  const careDirty = !sameCatalog(careCatalog, savedCareCatalog);
  const flagDirty = !sameCatalog(flagCatalog, savedFlagCatalog);

  const updateRow = (group, field, raw) => {
    if (!isAdmin) return;
    const value = String(raw || '').replace(/[^0-9]/g, '');
    setDraftRows((rows) => rows.map((row) => (
      row.group === group ? { ...row, [field]: value } : row
    )));
    setErrors((current) => ({ ...current, [`${group}.${field}`]: undefined, reason: undefined }));
  };

  const validate = ({ requireReason = false } = {}) => {
    const nextErrors = {};
    draftRows.forEach((row) => {
      if (!Number.isInteger(Number(row.quota)) || Number(row.quota) <= 0) {
        nextErrors[`${row.group}.quota`] = 'กรอกจำนวนเต็มบวกมากกว่า 0';
      }
      if (!Number.isInteger(Number(row.followUpDays)) || Number(row.followUpDays) <= 0) {
        nextErrors[`${row.group}.followUpDays`] = 'กรอกจำนวนเต็มบวกมากกว่า 0 วัน';
      }
    });
    if (requireReason && !reason.trim()) nextErrors.reason = 'ระบุเหตุผลที่ปรับเพดานหรือรอบติดตาม';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const requestSave = (leave = false) => {
    if (!isAdmin || !dirty) return;
    if (!validate()) return;
    setLeaveAfterSave(leave);
    setUnsavedOpen(false);
    setReasonPopupOpen(true);
  };

  const save = () => {
    if (!validate({ requireReason: true })) return;
    try {
      const saved = saveHomeVisitQuotaSettings(
        { rows: draftRows },
        { reason, by: currentUserName() },
      );
      setSettings(saved.settings);
      setDraftRows(saved.settings.rows);
      setAuditRows(saved.audit);
      setReason('');
      setReasonPopupOpen(false);
      setToast(`บันทึกเพดานการเยี่ยมบ้านแล้ว · ${saved.settings.savedBy}`);
      if (pendingTab) setActiveTab(pendingTab);
      if (leaveAfterSave && !pendingTab) history.push('/admin');
      setPendingTab(null);
      setLeaveAfterSave(false);
    } catch (error) {
      setErrors({ reason: error.message || 'บันทึกการตั้งค่าไม่สำเร็จ' });
    }
  };

  const discardAndLeave = () => {
    setUnsavedOpen(false);
    setDraftRows(settings.rows.map((row) => ({ ...row })));
    setCareCatalog({
      activities: savedCareCatalog.activities.map((activity) => ({ ...activity })),
      templates: savedCareCatalog.templates.map((template) => ({ ...template, activityIds: [...template.activityIds] })),
    });
    setFlagCatalog(savedFlagCatalog.map((row) => ({ ...row })));
    setReason('');
    setErrors({});
    if (pendingTab) setActiveTab(pendingTab);
    else history.push('/admin');
    setPendingTab(null);
  };

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    if ((activeTab === 'quota' && dirty) || (activeTab === 'templates' && careDirty) || (activeTab === 'flags' && flagDirty)) {
      setPendingTab(tab);
      setUnsavedOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  const patchFlagDraft = (field, value) => {
    setFlagDraft((current) => ({ ...current, [field]: value }));
    setFlagErrors((current) => ({ ...current, [field]: undefined }));
  };
  const flagDraftReady = useMemo(() => {
    if (!flagDraft?.label?.trim() || !COLORFUL_BADGE_STYLES.includes(flagDraft.badge)) return false;
    const original = flagCatalog.find((row) => row.value === flagDraft.value);
    return !original || !sameCatalog(flagDraft, original);
  }, [flagCatalog, flagDraft]);
  const saveFlagDraft = () => {
    const nextErrors = {};
    if (!flagDraft?.label?.trim()) nextErrors.label = 'ระบุชื่อ Flag';
    if (!COLORFUL_BADGE_STYLES.includes(flagDraft?.badge)) nextErrors.badge = 'เลือกสีป้าย';
    const duplicate = flagCatalog.some((row) => row.value !== flagDraft?.value && row.active && row.label.trim().toLowerCase() === flagDraft?.label?.trim().toLowerCase());
    if (duplicate) nextErrors.label = 'ชื่อ Flag ที่เปิดใช้ต้องไม่ซ้ำกัน';
    if (Object.keys(nextErrors).length) { setFlagErrors(nextErrors); return; }
    setFlagCatalog((rows) => rows.some((row) => row.value === flagDraft.value)
      ? rows.map((row) => (row.value === flagDraft.value ? flagDraft : row))
      : [...rows, flagDraft]);
    setFlagPopupOpen(false); setFlagDraft(null);
  };
  const confirmFlagToggle = () => {
    if (!statusToggle) return;
    setFlagCatalog((rows) => rows.map((row) => (row.value === statusToggle.id ? { ...row, active: statusToggle.next } : row)));
    setStatusToggle(null);
  };
  const saveFlags = () => {
    if (!flagReason.trim()) { setFlagErrors((current) => ({ ...current, reason: 'ระบุเหตุผลการปรับแคตตาล็อก Flag' })); return; }
    try {
      const saved = saveHomeVisitFlagCatalog(flagCatalog, { reason: flagReason, by: currentUserName() });
      setFlagCatalog(saved.state.catalog); setSavedFlagCatalog(saved.state.catalog); setFlagAuditRows(saved.audit);
      setFlagReason(''); setFlagReasonPopupOpen(false); setToast(`บันทึกแคตตาล็อก Flag แล้ว · ${saved.state.savedBy}`);
      if (pendingTab) setActiveTab(pendingTab); setPendingTab(null);
    } catch (error) { setFlagErrors((current) => ({ ...current, reason: error.message || 'บันทึกแคตตาล็อก Flag ไม่สำเร็จ' })); }
  };

  const activityOptions = useMemo(() => careCatalog.activities
    .filter((activity) => activity.active)
    .map((activity) => ({ value: activity.key, label: `${activity.label} · ${activity.group}` })), [careCatalog.activities]);

  const templateDraftReady = useMemo(() => {
    if (!templateDraft) return false;
    const activeActivityCount = (templateDraft.activityIds || []).filter((id) => careCatalog.activities
      .some((activity) => activity.key === id && activity.active)).length;
    const complete = Boolean(
      templateDraft.problem?.trim()
      && templateDraft.goal?.trim()
      && templateDraft.evaluation?.trim()
      && ['short', 'long'].includes(templateDraft.horizon)
      && activeActivityCount > 0,
    );
    if (!complete) return false;
    const original = careCatalog.templates.find((template) => template.id === templateDraft.id);
    return !original || !sameCatalog(templateDraft, original);
  }, [careCatalog.activities, careCatalog.templates, templateDraft]);


  const patchTemplateDraft = (field, value) => {
    setTemplateDraft((current) => ({ ...current, [field]: value }));
    setTemplateErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validateTemplateDraft = () => {
    const nextErrors = {};
    if (!templateDraft?.problem?.trim()) nextErrors.problem = 'ระบุปัญหาของผู้รับบริการ';
    if (!templateDraft?.goal?.trim()) nextErrors.goal = 'ระบุเป้าหมาย';
    if (!templateDraft?.evaluation?.trim()) nextErrors.evaluation = 'ระบุเกณฑ์ประเมินผล';
    if (!['short', 'long'].includes(templateDraft?.horizon)) nextErrors.horizon = 'เลือกระยะเป้าหมาย';
    const activeIds = (templateDraft?.activityIds || []).filter((id) => careCatalog.activities
      .some((activity) => activity.key === id && activity.active));
    if (activeIds.length === 0) nextErrors.activityIds = 'เลือกกิจกรรมที่เปิดใช้อย่างน้อย 1 รายการ';
    setTemplateErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveTemplateDraft = () => {
    if (!validateTemplateDraft()) return;
    setCareCatalog((catalog) => {
      const exists = catalog.templates.some((template) => template.id === templateDraft.id);
      return {
        ...catalog,
        templates: exists
          ? catalog.templates.map((template) => (template.id === templateDraft.id ? templateDraft : template))
          : [...catalog.templates, templateDraft],
      };
    });
    setTemplatePopupOpen(false);
    setTemplateDraft(null);
  };

  const confirmStatusToggle = () => {
    if (!statusToggle) return;
    setCareCatalog((catalog) => ({
      ...catalog,
      [statusToggle.kind === 'template' ? 'templates' : 'activities']: catalog[
        statusToggle.kind === 'template' ? 'templates' : 'activities'
      ].map((item) => ((item.id || item.key) === statusToggle.id ? { ...item, active: statusToggle.next } : item)),
    }));
    setStatusToggle(null);
  };

  const requestCareSave = () => {
    if (!isAdmin || !careDirty) return;
    setUnsavedOpen(false);
    setTemplateReasonPopupOpen(true);
  };

  const saveCareCatalog = () => {
    if (!templateReason.trim()) {
      setTemplateErrors((current) => ({ ...current, reason: 'ระบุเหตุผลการปรับเทมเพลตหรือกิจกรรม' }));
      return;
    }
    try {
      const saved = saveHomeVisitCareCatalog(careCatalog, { reason: templateReason, by: currentUserName() });
      setCareCatalog({ activities: saved.state.activities, templates: saved.state.templates });
      setSavedCareCatalog({ activities: saved.state.activities, templates: saved.state.templates });
      setCareAuditRows(saved.audit);
      setTemplateReason('');
      setTemplateReasonPopupOpen(false);
      setToast(`บันทึกเทมเพลตกิจกรรม/เป้าหมายแล้ว · ${saved.state.savedBy}`);
      if (pendingTab) setActiveTab(pendingTab);
      setPendingTab(null);
    } catch (error) {
      setTemplateErrors((current) => ({ ...current, reason: error.message || 'บันทึกเทมเพลตไม่สำเร็จ' }));
    }
  };

  const settingColumns = useMemo(() => [
    {
      key: 'group', label: 'กลุ่มผู้รับบริการ',
      render: (row) => {
        const meta = groupMeta(row.group);
        return (
          <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
            <span className='shrink-0'>
              <ColorfulBadge style={meta?.badge || 'grey'} size='small' hierarchy='secondary' width='hug'>
                {meta?.short || row.group}
              </ColorfulBadge>
            </span>
            <span className='min-w-0' style={TEXT}>{meta?.label || row.group}</span>
          </div>
        );
      },
    },
    {
      key: 'quota', label: 'โควตา สปสช. (ครั้ง/ปีงบ)', sortable: false,
      render: (row) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
          <Stepper
            aria-label={`โควตา สปสช. ${groupMeta(row.group)?.short || row.group}`}
            value={row.quota === '' ? null : Number(row.quota)}
            onChange={(value) => updateRow(row.group, 'quota', value ?? '')}
            min={1}
            step={1}
            size='large'
            disabled={!isAdmin}
          />
          {errors[`${row.group}.quota`] ? (
            <span style={{ color: 'var(--text-input-errorHelper)', fontSize: 'var(--type-size-xs)' }}>
              {errors[`${row.group}.quota`]}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'note', label: 'หมายเหตุ seed เดิม', sortable: false,
      render: (row) => <span style={SUBTEXT}>{row.note}</span>,
    },
    {
      key: 'followUpDays', label: 'รอบติดตาม (วัน)', sortable: false,
      render: (row) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
          <Stepper
            aria-label={`รอบติดตาม ${groupMeta(row.group)?.short || row.group}`}
            value={row.followUpDays === '' ? null : Number(row.followUpDays)}
            onChange={(value) => updateRow(row.group, 'followUpDays', value ?? '')}
            min={1}
            step={1}
            size='large'
            disabled={!isAdmin}
          />
          {errors[`${row.group}.followUpDays`] ? (
            <span style={{ color: 'var(--text-input-errorHelper)', fontSize: 'var(--type-size-xs)' }}>
              {errors[`${row.group}.followUpDays`]}
            </span>
          ) : null}
        </div>
      ),
    },
  ], [errors, isAdmin]);

  const auditColumns = useMemo(() => [
    {
      key: 'group', label: 'กลุ่มผู้รับบริการ',
      render: (row) => {
        const meta = groupMeta(row.group);
        return <span style={TEXT}>{meta?.label || row.group}</span>;
      },
    },
    {
      key: 'quota', label: 'โควตา (ครั้ง/ปีงบ)', sortable: false,
      render: (row) => <span style={TEXT}>{`${row.before.quota} → ${row.after.quota}`}</span>,
    },
    {
      key: 'followUpDays', label: 'รอบติดตาม (วัน)', sortable: false,
      render: (row) => <span style={TEXT}>{`${row.before.followUpDays} → ${row.after.followUpDays}`}</span>,
    },
    { key: 'by', label: 'ผู้ดำเนินการ', render: (row) => <span style={TEXT}>{row.by}</span> },
    { key: 'at', label: 'วันเวลา', render: (row) => <span style={SUBTEXT}>{auditTime(row.at)}</span> },
    {
      key: 'reason', label: 'เหตุผล', flex: true,
      render: (row) => <span style={TEXT}>{row.reason}</span>,
    },
  ], []);

  const careTemplateColumns = useMemo(() => [
    { key: 'problem', label: 'ปัญหา', render: (row) => <span style={TEXT}>{row.problem}</span> },
    { key: 'goal', label: 'เป้าหมาย', render: (row) => <span style={TEXT}>{row.goal}</span> },
    {
      key: 'horizon', label: 'ระยะ', sortable: false,
      render: (row) => (
        <ColorfulBadge style={row.horizon === 'long' ? 'purple' : 'blue'} size='small' hierarchy='secondary' width='hug'>
          {row.horizon === 'long' ? 'ระยะยาว · 6 เดือน' : 'ระยะสั้น · ≤ 3 เดือน'}
        </ColorfulBadge>
      ),
    },
    {
      key: 'activities', label: 'กิจกรรมที่ผูก', sortable: false,
      render: (row) => <span style={SUBTEXT}>{row.activityIds.map((id) => careCatalog.activities.find((activity) => activity.key === id)?.label || id).join(' · ') || '—'}</span>,
    },
    {
      key: 'active', label: 'สถานะ', sortable: false,
      render: (row) => (
        <Switch
          checked={row.active}
          disabled={!isAdmin}
          onChange={(active) => setStatusToggle({ kind: 'template', id: row.id, name: row.problem, next: active })}
          aria-label={`สถานะ ${row.problem}`}
        />
      ),
    },
    {
      key: 'edit', label: '', sortable: false,
      render: (row) => (
        <BrandSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='edit'
          disabled={!isAdmin}
          onClick={() => { setTemplateDraft({ ...row, activityIds: [...row.activityIds] }); setTemplateErrors({}); setTemplatePopupOpen(true); }}
        >
          แก้ไข
        </BrandSubdueButton>
      ),
    },
  ], [careCatalog.activities, isAdmin]);

  const flagColumns = useMemo(() => [
    { key: 'label', label: 'ชื่อ Flag', render: (row) => <span style={TEXT}>{row.label}</span> },
    { key: 'note', label: 'รายละเอียด', render: (row) => <span style={SUBTEXT}>{row.note || '—'}</span> },
    { key: 'badge', label: 'ตัวอย่างป้าย', render: (row) => <ColorfulBadge style={row.badge} size='small' hierarchy='secondary' width='hug'>{row.label || 'ตัวอย่างป้าย'}</ColorfulBadge> },
    { key: 'active', label: 'สถานะ', sortable: false, render: (row) => <Switch checked={row.active} disabled={!isAdmin} onChange={(active) => setStatusToggle({ kind: 'flag', id: row.value, name: row.label, next: active })} aria-label={`สถานะ ${row.label}`} /> },
    { key: 'edit', label: '', sortable: false, render: (row) => <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' disabled={!isAdmin} onClick={() => { setFlagDraft({ ...row }); setFlagErrors({}); setFlagPopupOpen(true); }}>แก้ไข</BrandSubdueButton> },
  ], [isAdmin]);

  const careAuditColumns = useMemo(() => [
    {
      key: 'entity', label: 'รายการ',
      render: (row) => <span style={TEXT}>{row.entity === 'activity' ? 'แคตตาล็อกกิจกรรม' : 'เทมเพลตกิจกรรม/เป้าหมาย'}</span>,
    },
    {
      key: 'before', label: 'ค่าเดิม → ค่าใหม่', sortable: false,
      render: (row) => {
        const before = row.before?.problem || row.before?.label || '—';
        const after = row.after?.problem || row.after?.label || 'ปิดใช้/นำออกจากรายการ';
        return <span style={TEXT}>{`${before} → ${after}`}</span>;
      },
    },
    { key: 'by', label: 'ผู้ดำเนินการ', render: (row) => <span style={TEXT}>{row.by}</span> },
    { key: 'at', label: 'วันเวลา', render: (row) => <span style={SUBTEXT}>{auditTime(row.at)}</span> },
    { key: 'reason', label: 'เหตุผล', flex: true, render: (row) => <span style={TEXT}>{row.reason}</span> },
  ], []);

  const combinedAuditRows = useMemo(() => [
    ...auditRows.map((row) => ({
      id: `quota-${row.id}`,
      type: 'quota',
      item: groupMeta(row.group)?.label || row.group,
      before: `โควตา ${row.before.quota} ครั้ง · รอบติดตาม ${row.before.followUpDays} วัน`,
      after: `โควตา ${row.after.quota} ครั้ง · รอบติดตาม ${row.after.followUpDays} วัน`,
      by: row.by,
      at: row.at,
      reason: row.reason,
    })),
    ...careAuditRows.map((row) => ({
      id: `care-${row.id}`,
      type: 'template',
      item: row.after?.problem || row.after?.label || row.before?.problem || row.before?.label || '—',
      before: row.before?.problem || row.before?.label || '—',
      after: row.after?.problem || row.after?.label || 'ปิดใช้รายการ',
      by: row.by,
      at: row.at,
      reason: row.reason,
    })),
    ...flagAuditRows.map((row) => ({
      id: `flag-${row.id}`,
      type: 'flag',
      item: row.after?.label || row.before?.label || row.entityId,
      before: row.before?.label || '—',
      after: row.after?.label || 'ปิดใช้รายการ',
      by: row.by, at: row.at, reason: row.reason,
    })),
  ].sort((left, right) => String(right.at || '').localeCompare(String(left.at || ''))), [auditRows, careAuditRows, flagAuditRows]);

  const combinedAuditColumns = useMemo(() => [
    { key: 'at', label: 'วันเวลา', render: (row) => <span style={SUBTEXT}>{auditTime(row.at)}</span> },
    {
      key: 'type', label: 'ประเภทการแก้ไข', sortable: false,
      render: (row) => (
        <ColorfulBadge style={row.type === 'quota' ? 'blue' : row.type === 'template' ? 'purple' : 'orange'} size='small' hierarchy='secondary' width='hug'>
          {row.type === 'quota' ? 'โควตาและรอบติดตาม' : row.type === 'template' ? 'เทมเพลตกิจกรรม/เป้าหมาย' : 'Flag เยี่ยมบ้าน'}
        </ColorfulBadge>
      ),
    },
    { key: 'item', label: 'รายการ', render: (row) => <span style={TEXT}>{row.item}</span> },
    { key: 'change', label: 'ค่าเดิม → ค่าใหม่', sortable: false, render: (row) => <span style={TEXT}>{`${row.before} → ${row.after}`}</span> },
    { key: 'by', label: 'ผู้ดำเนินการ', render: (row) => <span style={TEXT}>{row.by}</span> },
    { key: 'reason', label: 'เหตุผล', flex: true, render: (row) => <span style={TEXT}>{row.reason}</span> },
  ], []);
  const visibleAuditRows = useMemo(() => combinedAuditRows.filter((row) => (
    auditTypeFilter === 'all' || row.type === auditTypeFilter
  )), [auditTypeFilter, combinedAuditRows]);

  return (
    <>
      <QueuePageShell
        activeKey='system-homevisit'
        sidebarItems={SYSTEM_NAV}
        sidebarFallbackKey='system-homevisit'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title='ตั้งค่าการเยี่ยมบ้าน'
        tabs={PAGE_TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            paddingTop: 'var(--dim-space-600)',
            paddingRight: 'var(--dim-space-600)',
            paddingBottom: 'var(--dim-space-600)',
            paddingLeft: 'var(--dim-space-600)',
            gap: 'var(--dim-space-400)',
          }}
        >
          {!isAdmin ? (
            <Alert
              type='warning'
              title='สิทธิ์ไม่เพียงพอสำหรับการแก้ไข'
              subtext='คุณดูเพดานและประวัติได้ แต่การปรับโควตาและรอบติดตามทำได้เฉพาะผู้ดูแลระบบระดับสำนักอนามัย'
              showDetail={false}
              showBadge={false}
              showIndicator={false}
            />
          ) : null}

          {activeTab === 'quota' ? (
            <section className='w-full flex flex-col' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
              <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
                  <h2 style={{ color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-heading-content)', fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-bold)' }}>
                    โควตาและรอบติดตามตามกลุ่มผู้รับบริการ
                  </h2>
                </div>
                {dirty ? <ColorfulBadge style='orange' size='small' hierarchy='secondary'>มีการแก้ไขที่ยังไม่บันทึก</ColorfulBadge> : null}
              </div>
              <Table
                columns={settingColumns}
                rows={draftRows}
                rowKey={(row) => row.group}
                pagination={false}
                stickyColCount={1}
                stickyShadow
                emptyMessage='ไม่พบกลุ่มผู้รับบริการ'
              />
            </section>
          ) : null}

          {activeTab === 'templates' ? (
            <section className='w-full flex flex-col' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
              <div className='flex items-start justify-between flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
                  <h2 style={{ color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-heading-content)', fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-bold)' }}>
                    Template กิจกรรม/เป้าหมาย
                  </h2>
                </div>
                {isAdmin ? (
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                    <BrandSubdueButton
                      variant='fill'
                      size='md'
                      leadingIcon='add'
                      onClick={() => { setTemplateDraft(emptyTemplate(careCatalog.templates.length + 1)); setTemplateErrors({}); setTemplatePopupOpen(true); }}
                    >
                      เพิ่มเทมเพลต
                    </BrandSubdueButton>
                  </div>
                ) : null}
              </div>
              {careDirty ? <ColorfulBadge style='orange' size='small' hierarchy='secondary' width='hug'>มีการแก้ไขที่ยังไม่บันทึก</ColorfulBadge> : null}
              <Table
                columns={careTemplateColumns}
                rows={careCatalog.templates}
                rowKey={(row) => row.id}
                pagination={false}
                stickyColCount={1}
                stickyShadow
                emptyMessage='ยังไม่มีเทมเพลตกิจกรรม/เป้าหมาย'
              />
            </section>
          ) : null}

          {activeTab === 'flags' ? (
            <section className='w-full flex flex-col' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
              <div className='flex items-start justify-between flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-100)' }}><h2 style={{ color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-heading-content)', fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-bold)' }}>Flag เยี่ยมบ้าน</h2><span style={SUBTEXT}>แคตตาล็อกชนิดธงตาม TOR §1.10.12.1 และ §1.1.3.1 · ไม่ใช่ Flag เวชระเบียน โควตา หรือป้ายกลุ่มระยะสุดท้าย/กลุ่มพิเศษ</span></div>
                {isAdmin ? <BrandSubdueButton variant='fill' size='md' leadingIcon='add' onClick={() => { setFlagDraft(emptyFlag(flagCatalog.length + 1)); setFlagErrors({}); setFlagPopupOpen(true); }}>เพิ่ม Flag</BrandSubdueButton> : null}
              </div>
              {flagDirty ? <ColorfulBadge style='orange' size='small' hierarchy='secondary' width='hug'>มีการแก้ไขที่ยังไม่บันทึก</ColorfulBadge> : null}
              <Table columns={flagColumns} rows={flagCatalog} rowKey={(row) => row.value} pagination={false} stickyColCount={1} stickyShadow emptyMessage='ยังไม่มี Flag เยี่ยมบ้าน' />
            </section>
          ) : null}

          {activeTab === 'audit' ? (
            <section className='w-full flex flex-col' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
              <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
                <Icon name='history' size={20} style={{ color: 'var(--icon-brandPrimary-default)' }} />
                <div className='flex flex-col'>
                  <h2 style={{ color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-heading-content)', fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-bold)' }}>
                    ประวัติการแก้ไข
                  </h2>
                  <span style={SUBTEXT}>แสดงค่าเดิมและค่าใหม่รายกลุ่ม พร้อมผู้ดำเนินการ เวลา และเหตุผล</span>
                </div>
              </div>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <FilterTag value='ทั้งหมด' size='md' selected={auditTypeFilter === 'all'} onClick={() => setAuditTypeFilter('all')} />
                <FilterTag value='โควตาและรอบติดตาม' size='md' selected={auditTypeFilter === 'quota'} onClick={() => setAuditTypeFilter('quota')} />
                <FilterTag value='เทมเพลตกิจกรรม/เป้าหมาย' size='md' selected={auditTypeFilter === 'template'} onClick={() => setAuditTypeFilter('template')} />
                <FilterTag value='Flag เยี่ยมบ้าน' size='md' selected={auditTypeFilter === 'flag'} onClick={() => setAuditTypeFilter('flag')} />
              </div>
              <Table
                columns={combinedAuditColumns}
                rows={visibleAuditRows}
                rowKey={(row) => row.id}
                pagination={false}
                stickyColCount={1}
                stickyShadow
                emptyMessage='ยังไม่มีประวัติการแก้ไข'
                emptySubtext='ค่าเริ่มต้นของระบบกำลังถูกใช้งาน'
              />
            </section>
          ) : null}
        </div>
        {(activeTab === 'quota' || activeTab === 'templates' || activeTab === 'flags') && isAdmin ? (
          <Footer
            type='with BTN'
            sticky
            showLegal={false}
            showAutoSave={false}
            showButton2={false}
            showButton3={false}
            button1Label={activeTab === 'templates' ? 'บันทึกเทมเพลตทั้งชุด' : activeTab === 'flags' ? 'บันทึกแคตตาล็อก Flag ทั้งชุด' : 'บันทึกการตั้งค่าทั้งชุด'}
            button1Icon='save'
            button1Disabled={activeTab === 'templates' ? !careDirty : activeTab === 'flags' ? !flagDirty : !dirty}
            onButton1Click={activeTab === 'templates' ? requestCareSave : activeTab === 'flags' ? () => { setUnsavedOpen(false); setFlagReasonPopupOpen(true); } : () => requestSave(false)}
          />
        ) : null}
      </QueuePageShell>

      <UnsavedChangesPopup
        open={unsavedOpen}
        onClose={() => setUnsavedOpen(false)}
        onSave={() => (activeTab === 'templates' ? requestCareSave() : activeTab === 'flags' ? (() => { setUnsavedOpen(false); setFlagReasonPopupOpen(true); })() : requestSave(true))}
        onDiscard={discardAndLeave}
        description={activeTab === 'templates'
          ? 'เทมเพลตหรือแคตตาล็อกกิจกรรมที่ยังไม่บันทึกจะไม่พร้อมให้ทีมเยี่ยมบ้านเลือกใช้'
          : activeTab === 'flags' ? 'แคตตาล็อก Flag ที่ยังไม่บันทึกจะยังไม่มีผลกับทะเบียนและคิวเยี่ยมบ้าน'
          : 'การปรับเพดานหรือรอบติดตามที่ยังไม่บันทึกจะไม่มีผลกับการล็อกสิทธิในคิวเยี่ยมบ้าน'}
      />

      <Popup
        open={reasonPopupOpen}
        onClose={() => { setReasonPopupOpen(false); setLeaveAfterSave(false); }}
        title='บันทึกการตั้งค่าทั้งชุด'
        subtitle='ระบุเหตุผลเพื่อบันทึก audit ค่าเดิมและค่าใหม่'
        primaryAction={{
          label: 'บันทึกการตั้งค่าทั้งชุด',
          disabled: !reason.trim(),
          onClick: save,
        }}
        secondaryAction={{
          label: 'ยกเลิก',
          onClick: () => { setReasonPopupOpen(false); setLeaveAfterSave(false); },
        }}
      >
        <Textarea
          label='เหตุผลการปรับเพดานหรือรอบติดตาม'
          required
          value={reason}
          onChange={(value) => {
            setReason(value);
            setErrors((current) => ({ ...current, reason: undefined }));
          }}
          error={errors.reason}
          helperText='บังคับระบุเมื่อมีการเปลี่ยนแปลง'
          placeholder='เช่น ปรับตามประกาศโควตา สปสช. ประจำปีงบประมาณ'
        />
      </Popup>

      <Popup open={flagReasonPopupOpen} onClose={() => setFlagReasonPopupOpen(false)} title='บันทึกแคตตาล็อก Flag เยี่ยมบ้าน' subtitle='ระบุเหตุผลเพื่อบันทึก audit ค่าเดิมและค่าใหม่' primaryAction={{ label: 'บันทึกแคตตาล็อก Flag', disabled: !flagReason.trim(), onClick: saveFlags }} secondaryAction={{ label: 'ยกเลิก', onClick: () => setFlagReasonPopupOpen(false) }}>
        <Textarea label='เหตุผลการปรับแคตตาล็อก Flag' required value={flagReason} onChange={(value) => { setFlagReason(value); setFlagErrors((current) => ({ ...current, reason: undefined })); }} error={flagErrors.reason} helperText='บังคับระบุเมื่อมีการเปลี่ยนแปลง' placeholder='เช่น เพิ่ม Flag ตามแนวทางการดูแลผู้ป่วยที่บ้าน' />
      </Popup>

      <Popup open={flagPopupOpen} onClose={() => { setFlagPopupOpen(false); setFlagDraft(null); }} size='extraLarge' title={flagDraft && flagCatalog.some((row) => row.value === flagDraft.value) ? 'แก้ไข Flag เยี่ยมบ้าน' : 'เพิ่ม Flag เยี่ยมบ้าน'} subtitle='กำหนดชนิดธงกลางสำหรับการติดธงรายบุคคลในทะเบียนเยี่ยมบ้าน' primaryAction={{ label: 'เก็บไว้ในชุดที่กำลังแก้ไข', disabled: !flagDraftReady, onClick: saveFlagDraft }} secondaryAction={{ label: 'ยกเลิก', onClick: () => { setFlagPopupOpen(false); setFlagDraft(null); } }}>
        {flagDraft ? <div className='w-full' style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--dim-space-400)' }}>
          <InputField label='ชื่อ Flag' required value={flagDraft.label} onChange={(value) => patchFlagDraft('label', value)} error={flagErrors.label} placeholder='เช่น มีสายสวนปัสสาวะ' />
          <Select label='สีป้าย' required searchable={false} options={COLORFUL_BADGE_STYLES.map((value) => ({ value, label: value, badge: { style: value } }))} value={flagDraft.badge} onChange={(value) => patchFlagDraft('badge', value)} error={flagErrors.badge} />
          <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}><span style={SUBTEXT}>ตัวอย่าง</span><ColorfulBadge style={flagDraft.badge} size='small' hierarchy='secondary' width='hug'>{flagDraft.label || 'ตัวอย่างป้าย'}</ColorfulBadge></div>
          <div style={{ gridColumn: '1 / -1' }}><Textarea label='คำอธิบาย' value={flagDraft.note} onChange={(value) => patchFlagDraft('note', value)} placeholder='คำอธิบายสั้นสำหรับผู้ดูแลระบบ' /></div>
          <div className='flex items-center' style={{ gridColumn: '1 / -1', gap: 'var(--dim-space-200)' }}><Switch checked={flagDraft.active} onChange={(active) => patchFlagDraft('active', active)} aria-label='เปิดใช้ Flag' /><span style={TEXT}>เปิดใช้ Flag นี้</span></div>
        </div> : null}
      </Popup>

      <Popup
        open={templatePopupOpen}
        onClose={() => { setTemplatePopupOpen(false); setTemplateDraft(null); }}
        size='extraLarge'
        title={templateDraft && careCatalog.templates.some((template) => template.id === templateDraft.id) ? 'แก้ไขเทมเพลต' : 'เพิ่มเทมเพลต'}
        subtitle='กำหนดความสัมพันธ์ ปัญหา → เป้าหมาย → กิจกรรม → เกณฑ์ประเมินผล เพื่อให้ทีมเลือกใช้เป็นชุดเดียวกัน'
        primaryAction={{ label: 'เก็บไว้ในชุดที่กำลังแก้ไข', disabled: !templateDraftReady, onClick: saveTemplateDraft }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => { setTemplatePopupOpen(false); setTemplateDraft(null); } }}
      >
        {templateDraft ? (
          <div className='w-full' style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--dim-space-400)' }}>
            <InputField
              label='ปัญหาของผู้รับบริการ'
              required
              value={templateDraft.problem}
              onChange={(value) => patchTemplateDraft('problem', value)}
              error={templateErrors.problem}
              placeholder='เช่น แผลกดทับบริเวณก้นกบ'
            />
            <InputField
              label='เป้าหมาย'
              required
              value={templateDraft.goal}
              onChange={(value) => patchTemplateDraft('goal', value)}
              error={templateErrors.goal}
              placeholder='เช่น แผลกดทับหายภายใน 2 เดือน'
            />
            <Select
              label='ระยะเป้าหมาย'
              required
              searchable={false}
              options={HORIZON_OPTIONS}
              value={templateDraft.horizon}
              onChange={(value) => patchTemplateDraft('horizon', value)}
              error={templateErrors.horizon}
            />
            <Select
              label='กิจกรรมที่ผูก'
              required
              multiple
              searchable
              options={activityOptions}
              value={templateDraft.activityIds}
              onChange={(value) => patchTemplateDraft('activityIds', Array.isArray(value) ? value : [value])}
              error={templateErrors.activityIds}
              placeholder='เลือกกิจกรรมที่ผูกกับเป้าหมาย'
              helperText='เลือกได้หลายกิจกรรม · แสดงเฉพาะกิจกรรมที่เปิดใช้'
            />
            <div style={{ gridColumn: '1 / -1' }}>
              <Textarea
                label='เกณฑ์ประเมินผล'
                required
                value={templateDraft.evaluation}
                onChange={(value) => patchTemplateDraft('evaluation', value)}
                error={templateErrors.evaluation}
                placeholder='เช่น แผลเล็กลง ขอบแผลไม่แดง และไม่มีหนอง'
              />
            </div>
            <div className='flex items-center' style={{ gridColumn: '1 / -1', gap: 'var(--dim-space-200)' }}>
              <Switch
                checked={templateDraft.active}
                onChange={(active) => patchTemplateDraft('active', active)}
                aria-label='เปิดใช้เทมเพลต'
              />
              <span style={TEXT}>เปิดใช้เทมเพลตนี้</span>
            </div>
          </div>
        ) : null}
      </Popup>

      <Popup
        open={templateReasonPopupOpen}
        onClose={() => setTemplateReasonPopupOpen(false)}
        title='บันทึกเทมเพลตกิจกรรม/เป้าหมาย'
        subtitle='ระบุเหตุผลเพื่อบันทึก audit ค่าเดิมและค่าใหม่'
        primaryAction={{ label: 'บันทึกเทมเพลตทั้งชุด', disabled: !templateReason.trim(), onClick: saveCareCatalog }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setTemplateReasonPopupOpen(false) }}
      >
        <Textarea
          label='เหตุผลการปรับเทมเพลตหรือกิจกรรม'
          required
          value={templateReason}
          onChange={(value) => { setTemplateReason(value); setTemplateErrors((current) => ({ ...current, reason: undefined })); }}
          error={templateErrors.reason}
          helperText='บังคับระบุเมื่อมีการเปลี่ยนแปลง'
          placeholder='เช่น รวบรวมปัญหาและเป้าหมายร่วมจากแนวปฏิบัติของทีมเยี่ยมบ้าน'
        />
      </Popup>

      <Popup
        open={!!statusToggle}
        onClose={() => setStatusToggle(null)}
        title={statusToggle?.next ? 'เปิดใช้รายการนี้?' : 'ปิดใช้รายการนี้?'}
        subtitle={statusToggle?.next
          ? `“${statusToggle?.name || ''}” จะกลับมาเป็นตัวเลือกสำหรับการเยี่ยมบ้านครั้งใหม่`
          : `“${statusToggle?.name || ''}” จะไม่เป็นตัวเลือกสำหรับการเยี่ยมบ้านครั้งใหม่ แต่ประวัติเดิมยังแสดงได้`}
        primaryAction={{
          label: statusToggle?.next ? 'ยืนยันเปิดใช้' : 'ยืนยันปิดใช้',
          onClick: statusToggle?.kind === 'flag' ? confirmFlagToggle : confirmStatusToggle,
        }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setStatusToggle(null) }}
      />

      {toast ? (
        <div className='fixed left-1/2 z-[200] -translate-x-1/2' style={{ bottom: 'var(--dim-space-600)' }}>
          <Alert type='success' title={toast} showDetail={false} showBadge={false} showIndicator={false} onClose={() => setToast('')} />
        </div>
      ) : null}
    </>
  );
}
