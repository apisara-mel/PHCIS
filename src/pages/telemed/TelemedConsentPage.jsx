import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import ConsentFormFillPopup from '@/components/popup/ConsentFormFillPopup';
import ConsentSignedFormViewPopup from '@/pages/consent/ConsentSignedFormViewPopup';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Select from '@/components/forms/Select';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { getPatientByHN } from '@/data/patientProfiles';
import { CONSENT_TABS } from '@/data/consentRecords';
import { getConsentChannelOptions } from '@/data/consentChannels';
import {
  TELEMED_PDPA_FORM,
  TELEMED_CONSENT_KIND,
  RECORDING_RETENTION_MONTHS,
  getTelemedConsents,
  subscribeTelemedConsent,
  consentTone,
  consentTab,
  grantTelemedConsent,
  denyTelemedConsent,
  revokeTelemedConsent,
  revokeImpact,
  reconsentTelemed,
  deleteRecordingFile,
  requestTelemedConsent,
  consentCoverage,
} from '@/data/telemedConsent';
import { getTelemedVisits, formatThaiDateTime } from '@/data/telemedVisits';
import { SUGGEST_REASON } from '@/data/telemedAssessments';
import {
  TELEMED_DEFAULT_ROLE,
  telemedCan,
  telemedDenyReason,
  telemedActor,
  logTelemedEvent,
} from '@/utils/telemedAccess';
import {
  TELEMED_BREADCRUMB,
  PageBanner,
  RoleSwitcher,
  ContentCard,
  EmptyState,
  PagerBar,
  AuditStamp,
  resolveDateRange,
  inDateRange,
} from '@/pages/telemed/telemedShared';

/* TelemedConsentPage — ทะเบียนความยินยอม PDPA / การบันทึกภาพ-เสียงของ
   ระบบ Telemedicine (TOR §1.13.3 / .8 / .9 / .11).

   ใช้คำศัพท์สถานะและแท็บชุดเดียวกับโมดูล Consent เดิม (CONSENT_STATUS /
   CONSENT_TABS ใน src/data/consentRecords.js) เพื่อให้ integrator รวม
   ทะเบียนสองชุดเข้าด้วยกันได้โดยไม่ต้องแปลคำ — โมดูลนี้แก้ consentRecords.js
   ไม่ได้ จึงเขียนลง store ท้องถิ่น src/data/telemedConsent.js แทน. */

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:telemed-consent';
const PAGE_SIZE = 20;

/* ค่าเริ่มต้นของชิป "ช่วง:" = ทุกช่วงเวลา — ทะเบียนความยินยอมเป็นเอกสารที่มี
   อายุหลายเดือน/หลายปี ถ้า default เป็น "เดือนนี้" แถวเก่าจะหายไปเงียบ ๆ
   ('all' ไม่อยู่ใน quick ของ DateFilterPopup → resolveDateRange คืน null = ไม่กรอง) */
const DEFAULT_DATE_VALUE = { quick: 'all' };
const DATE_CHIP_LABELS = { all: 'ทุกช่วงเวลา', thisMonth: 'เดือนนี้' };

const KIND_OPTIONS = [
  { value: 'all', label: 'ทุกประเภท' },
  ...Object.keys(TELEMED_CONSENT_KIND).map((k) => ({ value: k, label: TELEMED_CONSENT_KIND[k].label })),
];

