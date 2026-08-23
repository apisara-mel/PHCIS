import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import FileUploadField from '@/components/forms/FileUploadField';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import SuccessToast from '@/components/toast/SuccessToast';
import {
  SwSectionCard, SwField, SwBanner, SwConfidentialMask, SwInlineSearch,
  SwAuditLine, SwEmptyHint, toLocalIso,
} from '@/pages/clinic/social-work/SocialWorkShared';
import {
  SW_CURRENT_USER,
  SW_WORKERS,
  searchSwPeople,
  calcAgeYears,
  formatCid,
  hasSocialWorkRights,
  setSocialWorkRights,
  formatSwDate,
  formatSwDateTime,
  todayIso,
  validateSwUpload,
  SW_UPLOAD_ACCEPT,
} from '@/data/socialWorkClinic';
import {
  SW_PROBLEM_CATEGORY_OPTIONS, swProblemSubOptions, swProblemCategoryOf,
  resolveSwProblemCodeLabel, toSwProblemCode,
} from '@/data/socialWorkProblems';
import {
  SW_CENTER,
  SW_REFERRAL_SCOPES,
  SW_REFERRAL_STATUSES,
  SW_REFERRAL_SUBJECTS,
  SW_REFERRAL_DONE_SUGGESTIONS,
  SW_REFERRAL_REQUEST_SUGGESTIONS,
  referralAgencyOptions,
  resolveSwReferralAgency,
  resolveSwReferralScope,
  resolveSwReferralStatus,
  swReferralStatusBadge,
  peekNextReferralNo,
  getSwReferrals,
  saveSwReferral,
  cancelSwReferral,
  reactivateSwReferral,
  addSwReferralReply,
  logSwReferralPrint,
  getSwReferralPrintLog,
} from '@/data/socialWorkReferrals';

