import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import Table, { EllipsisText as TableEllipsisText } from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Badge from '@/components/badge/Badge';
import PatientCard from '@/components/card/PatientCard';
import DatePicker from '@/components/forms/DatePicker';
import Dropdown from '@/components/forms/Dropdown';
import InputField from '@/components/forms/InputField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import AlertDialog from '@/components/popup/AlertDialog';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import Icon from '@/components/icons/Icon';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  getRg506Cases,
  getRg506Case,
  saveRg506Draft,
  saveRg506,
  sendRg506ToEpiNet,
  RG506_STATUS,
  SURVEILLANCE_DISEASES,
  PATIENT_TYPES,
  PATIENT_CONDITIONS,
} from '@/data/opdRg506';

/* OpdRg506Page — TOR 1.2.3.6 รง.506 surveillance reporting for EPI-NET.
   PharmacyRegistryPage pattern: list + record edit share this single page.
   Cases are auto-detected from OPD diagnoses (mock detector seeds the store);
   all auto-pulled fields stay editable before save (TOR: "สร้างและบันทึก …
   ดึงข้อมูลที่เกี่ยวข้องมาอัตโนมัติ"). EPI-NET is an external government
   system — ส่งเข้าระบบ is mocked as a status transition + export-file stub. */

const breadcrumb = ['รายงานเฝ้าระวังโรค รง.506'];
const PAGE_SIZE = 10;

const ADDRESS_SUGGESTIONS = [
  '215/8 ถ.ประชาสงเคราะห์ แขวงดินแดง เขตดินแดง กทม. 10400',
  '99/12 ถ.มิตรไมตรี แขวงดินแดง เขตดินแดง กทม. 10400',
  '31 ซ.ประชาราษฎร์บำเพ็ญ 14 แขวงห้วยขวาง เขตห้วยขวาง กทม. 10310',
  '88 ถ.วิภาวดีรังสิต แขวงสามเสนใน เขตพญาไท กทม. 10400',
];

const keyOfDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseKey = (key) => {
  if (!key) return null;
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/* Resolve FilterDateTag value {quick, single?, range?} → [start, end] Dates. */
const resolveDateBounds = (value) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const quick = value?.quick || 'all';
  const back = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d;
  };
  if (quick === 'today') return [today, today];
  if (quick === 'yesterday') return [back(1), back(1)];
  if (quick === '7days') return [back(6), today];
  if (quick === '30days') return [back(29), today];
  if (quick === 'custom') {
    if (value?.range?.start && value?.range?.end) return [value.range.start, value.range.end];
    if (value?.single) return [value.single, value.single];
  }
  return null; // no bound
};

const labelStyle = {
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium)',
  color: 'var(--text-content-default, #363B3F)',
};

