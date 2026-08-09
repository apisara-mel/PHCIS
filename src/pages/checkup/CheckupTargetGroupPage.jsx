import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import Checkbox from '@/components/checkbox/Checkbox';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { PATIENT_PROFILES } from '@/data/patientProfiles';
import {
  listTargetGroups, getTargetGroup, saveTargetGroup, cancelTargetGroup,
  reactivateTargetGroup, addGroupMembers, updateGroupMember, cancelGroupMember,
  restoreGroupMember, preorderWholeGroup, listPackages, getPackage,
  readIdCardMock, formatThaiDate, formatThaiDateTime, openNextRound,
  listVisits, CANCEL_REASON_SUGGESTIONS, CHECKUP_STAFF,
} from '@/data/checkupStore';
import CheckupImportPopup from '@/pages/checkup/CheckupImportPopup';
import {
  PageBody, PageCard, PagerRow, EmptyState, NoticeBar, SectionHeader, SubCard,
  ReadField, StatTile, CheckupAuditBar,
} from '@/pages/checkup/CheckupUi';

/* CheckupTargetGroupPage — ลงทะเบียนกลุ่มเป้าหมาย + Import รายชื่อ
   (TOR 1.19.3 Import spreadsheet · 1.19.4 ลงรายการตรวจรอล่วงหน้า ·
    1.19.6 เครื่องอ่านบัตรประชาชน).

   List and detail share the route (`mode`). Members can be added three ways:
     1. Import spreadsheet → CheckupImportPopup (preview + validate)
     2. เครื่องอ่านบัตรประชาชน (mock) → auto-fill, with the "already a service
        user" branch offering to open a visit instead of creating a duplicate
     3. ค้นหา HN เดิม

   แสดง / บันทึก / แก้ไข / ยกเลิก are all present for both the group and each
   member (a cancelled member keeps its row + reason and can be restored). */

const breadcrumb = ['ระบบงานตรวจสุขภาพ', 'กลุ่มเป้าหมายตรวจสุขภาพ'];
const PAGE_SIZE = 10;
const MEMBER_PAGE_SIZE = 10;

const EMPTY_GROUP = {
  id: '', code: '', name: '', owner: '', packageId: '',
  startDate: '', endDate: '', status: 'active', note: '', members: [],
};

const ageFromDob = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
};

/* ── เครื่องอ่านบัตรประชาชน mock (§1.19.6) ───────────────────────── */

const IdCardPopup = ({ open, onClose, existingMembers, onAdd, onOpenVisit }) => {
  const [state, setState] = useState({ status: 'idle' });

  useEffect(() => { if (open) setState({ status: 'idle' }); }, [open]);

  const read = () => {
    setState({ status: 'reading' });
    /* Mock reader latency so the retry path is visible. */
    setTimeout(() => {
      const result = readIdCardMock();
      if (!result.ok) {
        setState({ status: 'error', error: result.error });
        return;
      }
      const already = existingMembers.some((m) => m.cid === result.person.cid);
      setState({ status: 'done', person: result.person, already });
    }, 500);
  };

  const person = state.person;

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='อ่านบัตรประชาชนเพื่อสร้างข้อมูลผู้รับบริการ'
      subtitle='เสียบบัตรประชาชนที่เครื่องอ่าน แล้วกด "อ่านบัตร" — ระบบจะเติมข้อมูลอัตโนมัติ'
      tertiaryAction={{ label: 'ปิด', onClick: onClose }}
      primaryAction={state.status === 'done' && !state.already
        ? {
          label: 'สร้างผู้รับบริการและเพิ่มเข้ากลุ่ม',
          onClick: () => {
            onAdd([{
              cid: person.cid,
              name: person.name,
              sex: person.sex,
              dob: person.dob,
              phone: person.phone || '',
              hn: '',
              source: 'บัตรประชาชน',
            }]);
            onClose();
          },
        }
        : undefined}
      secondaryAction={state.status === 'done' && state.already
        ? { label: 'เปิดการรับบริการครั้งใหม่แทน', onClick: () => { onOpenVisit(person); onClose(); } }
        : undefined}
    >
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
        <SubCard tone={state.status === 'error' ? 'danger' : 'brand'}>
          <div className='flex flex-col items-center text-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <span style={{ color: state.status === 'error' ? 'var(--text-alert-error, #B91C1C)' : 'var(--icon-brandPrimary-default, #007549)' }}>
              <Icon name={state.status === 'error' ? 'error' : 'credit_card'} size={32} />
            </span>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
              {state.status === 'idle' ? 'พร้อมอ่านบัตร — กดปุ่มด้านล่างเพื่อเริ่ม'
                : state.status === 'reading' ? 'กำลังอ่านบัตรประชาชน…'
                  : state.status === 'error' ? state.error
                    : 'อ่านบัตรสำเร็จ'}
            </span>
            <BrandSubdueButton
              variant='fill'
              size='md'
              leadingIcon='credit_card'
              disabled={state.status === 'reading'}
              onClick={read}
            >
              {state.status === 'error' || state.status === 'done' ? 'อ่านบัตรอีกครั้ง' : 'อ่านบัตร'}
            </BrandSubdueButton>
          </div>
        </SubCard>

        {state.status === 'done' && person ? (
          <>
            <SubCard>
              <SectionHeader icon='badge' title='ข้อมูลจากบัตรประชาชน' subtitle='อ่านอย่างเดียว — แก้ไขได้หลังสร้างผู้รับบริการ' />
              <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
                <ReadField label='เลขบัตรประชาชน' value={person.cid} />
                <ReadField label='ชื่อ-นามสกุล' value={person.name} minWidth={220} />
                <ReadField label='เพศ' value={person.sex} minWidth={80} />
                <ReadField label='วันเกิด' value={`${formatThaiDate(person.dob)} (${ageFromDob(person.dob)} ปี)`} />
                <ReadField label='ที่อยู่ตามบัตร' value={person.address} minWidth={320} />
              </div>
            </SubCard>
            {state.already ? (
              <NoticeBar tone='warning' icon='warning'>
                {`เลขบัตรนี้เป็นสมาชิกในกลุ่มเป้าหมายนี้อยู่แล้ว${person.existingHn ? ` (HN ${person.existingHn})` : ''} — ระบบจะไม่สร้างผู้รับบริการซ้ำ กด "เปิดการรับบริการครั้งใหม่แทน" เพื่อเปิด visit ครั้งถัดไป`}
              </NoticeBar>
            ) : person.existingHn ? (
              <NoticeBar tone='info' icon='info'>
                {`พบผู้รับบริการเดิมในระบบ (HN ${person.existingHn}) — ระบบจะผูกสมาชิกใหม่กับ HN เดิมโดยไม่สร้างเวชระเบียนซ้ำ`}
              </NoticeBar>
            ) : null}
          </>
        ) : null}
      </div>
    </Popup>
  );
};