/* SocialWorkReferralPage — เมนูที่ 2 "แบบส่งต่อผู้ใช้บริการสังคมสงเคราะห์
   (ส.ส.3)" (TOR §1.10.11.2 · มติ คทง.10 ครั้งที่ 3 รหัส สส.3-1…13).

   Registry pattern เดียวกับ SocialWorkRegistryPage — list + create/edit
   บนหน้าเดียว ครบ 4 กริยาของ TOR:
     แสดง   — ตาราง + ปุ่ม "ดู/พิมพ์แบบ ส.ส.3" (popup ตัวอย่างเอกสาร + audit การพิมพ์)
     บันทึก — เลขที่หนังสือออกอัตโนมัติเมื่อบันทึกสำเร็จ
     แก้ไข  — เปิดฟอร์มเดิมพร้อมข้อมูล + บันทึกประวัติการแก้ไข
     ยกเลิก — บังคับกรอกเหตุผล · แถวยกเลิกยังเห็นได้ (จาง+ขีดฆ่า) · กู้คืนได้

   ข้อมูลลับ §1.4.2 — ผู้ใช้ที่ไม่มีสิทธิงานสังคมสงเคราะห์เห็นหน้าจอปกปิด
   และปุ่มเขียนทุกปุ่มถูก disable. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานสังคมสงเคราะห์', 'แบบส่งต่อ (ส.ส.3)'];

const TABS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'pending', label: 'รอตอบกลับ' },
  { key: 'accepted', label: 'ตอบรับแล้ว' },
  { key: 'closed', label: 'ปิดเรื่อง' },
  { key: 'declined', label: 'ปฏิเสธ / ส่งกลับ' },
  { key: 'cancelled', label: 'ยกเลิก' },
];

const EMPTY_FORM = {
  id: '',
  docNo: '',
  issueDate: todayIso(),
  hn: '',
  name: '',
  age: '',
  cid: '',
  sn: '',
  caseNo: '',
  subject: '',
  scope: 'bma',
  agency: '',
  currentAddress: '',
  landmark: '',
  problemCategory: '',
  problemCode: '',
  doneAlready: '',
  request: '',
  senderName: '',
  senderPosition: 'นักสังคมสงเคราะห์',
  phone: SW_CENTER.phone,
  fax: SW_CENTER.fax,
  attachments: [],
  status: 'pending',
};

const cancelledText = {
  textDecoration: 'line-through',
  color: 'var(--text-content-tertiary, #858C92)',
};

const SocialWorkReferralPage = () => {
  const history = useHistory();
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');

  const [editing, setEditing] = useState(null); /* null | 'new' | id */
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [savedBanner, setSavedBanner] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const [replyTarget, setReplyTarget] = useState(null);
  const [replyForm, setReplyForm] = useState({ date: todayIso(), by: '', note: '', status: 'accepted' });
  const [replyError, setReplyError] = useState('');

  const [printTarget, setPrintTarget] = useState(null);
  const [printTick, setPrintTick] = useState(0);
  const [toast, setToast] = useState('');
  const [, setRightsTick] = useState(0);

  const canWrite = hasSocialWorkRights();
  const toggleRightsDemo = () => {
    setSocialWorkRights(!hasSocialWorkRights());
    setRightsTick((t) => t + 1);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getSwReferrals(), [tick]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== 'all' && r.status !== tab) return false;
      if (scopeFilter !== 'all' && r.scope !== scopeFilter) return false;
      if (!q) return true;
      return [r.docNo, r.hn, r.name, r.caseNo, r.sn, r.subject, resolveSwReferralAgency(r.agency)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, tab, scopeFilter, search]);

  const counts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    accepted: rows.filter((r) => r.status === 'accepted').length,
    closed: rows.filter((r) => r.status === 'closed').length,
    declined: rows.filter((r) => r.status === 'declined').length,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
  }), [rows]);

  const tabs = useMemo(
    () => TABS.map((t) => ({ ...t, label: `${t.label} (${counts[t.key] ?? 0})` })),
    [counts],
  );

  const summaryCards = useMemo(() => ([
    { key: 'all', label: 'ใบส่งต่อทั้งหมด', value: String(counts.all), color: 'info', icon: 'forward_to_inbox' },
    { key: 'pending', label: 'รอตอบกลับ', value: String(counts.pending), color: 'warning', icon: 'hourglass_top' },
    { key: 'accepted', label: 'ตอบรับแล้ว', value: String(counts.accepted), color: 'positive', icon: 'mark_email_read' },
    { key: 'closed', label: 'ปิดเรื่องแล้ว', value: String(counts.closed), color: 'positive', icon: 'task_alt' },
    { key: 'cancelled', label: 'ยกเลิก', value: String(counts.cancelled), color: 'danger', icon: 'cancel' },
  ]), [counts]);

  /* ── ฟอร์ม ─────────────────────────────────────────────────────── */
  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, issueDate: todayIso(), senderName: SW_CURRENT_USER.replace(/^นักสังคมสงเคราะห์\s*/, '') });
    setErrors({});
    setSavedBanner(null);
    setEditing('new');
  };

  const openEdit = (row) => {
    setForm({
      ...EMPTY_FORM,
      ...row,
      problemCategory: swProblemCategoryOf(row.problemCode),
      problemCode: toSwProblemCode(row.problemCode),
    });
    setErrors({});
    setSavedBanner(null);
    setEditing(row.id);
  };

  const closeForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const pickPatient = (hn) => {
    const person = searchSwPeople(hn).find((p) => p.hn === hn);
    if (!person) {
      setErrors((e) => ({ ...e, hn: 'ไม่พบ HN นี้ในระบบเวชระเบียน' }));
      return;
    }
    setForm((f) => ({
      ...f,
      hn: person.hn,
      name: person.name,
      cid: person.cid,
      sn: person.sn,
      age: calcAgeYears(person.birthDate) != null ? `${calcAgeYears(person.birthDate)} ปี` : '',
    }));
    setErrors((e) => ({ ...e, hn: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.hn) next.hn = 'ระบุ HN ผู้ใช้บริการ';
    if (!form.name) next.name = 'ระบุชื่อ-นามสกุลผู้ส่งตัว';
    if (!form.issueDate) next.issueDate = 'ระบุวันที่ออกใบส่งต่อ';
    if (!form.subject) next.subject = 'ระบุเรื่องที่ส่งต่อ';
    if (!form.agency) next.agency = 'เลือกหน่วยงานปลายทาง';
    if (!form.problemCode) next.problemCode = 'เลือกรหัสปัญหาที่ส่งต่อ (อ้างอิงจาก ส.ส.2)';
    if (!form.request || form.request.trim().length < 10) next.request = 'ระบุเรื่องที่ขอความช่วยเหลืออย่างน้อย 10 ตัวอักษร';
    if (!form.senderName) next.senderName = 'ระบุชื่อผู้ส่งตัว';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (!canWrite || !validate()) return;
    const { saved, isNew } = saveSwReferral(form);
    setTick((t) => t + 1);
    setSavedBanner({ docNo: saved.docNo, isNew });
    setToast(isNew ? `บันทึกแบบส่งต่อ ส.ส.3 เลขที่ ${saved.docNo} แล้ว` : `แก้ไขแบบส่งต่อ ส.ส.3 เลขที่ ${saved.docNo} แล้ว`);
    closeForm();
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิก');
      return;
    }
    cancelSwReferral(cancelTarget.id, cancelReason.trim());
    setTick((t) => t + 1);
    setCancelTarget(null);
    setCancelReason('');
    setCancelError('');
    setToast('ยกเลิกแบบส่งต่อแล้ว — รายการยังแสดงในตารางและกู้คืนได้');
  };

  const reactivate = (row) => {
    reactivateSwReferral(row.id);
    setTick((t) => t + 1);
    setToast(`เปิดใช้งานใบส่งต่อ ${row.docNo} อีกครั้งแล้ว`);
  };

  const submitReply = () => {
    if (!replyForm.by.trim() || !replyForm.note.trim()) {
      setReplyError('ระบุหน่วยงานผู้ตอบกลับและรายละเอียดการตอบกลับ');
      return;
    }
    addSwReferralReply(replyTarget.id, replyForm);
    setTick((t) => t + 1);
    setReplyTarget(null);
    setReplyForm({ date: todayIso(), by: '', note: '', status: 'accepted' });
    setReplyError('');
    setToast('บันทึกการตอบกลับแล้ว');
  };

  const doPrint = () => {
    if (!printTarget) return;
    logSwReferralPrint(printTarget.id);
    setPrintTick((t) => t + 1);
    if (typeof window !== 'undefined') window.print();
  };

  const attachFile = (file) => {
    const message = validateSwUpload(file.name, file.size);
    if (message) { setUploadError(message); return; }
    setUploadError('');
    setForm((f) => ({
      ...f,
      attachments: [...(f.attachments || []), { name: file.name, size: `${Math.round(file.size / 1024)} KB` }],
    }));
  };

  const dim = (r) => (r.status === 'cancelled' ? cancelledText : undefined);

  const columns = useMemo(() => ([
    {
      key: 'docNo',
      label: 'เลขที่หนังสือ',
      render: (r) => (
        <span style={r.status === 'cancelled' ? cancelledText : { fontWeight: 'var(--type-weight-medium)' }}>
          {r.docNo}
        </span>
      ),
    },
    { key: 'issueDate', label: 'วันที่ออกใบส่งต่อ', render: (r) => <span style={dim(r)}>{formatSwDate(r.issueDate)}</span> },
    { key: 'hn', label: 'HN', render: (r) => <span style={dim(r)}>{r.hn}</span> },
    { key: 'name', label: 'ชื่อ-นามสกุลผู้ส่งตัว', flex: true, minWidth: 170, render: (r) => <span style={dim(r)}>{r.name}</span> },
    { key: 'subject', label: 'เรื่อง', flex: true, minWidth: 240, render: (r) => <span style={dim(r)}>{r.subject}</span> },
    {
      key: 'agency',
      label: 'หน่วยงานปลายทาง',
      flex: true,
      minWidth: 240,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={dim(r)}>{resolveSwReferralAgency(r.agency)}</span>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {resolveSwReferralScope(r.scope)}
          </span>
        </div>
      ),
    },
    {
      key: 'problemCode',
      label: 'รหัสปัญหาที่ส่งต่อ',
      flex: true,
      minWidth: 230,
      render: (r) => <span style={dim(r)}>{resolveSwProblemCodeLabel(r.problemCode)}</span>,
    },
    {
      key: 'status',
      label: 'สถานะตอบกลับ',
      render: (r) => (r.status === 'cancelled' ? (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกใบส่งต่อ</ColorfulBadge>
          {r.cancellation && (
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              โดย {r.cancellation.by} · {formatSwDateTime(r.cancellation.at)}
              <br />เหตุผล: {r.cancellation.reason}
            </span>
          )}
        </div>
      ) : (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge style={swReferralStatusBadge(r.status)} size='small' hierarchy='secondary'>
            {resolveSwReferralStatus(r.status)}
          </ColorfulBadge>
          {(r.replies || []).length > 0 && (
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              {`ตอบกลับล่าสุด ${formatSwDate(r.replies[r.replies.length - 1].date)}`}
            </span>
          )}
        </div>
      )),
    },
    {
      key: 'recordedBy',
      label: 'ผู้บันทึก',
      sortable: false,
      render: (r) => (
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #636B72)' }}>
          {r.recordedBy}<br />{formatSwDateTime(r.recordedAt)}
          {(r.editLog || []).length > 0 && (
            <>
              <br />
              <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>
                {`แก้ไขล่าสุด ${formatSwDateTime(r.editLog[r.editLog.length - 1].at)}`}
              </span>
            </>
          )}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton size='sm' leadingIcon='print' onClick={(e) => { e.stopPropagation(); setPrintTarget(r); }}>
            ดู / พิมพ์
          </NeutralSubdueButton>
          {!canWrite ? (
            <ColorfulBadge style='grey' size='small' hierarchy='secondary'>สิทธิไม่เพียงพอ</ColorfulBadge>
          ) : r.status === 'cancelled' ? (
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='restart_alt' onClick={(e) => { e.stopPropagation(); reactivate(r); }}>
              เปิดใช้งาน
            </BrandSubdueButton>
          ) : (
            <>
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                แก้ไข
              </BrandSubdueButton>
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='reply' onClick={(e) => { e.stopPropagation(); setReplyTarget(r); }}>
                บันทึกการตอบกลับ
              </BrandSubdueButton>
              <DangerSubdueButton size='sm' leadingIcon='block' onClick={(e) => { e.stopPropagation(); setCancelTarget(r); setCancelReason(''); setCancelError(''); }}>
                ยกเลิก
              </DangerSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canWrite]);

  const subOptions = useMemo(
    () => swProblemSubOptions(form.problemCategory),
    [form.problemCategory],
  );

  const printLog = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => (printTarget ? getSwReferralPrintLog(printTarget.id) : []),
    [printTarget, printTick],
  );

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='แบบส่งต่อผู้ใช้บริการสังคมสงเคราะห์ (ส.ส.3)'
      onBack={() => history.push('/clinic/social-work')}
      backLabel='กลับหน้าแรก'
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={tab}
      onTabChange={setTab}
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canWrite ? 'lock_open' : 'lock'}
            onClick={toggleRightsDemo}
            title='สลับสิทธิงานสังคมสงเคราะห์ (สำหรับทดสอบ)'
          >
            {canWrite ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
          </NeutralSubdueButton>
          <BrandButton size='sm' leadingIcon='add' disabled={!canWrite} onClick={openCreate}>
            ออกใบส่งต่อใหม่
          </BrandButton>
        </div>
      )}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-500, 20px)',
        }}
      >
        {!canWrite && (
          <SwBanner tone='warning' icon='lock'>
            บัญชีนี้ไม่มีสิทธิงานสังคมสงเคราะห์ (§1.4.2) — ดูและพิมพ์แบบ ส.ส.3 ได้
            แต่ออกใบใหม่ แก้ไข หรือยกเลิกไม่ได้
          </SwBanner>
        )}

        {savedBanner && (
          <SwBanner tone='brand' icon='check-circle' onClose={() => setSavedBanner(null)}>
            {savedBanner.isNew
              ? `บันทึกแบบส่งต่อสำเร็จ — ระบบออกเลขที่หนังสือ ${savedBanner.docNo} ให้อัตโนมัติ`
              : `แก้ไขแบบส่งต่อเลขที่ ${savedBanner.docNo} เรียบร้อยแล้ว (บันทึกประวัติการแก้ไขไว้ในแถว)`}
          </SwBanner>
        )}

        {/* ── ฟอร์มสร้าง/แก้ไข ─────────────────────────────────────── */}
        {editing && canWrite && (
          <SwSectionCard
            icon='forward_to_inbox'
            title={editing === 'new' ? 'ออกแบบส่งต่อผู้ใช้บริการสังคมสงเคราะห์ (ส.ส.3)' : `แก้ไขแบบส่งต่อ ${form.docNo}`}
            aside={(
              <ColorfulBadge style='grey' size='small' hierarchy='secondary'>
                {editing === 'new' ? `เลขที่หนังสือถัดไป ${peekNextReferralNo()}` : form.docNo}
              </ColorfulBadge>
            )}
          >
            <SwBanner tone='neutral' icon='info'>
              {`${SW_CENTER.name} · ${SW_CENTER.office} — ชื่อ-สกุล อายุ และที่อยู่ปัจจุบันเชื่อมจากเวชระเบียน แก้ไขได้ตามที่ตรวจสอบจริง`}
            </SwBanner>

            {/* แถว 1 — ผู้ใช้บริการ */}
            <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <SwField label='HN ผู้ใช้บริการ' required hint={errors.hn} hintTone={errors.hn ? 'error' : undefined} minWidth={200}>
                <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <InputField
                    value={form.hn}
                    onChange={set('hn')}
                    placeholder='เช่น 67-00012'
                    error={!!errors.hn}
                    showHelperText={false}
                  />
                  <NeutralSubdueButton size='sm' leadingIcon='person_search' onClick={() => pickPatient(form.hn)}>
                    ดึงข้อมูล
                  </NeutralSubdueButton>
                </div>
              </SwField>
              <SwField label='ชื่อ-นามสกุลผู้ส่งตัว (สส.3-6)' required hint={errors.name} hintTone={errors.name ? 'error' : undefined}>
                <InputField value={form.name} onChange={set('name')} placeholder='เชื่อมจากเวชระเบียน' error={!!errors.name} showHelperText={false} />
              </SwField>
              <SwField label='อายุ (สส.3-7)' minWidth={120}>
                <InputField value={form.age} onChange={set('age')} placeholder='เชื่อมจากเวชระเบียน' />
              </SwField>
              <SwField label='เลขประจำตัวประชาชน' minWidth={200}>
                <InputField value={form.cid ? formatCid(form.cid) : ''} onChange={() => {}} disabled placeholder='เชื่อมจากเวชระเบียน' />
              </SwField>
              <SwField label='SN / เลขเคส' minWidth={180}>
                <InputField value={form.sn} onChange={set('sn')} placeholder='เชื่อมจาก Intake ของ ส.ส.2' />
              </SwField>
            </div>

            {/* แถว 2 — หัวเรื่องเอกสาร */}
            <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <SwField label='วันที่ออกใบส่งต่อ (สส.3-2)' required hint={errors.issueDate} hintTone={errors.issueDate ? 'error' : undefined} minWidth={200}>
                <DatePicker
                  showLabel={false}
                  value={form.issueDate ? new Date(form.issueDate) : null}
                  onChange={(d) => set('issueDate')(d ? toLocalIso(d) : '')}
                  placeholder='เลือกวันที่'
                />
              </SwField>
              <SwField label='เรื่อง (สส.3-4)' required hint={errors.subject} hintTone={errors.subject ? 'error' : undefined} minWidth={280}>
                <Select
                  showLabel={false}
                  searchable
                  size='lg'
                  value={form.subject}
                  onChange={set('subject')}
                  options={SW_REFERRAL_SUBJECTS.map((s) => ({ value: s, label: s }))}
                  placeholder='เลือกเรื่องที่ส่งต่อ'
                />
              </SwField>
              <SwField label='ประเภทหน่วยงานปลายทาง' minWidth={240}>
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  value={form.scope}
                  onChange={(v) => { set('scope')(v); set('agency')(''); }}
                  options={SW_REFERRAL_SCOPES}
                  placeholder='เลือกประเภทหน่วยงาน'
                />
              </SwField>
              <SwField label='เรียน — หน่วยงานปลายทาง (สส.3-5)' required hint={errors.agency} hintTone={errors.agency ? 'error' : undefined} minWidth={300}>
                <Select
                  showLabel={false}
                  searchable
                  size='lg'
                  value={form.agency}
                  onChange={set('agency')}
                  options={referralAgencyOptions(form.scope)}
                  placeholder='เลือกหน่วยงาน'
                />
              </SwField>
            </div>

            {/* แถว 3 — ที่อยู่ + ปัญหา */}
            <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <SwField label='ที่อยู่ปัจจุบัน (สส.3-8)' minWidth={340}>
                <InputField value={form.currentAddress} onChange={set('currentAddress')} placeholder='เลขที่ ซอย ถนน แขวง เขต' />
              </SwField>
              <SwField label='สถานที่ใกล้เคียง (สส.3-9)' minWidth={240}>
                <InputField value={form.landmark} onChange={set('landmark')} placeholder='เช่น ตรงข้ามวัดธาตุทอง' />
              </SwField>
            </div>

            <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <SwField label='หมวดปัญหาหลัก (บัญชีปัญหาทางสังคม)' minWidth={280}>
                <Select
                  showLabel={false}
                  searchable
                  size='lg'
                  value={form.problemCategory}
                  onChange={(v) => { set('problemCategory')(v); set('problemCode')(''); }}
                  options={SW_PROBLEM_CATEGORY_OPTIONS}
                  placeholder='เลือกหมวด 01–17'
                />
              </SwField>
              <SwField
                label='รหัสปัญหาที่ส่งต่อ (4 หลัก)'
                required
                hint={errors.problemCode || (!form.problemCategory ? 'เลือกหมวดปัญหาหลักก่อน' : undefined)}
                hintTone={errors.problemCode ? 'error' : undefined}
                minWidth={340}
              >
                <Select
                  showLabel={false}
                  searchable
                  size='lg'
                  disabled={!form.problemCategory}
                  value={form.problemCode}
                  onChange={set('problemCode')}
                  options={subOptions}
                  error={!!errors.problemCode}
                  placeholder='เลือกหัวข้อย่อย'
                />
              </SwField>
            </div>

            <SwField label='การช่วยเหลือที่ได้ดำเนินการแล้ว (สส.3-10)'>
              <SuggestibleTextarea
                voice
                value={form.doneAlready}
                onChange={(e) => set('doneAlready')(e.target.value)}
                suggestions={SW_REFERRAL_DONE_SUGGESTIONS}
                minChars={3}
                placeholder='สรุปการช่วยเหลือที่ศูนย์บริการสาธารณสุขได้ดำเนินการไปแล้วก่อนส่งต่อ'
              />
            </SwField>

            <SwField
              label='จึงเรียนมาเพื่อขอความช่วยเหลือเรื่อง (สส.3-11)'
              required
              hint={errors.request}
              hintTone={errors.request ? 'error' : undefined}
            >
              <SuggestibleTextarea
                voice
                value={form.request}
                onChange={(e) => set('request')(e.target.value)}
                suggestions={SW_REFERRAL_REQUEST_SUGGESTIONS}
                minChars={3}
                placeholder='ระบุความช่วยเหลือที่ขอจากหน่วยงานปลายทาง'
              />
            </SwField>

            {/* แถว 4 — ผู้ลงนาม + เอกสารแนบ */}
            <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <SwField label='ลงชื่อผู้ส่งตัว (สส.3-12)' required hint={errors.senderName} hintTone={errors.senderName ? 'error' : undefined} minWidth={240}>
                <Select
                  showLabel={false}
                  searchable
                  size='lg'
                  value={form.senderName}
                  onChange={set('senderName')}
                  options={SW_WORKERS.map((w) => ({ value: w.replace(/^นัก\S+\s*/, ''), label: w }))}
                  error={!!errors.senderName}
                  placeholder='เลือกผู้ลงนาม'
                />
              </SwField>
              <SwField label='ตำแหน่ง' minWidth={220}>
                <InputField value={form.senderPosition} onChange={set('senderPosition')} placeholder='เช่น นักสังคมสงเคราะห์ชำนาญการ' />
              </SwField>
              <SwField label='โทรศัพท์ (สส.3-13)' minWidth={180}>
                <InputField value={form.phone} onChange={set('phone')} placeholder='0 2391 3251' />
              </SwField>
              <SwField label='โทรสาร' minWidth={180}>
                <InputField value={form.fax} onChange={set('fax')} placeholder='0 2391 3252' />
              </SwField>
            </div>

            <SwField label='เอกสารแนบ' hint={uploadError || `รองรับ ${SW_UPLOAD_ACCEPT} ขนาดไม่เกิน 10 MB`} hintTone={uploadError ? 'error' : undefined}>
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <FileUploadField
                  accept={SW_UPLOAD_ACCEPT}
                  buttonLabel='แนบเอกสาร'
                  onFile={attachFile}
                />
                {(form.attachments || []).length > 0 && (
                  <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    {form.attachments.map((a, i) => (
                      <div
                        key={`${a.name}-${i}`}
                        className='flex items-center'
                        style={{
                          gap: 'var(--dim-space-150, 6px)',
                          paddingTop: 'var(--dim-space-150, 6px)',
                          paddingBottom: 'var(--dim-space-150, 6px)',
                          paddingLeft: 'var(--dim-space-250, 10px)',
                          paddingRight: 'var(--dim-space-250, 10px)',
                          borderRadius: 'var(--dim-radius-200, 8px)',
                          background: 'var(--surface-card-quaternary, #F9FBFB)',
                          border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
                          fontSize: 'var(--type-size-xs)',
                        }}
                      >
                        <Icon name='attach_file' size={14} />
                        <span>{a.name}</span>
                        <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>{a.size}</span>
                        <button
                          type='button'
                          aria-label={`ลบไฟล์ ${a.name}`}
                          onClick={() => setForm((f) => ({ ...f, attachments: f.attachments.filter((_, idx) => idx !== i) }))}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-danger-default, #B91C1C)' }}
                        >
                          <Icon name='close' size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SwField>

            <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <SwAuditLine
                by={SW_CURRENT_USER}
                at={new Date().toISOString()}
                label='ผู้บันทึก'
                formatDateTime={formatSwDateTime}
              />
              <div className='flex-1' />
              <NeutralSubdueButton leadingIcon='close' onClick={closeForm}>ยกเลิกการกรอก</NeutralSubdueButton>
              <BrandButton leadingIcon='save' onClick={submit}>
                {editing === 'new' ? 'บันทึกแบบส่งต่อ' : 'บันทึกการแก้ไข'}
              </BrandButton>
            </div>
          </SwSectionCard>
        )}

        {/* ── รายการ ─────────────────────────────────────────────── */}
        <SwSectionCard icon='list_alt' title='รายการแบบส่งต่อ'>
          <div className='flex w-full flex-wrap items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <SwInlineSearch
              value={search}
              onChange={setSearch}
              placeholder='ค้นหา เลขที่หนังสือ / HN / ชื่อ / เรื่อง / หน่วยงาน'
              minWidth={280}
            />
            <div style={{ minWidth: 240 }}>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                value={scopeFilter}
                onChange={setScopeFilter}
                options={[{ value: 'all', label: 'ทุกประเภทหน่วยงาน' }, ...SW_REFERRAL_SCOPES]}
                placeholder='ประเภทหน่วยงาน'
              />
            </div>
            {(search || scopeFilter !== 'all') && (
              <NeutralSubdueButton size='sm' leadingIcon='close' onClick={() => { setSearch(''); setScopeFilter('all'); }}>
                ล้างตัวกรอง
              </NeutralSubdueButton>
            )}
            <div className='flex-1' />
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
              {`พบ ${filtered.length} รายการ จาก ${rows.length} รายการ`}
            </span>
          </div>

          {!canWrite ? (
            <SwConfidentialMask what='รายการส่งต่อผู้ใช้บริการสังคมสงเคราะห์' />
          ) : filtered.length === 0 ? (
            <SwEmptyHint icon='forward_to_inbox'>
              ไม่พบแบบส่งต่อที่ตรงกับตัวกรอง — ลองเปลี่ยนแท็บสถานะหรือกด &quot;ล้างตัวกรอง&quot;
            </SwEmptyHint>
          ) : (
            <Table
              columns={columns}
              rows={filtered}
              rowKey={(r) => r.id}
              pageSize={20}
              stickyRightColCount={1}
              emptyMessage='ไม่พบแบบส่งต่อ'
            />
          )}
        </SwSectionCard>
      </div>

      {/* ── popup ยกเลิก (เหตุผลบังคับ) ────────────────────────────── */}
      <Popup
        open={!!cancelTarget}
        onClose={() => { setCancelTarget(null); setCancelError(''); }}
        title='ยกเลิกแบบส่งต่อ (ส.ส.3)'
        subtitle={cancelTarget ? `${cancelTarget.docNo} · ${cancelTarget.name} (HN ${cancelTarget.hn})` : ''}
        secondaryAction={{ label: 'ไม่ยกเลิก', onClick: () => { setCancelTarget(null); setCancelError(''); } }}
        primaryAction={{ label: 'ยืนยันการยกเลิก', onClick: confirmCancel }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <SwBanner tone='warning' icon='warning'>
            รายการที่ยกเลิกจะยังแสดงในตาราง (ขีดฆ่า) พร้อมผู้ยกเลิก เวลา และเหตุผล
            และสามารถกด &quot;เปิดใช้งาน&quot; เพื่อกู้คืนได้ภายหลัง
          </SwBanner>
          <SwField label='เหตุผลการยกเลิก' required hint={cancelError} hintTone={cancelError ? 'error' : undefined}>
            <SuggestibleTextarea
              voice
              value={cancelReason}
              onChange={(e) => { setCancelReason(e.target.value); setCancelError(''); }}
              suggestions={[
                'ออกเลขที่หนังสือซ้ำ — ยกเลิกและออกใหม่',
                'ผู้รับบริการขอยุติการส่งต่อ',
                'ส่งผิดหน่วยงานปลายทาง',
                'ข้อมูลในเอกสารไม่ถูกต้อง ต้องออกฉบับใหม่',
              ]}
              minChars={2}
              placeholder='ระบุเหตุผลการยกเลิกแบบส่งต่อ'
            />
          </SwField>
        </div>
      </Popup>

      {/* ── popup บันทึกการตอบกลับ ─────────────────────────────────── */}
      <Popup
        open={!!replyTarget}
        onClose={() => { setReplyTarget(null); setReplyError(''); }}
        title='บันทึกการตอบกลับจากหน่วยงานปลายทาง'
        subtitle={replyTarget ? `${replyTarget.docNo} · ${resolveSwReferralAgency(replyTarget.agency)}` : ''}
        secondaryAction={{ label: 'ปิด', onClick: () => { setReplyTarget(null); setReplyError(''); } }}
        primaryAction={{ label: 'บันทึกการตอบกลับ', onClick: submitReply }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <SwField label='วันที่ตอบกลับ' minWidth={200}>
              <DatePicker
                showLabel={false}
                value={replyForm.date ? new Date(replyForm.date) : null}
                onChange={(d) => setReplyForm((f) => ({ ...f, date: d ? toLocalIso(d) : '' }))}
                placeholder='เลือกวันที่'
              />
            </SwField>
            <SwField label='สถานะหลังตอบกลับ' minWidth={220}>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                value={replyForm.status}
                onChange={(v) => setReplyForm((f) => ({ ...f, status: v }))}
                options={SW_REFERRAL_STATUSES.filter((s) => s.value !== 'pending')}
                placeholder='เลือกสถานะ'
              />
            </SwField>
          </div>
          <SwField label='หน่วยงานผู้ตอบกลับ' required>
            <InputField
              value={replyForm.by}
              onChange={(v) => { setReplyForm((f) => ({ ...f, by: v })); setReplyError(''); }}
              placeholder={replyTarget ? resolveSwReferralAgency(replyTarget.agency) : ''}
              showHelperText={false}
            />
          </SwField>
          <SwField label='รายละเอียดการตอบกลับ' required hint={replyError} hintTone={replyError ? 'error' : undefined}>
            <SuggestibleTextarea
              voice
              value={replyForm.note}
              onChange={(e) => { setReplyForm((f) => ({ ...f, note: e.target.value })); setReplyError(''); }}
              suggestions={[
                'ตอบรับ — นัดหมายผู้รับบริการเข้ารับบริการตามวันที่กำหนด',
                'ตอบรับ — อยู่ระหว่างพิจารณาให้การช่วยเหลือ',
                'ปิดเรื่อง — ให้การช่วยเหลือครบตามที่ขอแล้ว',
                'ส่งกลับ — ผู้รับบริการไม่อยู่ในเขตพื้นที่รับผิดชอบ',
              ]}
              minChars={3}
              placeholder='ระบุผลการตอบกลับจากหน่วยงานปลายทาง'
            />
          </SwField>
          {replyTarget && (replyTarget.replies || []).length > 0 && (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
              <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>
                ประวัติการตอบกลับ
              </span>
              {replyTarget.replies.map((r, i) => (
                <span key={`${r.date}-${i}`} style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #636B72)' }}>
                  {`${formatSwDate(r.date)} · ${r.by} — ${r.note}`}
                </span>
              ))}
            </div>
          )}
        </div>
      </Popup>

      {/* ── popup ดู / พิมพ์แบบ ส.ส.3 ──────────────────────────────── */}
      <Popup
        open={!!printTarget}
        onClose={() => setPrintTarget(null)}
        title='แบบส่งต่อผู้ใช้บริการสังคมสงเคราะห์ (ส.ส.3)'
        subtitle={printTarget ? `${printTarget.docNo} · ออกวันที่ ${formatSwDate(printTarget.issueDate)}` : ''}
        width={760}
        secondaryAction={{ label: 'ปิด', onClick: () => setPrintTarget(null) }}
        primaryAction={{ label: 'พิมพ์เอกสาร', onClick: doPrint }}
      >
        {printTarget && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <div
              className='flex flex-col w-full'
              style={{
                gap: 'var(--dim-space-200, 8px)',
                paddingTop: 'var(--dim-space-500, 20px)',
                paddingBottom: 'var(--dim-space-500, 20px)',
                paddingLeft: 'var(--dim-space-500, 20px)',
                paddingRight: 'var(--dim-space-500, 20px)',
                borderRadius: 'var(--dim-radius-300, 10px)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary, #E2E4E6)',
                background: 'var(--surface-card-100, #FFFFFF)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-content-default, #363B3F)',
              }}
            >
              <span style={{ fontWeight: 'var(--type-weight-bold)' }}>{SW_CENTER.name}</span>
              <span>{SW_CENTER.office}</span>
              <span>{`ที่ ${printTarget.docNo}`}</span>
              <span>{`วันที่ ${formatSwDate(printTarget.issueDate)}`}</span>
              <span>{`เรื่อง ${printTarget.subject}`}</span>
              <span>{`เรียน ${resolveSwReferralAgency(printTarget.agency)}`}</span>
              <span style={{ marginTop: 'var(--dim-space-200, 8px)' }}>
                {`เนื่องจาก ${printTarget.name} อายุ ${printTarget.age || '—'} ที่อยู่ปัจจุบัน ${printTarget.currentAddress || '—'}`}
                {printTarget.landmark ? ` (สถานที่ใกล้เคียง ${printTarget.landmark})` : ''}
              </span>
              <span>{`รหัสปัญหาหลัก: ${resolveSwProblemCodeLabel(printTarget.problemCode)}`}</span>
              <span>{`การช่วยเหลือที่ได้ดำเนินการแล้ว: ${printTarget.doneAlready || '—'}`}</span>
              <span>{`จึงเรียนมาเพื่อขอความช่วยเหลือเรื่อง: ${printTarget.request || '—'}`}</span>
              <span style={{ marginTop: 'var(--dim-space-300, 12px)' }}>
                {`ลงชื่อ ${printTarget.senderName} · ตำแหน่ง ${printTarget.senderPosition}`}
              </span>
              <span>{`โทรศัพท์ ${printTarget.phone} · โทรสาร ${printTarget.fax}`}</span>
            </div>

            {(printTarget.attachments || []).length > 0 && (
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #636B72)' }}>
                {`เอกสารแนบ: ${printTarget.attachments.map((a) => a.name).join(' · ')}`}
              </span>
            )}

            <SwBanner tone='neutral' icon='history'>
              {printLog.length === 0
                ? 'ยังไม่เคยพิมพ์เอกสารฉบับนี้ — เมื่อกดพิมพ์ ระบบจะประทับผู้พิมพ์และเวลาไว้'
                : `พิมพ์ล่าสุดโดย ${printLog[printLog.length - 1].by} · ${formatSwDateTime(printLog[printLog.length - 1].at)} (ทั้งหมด ${printLog.length} ครั้ง)`}
            </SwBanner>
          </div>
        )}
      </Popup>

      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />
    </QueuePageShell>
  );
};

export default SocialWorkReferralPage;