const OpdRg506Page = () => {
  const history = useHistory();
  const [cases, setCases] = useState(() => getRg506Cases());
  const refresh = () => setCases(getRg506Cases());

  /* view: null = list · otherwise record id */
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const [alertBox, setAlertBox] = useState(null); // { type, title, description }

  /* Role mock — ส่ง EPI-NET restricted to authorized role (นวก.สาธารณสุข). */
  const [canSendEpiNet, setCanSendEpiNet] = useState(true);

  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [diseaseFilter, setDiseaseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateValue, setDateValue] = useState({ quick: 'all' });

  const openRecord = (row) => {
    const full = getRg506Case(row.id);
    if (!full) return;
    setOpenId(row.id);
    setForm({ ...full });
    setDirty(false);
  };

  const closeRecord = (force = false) => {
    if (dirty && !force) { setUnsavedOpen(true); return; }
    setOpenId(null);
    setForm(null);
    setDirty(false);
    refresh();
  };

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  /* ── List derivation ─────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let result = cases;
    if (diseaseFilter !== 'all') result = result.filter((c) => c.diseaseCode === diseaseFilter);
    if (statusFilter !== 'all') result = result.filter((c) => c.status === statusFilter);
    const bounds = resolveDateBounds(dateValue);
    if (bounds) {
      const [start, end] = bounds;
      result = result.filter((c) => {
        const d = parseKey(c.foundDate);
        if (!d) return false;
        return d >= start && d <= end;
      });
    }
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      result = result.filter((c) => [c.reportNo, c.hn, c.name, c.disease, c.icd10]
        .some((f) => f && f.toLowerCase().includes(q)));
    }
    return result;
  }, [cases, diseaseFilter, statusFilter, dateValue, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const isAllDefault = diseaseFilter === 'all' && statusFilter === 'all' && (dateValue.quick || 'all') === 'all';

  const columns = useMemo(() => ([
    { key: 'reportNo', label: 'เลขที่รายงาน', width: 160 },
    { key: 'foundDate', label: 'วันพบผู้ป่วย', width: 128 },
    { key: 'hn', label: 'HN', width: 96 },
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 160 },
    {
      key: 'disease',
      label: 'โรคเฝ้าระวัง (ICD-10)',
      flex: true,
      minWidth: 220,
      render: (row) => <TableEllipsisText text={`${row.disease} · ${row.icd10}`} />,
    },
    {
      key: 'status',
      label: 'สถานะ',
      width: 160,
      render: (row) => {
        const meta = RG506_STATUS[row.status] || RG506_STATUS.draft;
        return <Badge style={meta.badge} size='small'>{meta.label}</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      width: 132,
      sortable: false,
      render: (row) => (
        <BrandSubdueButton
          variant='outline'
          size='sm'
          onClick={(e) => { e.stopPropagation(); openRecord(row); }}
        >
          {row.status === 'sent' ? 'แสดง' : 'แก้ไข'}
        </BrandSubdueButton>
      ),
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  ]), [cases]);

  /* ── Record actions ──────────────────────────────────────────────── */
  const requiredMissing = form
    ? !(form.disease && form.onsetDate && (form.addressWhileIll || '').trim())
    : true;

  const readOnly = form?.status === 'sent';

  const handleSaveDraft = () => {
    saveRg506Draft(form.id, extractFields(), 'พว.กานดา ศรีวิไล');
    setDirty(false);
    setForm(getRg506Case(form.id));
    refresh();
    setAlertBox({ type: 'success', title: 'บันทึกร่างแล้ว', description: `${form.reportNo} ถูกเก็บเป็นร่าง — ยังไม่ส่ง EPI-NET` });
  };

  const extractFields = () => ({
    disease: form.disease,
    diseaseCode: form.diseaseCode,
    icd10: form.icd10,
    onsetDate: form.onsetDate,
    foundDate: form.foundDate,
    patientType: form.patientType,
    condition: form.condition,
    addressWhileIll: (form.addressWhileIll || '').trim(),
  });

  const handleSave = () => {
    if (requiredMissing) {
      setAlertBox({ type: 'destructive', title: 'ข้อมูลไม่ครบ', description: 'ต้องระบุ โรคเฝ้าระวัง, วันเริ่มป่วย และที่อยู่ขณะป่วย ก่อนบันทึกรายงาน' });
      return;
    }
    saveRg506(form.id, extractFields(), 'พว.กานดา ศรีวิไล');
    setDirty(false);
    setForm(getRg506Case(form.id));
    refresh();
    setAlertBox({ type: 'success', title: 'บันทึกรายงานแล้ว', description: `${form.reportNo} พร้อมส่งเข้า EPI-NET` });
  };

  const handleSend = () => {
    if (form.status !== 'saved') {
      setAlertBox({ type: 'warning', title: 'ยังส่งไม่ได้', description: 'ต้องบันทึกรายงาน (สถานะ "บันทึกแล้ว") ก่อนจึงจะส่งเข้า EPI-NET ได้' });
      return;
    }
    const updated = sendRg506ToEpiNet(form.id, 'นวก.สาธารณสุข อรทัย บุญเรือง');
    setForm(getRg506Case(form.id));
    setDirty(false);
    refresh();
    setAlertBox({
      type: 'success',
      title: 'ส่งเข้า EPI-NET แล้ว (จำลอง)',
      description: `สร้างไฟล์ ${updated?.exportFile || ''} และปรับสถานะเป็น "ส่ง EPI-NET แล้ว" — การเชื่อมต่อระบบจริงเป็นงานภายนอก`,
    });
  };

  const handlePrint = () => {
    if (form.status === 'draft') {
      setAlertBox({ type: 'warning', title: 'พิมพ์ไม่ได้', description: 'รายงานยังเป็นร่าง — ต้องบันทึกรายงานก่อนจึงจะพิมพ์แบบ รง.506 ได้' });
      return;
    }
    setAlertBox({ type: 'info', title: 'พิมพ์แบบ รง.506', description: `สร้างตัวอย่างเอกสารแบบรายงาน 506 ของ ${form.reportNo} แล้ว (เอกสารตัวอย่าง)` });
  };

  const patientProfile = form ? getPatientByHN(form.hn) : null;

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <>
      <AlertDialog
        open={!!alertBox}
        onClose={() => setAlertBox(null)}
        onConfirm={() => setAlertBox(null)}
        type={alertBox?.type || 'info'}
        title={alertBox?.title || ''}
        description={alertBox?.description || ''}
        showCancel={false}
        confirmLabel='ตกลง'
      />
      <UnsavedChangesPopup
        open={unsavedOpen}
        onClose={() => setUnsavedOpen(false)}
        onSave={() => { setUnsavedOpen(false); handleSaveDraft(); closeRecord(true); }}
        onDiscard={() => { setUnsavedOpen(false); closeRecord(true); }}
      />

      <QueuePageShell
        activeKey='opd-rg506'
        breadcrumb={breadcrumb}
        title={form ? `รง.506 · ${form.reportNo}` : 'รายงานเฝ้าระวังโรค รง.506 (EPI-NET)'}
        onBack={form ? () => closeRecord() : () => history.push('/opd/queue')}
        actions={(
          <NeutralSubdueButton
            leadingIcon={canSendEpiNet ? 'verified_user' : 'lock'}
            onClick={() => setCanSendEpiNet((v) => !v)}
            accessibilityLabel='สลับบทบาทตัวอย่าง'
          >
            {canSendEpiNet ? 'บทบาท: นวก.สาธารณสุข (ส่ง EPI-NET ได้)' : 'บทบาท: พยาบาล (ส่ง EPI-NET ไม่ได้)'}
          </NeutralSubdueButton>
        )}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            paddingTop: 'var(--dim-space-600)',
            paddingLeft: 'var(--dim-space-600)',
            paddingRight: 'var(--dim-space-600)',
            paddingBottom: 'var(--dim-space-600)',
            gap: 'var(--dim-space-400)',
          }}
        >
          {!form ? (
            /* ══ LIST VIEW ══ */
            <div
              className='w-full flex flex-col'
              style={{
                background: 'var(--surface-card-100)',
                borderRadius: 'var(--dim-radius-500)',
                boxShadow: 'var(--shadow-card-strong)',
                paddingTop: 'var(--dim-space-600)',
                paddingBottom: 'var(--dim-space-600)',
                paddingLeft: 'var(--dim-space-600)',
                paddingRight: 'var(--dim-space-600)',
                gap: 'var(--dim-space-600)',
              }}
            >
              <div className='w-full flex items-start justify-center'>
                <PrimarySearch
                  value={searchQ}
                  onChange={(v) => { setSearchQ(v); setPage(1); }}
                  onSubmit={(v) => { setSearchQ(v); setPage(1); }}
                  placeholder='ค้นหาเลขที่รายงาน / HN / ชื่อผู้ป่วย / โรค / ICD-10'
                  width={640}
                />
              </div>

              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <FilterTag
                  value='ทั้งหมด'
                  selected={isAllDefault}
                  onClick={() => { setDiseaseFilter('all'); setStatusFilter('all'); setDateValue({ quick: 'all' }); setPage(1); }}
                />
                <FilterDropdown
                  prefix='โรค:'
                  options={[
                    { value: 'all', label: 'ทุกโรคเฝ้าระวัง' },
                    ...SURVEILLANCE_DISEASES.map((d) => ({ value: d.code, label: d.label })),
                  ]}
                  value={diseaseFilter}
                  onChange={(v) => { setDiseaseFilter(v); setPage(1); }}
                />
                <FilterDropdown
                  prefix='สถานะ:'
                  options={[
                    { value: 'all', label: 'ทุกสถานะ' },
                    ...Object.entries(RG506_STATUS).map(([k, v]) => ({ value: k, label: v.label })),
                  ]}
                  value={statusFilter}
                  onChange={(v) => { setStatusFilter(v); setPage(1); }}
                />
                <FilterDateTag
                  prefix='วันพบผู้ป่วย:'
                  value={dateValue}
                  onChange={(v) => { setDateValue(v); setPage(1); }}
                  defaultQuick='all'
                  quickLabels={{ all: 'ทุกช่วงเวลา', today: 'วันนี้', yesterday: 'เมื่อวาน' }}
                />
              </div>

              {cases.length === 0 ? (
                <div
                  className='w-full flex flex-col items-center'
                  style={{ gap: 'var(--dim-space-300)', paddingTop: 'var(--dim-space-600)', paddingBottom: 'var(--dim-space-600)' }}
                >
                  <Icon name='coronavirus' size={48} style={{ color: 'var(--text-content-quaternary, #ADB2B7)' }} />
                  <span style={{ ...labelStyle, fontSize: 'var(--type-size-base)' }}>
                    ยังไม่พบผู้ป่วยโรคเฝ้าระวังจากการวินิจฉัย OPD
                  </span>
                  <span style={{ ...labelStyle, fontWeight: 'var(--type-weight-regular)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    ระบบจะสร้างร่างรายงานอัตโนมัติเมื่อพบการวินิจฉัยเข้าเกณฑ์ รง.506
                  </span>
                </div>
              ) : (
                <>
                  <Table
                    columns={columns}
                    rows={pageRows}
                    rowKey={(row) => row.id}
                    stickyColCount={1}
                    onRowClick={openRecord}
                    emptyMessage='ไม่พบรายการที่ค้นหา — ลองล้างตัวกรองหรือคำค้น'
                  />
                  <div
                    className='flex items-center w-full'
                    style={{
                      gap: 'var(--dim-space-200)',
                      paddingTop: 'var(--dim-space-200)',
                      borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                    }}
                  >
                    <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                      แสดง {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ
                    </span>
                    <div className='flex-1' />
                    <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ══ RECORD VIEW ══ */
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
              {patientProfile && (
                <PatientCard patient={patientProfile} title='รายงานเฝ้าระวังโรค รง.506' />
              )}

              {readOnly && (
                <div
                  className='flex items-center'
                  style={{
                    gap: 'var(--dim-space-200)',
                    paddingTop: 'var(--dim-space-300)',
                    paddingBottom: 'var(--dim-space-300)',
                    paddingLeft: 'var(--dim-space-400)',
                    paddingRight: 'var(--dim-space-400)',
                    background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                    borderRadius: 'var(--dim-radius-400, 12px)',
                  }}
                >
                  <Icon name='check_circle' size={18} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
                  <span style={labelStyle}>
                    รายงานนี้ส่งเข้า EPI-NET แล้ว ({form.sentAt}) — อ่านอย่างเดียว ไฟล์ส่งออก: {form.exportFile}
                  </span>
                </div>
              )}

              <section
                className='w-full flex flex-col'
                style={{
                  background: 'var(--surface-card-100)',
                  borderRadius: 'var(--dim-radius-500)',
                  boxShadow: 'var(--shadow-card)',
                  paddingTop: 'var(--dim-space-600)',
                  paddingBottom: 'var(--dim-space-600)',
                  paddingLeft: 'var(--dim-space-600)',
                  paddingRight: 'var(--dim-space-600)',
                  gap: 'var(--dim-space-400)',
                }}
              >
                <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                  <Icon name='coronavirus' size={20} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
                  <h2
                    style={{
                      marginTop: 'var(--dim-space-0, 0px)',
                      marginRight: 'var(--dim-space-0, 0px)',
                      marginBottom: 'var(--dim-space-0, 0px)',
                      marginLeft: 'var(--dim-space-0, 0px)',
                      color: 'var(--text-brandPrimary-default, #007549)',
                      fontFamily: 'var(--type-family-heading-content)',
                      fontWeight: 'var(--type-weight-bold)',
                      fontSize: 'var(--type-size-base)',
                    }}
                  >
                    ข้อมูลการป่วย (ดึงอัตโนมัติจากการวินิจฉัย — แก้ไขได้ก่อนบันทึก)
                  </h2>
                  <Badge style={(RG506_STATUS[form.status] || RG506_STATUS.draft).badge} size='small'>
                    {(RG506_STATUS[form.status] || RG506_STATUS.draft).label}
                  </Badge>
                </div>

                <div className='grid' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--dim-space-400)' }}>
                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                    <span style={labelStyle}>โรคเฝ้าระวัง *</span>
                    <Dropdown
                      value={form.diseaseCode}
                      onChange={(code) => {
                        const meta = SURVEILLANCE_DISEASES.find((d) => d.code === code);
                        setForm((f) => ({ ...f, diseaseCode: code, disease: meta ? meta.label : code, icd10: f.icd10 || code }));
                        setDirty(true);
                      }}
                      options={SURVEILLANCE_DISEASES.map((d) => ({ value: d.code, label: d.label }))}
                      placeholder='เลือกโรคเฝ้าระวัง'
                      state={readOnly ? 'disabled' : 'default'}
                    />
                  </div>
                  <InputField
                    label='รหัส ICD-10'
                    value={form.icd10 || ''}
                    onChange={(v) => setField('icd10', v)}
                    placeholder='เช่น A90'
                    showLeadingIcon={false}
                    showHelperText={false}
                    disabled={readOnly}
                  />
                  <DatePicker
                    label='วันเริ่มป่วย'
                    required
                    value={parseKey(form.onsetDate)}
                    onChange={(d) => setField('onsetDate', d ? keyOfDate(d) : '')}
                    showHelperText={false}
                    disabled={readOnly}
                  />
                  <DatePicker
                    label='วันพบผู้ป่วย'
                    value={parseKey(form.foundDate)}
                    onChange={(d) => setField('foundDate', d ? keyOfDate(d) : '')}
                    showHelperText={false}
                    disabled={readOnly}
                  />
                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                    <span style={labelStyle}>ประเภทผู้ป่วย</span>
                    <Dropdown
                      value={form.patientType}
                      onChange={(v) => setField('patientType', v)}
                      options={PATIENT_TYPES.map((t) => ({ value: t, label: t }))}
                      state={readOnly ? 'disabled' : 'default'}
                    />
                  </div>
                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                    <span style={labelStyle}>สภาพผู้ป่วย</span>
                    <Dropdown
                      value={form.condition}
                      onChange={(v) => setField('condition', v)}
                      options={PATIENT_CONDITIONS.map((c) => ({ value: c, label: c }))}
                      state={readOnly ? 'disabled' : 'default'}
                    />
                  </div>
                </div>

                <SuggestibleTextarea
                  label='ที่อยู่ขณะป่วย'
                  required
                  voice
                  value={form.addressWhileIll || ''}
                  onChange={(e) => setField('addressWhileIll', e.target.value)}
                  placeholder='บ้านเลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์ ขณะเริ่มป่วย'
                  suggestions={ADDRESS_SUGGESTIONS}
                  minChars={2}
                  disabled={readOnly}
                  popoverAriaLabel='คำแนะนำที่อยู่ขณะป่วย'
                />

                {requiredMissing && !readOnly && (
                  <span style={{ ...labelStyle, color: 'var(--text-danger-default, #B91C1C)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-regular)' }}>
                    * ต้องระบุ โรคเฝ้าระวัง, วันเริ่มป่วย และที่อยู่ขณะป่วย ก่อนบันทึก/ส่งรายงาน
                  </span>
                )}
              </section>

              {/* Audit trail — read-only, every transition stamped */}
              <section
                className='w-full flex flex-col'
                style={{
                  background: 'var(--surface-card-100)',
                  borderRadius: 'var(--dim-radius-500)',
                  boxShadow: 'var(--shadow-card)',
                  paddingTop: 'var(--dim-space-400)',
                  paddingBottom: 'var(--dim-space-400)',
                  paddingLeft: 'var(--dim-space-600)',
                  paddingRight: 'var(--dim-space-600)',
                  gap: 'var(--dim-space-300)',
                }}
              >
                <ConsentAuditBar
                  recordedBy={(form.audit && form.audit[form.audit.length - 1]?.by) || '—'}
                  recordedAt={(form.audit && form.audit[form.audit.length - 1]?.at) || '—'}
                />
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  {(form.audit || []).map((a, i) => (
                    <div key={`${a.at}-${i}`} className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                      <Icon name='history' size={16} style={{ color: 'var(--text-content-tertiary, #858C92)' }} />
                      <span style={{ ...labelStyle, fontWeight: 'var(--type-weight-regular)', color: 'var(--text-content-secondary, #636B72)', fontSize: 'var(--type-size-xs)' }}>
                        {a.at} · {a.by} — {a.action}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Action footer */}
              <div
                className='flex items-center w-full flex-wrap'
                style={{
                  gap: 'var(--dim-space-300)',
                  paddingTop: 'var(--dim-space-400)',
                  paddingBottom: 'var(--dim-space-400)',
                  paddingLeft: 'var(--dim-space-600)',
                  paddingRight: 'var(--dim-space-600)',
                  background: 'var(--surface-card-100)',
                  borderRadius: 'var(--dim-radius-500)',
                  boxShadow: 'var(--shadow-card)',
                  position: 'sticky',
                  bottom: 'var(--dim-space-200)',
                  zIndex: 50,
                }}
              >
                <NeutralSubdueButton size='lg' onClick={() => closeRecord()}>กลับรายการ</NeutralSubdueButton>
                {/* ยกเลิกการแก้ไข — reverts the form to the stored record
                    (the "ยกเลิก" leg of แสดง/บันทึก/ยกเลิก/แก้ไข). */}
                {!readOnly && (
                  <NeutralSubdueButton
                    size='lg'
                    leadingIcon='undo'
                    disabled={!dirty}
                    onClick={() => {
                      setForm(getRg506Case(openId));
                      setDirty(false);
                      setAlertBox({ type: 'info', title: 'ยกเลิกการแก้ไขแล้ว', description: 'ข้อมูลถูกคืนค่าเป็นรายงานที่บันทึกไว้ล่าสุด' });
                    }}
                  >
                    ยกเลิกการแก้ไข
                  </NeutralSubdueButton>
                )}
                <div className='flex-1' />
                <NeutralSubdueButton size='lg' leadingIcon='print' onClick={handlePrint}>
                  พิมพ์แบบ รง.506
                </NeutralSubdueButton>
                {!readOnly && (
                  <>
                    <BrandSubdueButton variant='outline' size='lg' leadingIcon='save' disabled={!dirty} onClick={handleSaveDraft}>
                      บันทึกร่าง
                    </BrandSubdueButton>
                    <BrandSubdueButton variant='fill' size='lg' leadingIcon='task_alt' disabled={requiredMissing} onClick={handleSave}>
                      บันทึก
                    </BrandSubdueButton>
                    <span title={!canSendEpiNet ? 'เฉพาะบทบาทที่ได้รับอนุญาต (นวก.สาธารณสุข) เท่านั้น' : undefined}>
                      <BrandPrimaryButton
                        size='lg'
                        leadingIcon='outbox'
                        disabled={!canSendEpiNet || form.status !== 'saved'}
                        onClick={handleSend}
                      >
                        ส่งเข้า EPI-NET
                      </BrandPrimaryButton>
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </QueuePageShell>
    </>
  );
};

export default OpdRg506Page;