const TelemedConsentPage = () => {
  const history = useHistory();

  const [role, setRole] = useState(TELEMED_DEFAULT_ROLE);
  const [tab, setTab] = useState('pending');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [kindFilter, setKindFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [dateValue, setDateValue] = useState(DEFAULT_DATE_VALUE);
  const [tick, setTick] = useState(0);

  const [fillTarget, setFillTarget] = useState(null);
  const [fillKind, setFillKind] = useState('recording');
  const [fillChannel, setFillChannel] = useState('');
  /* ขั้นที่ผู้ใช้กดออก: null | 'settings' | 'form'
     ต้องแยกขั้น เพราะ ConsentFormFillPopup ล้าง checks/signature ของตัวเอง
     ตอน onClose แล้ว — ป๊อปอัพยืนยันจึงห้ามสัญญาว่า "กลับไปกรอกต่อ" ได้
     (จะกลับไปเจอฟอร์มเปล่า) ส่วนขั้นตั้งค่ายังคงค่าไว้ในหน้าจริง */
  const [abandonStage, setAbandonStage] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeError, setRevokeError] = useState('');
  const [denyTarget, setDenyTarget] = useState(null);
  const [denyReason, setDenyReason] = useState('');
  const [denyError, setDenyError] = useState('');
  const [filesTarget, setFilesTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [newRequestVisit, setNewRequestVisit] = useState('');
  const [newRequestKind, setNewRequestKind] = useState('recording');
  const [toast, setToast] = useState(null);

  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  useEffect(() => subscribeTelemedConsent(() => setTick((t) => t + 1)), []);

  const canManage = telemedCan(role, 'consent') || telemedCan(role, 'edit');
  const canDeleteFiles = telemedCan(role, 'deleteRecording');
  const manageDeny = telemedDenyReason(role, 'consent');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const records = useMemo(() => getTelemedConsents(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visits = useMemo(() => getTelemedVisits(), [tick]);
  const coverage = useMemo(() => consentCoverage(), [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const channelOptions = useMemo(() => ([
    { value: 'all', label: 'ทุกช่องทาง' },
    ...getConsentChannelOptions().map((o) => ({ value: o.value, label: o.label })),
  ]), []);

  const byTab = useMemo(() => {
    if (tab === 'all') return records;
    return records.filter((r) => consentTab(r.status) === tab);
  }, [records, tab]);

  const filtered = useMemo(() => {
    let out = byTab;
    if (kindFilter !== 'all') out = out.filter((r) => r.kind === kindFilter);
    if (channelFilter !== 'all') out = out.filter((r) => r.channel === channelFilter);
    /* ชิป "ช่วง:" ต้องกรองจริง — เทียบกับ createdAt (ISO) ของคำขอความยินยอม */
    const range = resolveDateRange(dateValue);
    if (range) out = out.filter((r) => inDateRange(r.createdAt, range));
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      out = out.filter((r) => [r.hn, r.name, r.formCode, r.formName, r.requester, r.status]
        .some((f) => f && String(f).toLowerCase().includes(q)));
    }
    return out;
  }, [byTab, kindFilter, channelFilter, dateValue, searchQ]);

  const sorted = useMemo(() => {
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    if (!sortConfig.key) return filtered;
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return [...filtered].sort((a, b) => sign * collator.compare(String(a[sortConfig.key] ?? ''), String(b[sortConfig.key] ?? '')));
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sorted.length);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const summaryCards = useMemo(() => ([
    { key: 'total',     label: 'ความยินยอมทั้งหมด', value: records.length, color: 'info', icon: 'verified_user' },
    { key: 'consented', label: 'ยินยอมแล้ว',        value: records.filter((r) => r.status === 'ยินยอมแล้ว').length, color: 'positive', icon: 'check_circle' },
    { key: 'pending',   label: 'รอลงนาม / ขอเพิกถอน', value: records.filter((r) => consentTab(r.status) === 'pending').length, color: 'inprogress', icon: 'pending_actions' },
    { key: 'expiring',  label: 'ใกล้หมดอายุ',       value: records.filter((r) => r.status === 'ใกล้หมดอายุ').length, color: 'inprogress', icon: 'hourglass_top' },
    { key: 'files',     label: 'ไฟล์บันทึกสาย',     value: records.reduce((s, r) => s + r.recordings.filter((f) => !f.queuedForDeletion).length, 0), color: 'info', icon: 'video_library' },
  ]), [records]);

  const blockedRecordings = useMemo(
    () => records.filter((r) => r.kind === 'recording' && r.status !== 'ยินยอมแล้ว'),
    [records],
  );

  /* ── actions ───────────────────────────────────────────────────────── */
  const openFill = (row) => {
    setFillTarget(row);
    setFillKind(row.kind || 'recording');
    setFillChannel(row.channel || getConsentChannelOptions()[0].value);
  };

  const handleFillConfirm = ({ signedAt }) => {
    grantTelemedConsent(fillTarget.key, { kind: fillKind, channel: fillChannel, signedAt }, telemedActor(role));
    logTelemedEvent(role, 'ให้ความยินยอม PDPA (Telemedicine)', { detail: `${fillTarget.name} · ${TELEMED_CONSENT_KIND[fillKind].label}` });
    setFillTarget(null);
    setToast('บันทึกความยินยอมแล้ว — ระบบอนุญาตให้บันทึกสายได้');
  };

  const handleDeny = () => {
    /* การปฏิเสธคือการกระทำที่ปิดสิทธิ์การบันทึกสาย → บังคับเหตุผลเหมือน
       ยกเลิก/เพิกถอน/ลบไฟล์ (ตรวจซ้ำที่ data layer ด้วย) */
    const result = denyTelemedConsent(denyTarget.key, denyReason, telemedActor(role));
    if (!result.ok) { setDenyError(result.reason); return; }
    logTelemedEvent(role, 'บันทึกการปฏิเสธความยินยอม PDPA', { ok: false, detail: `${denyTarget.name} · ${denyReason}` });
    setDenyTarget(null);
    setDenyReason('');
    setDenyError('');
    setToast('บันทึกการปฏิเสธแล้ว — การบันทึกสายถูกปิดสำหรับผู้รับบริการรายนี้');
  };

  const handleRevoke = () => {
    const result = revokeTelemedConsent(revokeTarget.key, revokeReason, telemedActor(role));
    if (!result.ok) { setRevokeError(result.reason); return; }
    logTelemedEvent(role, 'เพิกถอนความยินยอม + เข้าคิวลบไฟล์บันทึกสาย', { detail: `${revokeTarget.name} · ${revokeReason}` });
    setRevokeTarget(null);
    setRevokeReason('');
    setRevokeError('');
    setToast(`เพิกถอนแล้ว — หยุดบันทึกและเข้าคิวลบไฟล์ ${result.removed} ไฟล์ พร้อมแจ้งผู้เกี่ยวข้อง`);
  };

  const handleReconsent = (row) => {
    reconsentTelemed(row.key, telemedActor(role));
    logTelemedEvent(role, 'ส่งคำขอความยินยอมฉบับใหม่ (Reconsent)', { detail: row.name });
    setToast(`ส่งคำขอความยินยอมฉบับใหม่ถึง ${row.name} แล้ว`);
  };

  const handleDeleteFile = () => {
    const result = deleteRecordingFile(deleteTarget.row.key, deleteTarget.file.id, deleteReason, telemedActor(role));
    if (!result.ok) { setDeleteError(result.reason); return; }
    logTelemedEvent(role, 'ลบไฟล์บันทึกสาย', { detail: `${deleteTarget.file.name} · ${deleteReason}` });
    setDeleteTarget(null);
    setDeleteReason('');
    setDeleteError('');
    setToast('ลบไฟล์บันทึกสายแล้ว (คงร่องรอยในประวัติ)');
  };

  const handleNewRequest = () => {
    const visit = visits.find((v) => v.id === newRequestVisit);
    if (!visit) return;
    requestTelemedConsent({
      visitId: visit.id, hn: visit.hn, name: visit.name, kind: newRequestKind,
    }, telemedActor(role));
    logTelemedEvent(role, 'สร้างคำขอความยินยอม Telemedicine', { detail: visit.name });
    setNewRequestOpen(false);
    setNewRequestVisit('');
    setToast('สร้างคำขอความยินยอมแล้ว — ส่งไปที่แอปผู้รับบริการ');
  };

  const impact = revokeTarget ? revokeImpact(revokeTarget.key) : null;

  /* ── renderers ─────────────────────────────────────────────────────── */
  const renderPatient = (row) => (
    <div className='flex flex-col min-w-0'>
      <span className='truncate' style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)' }}>
        {row.name}
      </span>
      <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{`HN ${row.hn}`}</span>
    </div>
  );

  const renderKind = (row) => (
    <ColorfulBadge style={TELEMED_CONSENT_KIND[row.kind]?.tone || 'grey'} size='small' hierarchy='secondary'>
      {TELEMED_CONSENT_KIND[row.kind]?.label || '—'}
    </ColorfulBadge>
  );

  const renderStatus = (row) => (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <ColorfulBadge style={consentTone(row.status)} size='small' hierarchy='secondary'>{row.status}</ColorfulBadge>
      {row.expiresInDays != null && (
        <span style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-alert-warning, #C2410C)' }}>
          {`เหลืออีก ${row.expiresInDays} วัน`}
        </span>
      )}
    </div>
  );

  const renderFiles = (row) => {
    const live = row.recordings.filter((f) => !f.queuedForDeletion);
    const removed = row.recordings.length - live.length;
    return (
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
          {`${live.length} ไฟล์`}
          {removed > 0 ? ` · ลบแล้ว ${removed}` : ''}
        </span>
        <span style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary)' }}>
          {`เก็บรักษา ${RECORDING_RETENTION_MONTHS} เดือน`}
        </span>
        {row.recordings.length > 0 && (
          <NeutralSubdueButton size='sm' variant='outline' leadingIcon='video_library' onClick={(e) => { e.stopPropagation(); setFilesTarget(row); }}>
            จัดการไฟล์
          </NeutralSubdueButton>
        )}
      </div>
    );
  };

  const renderActions = (row) => {
    const isConsented = row.status === 'ยินยอมแล้ว';
    const isPending = consentTab(row.status) === 'pending';
    return (
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
        {isPending && (
          <BrandSubdueButton
            size='sm'
            leadingIcon='draw'
            disabled={!canManage}
            title={canManage ? undefined : manageDeny}
            onClick={(e) => { e.stopPropagation(); openFill(row); }}
          >
            ขอความยินยอม
          </BrandSubdueButton>
        )}
        <NeutralSubdueButton
          size='sm'
          variant='outline'
          leadingIcon='visibility'
          disabled={row.signedDate === '-'}
          title={row.signedDate === '-' ? 'ยังไม่มีฉบับที่ลงนาม' : undefined}
          onClick={(e) => { e.stopPropagation(); setViewTarget(row); }}
        >
          ดูฉบับที่ลงนาม
        </NeutralSubdueButton>
        {isConsented && (
          <NeutralSubdueButton
            size='sm'
            variant='outline'
            leadingIcon='gpp_bad'
            disabled={!canManage}
            title={canManage ? undefined : manageDeny}
            onClick={(e) => { e.stopPropagation(); setRevokeTarget(row); setRevokeReason(''); setRevokeError(''); }}
          >
            เพิกถอน
          </NeutralSubdueButton>
        )}
        {isPending && (
          <NeutralSubdueButton
            size='sm'
            variant='outline'
            leadingIcon='do_not_disturb_on'
            disabled={!canManage}
            title={canManage ? undefined : manageDeny}
            onClick={(e) => { e.stopPropagation(); setDenyTarget(row); setDenyReason(''); setDenyError(''); }}
          >
            บันทึกการปฏิเสธ
          </NeutralSubdueButton>
        )}
        {!isPending && !isConsented && (
          <BrandSubdueButton
            size='sm'
            leadingIcon='autorenew'
            disabled={!canManage}
            title={canManage ? undefined : manageDeny}
            onClick={(e) => { e.stopPropagation(); handleReconsent(row); }}
          >
            Reconsent
          </BrandSubdueButton>
        )}
      </div>
    );
  };

  const columns = useMemo(() => ([
    { key: 'name',        label: 'ผู้รับบริการ',   flex: true, minWidth: 190, render: renderPatient },
    { key: 'kind',        label: 'ประเภทความยินยอม', width: 200, render: renderKind },
    { key: 'formCode',    label: 'แบบฟอร์ม',      width: 140, render: (r) => `${r.formCode} ${r.version}` },
    { key: 'channel',     label: 'ช่องทางลงนาม',   width: 210 },
    { key: 'status',      label: 'สถานะ',          width: 150, render: renderStatus },
    { key: 'signedDate',  label: 'วันที่ลงนาม',     width: 150 },
    { key: 'expiryDate',  label: 'วันหมดอายุ',     width: 150 },
    { key: 'files',       label: 'ไฟล์บันทึกสาย',  width: 170, sortable: false, render: renderFiles },
    { key: 'requester',   label: 'ผู้ขอความยินยอม', width: 180 },
    { key: 'actions',     label: 'การดำเนินการ',   width: 460, sortable: false, render: renderActions },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canManage, role]);

  const tabsWithAll = useMemo(() => CONSENT_TABS.map((t) => ({ key: t.value, label: t.label, icon: t.icon })), []);

  return (
    <QueuePageShell
      activeKey='telemed'
      breadcrumb={TELEMED_BREADCRUMB('ทะเบียนความยินยอม PDPA')}
      title='ทะเบียนความยินยอม PDPA / การบันทึกภาพ-เสียง'
      onBack={() => history.push('/telemed/worklist')}
      backLabel='หน้าห้องตรวจ'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <RoleSwitcher role={role} onChange={setRole} />
          <BrandSubdueButton
            size='md'
            leadingIcon='add'
            disabled={!canManage}
            title={canManage ? undefined : manageDeny}
            onClick={() => { setNewRequestOpen(true); setNewRequestVisit(''); }}
          >
            สร้างคำขอความยินยอม
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='print' onClick={() => { logTelemedEvent(role, 'พิมพ์ทะเบียนความยินยอม Telemedicine'); window.print(); }}>
            พิมพ์ / ส่งออกทะเบียน
          </BrandSubdueButton>
        </div>
      )}
      summaryCards={summaryCards}
      tabs={tabsWithAll}
      activeTab={tab}
      onTabChange={(t) => { setTab(t); setPage(1); }}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          gap: 'var(--dim-space-400)',
        }}
      >
        <PageBanner tone='info' icon='policy' title='หน้านี้คือแหล่งความจริงของสถานะ "บันทึกได้ / บันทึกไม่ได้"'>
          {`ห้องตรวจทางไกล (web) และแอปผู้รับบริการ (mobile) อ่านสถานะจากทะเบียนนี้ · อัตราการมีความยินยอม ${coverage.pct}% (${coverage.consented}/${coverage.total} รายการ) · ไฟล์บันทึกเก็บรักษา ${RECORDING_RETENTION_MONTHS} เดือนแล้วทำลาย`}
        </PageBanner>

        {blockedRecordings.length > 0 && (
          <PageBanner tone='warning' icon='videocam_off' title={`บันทึกสายไม่ได้ ${blockedRecordings.length} ราย`}>
            {blockedRecordings.map((r) => `${r.name} (${r.status})`).join(' · ')} — ปุ่มบันทึกสายถูกปิดตั้งแต่ต้นทั้งฝั่ง web และ mobile
          </PageBanner>
        )}

        {!canManage && (
          <PageBanner tone='warning' icon='lock' title='บทบาทนี้จัดการความยินยอมไม่ได้'>
            {manageDeny} — เปิดดูทะเบียนและฉบับที่ลงนามได้ แต่ปุ่มขอความยินยอม / เพิกถอน / ลบไฟล์ ถูกปิด
          </PageBanner>
        )}

        <ContentCard>
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={setSearchQ}
              onSubmit={(label, item) => { setSearchQ(label); pushHistory(item ?? label); }}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              placeholder='ค้นหา HN / ชื่อ-สกุล / รหัสแบบฟอร์ม / ผู้ขอความยินยอม'
              width={640}
            />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterTag
                value='ทั้งหมด'
                selected={kindFilter === 'all' && channelFilter === 'all' && dateValue.quick === DEFAULT_DATE_VALUE.quick && !searchQ}
                onClick={() => { setKindFilter('all'); setChannelFilter('all'); setDateValue(DEFAULT_DATE_VALUE); setSearchQ(''); setPage(1); }}
              />
              <FilterDropdown prefix='ประเภท:' options={KIND_OPTIONS} value={kindFilter} onChange={(v) => { setKindFilter(v); setPage(1); }} />
              <FilterDropdown prefix='ช่องทาง:' options={channelOptions} value={channelFilter} onChange={(v) => { setChannelFilter(v); setPage(1); }} />
              <FilterDateTag prefix='ช่วง:' value={dateValue} onChange={(v) => { setDateValue(v); setPage(1); }} defaultQuick='all' quickLabels={DATE_CHIP_LABELS} />
            </OverflowFlexRow>
          </div>

          {records.length === 0 ? (
            <EmptyState icon='verified_user' title='ยังไม่มีทะเบียนความยินยอมของ Telemedicine' hint='กด "สร้างคำขอความยินยอม" เพื่อส่งแบบฟอร์ม PDPA ไปที่แอปผู้รับบริการ' />
          ) : sorted.length === 0 ? (
            <EmptyState
              icon='search_off'
              title='ไม่พบรายการที่ตรงกับการค้นหา / ตัวกรอง'
              hint='ลองปรับคำค้นหรือล้างตัวกรอง'
              action={(
                <NeutralSubdueButton size='md' variant='outline' leadingIcon='filter_alt_off' onClick={() => { setKindFilter('all'); setChannelFilter('all'); setDateValue(DEFAULT_DATE_VALUE); setSearchQ(''); setPage(1); }}>
                  ล้างตัวกรอง
                </NeutralSubdueButton>
              )}
            />
          ) : (
            <>
              <Table
                columns={columns}
                rows={pageRows}
                rowKey={(r) => r.key}
                sortConfig={sortConfig}
                onSort={(key) => setSortConfig((prev) => (prev.key === key
                  ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                  : { key, direction: 'asc' }))}
                stickyColCount={1}
                stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                emptyMessage='ไม่พบรายการที่ตรงกับการค้นหา / ตัวกรอง'
              />
              <PagerBar rangeStart={rangeStart} rangeEnd={rangeEnd} total={sorted.length}>
                <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
              </PagerBar>
            </>
          )}
        </ContentCard>
      </div>

      {/* ── ขอความยินยอม (ConsentFormFillPopup + ฟอร์ม PDPA-Telemed) ── */}
      {fillTarget && (
        <>
          <Popup
            open={Boolean(fillTarget) && fillTarget._step !== 'form' && !abandonStage}
            onClose={() => setAbandonStage('settings')}
            title='ตั้งค่าคำขอความยินยอม'
            subtitle={`${fillTarget.name} · HN ${fillTarget.hn}`}
            width={520}
            secondaryAction={{ label: 'ยกเลิก', onClick: () => setAbandonStage('settings') }}
            primaryAction={{ label: 'ถัดไป: กรอกแบบฟอร์ม', onClick: () => setFillTarget((t) => ({ ...t, _step: 'form' })) }}
          >
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>ประเภทความยินยอม</span>
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  value={fillKind}
                  onChange={setFillKind}
                  options={Object.keys(TELEMED_CONSENT_KIND).map((k) => ({ value: k, label: TELEMED_CONSENT_KIND[k].label }))}
                />
              </div>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>ช่องทางลงนาม</span>
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  value={fillChannel}
                  onChange={setFillChannel}
                  options={getConsentChannelOptions().map((o) => ({ value: o.value, label: o.label, subtext: o.hint }))}
                />
              </div>
              <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                <Icon name='info' size={14} />
                {`แบบฟอร์ม ${TELEMED_PDPA_FORM.code} ${TELEMED_PDPA_FORM.version} · ${TELEMED_PDPA_FORM.estimatedMinutes} นาที`}
              </span>
            </div>
          </Popup>

          <ConsentFormFillPopup
            open={fillTarget._step === 'form' && !abandonStage}
            form={TELEMED_PDPA_FORM}
            patient={getPatientByHN(fillTarget.hn)}
            onClose={() => setAbandonStage('form')}
            onConfirm={handleFillConfirm}
          />
        </>
      )}

      <AlertDialog
        open={Boolean(abandonStage)}
        type='warning'
        title='ยกเลิกการขอความยินยอม?'
        description={abandonStage === 'form'
          ? 'ข้อที่ติ๊กไว้และลายเซ็นในแบบฟอร์มถูกล้างแล้ว — เลือก "เริ่มกรอกใหม่" เพื่อกรอกแบบฟอร์มอีกครั้ง หรือ "ทิ้งคำขอนี้" เพื่อออกโดยไม่บันทึก'
          : 'ประเภทความยินยอมและช่องทางที่เลือกไว้จะยังอยู่ — เลือก "กลับไปตั้งค่าต่อ" เพื่อทำต่อ'}
        cancelLabel={abandonStage === 'form' ? 'เริ่มกรอกใหม่' : 'กลับไปตั้งค่าต่อ'}
        confirmLabel='ทิ้งคำขอนี้'
        onCancel={() => setAbandonStage(null)}
        onClose={() => setAbandonStage(null)}
        onConfirm={() => { setAbandonStage(null); setFillTarget(null); }}
      />

      {/* ── ดูฉบับที่ลงนาม ── */}
      <ConsentSignedFormViewPopup
        open={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        event={viewTarget ? {
          formCode: viewTarget.formCode,
          formName: viewTarget.formName,
          version: viewTarget.version,
          type: 'PDPA',
          action: 'ยินยอม',
          dateTime: viewTarget.signedDate,
        } : null}
        patientHn={viewTarget?.hn || ''}
        patientName={viewTarget?.name || ''}
      />

      {/* ── เพิกถอน ── */}
      <AlertDialog
        open={Boolean(revokeTarget)}
        type='destructive'
        title='เพิกถอนความยินยอม'
        description={revokeTarget ? `${revokeTarget.name} (HN ${revokeTarget.hn}) — ตรวจสอบผลกระทบก่อนยืนยัน` : ''}
        cancelLabel='ไม่เพิกถอน'
        confirmLabel='ยืนยันเพิกถอน'
        onCancel={() => setRevokeTarget(null)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          {impact && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>ผลกระทบ</span>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                {`· ${impact.stopRecording ? 'หยุดบันทึกสายทันทีทั้ง web และ mobile' : 'ไม่มีการบันทึกสายที่กำลังทำงาน'}`}
              </span>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                {`· เข้าคิวลบไฟล์บันทึก ${impact.fileCount} ไฟล์${impact.fileCount ? ` (${impact.fileNames.join(', ')})` : ''}`}
              </span>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                {`· แจ้งผู้เกี่ยวข้อง: ${impact.notify.join(', ')}`}
              </span>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                · รายการยังคงอยู่ในทะเบียน (ไม่ลบประวัติ)
              </span>
            </div>
          )}
          <SuggestibleTextarea
            voice
            minChars={3}
            suggestions={[
              'ผู้รับบริการยื่นคำขอเพิกถอนผ่านแอป',
              'ลูกหลานผู้รับบริการขอให้หยุดบันทึกวิดีโอ',
              'พบว่าลงนามผิดคน จึงเพิกถอนและขอความยินยอมใหม่',
              ...SUGGEST_REASON,
            ]}
            value={revokeReason}
            onChange={(v) => { setRevokeReason(v); if (revokeError) setRevokeError(''); }}
            placeholder='เหตุผลการเพิกถอน (บังคับ)'
            height={100}
          />
          {revokeError && (
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-alert-error, #B91C1C)' }}>{revokeError}</span>
          )}
        </div>
      </AlertDialog>

      {/* ── บันทึกการปฏิเสธ ── */}
      <AlertDialog
        open={Boolean(denyTarget)}
        type='warning'
        title='บันทึกการปฏิเสธความยินยอม'
        description={denyTarget ? `${denyTarget.name} — สถานะจะเปลี่ยนเป็น "ปฏิเสธ" และการบันทึกสายจะถูกปิด` : ''}
        cancelLabel='ยกเลิก'
        confirmLabel='บันทึกการปฏิเสธ'
        onCancel={() => { setDenyTarget(null); setDenyError(''); }}
        onClose={() => { setDenyTarget(null); setDenyError(''); }}
        onConfirm={handleDeny}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <SuggestibleTextarea
            voice
            minChars={3}
            suggestions={[
              'ผู้รับบริการไม่สะดวกให้บันทึกวิดีโอ',
              'ผู้รับบริการยินยอมรับบริการแต่ไม่ยินยอมให้บันทึกภาพ-เสียง',
              'ผู้แทนโดยชอบธรรมยังไม่ได้ให้ความยินยอม',
            ]}
            value={denyReason}
            onChange={(v) => { setDenyReason(v); if (denyError) setDenyError(''); }}
            placeholder='เหตุผลการปฏิเสธ (บังคับ)'
            height={100}
          />
          {denyError && (
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-alert-error, #B91C1C)' }}>{denyError}</span>
          )}
        </div>
      </AlertDialog>

      {/* ── จัดการไฟล์บันทึกสาย ── */}
      <Popup
        open={Boolean(filesTarget)}
        onClose={() => setFilesTarget(null)}
        title='ไฟล์บันทึกสายที่ผูกกับความยินยอมนี้'
        subtitle={filesTarget ? `${filesTarget.name} · เก็บรักษา ${RECORDING_RETENTION_MONTHS} เดือน` : ''}
        size='large'
        width={800}
        primaryAction={{ label: 'ปิด', onClick: () => setFilesTarget(null) }}
      >
        {filesTarget && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <Table
              columns={[
                { key: 'name', label: 'ไฟล์', flex: true, minWidth: 240, sortable: false },
                { key: 'size', label: 'ขนาด', width: 100, sortable: false },
                { key: 'at', label: 'บันทึกเมื่อ', width: 200, sortable: false, render: (r) => formatThaiDateTime(r.at) },
                { key: 'state', label: 'สถานะ', width: 170, sortable: false, render: (r) => (
                  <ColorfulBadge style={r.queuedForDeletion ? 'red' : 'green'} size='small' hierarchy='secondary'>
                    {r.queuedForDeletion ? 'เข้าคิวลบแล้ว' : 'เก็บรักษาอยู่'}
                  </ColorfulBadge>
                ) },
                { key: 'act', label: 'การจัดการ', width: 150, sortable: false, render: (r) => (
                  <NeutralSubdueButton
                    size='sm'
                    variant='outline'
                    leadingIcon='delete'
                    disabled={!canDeleteFiles || r.queuedForDeletion}
                    title={!canDeleteFiles ? telemedDenyReason(role, 'deleteRecording') : r.queuedForDeletion ? 'ไฟล์นี้เข้าคิวลบแล้ว' : undefined}
                    onClick={() => { setDeleteTarget({ row: filesTarget, file: r }); setDeleteReason(''); setDeleteError(''); }}
                  >
                    ลบไฟล์
                  </NeutralSubdueButton>
                ) },
              ]}
              rows={filesTarget.recordings}
              rowKey={(r) => r.id}
              emptyMessage='ยังไม่มีไฟล์บันทึกสายสำหรับความยินยอมนี้'
            />
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
              <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)' }}>
                ประวัติของความยินยอมนี้
              </span>
              {filesTarget.history.map((h, i) => (
                <AuditStamp key={`${h.at}-${i}`} action={h.action} by={h.by} at={h.at} />
              ))}
            </div>
          </div>
        )}
      </Popup>

      {/* ── ลบไฟล์ ── */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        type='destructive'
        title='ลบไฟล์บันทึกสาย'
        description={deleteTarget ? `${deleteTarget.file.name} — การลบมีผลถาวร แต่ร่องรอยการลบจะถูกเก็บไว้ในประวัติ` : ''}
        cancelLabel='ไม่ลบ'
        confirmLabel='ยืนยันลบไฟล์'
        onCancel={() => setDeleteTarget(null)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteFile}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <SuggestibleTextarea
            voice
            minChars={3}
            suggestions={[
              'ครบกำหนดระยะเวลาเก็บรักษาตามนโยบาย',
              'ผู้รับบริการเพิกถอนความยินยอม',
              'ไฟล์บันทึกผิดคน',
              ...SUGGEST_REASON,
            ]}
            value={deleteReason}
            onChange={(v) => { setDeleteReason(v); if (deleteError) setDeleteError(''); }}
            placeholder='เหตุผลการลบไฟล์ (บังคับ)'
            height={100}
          />
          {deleteError && (
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-alert-error, #B91C1C)' }}>{deleteError}</span>
          )}
        </div>
      </AlertDialog>

      {/* ── สร้างคำขอใหม่ ── */}
      <Popup
        open={newRequestOpen}
        onClose={() => setNewRequestOpen(false)}
        title='สร้างคำขอความยินยอม Telemedicine'
        subtitle='ส่งแบบฟอร์ม PDPA-Telemed ไปที่แอปผู้รับบริการ'
        width={560}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setNewRequestOpen(false) }}
        primaryAction={{ label: 'ส่งคำขอ', onClick: handleNewRequest, disabled: !newRequestVisit }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>เลือกรายการปรึกษาทางไกล</span>
            <Select
              showLabel={false}
              searchable
              size='lg'
              value={newRequestVisit}
              onChange={setNewRequestVisit}
              options={visits.map((v) => ({ value: v.id, label: `${v.name} · HN ${v.hn}`, subtext: `${v.originUnit} · ${v.doctor}` }))}
              placeholder='ค้นหาชื่อหรือ HN'
            />
          </div>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>ประเภทความยินยอม</span>
            <Select
              showLabel={false}
              searchable={false}
              size='lg'
              value={newRequestKind}
              onChange={setNewRequestKind}
              options={Object.keys(TELEMED_CONSENT_KIND).map((k) => ({ value: k, label: TELEMED_CONSENT_KIND[k].label }))}
            />
          </div>
        </div>
      </Popup>

      <AlertDialog
        open={Boolean(toast)}
        type='success'
        title='ดำเนินการแล้ว'
        description={toast || ''}
        showCancel={false}
        confirmLabel='ตกลง'
        onConfirm={() => setToast(null)}
        onClose={() => setToast(null)}
      />
    </QueuePageShell>
  );
};

export default TelemedConsentPage;