/* ── ค้นหา HN เดิม ───────────────────────────────────────────────── */

const HnSearchPopup = ({ open, onClose, existingMembers, onAdd }) => {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState([]);
  useEffect(() => { if (open) { setQ(''); setPicked([]); } }, [open]);

  const existing = new Set(existingMembers.map((m) => m.hn).filter(Boolean));
  const eligiblePool = useMemo(
    () => PATIENT_PROFILES.filter((p) => !existing.has(p.hn)),
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [existingMembers],
  );

  const hnMatches = useMemo(() => {
    if (q.trim().length < 2) return [];
    const needle = q.trim().toLowerCase();
    return eligiblePool.filter((p) => [p.hn, p.fullName, p.shortName, p.nationalId]
      .some((f) => f && String(f).toLowerCase().includes(needle)));
  }, [q, eligiblePool]);

  const results = hnMatches.slice(0, 20);

  const toggle = (hn) => setPicked((p) => (p.includes(hn) ? p.filter((h) => h !== hn) : [...p, hn]));

  const columns = [
    {
      key: 'pick',
      label: '',
      sortable: false,
      render: (r) => <Checkbox checked={picked.includes(r.hn)} onChange={() => toggle(r.hn)} aria-label={`เลือก ${r.fullName}`} />,
    },
    { key: 'hn', label: 'HN' },
    { key: 'fullName', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 200, render: (r) => r.fullName },
    { key: 'nationalId', label: 'เลขบัตรประชาชน' },
    { key: 'sex', label: 'เพศ' },
    { key: 'insurance', label: 'สิทธิการรักษา', flex: true, minWidth: 220 },
  ];

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='ค้นหาผู้รับบริการเดิมด้วย HN'
      subtitle='พิมพ์ HN ชื่อ-นามสกุล หรือเลขบัตรประชาชน อย่างน้อย 2 ตัวอักษร'
      size='extraLarge'
      tertiaryAction={{ label: 'ปิด', onClick: onClose }}
      primaryAction={{
        label: picked.length > 0 ? `เพิ่ม ${picked.length} รายเข้ากลุ่ม` : 'เพิ่มเข้ากลุ่ม',
        disabled: picked.length === 0,
        onClick: () => {
          onAdd(picked.map((hn) => {
            const p = PATIENT_PROFILES.find((x) => x.hn === hn);
            return {
              cid: p.nationalId,
              name: p.fullName,
              sex: p.sex,
              dob: '',
              phone: '',
              hn: p.hn,
              source: 'HN เดิม',
            };
          }));
          onClose();
        },
      }}
    >
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
        <InputField
          label='คำค้นหา'
          showHelperText={false}
          leadingIcon='search'
          size='md'
          placeholder='เช่น 67-00001 หรือ สมชาย'
          value={q}
          onChange={(e) => setQ(e?.target ? e.target.value : e)}
        />
        {q.trim().length >= 2 ? (
          <SearchResultCount found={hnMatches.length} total={eligiblePool.length} />
        ) : null}
        {q.trim().length < 2 ? (
          <EmptyState compact icon='manage_search' title='พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา' />
        ) : results.length === 0 ? (
          <EmptyState compact icon='search_off' title='ไม่พบผู้รับบริการที่ตรงกับคำค้นหา' subtitle='ผู้รับบริการอาจเป็นสมาชิกในกลุ่มนี้อยู่แล้ว หรือยังไม่มีเวชระเบียน' />
        ) : (
          <Table columns={columns} rows={results} rowKey={(r) => r.hn} emptyMessage='ไม่พบรายการ' />
        )}
      </div>
    </Popup>
  );
};

