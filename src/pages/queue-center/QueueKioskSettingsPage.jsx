import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import SYSTEM_NAV from '@/pages/system/systemNav';
import Table from '@/components/table/Table';
import InputField from '@/components/forms/InputField';
import Dropdown from '@/components/forms/Dropdown';
import Switch from '@/components/switch/Switch';
import Checkbox from '@/components/checkbox/Checkbox';
import Popup from '@/components/popup/Popup';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import {
  QueueCenterSubNav,
  SectionCard,
  FieldLabel,
  HelperText,
  PAGE_BODY_STYLE,
  CARD_STYLE,
} from './queueCenterShared';
import { QUEUE_STATIONS } from '@/data/queueCenterStore';

const PURPOSES = [
  { value: 'queue', label: 'กดเพื่อรับคิว' },
  { value: 'payment', label: 'กดเพื่อชำระเงิน' },
];

const TICKET_KIOSK_TYPES = [
  { value: 'queue', label: 'ตู้กดคิว' },
  { value: 'payment', label: 'ตู้ชำระเงิน' },
];

const TICKET_SIZES = [
  { value: '58mm', label: '58 มม.' },
  { value: '80mm', label: '80 มม.' },
  { value: 'a4', label: 'A4' },
];

const ORGANIZATION_UNITS = [
  { value: 'registration', label: 'งานเวชระเบียนและคัดกรอง', stationIds: ['st-screening'] },
  { value: 'opd', label: 'แผนกผู้ป่วยนอก', stationIds: ['st-opd', 'st-lab', 'st-xray'] },
  { value: 'special-clinics', label: 'กลุ่มคลินิกเฉพาะทาง', stationIds: ['st-anc', 'st-ped', 'st-elderly', 'st-ncd', 'st-mental', 'st-dental', 'st-tb', 'st-vaccine', 'st-family', 'st-physio'] },
  { value: 'finance', label: 'แผนกการเงิน', stationIds: ['st-finance'] },
  { value: 'pharmacy', label: 'แผนกเภสัชกรรม', stationIds: ['st-pharmacy'] },
];

const stationsForUnit = (unitId) => {
  const unit = ORGANIZATION_UNITS.find((item) => item.value === unitId);
  return QUEUE_STATIONS.filter((station) => unit?.stationIds.includes(station.id));
};

const organizationLabel = (unitId) => ORGANIZATION_UNITS.find((item) => item.value === unitId)?.label || '—';
const stationLabel = (stationId) => QUEUE_STATIONS.find((station) => station.id === stationId)?.label || '—';
const kioskStationLabel = (stationId) => ({
  'st-screening': 'ซักประวัติ',
  'st-finance': 'การเงิน',
}[stationId] || stationLabel(stationId));

const DISPLAY_FIELDS = [
  { key: 'queueNumber', label: 'เลขคิว', required: true },
  { key: 'waitingAhead', label: 'ผู้รอคิวก่อนหน้า' },
  { key: 'issuedDate', label: 'วันที่' },
  { key: 'issuedTime', label: 'เวลา' },
  { key: 'patientName', label: 'ชื่อ–นามสกุลผู้รับบริการ', required: true },
  { key: 'contact', label: 'ติดต่อ' },
  { key: 'hn', label: 'เลข HN', required: true },
  { key: 'hnBarcode', label: 'Barcode HN', required: true },
  { key: 'servicePoint', label: 'จุดให้บริการ', required: true },
  { key: 'serviceStep', label: 'ขั้นตอนรับบริการ/จุดที่ต้องไปต่อ', required: true },
  { key: 'statusQr', label: 'QR Code สำหรับดูสถานะคิวออนไลน์', required: true },
  { key: 'callOrderNote', label: 'ข้อความ “ลำดับการเรียกคิวไม่เรียงตามหมายเลข”', required: true },
  { key: 'kioskNumber', label: 'หมายเลขตู้' },
  { key: 'kioskName', label: 'ชื่อตู้' },
  { key: 'location', label: 'ตำแหน่งที่ตั้ง' },
  { key: 'floor', label: 'ชั้น' },
];

const TOR_DISPLAY_DEFAULTS = {
  queueNumber: true, patientName: true, hn: true, hnBarcode: true,
  servicePoint: true, serviceStep: true, statusQr: true, callOrderNote: true,
};

const TICKET_DISPLAY_DEFAULTS = {
  ...TOR_DISPLAY_DEFAULTS,
  waitingAhead: true,
  issuedDate: true,
  issuedTime: true,
  contact: true,
};

