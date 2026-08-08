import React, { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header, { SubHeader } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import Table from '@/components/table/Table';
import Checkbox from '@/components/checkbox/Checkbox';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import TimePicker from '@/components/forms/TimePicker';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import Barcode128 from '@/components/lab/Barcode128';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  CHECKUP_CATALOG, CHECKUP_ITEM_GROUPS, CHECKUP_ITEM_GROUP_LABEL, LAB_PANELS,
  CHECKUP_CENTER, CHECKUP_DOCTORS, CANCEL_REASON_SUGGESTIONS,
  getVisit, saveVisit, cancelVisitOrder, restoreVisitOrder, getPackage,
  listPackages, visitItems, visitTotals, formatBahtTh,
  formatThaiDate, formatThaiDateTime, emrLinksFor, hasEmrHistory, openNextRound,
  listVisitsByHn, CHECKUP_STAFF,
} from '@/data/checkupStore';
import {
  PageBody, PageCard, EmptyState, NoticeBar, SectionHeader, SubCard,
  ReadField, CheckupAuditBar, ReadOnlyLinkRow, StatTile,
} from '@/pages/checkup/CheckupUi';

/* CheckupOrderPage — บันทึกส่งตรวจสุขภาพ / ใบสั่งตรวจ
   (TOR 1.19.5 เพิ่มรายการตรวจ + ออกใบสั่งตรวจ · 1.19.10 หลายครั้งใน 1 โปรแกรม ·
    1.19.15 เชื่อมโยง CPOE แบบอ่านอย่างเดียว).

   Follows HCIS §2.13.2: the ชุดตรวจ that was pre-ordered for the visit expands
   into the four item groups with ราคา / เบิกได้ / รวม, per-visit extras can be
   added or removed before confirming, then the order is issued with a number
   and a printable slip + specimen labels.

   Verbs: แสดง (read-only when confirmed / cancelled) · บันทึก (บันทึกใบสั่ง) ·
   แก้ไข (แก้ไขใบสั่ง reopens) · ยกเลิก (mandatory reason → audit). */

const breadcrumb = ['ระบบงานตรวจสุขภาพ', 'บันทึกส่งตรวจสุขภาพ'];
const QUEUE_PATH = '/checkup';

const UNIT_OPTIONS = [
  { value: 'ห้องตรวจ 1', label: 'ห้องตรวจ 1' },
  { value: 'ห้องตรวจ 2', label: 'ห้องตรวจ 2' },
  { value: 'ห้องตรวจ 3', label: 'ห้องตรวจ 3' },
  { value: 'ห้องตรวจ 4', label: 'ห้องตรวจ 4' },
  { value: 'หน่วยตรวจเคลื่อนที่', label: 'หน่วยตรวจเคลื่อนที่ (ออกหน่วย)' },
];

/* ── add-item lookup ─────────────────────────────────────────────── */