/* ── page ────────────────────────────────────────────────────────── */

const CheckupTargetGroupPage = () => {
  const history = useHistory();
  const [mode, setMode] = useState('list'); /* 'list' | 'detail' */
  const [groupId, setGroupId] = useState(null);
  const [form, setForm] = useState(EMPTY_GROUP);
  const [isNew, setIsNew] = useState(false);
  const [errors, setErrors] = useState({});
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [memberPage, setMemberPage] = useState(1);
  const [memberQ, setMemberQ] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [importOpen, setImportOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [hnOpen, setHnOpen] = useState(false);
  const [preorderOpen, setPreorderOpen] = useState(false);
  const [preorderPkg, setPreorderPkg] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null); /* { kind, group|member } */
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [toast, setToast] = useState('');

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const groups = useMemo(() => listTargetGroups(), [tick]);
  const packages = useMemo(() => listPackages().filter((p) => p.active), []);
  const packageOptions = useMemo(
    () => [{ value: '', label: 'ยังไม่ผูกชุดตรวจ' }, ...packages.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))],
    [packages],
  );

  const group = groupId ? groups.find((g) => g.id === groupId) : null;

  const filteredGroups = useMemo(() => {
    let rows = groups;
    if (activeTab === 'active') rows = rows.filter((g) => g.status === 'active');
    if (activeTab === 'cancelled') rows = rows.filter((g) => g.status === 'cancelled');
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      rows = rows.filter((g) => [g.code, g.name, g.owner].some((f) => f && f.toLowerCase().includes(q)));
    }
    return rows;
  }, [groups, activeTab, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const pageRows = filteredGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const startNew = () => {
    const id = `GRP-${Date.now().toString().slice(-6)}`;
    setForm({ ...EMPTY_GROUP, id, code: `TG-2569-${String(groups.length + 1).padStart(3, '0')}` });
    setGroupId(id);
    setIsNew(true);
    setErrors({});
    setMode('detail');
  };

  const openDetail = (g) => {
    setForm({ ...EMPTY_GROUP, ...g });
    setGroupId(g.id);
    setIsNew(false);
    setErrors({});
    setMemberPage(1);
    setMemberQ('');
    setMemberFilter('all');
    setMode('detail');
  };

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = 'ต้องระบุรหัสกลุ่ม';
    if (!form.name.trim()) e.name = 'ต้องระบุชื่อกลุ่มเป้าหมาย';
    if (!form.startDate) e.startDate = 'ต้องระบุวันเริ่มรอบตรวจ';
    if (form.startDate && form.endDate && String(form.endDate) < String(form.startDate)) {
      e.endDate = 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveGroup = () => {
    if (!validate()) return;
    saveTargetGroup({ ...form, code: form.code.trim(), name: form.name.trim() });
    setIsNew(false);
    setTick((t) => t + 1);
    setToast(`บันทึกกลุ่มเป้าหมาย ${form.name} เรียบร้อยแล้ว`);
  };

  const handleImport = (rows) => {
    if (isNew) {
      /* Persist the group first so members have somewhere to land. */
      saveTargetGroup({ ...form });
      setIsNew(false);
    }
    const added = addGroupMembers(groupId, rows);
    setTick((t) => t + 1);
    const fresh = getTargetGroup(groupId);
    if (fresh) setForm({ ...EMPTY_GROUP, ...fresh });
    setToast(`นำเข้าสมาชิกใหม่ ${added} ราย (ข้ามรายการซ้ำ ${rows.length - added} ราย)`);
  };

  const openCancelGroup = (g) => { setCancelReason(''); setCancelError(''); setCancelTarget({ kind: 'group', group: g }); };
  const openCancelMember = (m) => { setCancelReason(''); setCancelError(''); setCancelTarget({ kind: 'member', member: m }); };

  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('ต้องระบุเหตุผลการยกเลิก');
      return;
    }
    if (cancelTarget.kind === 'group') {
      cancelTargetGroup(cancelTarget.group.id, cancelReason.trim());
    } else {
      cancelGroupMember(groupId, cancelTarget.member.cid, cancelReason.trim());
      const fresh = getTargetGroup(groupId);
      if (fresh) setForm({ ...EMPTY_GROUP, ...fresh });
    }
    setCancelTarget(null);
    setTick((t) => t + 1);
  };

  const handleOpenVisitForPerson = (person) => {
    const existing = listVisits().find((v) => v.hn === person.existingHn);
    if (existing) {
      const { visit, warnPrevOpen } = openNextRound(existing.hn, existing.programName);
      setTick((t) => t + 1);
      if (warnPrevOpen) {
        setToast('เตือน: การรับบริการครั้งก่อนในโปรแกรมนี้ยังไม่สรุปผล — ระบบเปิดครั้งใหม่ให้แล้ว โปรดตรวจสอบ');
      }
      history.push(`/checkup/order/${visit.id}`);
    } else {
      setToast('ไม่พบใบสั่งตรวจเดิมของผู้รับบริการนี้ — โปรดเพิ่มเข้ากลุ่มแล้วลงรายการตรวจรอล่วงหน้า');
    }
  };

  /* ── group list columns ─────────────────────────────────────────── */

  const groupColumns = useMemo(() => ([
    { key: 'code', label: 'รหัสกลุ่ม' },
    {
      key: 'name',
      label: 'ชื่อกลุ่มเป้าหมาย',
      flex: true,
      minWidth: 300,
      render: (r) => (
        <span className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm, 14px)' }}>{r.name}</span>
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {r.owner || '—'}
          </span>
        </span>
      ),
    },
    {
      key: 'packageId',
      label: 'ชุดตรวจที่ผูกไว้',
      flex: true,
      minWidth: 220,
      render: (r) => (r.packageId
        ? `${getPackage(r.packageId)?.code || r.packageId} — ${getPackage(r.packageId)?.name || ''}`
        : <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่ผูกชุดตรวจ</ColorfulBadge>),
    },
    {
      key: 'dates',
      label: 'รอบตรวจ',
      sortable: false,
      render: (r) => `${formatThaiDate(r.startDate)}${r.endDate && r.endDate !== r.startDate ? ` – ${formatThaiDate(r.endDate)}` : ''}`,
    },
    {
      key: 'members',
      label: 'สมาชิก',
      align: 'center',
      render: (r) => {
        const active = (r.members || []).filter((m) => m.status !== 'cancelled');
        const pre = active.filter((m) => m.preordered);
        return (
          <span className='flex flex-col items-center' style={{ gap: 'var(--dim-space-050, 2px)' }}>
            <span style={{ fontSize: 'var(--type-size-sm, 14px)' }}>{`${active.length} ราย`}</span>
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
              {`ลงรายการล่วงหน้า ${pre.length}`}
            </span>
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'สถานะ',
      render: (r) => (r.status === 'cancelled'
        ? <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกแล้ว</ColorfulBadge>
        : <ColorfulBadge style='green' size='small' hierarchy='secondary'>ใช้งาน</ColorfulBadge>)},
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={(e) => { e.stopPropagation(); openDetail(r); }}>
            แสดง / แก้ไข
          </BrandSubdueButton>
          {r.status === 'cancelled' ? (
            <BrandSubdueButton variant='fill' size='sm' leadingIcon='restart_alt' onClick={(e) => { e.stopPropagation(); reactivateTargetGroup(r.id); setTick((t) => t + 1); }}>
              เปิดใช้งาน
            </BrandSubdueButton>
          ) : (
            <NeutralSubdueButton size='sm' leadingIcon='block' onClick={(e) => { e.stopPropagation(); openCancelGroup(r); }}>
              ยกเลิกกลุ่ม
            </NeutralSubdueButton>
          )}
        </span>
      ),
    },
  ]), []);

  /* ── member table ───────────────────────────────────────────────── */

  const members = form.members || [];

  const memberFiltersActive = memberFilter !== 'all' || memberQ.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(memberFiltersActive, () => {
    setMemberFilter('all');
    setMemberQ('');
    setMemberPage(1);
  });

  const filteredMembers = useMemo(() => {
    let rows = members;
    if (memberFilter === 'preordered') rows = rows.filter((m) => m.preordered && m.status !== 'cancelled');
    if (memberFilter === 'pending') rows = rows.filter((m) => !m.preordered && m.status !== 'cancelled');
    if (memberFilter === 'cancelled') rows = rows.filter((m) => m.status === 'cancelled');
    if (memberQ.trim()) {
      const q = memberQ.trim().toLowerCase();
      rows = rows.filter((m) => [m.cid, m.name, m.hn].some((f) => f && String(f).toLowerCase().includes(q)));
    }
    return rows;
  }, [members, memberFilter, memberQ]);

  const memberPageRows = filteredMembers.slice((memberPage - 1) * MEMBER_PAGE_SIZE, memberPage * MEMBER_PAGE_SIZE);

  const memberColumns = useMemo(() => ([
    { key: 'cid', label: 'เลขบัตรประชาชน' },
    {
      key: 'name',
      label: 'ชื่อ-นามสกุล',
      flex: true,
      minWidth: 220,
      render: (r) => (
        <MaskedWorklistName
          name={r.name}
          recordKey={r.cid}
          linkTo={r.hn ? `/checkup/history/${r.hn}` : undefined}
        />
      ),
    },
    { key: 'sex', label: 'เพศ' },
    { key: 'dob', label: 'อายุ', render: (r) => (ageFromDob(r.dob) != null ? `${ageFromDob(r.dob)} ปี` : '—') },
    { key: 'hn', label: 'HN', render: (r) => r.hn || <ColorfulBadge style='yellow' size='small' hierarchy='secondary'>ยังไม่มี HN</ColorfulBadge> },
    { key: 'phone', label: 'เบอร์โทร', render: (r) => r.phone || '—' },
    {
      key: 'packageId',
      label: 'ชุดตรวจของสมาชิก',
      flex: true,
      minWidth: 220,
      sortable: false,
      render: (r) => (
        <Select
          size='sm'
          showFieldName={false}
          showHelperText={false}
          showLeadingIcon={false}
          placeholder='เลือกชุดตรวจ'
          options={packageOptions}
          value={r.packageId || ''}
          disabled={r.status === 'cancelled'}
          onChange={(v) => {
            const val = typeof v === 'string' ? v : v?.value;
            updateGroupMember(groupId, r.cid, { packageId: val, preordered: !!val });
            const fresh = getTargetGroup(groupId);
            if (fresh) setForm({ ...EMPTY_GROUP, ...fresh });
            setTick((t) => t + 1);
          }}
          style={{ minWidth: 200 }}
        />
      ),
    },
    {
      key: 'status',
      label: 'สถานะ',
      render: (r) => (r.status === 'cancelled'
        ? (
          <span className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
            <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิก</ColorfulBadge>
            {r.cancelReason ? (
              <span title={r.cancelReason} style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'var(--dim-size-2100, 160px)' }}>
                {r.cancelReason}
              </span>
            ) : null}
          </span>
        )
        : r.preordered
          ? <ColorfulBadge style='green' size='small' hierarchy='secondary' icon='playlist_add_check'>ลงรายการตรวจล่วงหน้าแล้ว</ColorfulBadge>
          : <ColorfulBadge style='grey' size='small' hierarchy='secondary'>รอลงรายการตรวจ</ColorfulBadge>),
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
          {r.status === 'cancelled' ? (
            <BrandSubdueButton
              variant='fill'
              size='sm'
              leadingIcon='restart_alt'
              onClick={() => {
                restoreGroupMember(groupId, r.cid);
                const fresh = getTargetGroup(groupId);
                if (fresh) setForm({ ...EMPTY_GROUP, ...fresh });
                setTick((t) => t + 1);
              }}
            >
              กู้คืน
            </BrandSubdueButton>
          ) : (
            <NeutralSubdueButton size='sm' leadingIcon='block' onClick={() => openCancelMember(r)}>
              ยกเลิกสมาชิก
            </NeutralSubdueButton>
          )}
        </span>
      ),
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  ]), [groupId, packageOptions]);

  const tabs = [
    { key: 'all', label: `ทั้งหมด (${groups.length})`, icon: 'list' },
    { key: 'active', label: `ใช้งาน (${groups.filter((g) => g.status === 'active').length})`, icon: 'check_circle' },
    { key: 'cancelled', label: `ยกเลิกแล้ว (${groups.filter((g) => g.status === 'cancelled').length})`, icon: 'block' },
  ];

  const listActions = (
    <BrandSubdueButton variant='fill' size='md' leadingIcon='add' onClick={startNew}>
      สร้างกลุ่มเป้าหมายใหม่
    </BrandSubdueButton>
  );

  const detailActions = (
    <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
      <NeutralSubdueButton size='md' leadingIcon='upload_file' onClick={() => setImportOpen(true)}>
        Import รายชื่อ
      </NeutralSubdueButton>
      <NeutralSubdueButton size='md' leadingIcon='credit_card' onClick={() => setCardOpen(true)}>
        อ่านบัตรประชาชน
      </NeutralSubdueButton>
      <NeutralSubdueButton size='md' leadingIcon='person_search' onClick={() => setHnOpen(true)}>
        ค้นหา HN เดิม
      </NeutralSubdueButton>
      <BrandSubdueButton variant='fill' size='md' leadingIcon='save' onClick={handleSaveGroup}>
        บันทึกกลุ่มเป้าหมาย
      </BrandSubdueButton>
    </div>
  );

  return (
    <QueuePageShell
      activeKey='checkup'
      breadcrumb={mode === 'detail' ? [...breadcrumb, form.name || 'กลุ่มใหม่'] : breadcrumb}
      title={mode === 'detail' ? (isNew ? 'สร้างกลุ่มเป้าหมายใหม่' : `กลุ่มเป้าหมาย: ${form.name}`) : 'กลุ่มเป้าหมายตรวจสุขภาพ'}
      onBack={() => (mode === 'detail' ? setMode('list') : history.push('/checkup'))}
      backLabel={mode === 'detail' ? 'กลับไปทะเบียนกลุ่ม' : 'กลับไปคิวตรวจสุขภาพ'}
      actions={mode === 'detail' ? detailActions : listActions}
      tabs={mode === 'list' ? tabs : undefined}
      activeTab={activeTab}
      onTabChange={(k) => { setActiveTab(k); setPage(1); }}
    >
      <CheckupImportPopup
        open={importOpen}
        onClose={() => setImportOpen(false)}
        existingMembers={members}
        onImport={handleImport}
      />
      <IdCardPopup
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        existingMembers={members}
        onAdd={handleImport}
        onOpenVisit={handleOpenVisitForPerson}
      />
      <HnSearchPopup
        open={hnOpen}
        onClose={() => setHnOpen(false)}
        existingMembers={members}
        onAdd={handleImport}
      />

      <Popup
        open={preorderOpen}
        onClose={() => setPreorderOpen(false)}
        title='ลงรายการตรวจรอล่วงหน้าให้ทั้งกลุ่ม'
        subtitle='ระบบจะผูกชุดตรวจที่เลือกให้สมาชิกที่ยังไม่ถูกยกเลิกทุกราย'
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setPreorderOpen(false) }}
        primaryAction={{
          label: 'ยืนยันลงรายการล่วงหน้า',
          disabled: !preorderPkg,
          onClick: () => {
            preorderWholeGroup(groupId, preorderPkg);
            const fresh = getTargetGroup(groupId);
            if (fresh) setForm({ ...EMPTY_GROUP, ...fresh });
            setPreorderOpen(false);
            setTick((t) => t + 1);
            setToast('ลงรายการตรวจรอล่วงหน้าให้สมาชิกทั้งกลุ่มเรียบร้อยแล้ว');
          },
        }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <NoticeBar tone='info' icon='info'>
            สมาชิกที่มีชุดตรวจเฉพาะรายอยู่แล้วจะถูกเปลี่ยนเป็นชุดตรวจที่เลือกนี้ — ปรับรายคนภายหลังได้จากตารางสมาชิก
          </NoticeBar>
          <Select
            label='ชุดตรวจที่จะผูกให้ทั้งกลุ่ม'
            required
            showHelperText={false}
            showLeadingIcon={false}
            size='md'
            options={packageOptions.filter((o) => o.value)}
            value={preorderPkg}
            onChange={(v) => setPreorderPkg(typeof v === 'string' ? v : v?.value)}
          />
        </div>
      </Popup>

      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={cancelTarget?.kind === 'group' ? 'ยกเลิกกลุ่มเป้าหมาย' : 'ยกเลิกสมาชิกในกลุ่ม'}
        subtitle={cancelTarget?.kind === 'group'
          ? `${cancelTarget?.group?.code} · ${cancelTarget?.group?.name}`
          : `${cancelTarget?.member?.name} · ${cancelTarget?.member?.cid}`}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิก', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <NoticeBar tone='warning' icon='warning'>
            ระบบไม่ลบข้อมูลออกจากทะเบียน แต่จะตั้งสถานะเป็น "ยกเลิก" พร้อมเหตุผล ผู้บันทึก และเวลา และสามารถกู้คืนได้
          </NoticeBar>
          <SuggestibleTextarea
            voice
            label='เหตุผลการยกเลิก'
            required
            value={cancelReason}
            onChange={(e) => { setCancelReason(e?.target ? e.target.value : e); setCancelError(''); }}
            placeholder='เช่น ลาออกจากหน่วยงานก่อนรอบตรวจ'
            suggestions={[
              'ลาออกจากหน่วยงานก่อนรอบตรวจ',
              'ย้ายไปตรวจที่หน่วยบริการอื่น',
              'รายชื่อซ้ำกับกลุ่มอื่น',
              'หน่วยงานยกเลิกรอบตรวจ',
              ...CANCEL_REASON_SUGGESTIONS,
            ]}
            minChars={2}
          />
          {cancelError ? (
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-danger-secondary, #DC2626)' }}>
              {cancelError}
            </span>
          ) : null}
        </div>
      </Popup>

      <PageBody>
        {toast ? (
          <NoticeBar
            tone='success'
            icon='check_circle'
            trailing={(
              <button
                type='button'
                aria-label='ปิดการแจ้งเตือน'
                onClick={() => setToast('')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
              >
                <Icon name='close' size={16} />
              </button>
            )}
          >
            {toast}
          </NoticeBar>
        ) : null}

        {mode === 'list' ? (
          <PageCard>
            <div className='w-full flex items-start justify-center'>
              <PrimarySearch
                value={searchQ}
                onChange={(v) => { setSearchQ(v); setPage(1); }}
                onSubmit={(label) => setSearchQ(label)}
                placeholder='ค้นหารหัสกลุ่ม / ชื่อกลุ่มเป้าหมาย / หน่วยงาน'
                width={640}
              />
            </div>

            {groups.length === 0 ? (
              <EmptyState
                icon='groups'
                title='ยังไม่มีกลุ่มเป้าหมาย'
                subtitle='สร้างกลุ่มเป้าหมายแรกเพื่อ import รายชื่อและลงรายการตรวจรอล่วงหน้า'
                actionLabel='สร้างกลุ่มเป้าหมายแรก'
                onAction={startNew}
              />
            ) : filteredGroups.length === 0 ? (
              <EmptyState
                icon='search_off'
                title='ไม่พบผลลัพธ์'
                subtitle='ลองปรับคำค้นหาหรือเลือกแท็บอื่น'
                actionLabel='ล้างตัวกรองทั้งหมด'
                onAction={() => { setSearchQ(''); setActiveTab('all'); }}
              />
            ) : (
              <>
                <Table
                  columns={groupColumns}
                  rows={pageRows}
                  rowKey={(r) => r.id}
                  onRowClick={openDetail}
                  stickyColCount={2}
                  stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                  emptyMessage='ไม่พบรายการ'
                />
                <PagerRow page={page} pageSize={PAGE_SIZE} total={filteredGroups.length} onPageChange={setPage} unit='กลุ่ม' />
              </>
            )}
          </PageCard>
        ) : (
          <>
            {form.status === 'cancelled' ? (
              <NoticeBar
                tone='danger'
                icon='block'
                trailing={(
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='restart_alt' onClick={() => { reactivateTargetGroup(groupId); setTick((t) => t + 1); setForm((f) => ({ ...f, status: 'active' })); }}>
                    เปิดใช้งานอีกครั้ง
                  </BrandSubdueButton>
                )}
              >
                {`กลุ่มเป้าหมายนี้ถูกยกเลิกแล้ว${form.cancelReason ? ` — ${form.cancelReason}` : ''} (แสดงแบบอ่านอย่างเดียว)`}
              </NoticeBar>
            ) : null}

            <PageCard>
              <SectionHeader
                icon='groups'
                title='ข้อมูลกลุ่มเป้าหมาย'
                subtitle='ผูกชุดตรวจให้ทั้งกลุ่มหรือรายคน เพื่อลงรายการตรวจรอล่วงหน้าไว้ก่อนวันตรวจ'
                trailing={(
                  <NeutralSubdueButton size='sm' leadingIcon='playlist_add_check' disabled={form.status === 'cancelled'} onClick={() => { setPreorderPkg(form.packageId || ''); setPreorderOpen(true); }}>
                    ลงรายการตรวจล่วงหน้าทั้งกลุ่ม
                  </NeutralSubdueButton>
                )}
              />
              <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full' style={{ gap: 'var(--dim-space-400)' }}>
                <InputField
                  label='รหัสกลุ่ม'
                  required
                  showLeadingIcon={false}
                  showHelperText={!!errors.code}
                  helperText={errors.code}
                  error={!!errors.code}
                  size='md'
                  disabled={form.status === 'cancelled'}
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e?.target ? e.target.value : e }))}
                />
                <div className='md:col-span-1 xl:col-span-2'>
                  <InputField
                    label='ชื่อกลุ่มเป้าหมาย / รอบกิจกรรมตรวจ'
                    required
                    showLeadingIcon={false}
                    showHelperText={!!errors.name}
                    helperText={errors.name}
                    error={!!errors.name}
                    size='md'
                    placeholder='เช่น ตรวจสุขภาพประจำปีข้าราชการเขตดินแดง 2569'
                    disabled={form.status === 'cancelled'}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e?.target ? e.target.value : e }))}
                  />
                </div>
                <InputField
                  label='หน่วยงาน / ชุมชนเจ้าของกลุ่ม'
                  showLeadingIcon={false}
                  showHelperText={false}
                  size='md'
                  disabled={form.status === 'cancelled'}
                  value={form.owner}
                  onChange={(e) => setForm((f) => ({ ...f, owner: e?.target ? e.target.value : e }))}
                />
                <Select
                  label='ชุดตรวจหลักของกลุ่ม'
                  showHelperText={false}
                  showLeadingIcon={false}
                  size='md'
                  disabled={form.status === 'cancelled'}
                  options={packageOptions}
                  value={form.packageId || ''}
                  onChange={(v) => setForm((f) => ({ ...f, packageId: typeof v === 'string' ? v : v?.value }))}
                />
                <div />
                <DatePicker
                  label='วันเริ่มรอบตรวจ'
                  required
                  showHelperText={!!errors.startDate}
                  helperText={errors.startDate}
                  error={!!errors.startDate}
                  size='md'
                  disabled={form.status === 'cancelled'}
                  value={form.startDate ? new Date(form.startDate) : undefined}
                  onChange={(d) => setForm((f) => ({ ...f, startDate: d ? new Date(d).toISOString().slice(0, 10) : '' }))}
                />
                <DatePicker
                  label='วันสิ้นสุดรอบตรวจ'
                  showHelperText={!!errors.endDate}
                  helperText={errors.endDate}
                  error={!!errors.endDate}
                  size='md'
                  disabled={form.status === 'cancelled'}
                  value={form.endDate ? new Date(form.endDate) : undefined}
                  onChange={(d) => setForm((f) => ({ ...f, endDate: d ? new Date(d).toISOString().slice(0, 10) : '' }))}
                />
              </div>

              <SuggestibleTextarea
                voice
                label='หมายเหตุของรอบตรวจ'
                value={form.note}
                disabled={form.status === 'cancelled'}
                onChange={(e) => setForm((f) => ({ ...f, note: e?.target ? e.target.value : e }))}
                placeholder='เช่น ตรวจที่ห้องประชุมสำนักงานเขต ลงรายการตรวจรอล่วงหน้าให้ทั้งกลุ่ม'
                suggestions={[
                  'ตรวจที่ห้องประชุมสำนักงานเขต',
                  'ผู้รับบริการต้องงดอาหารก่อนตรวจ 8 ชั่วโมง',
                  'เก็บสิ่งส่งตรวจที่หน่วยแล้วส่ง Lab กลางวัน',
                  'ประสานหน่วยงานยืนยันรายชื่อล่วงหน้า 3 วัน',
                  'มีรถเอกซเรย์เคลื่อนที่ให้บริการ',
                ]}
                minChars={2}
              />

              {!isNew ? <CheckupAuditBar record={form} /> : null}
            </PageCard>

            <PageCard>
              <SectionHeader
                icon='badge'
                title={`รายชื่อสมาชิกในกลุ่ม (${members.filter((m) => m.status !== 'cancelled').length} ราย)`}
                subtitle='เพิ่มสมาชิกได้ 3 ทาง: Import สเปรดชีต · เครื่องอ่านบัตรประชาชน · ค้นหา HN เดิม'
              />

              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <StatTile label='สมาชิกทั้งหมด' value={members.filter((m) => m.status !== 'cancelled').length} unit='ราย' tone='info' icon='groups' />
                <StatTile label='ลงรายการตรวจล่วงหน้าแล้ว' value={members.filter((m) => m.preordered && m.status !== 'cancelled').length} unit='ราย' tone='brand' icon='playlist_add_check' />
                <StatTile label='ยังไม่มี HN' value={members.filter((m) => !m.hn && m.status !== 'cancelled').length} unit='ราย' tone='warning' icon='person_add' />
                <StatTile label='ยกเลิกแล้ว' value={members.filter((m) => m.status === 'cancelled').length} unit='ราย' tone='danger' icon='block' />
              </div>

              <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                  <FilterDropdown
                    prefix='สถานะ:'
                    options={[
                      { value: 'all', label: 'ทุกสถานะ' },
                      { value: 'preordered', label: 'ลงรายการตรวจล่วงหน้าแล้ว' },
                      { value: 'pending', label: 'รอลงรายการตรวจ' },
                      { value: 'cancelled', label: 'ยกเลิกแล้ว' },
                    ]}
                    value={memberFilter}
                    onChange={(v) => { setMemberFilter(v); setMemberPage(1); }}
                  />
                  <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
                </OverflowFlexRow>
                <div className='flex-1' />
                <InputField
                  showLabel={false}
                  showHelperText={false}
                  leadingIcon='search'
                  size='md'
                  placeholder='ค้นหาชื่อ / เลขบัตร / HN'
                  value={memberQ}
                  onChange={(e) => { setMemberQ(e?.target ? e.target.value : e); setMemberPage(1); }}
                  style={{ minWidth: 'var(--dim-size-2500, 320px)' }}
                />
              </div>

              <SmoothFilterResults opaque={resultsOpaque}>
              {members.length > 0 ? (
                <SearchResultCount found={filteredMembers.length} total={members.length} />
              ) : null}

              {members.length === 0 ? (
                <EmptyState
                  icon='person_add'
                  title='ยังไม่มีสมาชิกในกลุ่มนี้'
                  subtitle='นำเข้ารายชื่อจากสเปรดชีต อ่านบัตรประชาชน หรือค้นหา HN เดิมเพื่อเพิ่มสมาชิก'
                  actionLabel='นำเข้ารายชื่อจากสเปรดชีต'
                  onAction={() => setImportOpen(true)}
                />
              ) : filteredMembers.length === 0 ? (
                <EmptyState
                  icon='search_off'
                  title='ไม่พบผลลัพธ์'
                  subtitle='ลองปรับคำค้นหาหรือล้างตัวกรองสถานะ'
                  actionLabel='ล้างตัวกรอง'
                  onAction={() => { setMemberQ(''); setMemberFilter('all'); }}
                />
              ) : (
                <>
                  <Table
                    columns={memberColumns}
                    rows={memberPageRows}
                    rowKey={(r) => r.cid}
                    stickyColCount={2}
                    emptyMessage='ไม่พบรายการ'
                  />
                  <PagerRow page={memberPage} pageSize={MEMBER_PAGE_SIZE} total={filteredMembers.length} onPageChange={setMemberPage} unit='ราย' />
                </>
              )}
              </SmoothFilterResults>

              <SubCard tone='brand'>
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                  <Icon name='info' size={16} />
                  <span className='flex-1 min-w-0' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}>
                    {`เมื่อถึงวันตรวจ ให้เปิดใบสั่งตรวจจากคิวตรวจสุขภาพ — ระบบจะดึงชุดตรวจที่ลงรายการล่วงหน้าไว้มาให้อัตโนมัติ (ผู้บันทึกล่าสุด ${form.updatedBy || CHECKUP_STAFF.name} · ${formatThaiDateTime(form.updatedAt)})`}
                  </span>
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='arrow_forward' onClick={() => history.push('/checkup')}>
                    ไปคิวตรวจสุขภาพ
                  </BrandSubdueButton>
                </div>
              </SubCard>
            </PageCard>
          </>
        )}
      </PageBody>
    </QueuePageShell>
  );
};

export default CheckupTargetGroupPage;