const createTicketSettings = () => ({
  ticketSize: '80mm',
  displayFields: { ...TICKET_DISPLAY_DEFAULTS, kioskNumber: true, kioskName: true, kioskId: false, location: true, floor: true },
});

const INITIAL_MONITORS = [
  { id: 'monitor-1', number: 1, name: 'จอที่ 1', location: 'โถงชั้น 1', stationIds: ['st-screening', 'st-opd', 'st-lab', 'st-finance', 'st-pharmacy'] },
  { id: 'monitor-2', number: 2, name: 'จอที่ 2', location: 'หน้าห้องตรวจ ชั้น 2', stationIds: ['st-ped', 'st-elderly', 'st-ncd'] },
  { id: 'monitor-3', number: 3, name: 'จอที่ 3', location: 'โถงอาคารบริการ', stationIds: ['st-anc', 'st-mental', 'st-dental', 'st-tb', 'st-vaccine', 'st-family'] },
];

const INITIAL_KIOSKS = [
  {
    id: 'kiosk-01', kioskNumber: 'K-01', kioskName: 'ตู้รับคิว อาคาร A', kioskId: 'KIOSK-A-01',
    organizationUnit: 'registration', stationId: 'st-screening', floor: 'ชั้น 1', purpose: 'queue',
    ticketSize: '80mm', displayFields: { ...TICKET_DISPLAY_DEFAULTS, kioskNumber: true, kioskName: true, kioskId: false, location: true, floor: true }, active: true,
  },
  {
    id: 'kiosk-02', kioskNumber: 'P-01', kioskName: 'ตู้ชำระเงิน อาคาร A', kioskId: 'KIOSK-A-P01',
    organizationUnit: 'finance', stationId: 'st-finance', floor: 'ชั้น 1', purpose: 'payment',
    ticketSize: '58mm', displayFields: { ...TICKET_DISPLAY_DEFAULTS, kioskNumber: true, kioskName: true, kioskId: true, location: false, floor: false }, active: true,
  },
];

const blankKiosk = () => ({
  id: `kiosk-${Date.now()}`, kioskNumber: '', kioskName: '', kioskId: '', organizationUnit: '', stationId: '', floor: '', purpose: '',
  ticketSize: '80mm', displayFields: { ...TICKET_DISPLAY_DEFAULTS, kioskNumber: true, kioskName: true, kioskId: false, location: true, floor: true }, active: true,
});