const AddItemPopup = ({ open, onClose, existing, onConfirm }) => {
  const [group, setGroup] = useState('lab');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState([]);

  React.useEffect(() => { if (open) { setQ(''); setPicked([]); setGroup('lab'); } }, [open]);

  const minChars = group === 'procedure' ? 2 : 1;
  const candidates = CHECKUP_CATALOG.filter((i) => i.group === group && !existing.includes(i.code));
  const results = q.trim().length < minChars
    ? []
    : candidates.filter((i) => `${i.code} ${i.name}`.toLowerCase().includes(q.trim().toLowerCase()));

  const toggle = (code) => setPicked((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));

  const columns = [
    {
      key: 'pick', label: '', width: 56, sortable: false,
      render: (r) => <Checkbox checked={picked.includes(r.code)} onChange={() => toggle(r.code)} aria-label={`เลือก ${r.name}`} />,
    },
    { key: 'code', label: 'รหัส', width: 130 },
    { key: 'name', label: 'ชื่อรายการตรวจ', flex: true, minWidth: 240 },
    { key: 'price', label: 'ราคา', width: 120, align: 'right', render: (r) => formatBahtTh(r.price) },
    { key: 'claimable', label: 'เบิกได้', width: 120, align: 'right', render: (r) => formatBahtTh(r.claimable) },
  ];

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='เพิ่มรายการตรวจเฉพาะรายตามความต้องการ'
      subtitle='เลือกกลุ่มรายการ พิมพ์คำค้นหา แล้วติกเลือกรายการที่ต้องการเพิ่มในใบสั่งตรวจนี้'
      size='extraLarge'
      tertiaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      secondaryAction={group === 'lab'
        ? {
          label: 'เพิ่มทั้งชุด Lab พื้นฐาน',
          onClick: () => { onConfirm(LAB_PANELS[3].members); onClose(); },
        }
        : undefined}
      primaryAction={{
        label: picked.length > 0 ? `เพิ่ม ${picked.length} รายการ` : 'เพิ่มรายการ',
        disabled: picked.length === 0,
        onClick: () => { onConfirm(picked); onClose(); },
      }}
    >
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='grid grid-cols-1 md:grid-cols-2' style={{ gap: 'var(--dim-space-300)' }}>
          <Select
            label='กลุ่มรายการตรวจ'
            showHelperText={false}
            showLeadingIcon={false}
            size='md'
            options={CHECKUP_ITEM_GROUPS.map((g) => ({ value: g.key, label: g.label }))}
            value={group}
            onChange={(v) => { setGroup(typeof v === 'string' ? v : v?.value); setQ(''); setPicked([]); }}
          />
          <InputField
            label='คำค้นหา'
            showHelperText={false}
            leadingIcon='search'
            size='md'
            placeholder={`พิมพ์อย่างน้อย ${minChars} ตัวอักษร`}
            value={q}
            onChange={(e) => setQ(e?.target ? e.target.value : e)}
          />
        </div>
        {q.trim().length < minChars ? (
          <EmptyState compact icon='manage_search' title={`พิมพ์อย่างน้อย ${minChars} ตัวอักษรเพื่อค้นหา`} subtitle={`มี ${candidates.length} รายการที่ยังไม่อยู่ในใบสั่งตรวจนี้`} />
        ) : results.length === 0 ? (
          <EmptyState compact icon='search_off' title='ไม่พบผลลัพธ์' subtitle='รายการที่ค้นหาอาจอยู่ในใบสั่งตรวจนี้แล้ว' />
        ) : (
          <Table columns={columns} rows={results} rowKey={(r) => r.code} emptyMessage='ไม่พบรายการ' />
        )}
      </div>
    </Popup>
  );
};

/* ── print preview ───────────────────────────────────────────────── */

const OrderPrintPopup = ({ open, onClose, visit, items, totals, patient, draft }) => (
  <Popup
    open={open}
    onClose={onClose}
    title='ตัวอย่างใบสั่งตรวจสุขภาพก่อนพิมพ์'
    subtitle={visit ? `เลขที่ใบสั่ง ${visit.orderNo} · ${formatThaiDate(visit.visitDate)}` : ''}
    size='extraLarge'
    tertiaryAction={{ label: 'ปิด', onClick: onClose }}
    primaryAction={{ label: 'พิมพ์ใบสั่งตรวจ', onClick: () => { if (typeof window !== 'undefined') window.print(); } }}
  >
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
      {draft ? (
        <NoticeBar tone='warning' icon='warning'>
          ใบสั่งตรวจยังไม่ได้บันทึก — เอกสารจะพิมพ์ด้วยลายน้ำ "ฉบับร่าง" จนกดบันทึกใบสั่งตรวจ
        </NoticeBar>
      ) : null}
      <SubCard>
        <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
            <span style={{ fontFamily: 'var(--type-family-heading-content, var(--type-family-body))', fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))' }}>
              ใบสั่งตรวจสุขภาพ
            </span>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
              {`${CHECKUP_CENTER} · สำนักอนามัย กรุงเทพมหานคร`}
            </span>
          </div>
          <div className='flex flex-col items-end' style={{ gap: 'var(--dim-space-100)' }}>
            <Barcode128 value={visit?.orderNo || 'ORD-DRAFT'} height={40} showText />
          </div>
        </div>
        <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
          <ReadField label='HN' value={visit?.hn} />
          <ReadField label='ชื่อ-นามสกุล' value={patient?.fullName || visit?.name} minWidth={220} />
          <ReadField label='เพศ / อายุ' value={`${visit?.sex || '—'} · ${visit?.age || '—'} ปี`} />
          <ReadField label='สิทธิการรักษา' value={visit?.rights} minWidth={260} />
          <ReadField label='โปรแกรมตรวจ' value={`${visit?.programName} (ครั้งที่ ${visit?.round || 1})`} minWidth={320} />
          <ReadField label='วันเวลาที่ขอตรวจ' value={`${formatThaiDate(visit?.visitDate)} · ${visit?.visitTime}`} minWidth={200} />
          <ReadField label='หน่วยงานที่ขอตรวจ' value={visit?.unit} />
          <ReadField label='แพทย์' value={visit?.doctor} minWidth={180} />
        </div>
      </SubCard>

      {CHECKUP_ITEM_GROUPS.map((g) => {
        const rows = items.filter((i) => i.group === g.key);
        if (rows.length === 0) return null;
        return (
          <div key={g.key} className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))' }}>
              {g.label}
            </span>
            <Table
              columns={[
                { key: 'code', label: 'รหัส', width: 120 },
                { key: 'name', label: 'รายการตรวจ', flex: true, minWidth: 260 },
                { key: 'price', label: 'ราคา', width: 120, align: 'right', render: (r) => formatBahtTh(r.price) },
                { key: 'claimable', label: 'เบิกได้', width: 120, align: 'right', render: (r) => formatBahtTh(r.claimable) },
              ]}
              rows={rows}
              rowKey={(r) => r.code}
              emptyMessage='ไม่มีรายการ'
            />
          </div>
        );
      })}

      <SubCard tone='brand'>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
          <ReadField label='รวมทั้งสิ้น' value={formatBahtTh(totals.total)} />
          <ReadField label='เบิกได้' value={formatBahtTh(totals.claimable)} />
          <ReadField label='ผู้รับบริการชำระ' value={formatBahtTh(totals.payable)} />
          <ReadField label='ผู้ออกใบสั่ง' value={CHECKUP_STAFF.name} minWidth={220} />
          <ReadField label='เวลาพิมพ์' value={formatThaiDateTime(new Date().toISOString())} minWidth={220} />
        </div>
      </SubCard>
    </div>
  </Popup>
);

/* ── specimen labels ─────────────────────────────────────────────── */

const SpecimenLabelPopup = ({ open, onClose, visit, items }) => {
  const tubes = useMemo(() => {
    const map = new Map();
    items.filter((i) => i.specimen).forEach((i) => {
      if (!map.has(i.specimen)) map.set(i.specimen, []);
      map.get(i.specimen).push(i);
    });
    return [...map.entries()].map(([tube, rows], idx) => ({
      tube,
      rows,
      accessionNo: `${visit?.orderNo || 'ORD'}-${String(idx + 1).padStart(2, '0')}`,
    }));
  }, [items, visit]);

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='สติกเกอร์สิ่งส่งตรวจ'
      subtitle='หนึ่งบาร์โค้ดต่อหนึ่งชนิดสิ่งส่งตรวจ (Barcode ตาม Tube)'
      tertiaryAction={{ label: 'ปิด', onClick: onClose }}
      primaryAction={{ label: 'พิมพ์สติกเกอร์', onClick: () => { if (typeof window !== 'undefined') window.print(); } }}
    >
      {tubes.length === 0 ? (
        <EmptyState
          compact
          icon='colorize'
          title='ใบสั่งตรวจนี้ไม่มีรายการที่ต้องเก็บสิ่งส่งตรวจ'
          subtitle='รายการตรวจรังสีและหัตถการไม่ต้องออกสติกเกอร์สิ่งส่งตรวจ'
        />
      ) : (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          {tubes.map((t) => (
            <SubCard key={t.accessionNo}>
              <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-400)' }}>
                <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))' }}>
                    {`${visit?.name} · HN ${visit?.hn}`}
                  </span>
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
                    {`Tube: ${t.tube} · ${formatThaiDate(visit?.visitDate)} ${visit?.visitTime}`}
                  </span>
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    {t.rows.map((r) => r.code).join(' · ')}
                  </span>
                </div>
                <Barcode128 value={t.accessionNo} height={40} showText />
              </div>
            </SubCard>
          ))}
        </div>
      )}
    </Popup>
  );
};

/* ── page ────────────────────────────────────────────────────────── */