const QueueKioskSettingsPage = () => {
  const location = useLocation();
  const isTicketSettings = location.pathname === '/queue-center/ticket-settings';
  const isDisplaySettings = location.pathname === '/queue-center/display';
  const [kiosks, setKiosks] = useState(INITIAL_KIOSKS);
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);
  const [monitors, setMonitors] = useState(INITIAL_MONITORS);
  const [monitorSaved, setMonitorSaved] = useState(false);
  const [activeChange, setActiveChange] = useState(null);
  const [ticketKioskType, setTicketKioskType] = useState('queue');
  const [ticketSettingsByKioskType, setTicketSettingsByKioskType] = useState({
    queue: createTicketSettings(),
    payment: createTicketSettings(),
  });
  const ticketSettings = ticketSettingsByKioskType[ticketKioskType];
  const ticketPreviewSettings = draft?.purpose ? ticketSettingsByKioskType[draft.purpose] : null;
  const ticketPreviewFields = ticketPreviewSettings?.displayFields || {};
  const [ticketSaved, setTicketSaved] = useState(false);
  const purposeLabel = useMemo(() => Object.fromEntries(PURPOSES.map((item) => [item.value, item.label])), []);
  const isNewDraft = !!draft && !kiosks.some((item) => item.id === draft.id);

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const generateKioskIdentity = (purpose, stationId) => {
    const station = QUEUE_STATIONS.find((item) => item.id === stationId);
    if (!purpose || !station) return { kioskName: '', kioskNumber: '', kioskId: '' };
    const prefix = purpose === 'payment' ? 'P' : 'K';
    const number = kiosks.reduce((highest, item) => {
      const match = String(item.kioskNumber || '').match(new RegExp(`^${prefix}-(\\d+)$`));
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0) + 1;
    const serial = String(number).padStart(2, '0');
    return {
      kioskName: `${purpose === 'payment' ? 'ตู้ชำระเงิน' : 'ตู้รับคิว'} ${station.label}`,
      kioskNumber: `${prefix}-${serial}`,
      kioskId: `KIOSK-${station.code}-${serial}`,
    };
  };
  const applyGeneratedIdentity = (current, patch) => {
    const next = { ...current, ...patch };
    return kiosks.some((item) => item.id === current.id)
      ? next
      : { ...next, ...generateKioskIdentity(next.purpose, next.stationId) };
  };
  const selectOrganizationUnit = (organizationUnit) => setDraft((current) => applyGeneratedIdentity(current, {
    organizationUnit,
    stationId: '',
    floor: '',
  }));
  const selectStation = (stationId) => {
    const station = QUEUE_STATIONS.find((item) => item.id === stationId);
    setDraft((current) => applyGeneratedIdentity(current, { stationId, floor: station?.floor || '' }));
  };
  const selectPurpose = (purpose) => setDraft((current) => applyGeneratedIdentity(current, { purpose }));
  const updateDisplayField = (key, value) => setDraft((current) => ({
    ...current,
    displayFields: { ...current.displayFields, [key]: value },
  }));
  const updateTicketDisplayField = (key, value) => setTicketSettingsByKioskType((current) => ({
    ...current,
    [ticketKioskType]: {
      ...current[ticketKioskType],
      displayFields: { ...current[ticketKioskType].displayFields, [key]: value },
    },
  }));

  const save = () => {
    if (!draft.kioskNumber.trim() || !draft.kioskName.trim() || !draft.kioskId.trim() || !draft.organizationUnit || !draft.stationId || !draft.floor || !draft.purpose) return;
    setKiosks((current) => current.some((item) => item.id === draft.id)
      ? current.map((item) => (item.id === draft.id ? draft : item))
      : [...current, draft]);
    setDraft(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  };

  const toggleMonitorStation = (monitorId, stationId) => {
    setMonitors((current) => current.map((monitor) => {
      if (monitor.id !== monitorId) return monitor;
      const stationIds = monitor.stationIds.includes(stationId)
        ? monitor.stationIds.filter((id) => id !== stationId)
        : [...monitor.stationIds, stationId];
      return { ...monitor, stationIds };
    }));
  };

  const requestActiveChange = (kiosk, active) => setActiveChange({ kiosk, active });
  const confirmActiveChange = () => {
    if (!activeChange) return;
    setKiosks((current) => current.map((item) => item.id === activeChange.kiosk.id
      ? { ...item, active: activeChange.active }
      : item));
    setActiveChange(null);
  };

  const columns = [
    { key: 'kioskNumber', label: 'หมายเลขตู้', render: (row) => <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{row.kioskNumber}</ColorfulBadge> },
    { key: 'kioskName', label: 'ชื่อตู้', flex: true, minWidth: 220 },
    { key: 'purpose', label: 'จุดประสงค์', render: (row) => purposeLabel[row.purpose] },
    { key: 'organizationUnit', label: 'คลินิก / แผนก', render: (row) => organizationLabel(row.organizationUnit) },
    { key: 'stationId', label: 'จุดบริการ / ห้องตรวจ', render: (row) => kioskStationLabel(row.stationId) },
    { key: 'floor', label: 'ชั้น', render: (row) => row.floor || '—' },
    { key: 'ticketSize', label: 'ความกว้างกระดาษที่พิมพ์ออกจากตู้', render: (row) => TICKET_SIZES.find((item) => item.value === row.ticketSize)?.label },
    { key: 'active', label: 'สถานะ', render: (row) => <Switch checked={row.active} onChange={(value) => requestActiveChange(row, typeof value === 'boolean' ? value : !row.active)} aria-label={`เปลี่ยนสถานะ ${row.kioskName}`} /> },
    { key: 'action', label: 'การดำเนินการ', sortable: false, render: (row) => <NeutralSubdueButton size='sm' variant='outline' leadingIcon='edit' onClick={() => setDraft({ ...row, displayFields: { ...row.displayFields } })}>แก้ไข</NeutralSubdueButton> },
  ];

  return (
    <QueuePageShell
      activeKey='queue-center'
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-overview'
      sidebarHideActiveChevron
      breadcrumb={['ระบบบริหารจัดการคิว', isDisplaySettings ? 'ตั้งค่าจอแสดงผลการเรียกคิว' : isTicketSettings ? 'ตั้งค่าใบคิว' : 'ตั้งค่าตู้บริการ(Kiosk)']}
      title={isDisplaySettings ? 'ตั้งค่าจอแสดงผลการเรียกคิว' : isTicketSettings ? 'ตั้งค่าใบคิว' : 'ตั้งค่าตู้บริการ(Kiosk)'}
      summaryCards={[
        { key: 'all', label: 'ตู้บริการทั้งหมด', value: kiosks.length, indicator: 'รายการ', color: 'info', icon: 'print' },
        { key: 'active', label: 'เปิดใช้งาน', value: kiosks.filter((item) => item.active).length, indicator: 'พร้อมใช้งาน', color: 'positive', icon: 'check_circle' },
        { key: 'monitors', label: 'จอแสดงผล', value: monitors.length, indicator: 'จอที่ตั้งค่าไว้', color: 'info', icon: 'tv' },
      ]}
      belowSummary={<QueueCenterSubNav />}
    >
      <div className='flex flex-col flex-1 min-w-0' style={PAGE_BODY_STYLE}>
        {!isTicketSettings && !isDisplaySettings ? (
          <>
            {saved ? <div role='status' style={{ ...CARD_STYLE, padding: 'var(--dim-space-300)', color: 'var(--text-positive-default)' }}>บันทึกการตั้งค่าเรียบร้อยแล้ว</div> : null}

            <SectionCard
              icon='kiosk'
              title='รายการตู้บริการ'
              subtitle='กำหนดข้อมูลประจำตู้ จุดประสงค์ และตำแหน่งตามโครงสร้างองค์กร'
              action={<BrandPrimaryButton leadingIcon='add' onClick={() => setDraft(blankKiosk())}>เพิ่มตู้บริการ</BrandPrimaryButton>}
            >
              <Table columns={columns} rows={kiosks} rowKey={(row) => row.id} />
            </SectionCard>

            {draft ? (
              <Popup
            open={!!draft}
            onClose={() => setDraft(null)}
            title={kiosks.some((item) => item.id === draft.id) ? 'แก้ไขตู้บริการ' : 'เพิ่มตู้บริการ'}
            subtitle='ข้อมูลที่มีเครื่องหมาย * จำเป็นต้องระบุ'
            size='extraLarge'
            tertiaryAction={{ label: 'ยกเลิก', onClick: () => setDraft(null) }}
            primaryAction={{ label: 'บันทึกการตั้งค่า', onClick: save, disabled: !draft.kioskNumber.trim() || !draft.kioskName.trim() || !draft.kioskId.trim() || !draft.organizationUnit || !draft.stationId || !draft.floor || !draft.purpose }}
          >
            <div className='grid grid-cols-1 xl:grid-cols-2' style={{ gap: 'var(--dim-space-800)' }}>
              <section className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
                <div>
                  <FieldLabel>ข้อมูลตู้บริการ</FieldLabel>
                  <HelperText>ระบุตัวตนและตำแหน่งของตู้ตามโครงสร้างองค์กร</HelperText>
                </div>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <FieldLabel required>คลินิก / แผนก</FieldLabel>
                  <Dropdown value={draft.organizationUnit} onChange={selectOrganizationUnit} options={ORGANIZATION_UNITS} placeholder='เลือกคลินิก / แผนก' />
                </div>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <FieldLabel required>จุดรับบริการ / ห้องตรวจ</FieldLabel>
                  <Dropdown value={draft.stationId} onChange={selectStation} options={stationsForUnit(draft.organizationUnit).map((station) => ({ value: station.id, label: station.label }))} placeholder='เลือกจุดบริการ / ห้องตรวจ' state={draft.organizationUnit ? 'default' : 'disabled'} />
                </div>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <FieldLabel required>จุดประสงค์</FieldLabel>
                  <Dropdown value={draft.purpose} onChange={selectPurpose} options={PURPOSES} placeholder='เลือกจุดประสงค์' />
                </div>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <FieldLabel required>ชั้น</FieldLabel>
                  <Dropdown
                    value={draft.floor}
                    onChange={(floor) => update('floor', floor)}
                    options={draft.stationId ? [{ value: QUEUE_STATIONS.find((station) => station.id === draft.stationId)?.floor || '', label: QUEUE_STATIONS.find((station) => station.id === draft.stationId)?.floor || '—' }] : []}
                    placeholder='เลือกชั้น'
                    state={draft.stationId ? 'default' : 'disabled'}
                  />
                </div>
                <InputField label='ชื่อตู้' required value={draft.kioskName} onChange={(value) => update('kioskName', value)} placeholder='ระบบจะสร้างให้อัตโนมัติ' disabled={isNewDraft} />
                <InputField label='หมายเลขตู้ (แสดงบนใบคิว)' required value={draft.kioskNumber} onChange={(value) => update('kioskNumber', value)} placeholder='ระบบจะสร้างให้อัตโนมัติ' disabled={isNewDraft} />
                <InputField label='รหัสตู้ (Kiosk ID)' required value={draft.kioskId} onChange={(value) => update('kioskId', value)} placeholder='ระบบจะสร้างให้อัตโนมัติ' disabled={isNewDraft} />
              </section>

              <section className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
                <div>
                  <FieldLabel>ตัวอย่างใบคิว</FieldLabel>
                  <HelperText>{draft.purpose ? `อ้างอิงการตั้งค่าของ${TICKET_KIOSK_TYPES.find((item) => item.value === draft.purpose)?.label}` : 'เลือกจุดประสงค์เพื่อดูตัวอย่างใบคิว'}</HelperText>
                </div>
                {ticketPreviewSettings ? (
                  <div className='mx-auto w-full' style={{ ...CARD_STYLE, maxWidth: 360, padding: 'var(--dim-space-500)', textAlign: 'center', borderStyle: 'dashed' }}>
                    <Icon name='confirmation_number' size={28} style={{ color: 'var(--text-brandPrimary-default)' }} />
                    {ticketPreviewFields.queueNumber ? <div style={{ marginTop: 'var(--dim-space-200)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-lg)', color: 'var(--text-content-primary)' }}>A-042</div> : null}
                    {ticketPreviewFields.patientName ? <div style={{ marginTop: 'var(--dim-space-200)', color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>นายสมชาย มีสุข</div> : null}
                    {(ticketPreviewFields.hn || ticketPreviewFields.hnBarcode) ? <div style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{ticketPreviewFields.hn ? 'HN: 67-00001' : ''}{ticketPreviewFields.hn && ticketPreviewFields.hnBarcode ? ' · ' : ''}{ticketPreviewFields.hnBarcode ? '|||||| ||| ||||' : ''}</div> : null}
                    {(ticketPreviewFields.issuedDate || ticketPreviewFields.issuedTime) ? <div style={{ marginTop: 'var(--dim-space-200)', color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{ticketPreviewFields.issuedDate ? 'วันที่: 29 สิงหาคม 2569' : ''}{ticketPreviewFields.issuedDate && ticketPreviewFields.issuedTime ? ' · ' : ''}{ticketPreviewFields.issuedTime ? 'เวลา: 09:30 น.' : ''}</div> : null}
                    {(ticketPreviewFields.waitingAhead || ticketPreviewFields.contact) ? <div style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{ticketPreviewFields.waitingAhead ? 'ผู้รอคิวก่อนหน้า: 3 ราย' : ''}{ticketPreviewFields.waitingAhead && ticketPreviewFields.contact ? ' · ' : ''}{ticketPreviewFields.contact ? 'ติดต่อ: 0 2245 1000' : ''}</div> : null}
                    {ticketPreviewFields.servicePoint ? <div style={{ marginTop: 'var(--dim-space-200)', color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>จุดให้บริการ: {draft.stationId ? kioskStationLabel(draft.stationId) : '—'}</div> : null}
                    {ticketPreviewFields.serviceStep ? <div style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>ขั้นตอนถัดไป: จุดคัดกรอง</div> : null}
                    {(ticketPreviewFields.kioskName || ticketPreviewFields.kioskNumber || ticketPreviewFields.location || ticketPreviewFields.floor) ? <div style={{ marginTop: 'var(--dim-space-200)', color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{ticketPreviewFields.kioskName ? draft.kioskName || 'ชื่อตู้บริการ' : ''}{ticketPreviewFields.kioskName && ticketPreviewFields.kioskNumber ? ' · ' : ''}{ticketPreviewFields.kioskNumber ? draft.kioskNumber || 'หมายเลขตู้' : ''}{ticketPreviewFields.location ? ` · ${organizationLabel(draft.organizationUnit)}` : ''}{ticketPreviewFields.floor ? ` · ${draft.floor || 'ชั้น'}` : ''}</div> : null}
                    {(ticketPreviewFields.statusQr || ticketPreviewFields.callOrderNote) ? <div style={{ marginTop: 'var(--dim-space-300)', paddingTop: 'var(--dim-space-300)', borderTop: '1px dashed var(--border-neutral-tertiary)', color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{ticketPreviewFields.statusQr ? 'QR ดูสถานะคิว' : ''}{ticketPreviewFields.statusQr && ticketPreviewFields.callOrderNote ? ' · ' : ''}{ticketPreviewFields.callOrderNote ? 'ลำดับการเรียกคิวไม่เรียงตามหมายเลข' : ''}</div> : null}
                  </div>
                ) : <div style={{ ...CARD_STYLE, padding: 'var(--dim-space-500)', color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', textAlign: 'center' }}>ยังไม่ได้เลือกประเภทตู้</div>}
              </section>
            </div>

              </Popup>
            ) : null}
          </>
        ) : null}

        {isTicketSettings ? (
          <SectionCard
            icon='receipt_long'
            title='ข้อมูลบนใบคิว'
            subtitle='กำหนดค่าเริ่มต้น ขนาดกระดาษ และข้อมูลที่ต้องการแสดงบนใบคิว'
            action={<BrandPrimaryButton leadingIcon='save' onClick={() => { setTicketSaved(true); window.setTimeout(() => setTicketSaved(false), 2400); }}>บันทึกการตั้งค่าใบคิว</BrandPrimaryButton>}
          >
            {ticketSaved ? <div role='status' style={{ marginBottom: 'var(--dim-space-400)', color: 'var(--text-positive-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>บันทึกการตั้งค่าใบคิวเรียบร้อยแล้ว</div> : null}
            <div className='grid grid-cols-1 md:grid-cols-2' style={{ gap: 'var(--dim-space-400)' }}>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                <FieldLabel required>ประเภทตู้</FieldLabel>
                <Dropdown value={ticketKioskType} onChange={setTicketKioskType} options={TICKET_KIOSK_TYPES} placeholder='เลือกประเภทตู้' />
              </div>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                <FieldLabel>ความกว้างกระดาษที่พิมพ์ออกจากตู้</FieldLabel>
                <Dropdown value={ticketSettings.ticketSize} onChange={(ticketSize) => setTicketSettingsByKioskType((current) => ({
                  ...current,
                  [ticketKioskType]: { ...current[ticketKioskType], ticketSize },
                }))} options={TICKET_SIZES} />
              </div>
            </div>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)', marginTop: 'var(--dim-space-500)' }}>
              <div>
                <FieldLabel>ข้อมูลที่ต้องการแสดงบนใบคิว</FieldLabel>
                <HelperText>ข้อมูลสถานที่จะแสดงตาม คลินิก/แผนก จุดรับบริการ/ห้องตรวจ และชั้นของตู้บริการ</HelperText>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2' style={{ gap: 'var(--dim-space-200)' }}>
                {DISPLAY_FIELDS.map((field) => (
                  <Checkbox
                    key={field.key}
                    checked={!!ticketSettings.displayFields[field.key]}
                    onChange={(value) => updateTicketDisplayField(field.key, value)}
                    label={field.label}
                  />
                ))}
              </div>
            </div>
          </SectionCard>
        ) : null}

        {isTicketSettings ? (
          <SectionCard icon='receipt_long' title='ตัวอย่างข้อมูลบนใบคิว' subtitle='รายละเอียดบังคับตาม TOR: หมายเลขคิว ชื่อ–นามสกุล HN/Barcode จุดบริการ ขั้นตอน QR สถานะ และข้อความกำกับลำดับคิว'>
          <div style={{ ...CARD_STYLE, maxWidth: 360, padding: 'var(--dim-space-500)', textAlign: 'center', borderStyle: 'dashed' }}>
            <Icon name='confirmation_number' size={28} style={{ color: 'var(--text-brandPrimary-default)' }} />
            <div style={{ marginTop: 'var(--dim-space-200)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-lg)', color: 'var(--text-content-primary)' }}>A-042</div>
            <div style={{ marginTop: 'var(--dim-space-200)', color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>นายสมชาย มีสุข</div>
            <div style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>HN: 67-00001 · |||||| ||| ||||</div>
            <div style={{ marginTop: 'var(--dim-space-200)', color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>วันที่: 29 สิงหาคม 2569 · เวลา: 09:30 น.</div>
            <div style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>ผู้รอคิวก่อนหน้า: 3 ราย · ติดต่อ: 0 2245 1000</div>
            <div style={{ marginTop: 'var(--dim-space-200)', color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>จุดให้บริการ: คลินิกตรวจรักษาทั่วไป</div>
            <div style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>ขั้นตอนถัดไป: จุดคัดกรอง · QR ดูสถานะคิว</div>
            <div style={{ marginTop: 'var(--dim-space-300)', paddingTop: 'var(--dim-space-300)', borderTop: '1px dashed var(--border-neutral-tertiary)', color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>ลำดับการเรียกคิวไม่เรียงตามหมายเลข</div>
          </div>
          </SectionCard>
        ) : null}

        {isDisplaySettings ? (
          <SectionCard
            icon='tv'
            title='ตั้งค่าจอ Monitor'
            subtitle='กำหนดว่าจอที่ 1, 2 และ 3 จะแสดงคิวของจุดบริการ/แผนกใดบ้าง เลือกได้มากกว่า 1 จุดบริการต่อจอ'
            action={(
              <BrandPrimaryButton leadingIcon='save' onClick={() => { setMonitorSaved(true); window.setTimeout(() => setMonitorSaved(false), 2400); }}>
                บันทึกการตั้งค่าจอ
              </BrandPrimaryButton>
            )}
          >
            {monitorSaved ? <div role='status' style={{ marginBottom: 'var(--dim-space-400)', color: 'var(--text-positive-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>บันทึกการตั้งค่าจอเรียบร้อยแล้ว</div> : null}
            <div className='grid grid-cols-1 lg:grid-cols-3' style={{ gap: 'var(--dim-space-400)' }}>
            {monitors.map((monitor) => (
              <div key={monitor.id} style={{ ...CARD_STYLE, padding: 'var(--dim-space-400)', boxShadow: 'none' }}>
                <div className='flex items-start' style={{ gap: 'var(--dim-space-200)', marginBottom: 'var(--dim-space-300)' }}>
                  <span className='inline-flex items-center justify-center shrink-0' style={{ width: 36, height: 36, borderRadius: 'var(--dim-radius-300)', background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)' }}>{monitor.number}</span>
                  <div className='flex flex-col min-w-0'>
                    <strong style={{ color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>{monitor.name}</strong>
                    <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{monitor.location}</span>
                  </div>
                </div>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                  {QUEUE_STATIONS.filter((station) => station.active).map((station) => (
                    <label key={station.id} className='flex items-center' style={{ gap: 'var(--dim-space-200)', color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
                      <Switch
                        checked={monitor.stationIds.includes(station.id)}
                        onChange={() => toggleMonitorStation(monitor.id, station.id)}
                        aria-label={`แสดงคิว ${station.label} บน${monitor.name}`}
                      />
                      <span className='flex-1'>{station.label}</span>
                      <span style={{ color: 'var(--text-content-tertiary)' }}>{station.prefix}</span>
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: 'var(--dim-space-300)', paddingTop: 'var(--dim-space-300)', borderTop: '1px solid var(--border-table-line)', color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
                  แสดง {monitor.stationIds.filter((id) => QUEUE_STATIONS.some((station) => station.id === id)).length} จุดบริการ
                </div>
              </div>
            ))}
            </div>
          </SectionCard>
        ) : null}

        <Popup
          open={!!activeChange}
          onClose={() => setActiveChange(null)}
          title={activeChange?.active ? 'ยืนยันการเปิดใช้งานตู้บริการ' : 'ยืนยันการปิดใช้งานตู้บริการ'}
          subtitle={activeChange?.active
            ? `ต้องการเปิดใช้งาน ${activeChange?.kiosk.kioskName} ใช่หรือไม่`
            : `ต้องการปิดใช้งาน ${activeChange?.kiosk.kioskName} ใช่หรือไม่`}
          tertiaryAction={{ label: 'ยกเลิก', onClick: () => setActiveChange(null) }}
          primaryAction={{ label: 'ยืนยัน', onClick: confirmActiveChange }}
        >
          <p style={{ margin: 0, color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
            {activeChange?.active ? 'ผู้รับบริการจะสามารถใช้งานตู้บริการนี้ได้ทันที' : 'ผู้รับบริการจะไม่สามารถใช้งานตู้บริการนี้ได้จนกว่าจะเปิดใช้งานอีกครั้ง'}
          </p>
        </Popup>
      </div>
    </QueuePageShell>
  );
};

export default QueueKioskSettingsPage;