const CheckupOrderPage = () => {
  const history = useHistory();
  const { visitId } = useParams();
  const [tick, setTick] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [toast, setToast] = useState('');

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const visit = useMemo(() => getVisit(visitId), [visitId, tick]);

  const [draft, setDraft] = useState(() => {
    const v = getVisit(visitId);
    return v
      ? {
        packageId: v.packageId,
        extraItems: [...(v.extraItems || [])],
        excludedItems: [...(v.excludedItems || [])],
        visitDate: v.visitDate,
        visitTime: v.visitTime,
        doctor: v.doctor,
        unit: v.unit,
      }
      : null;
  });

  /* Confirmed / cancelled orders open read-only until the user clicks แก้ไข. */
  const [editing, setEditing] = useState(false);
  const confirmed = visit ? visit.statusKey !== 'waiting' : false;
  const cancelled = visit?.statusKey === 'cancelled';
  const locked = cancelled || (confirmed && !editing);

  const patient = useMemo(
    () => (visit?.hn && getPatientByHN(visit.hn)) || DEFAULT_PATIENT,
    [visit],
  );

  const packages = useMemo(() => listPackages().filter((p) => p.active || p.id === visit?.packageId), [visit]);

  const previewVisit = visit && draft ? { ...visit, ...draft } : visit;
  const items = useMemo(() => (previewVisit ? visitItems(previewVisit) : []), [previewVisit]);
  const totals = useMemo(() => (previewVisit ? visitTotals(previewVisit) : { total: 0, claimable: 0, payable: 0, count: 0 }), [previewVisit]);

  const priorRounds = useMemo(
    () => (visit ? listVisitsByHn(visit.hn).filter((v) => v.programName === visit.programName && v.id !== visit.id) : []),
    [visit],
  );
  const openPrevRound = priorRounds.find((v) => v.statusKey !== 'summarised' && v.statusKey !== 'cancelled');

  if (!visit || !draft) {
    return (
      <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
        <Sidebar activeKey='checkup' />
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header breadcrumb={breadcrumb} standalone={false} />
          <SubHeader title='บันทึกส่งตรวจสุขภาพ' onBack={() => history.push(QUEUE_PATH)} backLabel='กลับไปคิว' hideBottomBorder />
          <PageBody>
            <PageCard>
              <EmptyState
                icon='error'
                title='ไม่พบใบสั่งตรวจที่ระบุ'
                subtitle={`ไม่พบข้อมูล visit "${visitId}" — อาจถูกลบหรือเปิดจากลิงก์ที่หมดอายุ`}
                actionLabel='กลับไปคิวตรวจสุขภาพ'
                onAction={() => history.push(QUEUE_PATH)}
              />
            </PageCard>
          </PageBody>
          <Footer />
        </div>
      </div>
    );
  }

  const addItems = (codes) => setDraft((d) => ({
    ...d,
    extraItems: [...new Set([...d.extraItems, ...codes])],
    /* Re-adding a previously removed package item clears its exclusion. */
    excludedItems: (d.excludedItems || []).filter((c) => !codes.includes(c)),
  }));

  /* Removing a package item on one visit keeps the ทะเบียนชุดตรวจ intact — the
     exclusion is stored per visit (`excludedItems`), see store visitItems(). */
  const removeItem = (code) => setDraft((d) => ({
    ...d,
    extraItems: d.extraItems.filter((c) => c !== code),
    excludedItems: [...new Set([...(d.excludedItems || []), code])],
  }));

  const handleSave = () => {
    saveVisit({ ...visit, ...draft });
    setEditing(false);
    setTick((t) => t + 1);
    setToast(`บันทึกใบสั่งตรวจ ${visit.orderNo} เรียบร้อยแล้ว`);
  };

  const handleConfirmOrder = () => {
    saveVisit({
      ...visit,
      ...draft,
      statusKey: 'progress',
      steps: { ...visit.steps, register: 'done', collect: 'active' },
    });
    setEditing(false);
    setTick((t) => t + 1);
    setToast(`ออกใบสั่งตรวจ ${visit.orderNo} เรียบร้อยแล้ว — พิมพ์ใบสั่งและสติกเกอร์สิ่งส่งตรวจได้`);
    setPrintOpen(true);
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('ต้องระบุเหตุผลการยกเลิกใบสั่งตรวจ');
      return;
    }
    cancelVisitOrder(visit.id, cancelReason.trim());
    setCancelOpen(false);
    setTick((t) => t + 1);
  };

  const groupTable = (groupKey) => {
    const rows = items.filter((i) => i.group === groupKey);
    const pkgItems = getPackage(draft.packageId)?.items || [];
    const columns = [
      { key: 'code', label: 'รหัส', width: 130 },
      { key: 'name', label: 'ชื่อรายการตรวจ', flex: true, minWidth: 250 },
      {
        key: 'origin',
        label: 'ที่มา',
        width: 140,
        render: (r) => (pkgItems.includes(r.code)
          ? <ColorfulBadge style='teal' size='small' hierarchy='secondary'>จากชุดตรวจ</ColorfulBadge>
          : <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>เพิ่มเฉพาะราย</ColorfulBadge>),
      },
      { key: 'price', label: 'ราคา', width: 120, align: 'right', render: (r) => formatBahtTh(r.price) },
      {
        key: 'claimable',
        label: 'เบิกได้',
        width: 130,
        align: 'right',
        render: (r) => (visit.rightsValid === false
          ? <span style={{ color: 'var(--text-alert-warning, #C2410C)' }}>{formatBahtTh(0)}</span>
          : formatBahtTh(r.claimable)),
      },
      { key: 'specimen', label: 'สิ่งส่งตรวจ', width: 120, render: (r) => r.specimen || '—' },
      {
        key: 'remove',
        label: '',
        width: 64,
        sortable: false,
        render: (r) => (
          <BrandSubdueIconButton
            variant='outline'
            size='sm'
            icon='delete'
            disabled={locked}
            aria-label={`ลบ ${r.name} ออกจากใบสั่งตรวจ`}
            onClick={() => removeItem(r.code)}
          />
        ),
      },
    ];
    const group = CHECKUP_ITEM_GROUPS.find((g) => g.key === groupKey);
    return (
      <div key={groupKey} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <SectionHeader
          icon={group.icon}
          title={group.label}
          subtitle={`${rows.length} รายการ · รวม ${formatBahtTh(rows.reduce((s, r) => s + r.price, 0))}`}
        />
        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={group.icon}
            title={`ไม่มี${CHECKUP_ITEM_GROUP_LABEL[groupKey]}ในใบสั่งตรวจนี้`}
            subtitle={locked ? undefined : 'กด "เพิ่มรายการตรวจ" ด้านบนเพื่อเพิ่มรายการเฉพาะราย'}
          />
        ) : (
          <Table columns={columns} rows={rows} rowKey={(r) => r.code} emptyMessage='ไม่มีรายการ' />
        )}
      </div>
    );
  };

  const emrLinks = emrLinksFor(visit.hn);

  return (
    <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='checkup' />
      <div className='flex-1 min-w-0 flex flex-col'>
        <Header breadcrumb={breadcrumb} standalone={false} />
        <SubHeader
          title={`บันทึกส่งตรวจสุขภาพ — ${visit.orderNo}`}
          onBack={() => history.push(QUEUE_PATH)}
          backLabel='กลับไปคิว'
          hideBottomBorder
        >
          <NeutralSubdueButton size='md' leadingIcon='label' onClick={() => setLabelOpen(true)}>
            สติกเกอร์สิ่งส่งตรวจ
          </NeutralSubdueButton>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='print' onClick={() => setPrintOpen(true)}>
            ตัวอย่างใบสั่งตรวจ
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='history' onClick={() => history.push(`/checkup/history/${visit.hn}`)}>
            ประวัติการตรวจ
          </BrandSubdueButton>
        </SubHeader>

        <PatientCard
          sticky
          showBack={false}
          patient={patient}
          title={`บันทึกส่งตรวจสุขภาพ · ${visit.programName}`}
          tags={(
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{visit.orderNo}</ColorfulBadge>
              <ColorfulBadge style={(visit.round || 1) > 1 ? 'indigo' : 'grey'} size='small' hierarchy='secondary'>
                {`ครั้งที่ ${visit.round || 1} ของโปรแกรม`}
              </ColorfulBadge>
              <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ข้อมูลผู้รับบริการ: อ่านอย่างเดียว</ColorfulBadge>
            </div>
          )}
          actions={(
            <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
              {locked && !cancelled ? (
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => setEditing(true)}>
                  แก้ไขใบสั่งตรวจ
                </BrandSubdueButton>
              ) : null}
              {!cancelled ? (
                <NeutralSubdueButton size='sm' leadingIcon='block' onClick={() => { setCancelReason(''); setCancelError(''); setCancelOpen(true); }}>
                  ยกเลิกใบสั่งตรวจ
                </NeutralSubdueButton>
              ) : (
                <BrandSubdueButton variant='fill' size='sm' leadingIcon='restart_alt' onClick={() => { restoreVisitOrder(visit.id); setTick((t) => t + 1); }}>
                  กู้คืนใบสั่ง
                </BrandSubdueButton>
              )}
            </div>
          )}
        />

        <PageBody>
          {toast ? (
            <NoticeBar
              tone='success'
              icon='check_circle'
              trailing={(
                <button type='button' aria-label='ปิดการแจ้งเตือน' onClick={() => setToast('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                  <Icon name='close' size={16} />
                </button>
              )}
            >
              {toast}
            </NoticeBar>
          ) : null}

          {cancelled ? (
            <NoticeBar tone='danger' icon='block'>
              {`ใบสั่งตรวจนี้ถูกยกเลิกแล้ว — เหตุผล: ${visit.cancelReason || '—'} (แสดงแบบอ่านอย่างเดียว กด "กู้คืนใบสั่ง" เพื่อใช้งานต่อ)`}
            </NoticeBar>
          ) : null}

          {visit.rightsValid === false ? (
            <NoticeBar tone='warning' icon='warning'>
              {`สิทธิการรักษาของผู้รับบริการหมดอายุหรือไม่มีสิทธิ (${visit.rights}) — ยอดเบิกได้ถูกคิดเป็น 0 บาท ผู้รับบริการต้องยืนยันชำระเงินเองก่อนส่งตรวจ`}
            </NoticeBar>
          ) : null}

          {openPrevRound ? (
            <NoticeBar
              tone='warning'
              icon='warning'
              trailing={(
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='open_in_new' onClick={() => history.push(`/checkup/record/${openPrevRound.id}`)}>
                  เปิดครั้งก่อน
                </BrandSubdueButton>
              )}
            >
              {`การรับบริการครั้งที่ ${openPrevRound.round || 1} ในโปรแกรมเดียวกันยังไม่สรุปผล (${formatThaiDate(openPrevRound.visitDate)}) — ตรวจสอบก่อนเปิดครั้งใหม่เพื่อไม่ให้ข้อมูลซ้ำ`}
            </NoticeBar>
          ) : null}

          {locked && !cancelled ? (
            <NoticeBar tone='neutral' icon='visibility'>
              {`ใบสั่งตรวจถูกยืนยันแล้ว — แสดงแบบอ่านอย่างเดียว บันทึกโดย ${visit.createdBy} · ${formatThaiDateTime(visit.createdAt)}`}
            </NoticeBar>
          ) : null}

          <PageCard>
            <SectionHeader
              icon='assignment'
              title='ข้อมูลการส่งตรวจ'
              subtitle='ระบุวันเวลาที่ขอตรวจ หน่วยงานที่ขอตรวจ ชุดรายการตรวจ และแพทย์ ตามคู่มือ §2.13.2'
            />
            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <DatePicker
                label='วันที่ขอตรวจ'
                required
                showHelperText={false}
                size='md'
                disabled={locked}
                value={draft.visitDate ? new Date(draft.visitDate) : undefined}
                onChange={(d) => setDraft((x) => ({ ...x, visitDate: d ? new Date(d).toISOString().slice(0, 10) : '' }))}
              />
              <TimePicker
                label='เวลาที่ขอตรวจ'
                required
                showHelperText={false}
                size='md'
                disabled={locked}
                value={draft.visitTime}
                onChange={(v) => setDraft((x) => ({ ...x, visitTime: v }))}
              />
              <Select
                label='หน่วยงานที่ขอตรวจ'
                showHelperText={false}
                showLeadingIcon={false}
                size='md'
                disabled={locked}
                options={UNIT_OPTIONS}
                value={draft.unit}
                onChange={(v) => setDraft((x) => ({ ...x, unit: typeof v === 'string' ? v : v?.value }))}
              />
              <div className='md:col-span-2'>
                <Select
                  label='ชุดรายการตรวจ (ชุดตรวจ)'
                  required
                  showHelperText={false}
                  showLeadingIcon={false}
                  size='md'
                  disabled={locked}
                  options={packages.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
                  value={draft.packageId}
                  onChange={(v) => setDraft((x) => ({ ...x, packageId: typeof v === 'string' ? v : v?.value }))}
                />
              </div>
              <Select
                label='แพทย์'
                showHelperText={false}
                showLeadingIcon={false}
                size='md'
                disabled={locked}
                options={CHECKUP_DOCTORS.map((d) => ({ value: d, label: d }))}
                value={draft.doctor}
                onChange={(v) => setDraft((x) => ({ ...x, doctor: typeof v === 'string' ? v : v?.value }))}
              />
            </div>

            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <StatTile label='จำนวนรายการตรวจ' value={totals.count} unit='รายการ' tone='info' icon='checklist' />
              <StatTile label='รวมทั้งสิ้น' value={formatBahtTh(totals.total)} tone='brand' icon='payments' />
              <StatTile label='เบิกได้' value={formatBahtTh(totals.claimable)} tone={visit.rightsValid === false ? 'danger' : 'brand'} icon='verified' />
              <StatTile label='ผู้รับบริการชำระ' value={formatBahtTh(totals.payable)} tone='warning' icon='account_balance_wallet' />
            </div>
          </PageCard>

          <PageCard>
            <SectionHeader
              icon='checklist'
              title='รายการตรวจในใบสั่งนี้'
              subtitle='รายการที่มาจากชุดตรวจ + รายการที่เพิ่มเฉพาะราย — ลบหรือเพิ่มได้ก่อนยืนยันออกใบสั่ง'
              trailing={(
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='add' disabled={locked} onClick={() => setAddOpen(true)}>
                  เพิ่มรายการตรวจ
                </BrandSubdueButton>
              )}
            />
            {items.length === 0 ? (
              <EmptyState
                icon='checklist'
                title='ยังไม่มีรายการตรวจในใบสั่งนี้'
                subtitle='เลือกชุดตรวจด้านบน หรือเพิ่มรายการตรวจเฉพาะรายตามความต้องการ'
                actionLabel={locked ? undefined : 'เพิ่มรายการตรวจ'}
                onAction={locked ? undefined : () => setAddOpen(true)}
              />
            ) : (
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
                {CHECKUP_ITEM_GROUPS.map((g) => groupTable(g.key))}
              </div>
            )}
          </PageCard>

          <div className='grid grid-cols-1 xl:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-600)' }}>
            <PageCard>
              <SectionHeader
                icon='stethoscope'
                title='คำสั่งการรักษา (CPOE)'
                subtitle='เชื่อมโยงระบบบันทึกการรักษาของแพทย์ — เปิดดูได้อย่างเดียว ไม่แก้ไขจากฝั่งตรวจสุขภาพ (TOR 1.19.15)'
              />
              {hasEmrHistory(visit.hn) ? (
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                  {emrLinks.map((l) => (
                    <ReadOnlyLinkRow key={l.to} to={l.to} icon={l.icon} label={l.label} note={l.note} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  compact
                  icon='folder_off'
                  title='ไม่มีข้อมูลการรักษาเดิมของผู้รับบริการนี้'
                  subtitle='เมื่อผู้รับบริการมีประวัติในระบบ OPD / Lab / รังสี ลิงก์อ่านอย่างเดียวจะปรากฏที่นี่'
                />
              )}
            </PageCard>

            <PageCard>
              <SectionHeader icon='fact_check' title='บันทึกการทำรายการ' subtitle='ผู้บันทึก วันเวลา และการแก้ไขล่าสุดของใบสั่งตรวจนี้' />
              <CheckupAuditBar record={visit} />
              <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
                <ReadField label='สถานะใบสั่ง' value={cancelled ? 'ยกเลิกแล้ว' : confirmed ? 'ยืนยันแล้ว' : 'ฉบับร่าง (ยังไม่ยืนยัน)'} />
                <ReadField label='กลุ่มเป้าหมาย' value={visit.groupId || 'รายบุคคล (ไม่ผูกกลุ่ม)'} minWidth={200} />
                <ReadField label='ครั้งที่ในโปรแกรม' value={`ครั้งที่ ${visit.round || 1}`} />
                <ReadField label='จำนวนครั้งทั้งหมดในโปรแกรม' value={`${priorRounds.length + 1} ครั้ง`} minWidth={200} />
              </div>
              {priorRounds.length > 0 ? (
                <SubCard>
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    ครั้งอื่นในโปรแกรมเดียวกัน
                  </span>
                  {priorRounds.map((v) => (
                    <ReadOnlyLinkRow
                      key={v.id}
                      to={`/checkup/record/${v.id}`}
                      icon='event_repeat'
                      label={`ครั้งที่ ${v.round || 1} · ${formatThaiDate(v.visitDate)}`}
                      note={`${v.orderNo} · สถานะ ${v.statusKey === 'summarised' ? 'สรุปแล้ว' : 'ยังไม่สรุป'}`}
                    />
                  ))}
                </SubCard>
              ) : null}
            </PageCard>
          </div>
        </PageBody>

        {/* Sticky action bar — บันทึก / ออกใบสั่งตรวจ / เปิดครั้งถัดไป */}
        <div
          className='flex items-center w-full'
          style={{
            gap: 'var(--dim-space-300)',
            paddingTop: 'var(--dim-space-400)',
            paddingBottom: 'var(--dim-space-400)',
            paddingLeft: 'var(--dim-space-600)',
            paddingRight: 'var(--dim-space-600)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            background: 'var(--surface-navigation-default)',
            boxShadow: 'var(--shadow-brand-drop-top-100)',
            position: 'sticky',
            bottom: 'var(--dim-space-0)',
            zIndex: 60,
          }}
        >
          <NeutralSubdueButton size='lg' leadingIcon='arrow_back' onClick={() => history.push(QUEUE_PATH)}>
            กลับไปคิว
          </NeutralSubdueButton>
          <div className='flex-1' />
          {confirmed && !cancelled ? (
            <NeutralSubdueButton
              size='lg'
              leadingIcon='event_repeat'
              onClick={() => {
                const { visit: next } = openNextRound(visit.hn, visit.programName);
                history.push(`/checkup/order/${next.id}`);
              }}
            >
              เปิดการรับบริการครั้งถัดไป
            </NeutralSubdueButton>
          ) : null}
          <BrandSubdueButton variant='outline' size='lg' leadingIcon='save' disabled={locked} onClick={handleSave}>
            บันทึกใบสั่งตรวจ
          </BrandSubdueButton>
          <BrandSubdueButton
            variant='fill'
            size='lg'
            leadingIcon='print'
            disabled={locked || items.length === 0}
            onClick={handleConfirmOrder}
          >
            ยืนยันและออกใบสั่งตรวจ
          </BrandSubdueButton>
        </div>

        <Footer />

        <AddItemPopup
          open={addOpen}
          onClose={() => setAddOpen(false)}
          existing={items.map((i) => i.code)}
          onConfirm={addItems}
        />
        <OrderPrintPopup
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          visit={previewVisit}
          items={items}
          totals={totals}
          patient={patient}
          draft={!confirmed}
        />
        <SpecimenLabelPopup
          open={labelOpen}
          onClose={() => setLabelOpen(false)}
          visit={previewVisit}
          items={items}
        />
        <Popup
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          title='ยกเลิกใบสั่งตรวจสุขภาพ'
          subtitle={`${visit.name} · HN ${visit.hn} · ${visit.orderNo}`}
          tertiaryAction={{ label: 'ปิด', onClick: () => setCancelOpen(false) }}
          primaryAction={{ label: 'ยืนยันยกเลิกใบสั่ง', onClick: confirmCancel, tone: 'danger' }}
        >
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
            <NoticeBar tone='warning' icon='warning'>
              ต้องระบุเหตุผล — ระบบจะบันทึกเหตุผล ผู้ยกเลิก และเวลาไว้ใน audit trail และแสดงในรายงานประจำวัน
            </NoticeBar>
            <SuggestibleTextarea
              voice
              label='เหตุผลการยกเลิกใบสั่งตรวจ'
              required
              value={cancelReason}
              onChange={(e) => { setCancelReason(e?.target ? e.target.value : e); setCancelError(''); }}
              placeholder='เช่น ผู้รับบริการไม่ได้งดอาหารก่อนตรวจ นัดตรวจใหม่สัปดาห์หน้า'
              suggestions={CANCEL_REASON_SUGGESTIONS}
              minChars={2}
            />
            {cancelError ? (
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-danger-secondary, #DC2626)' }}>
                {cancelError}
              </span>
            ) : null}
          </div>
        </Popup>
      </div>
    </div>
  );
};

export default CheckupOrderPage;
