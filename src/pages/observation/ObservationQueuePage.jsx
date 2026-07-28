import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import StatusBadge from '@/components/badge/StatusBadge';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Textarea from '@/components/forms/Textarea';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import BrandCircleIconButton from '@/components/button/BrandCircleIconButton';
import Icon from '@/components/icons/Icon';
import PrimarySearch from '@/components/search/PrimarySearch';
import Table, { EllipsisText } from '@/components/table/Table';
import { getPatientByHN } from '@/data/patientProfiles';
import { MOCK_OBSERVATION_PATIENTS, calculateEwsScore, EWS_RISK_TIERS } from '@/data/observationMock';

/* List-view columns — styled to match the OPD screening worklist table
   (shared <Table>, design tokens, StatusBadge) instead of a bespoke
   Tailwind-gray <table>. The "actions" column is bound to page-level
   handlers (history, admit-form state) so it's appended via useMemo in
   the component body — see QueuePage.jsx's makeRenderActions pattern. */
const OBSERVATION_QUEUE_BASE_COLUMNS = [
  {
    key: 'bedNo',
    label: 'เลขเตียง',
    width: 96,
    sortable: false,
    render: (patient) => (
      <span style={{ color: 'var(--text-brandPrimary-default, var(--brand-p700))', fontWeight: 'var(--type-weight-bold)' }}>
        {patient.bedNo}
      </span>
    ),
  },
  {
    key: 'name',
    label: 'ชื่อ-นามสกุล / HN',
    flex: true,
    minWidth: 200,
    sortable: false,
    render: (patient) => {
      if (patient.status === 'empty') {
        return (
          <span style={{ color: 'var(--text-content-tertiary)', fontStyle: 'italic' }}>
            เตียงว่าง ({patient.bedType})
          </span>
        );
      }
      return (
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
          <img
            src={patient.avatar || getPatientByHN(patient.hn)?.avatarUrl || '/avatars/somchai-mock.png'}
            alt={patient.patientName}
            className='w-8 h-8 rounded-full object-cover shrink-0'
            style={{ border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)' }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/avatars/somchai-mock.png';
            }}
          />
          <div className='min-w-0'>
            <div className='truncate' style={{ fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>
              {patient.patientName}
            </div>
            <div style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              HN: {patient.hn}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    key: 'genderAge',
    label: 'เพศ / อายุ',
    width: 112,
    sortable: false,
    render: (patient) => (patient.status === 'empty' ? '-' : `${patient.gender}, ${patient.age} ปี`),
  },
  {
    key: 'admitTime',
    label: 'เวลาเข้าเตียง',
    width: 140,
    sortable: false,
    render: (patient) => {
      if (patient.status === 'empty') return '-';
      return (
        <div>
          <div>{patient.admitTime}</div>
          <div style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            ({Math.floor(patient.durationMinutes / 60)} ชม. {patient.durationMinutes % 60} นาที)
          </div>
        </div>
      );
    },
  },
  {
    key: 'complaint',
    label: 'อาการสำคัญ / วินิจฉัย',
    flex: true,
    minWidth: 220,
    sortable: false,
    render: (patient) => {
      if (patient.status === 'empty') return '-';
      return (
        <div className='min-w-0'>
          <EllipsisText text={patient.chiefComplaint} />
          <div className='truncate' style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {patient.diagnosis}
          </div>
        </div>
      );
    },
  },
  {
    key: 'vitals',
    label: 'สัญญาณชีพล่าสุด',
    width: 176,
    align: 'center',
    sortable: false,
    render: (patient) => {
      const latest = patient.vitalsTrend?.[patient.vitalsTrend.length - 1];
      if (!latest) return '-';
      return (
        <div style={{ fontWeight: 'var(--type-weight-bold)' }}>
          <div>{latest.bpSys}/{latest.bpDia} mmHg</div>
          <div style={{ fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-regular)', color: 'var(--text-content-tertiary)' }}>
            P: {latest.pulse} | SpO2: {latest.spo2}%
          </div>
        </div>
      );
    },
  },
  {
    key: 'ews',
    label: 'EWS Score',
    width: 128,
    align: 'center',
    sortable: false,
    render: (patient) => {
      const latest = patient.vitalsTrend?.[patient.vitalsTrend.length - 1];
      if (!latest) return '-';
      const ews = calculateEwsScore(latest);
      return (
        <StatusBadge style={ews.tier.style} size='small' showDot>
          {ews.score} ({ews.tier.level.toUpperCase()})
        </StatusBadge>
      );
    },
  },
  {
    key: 'status',
    label: 'สถานะ',
    width: 128,
    align: 'center',
    sortable: false,
    render: (patient) => {
      if (patient.status === 'empty') return '-';
      return (
        <StatusBadge style={patient.status === 'ready_discharge' ? 'success' : 'info'} size='small'>
          {patient.status === 'ready_discharge' ? 'พร้อมจำหน่าย' : 'สังเกตอาการ'}
        </StatusBadge>
      );
    },
  },
];

export default function ObservationQueuePage() {
  const history = useHistory();
  const [patients, setPatients] = useState(MOCK_OBSERVATION_PATIENTS);
  const columns = React.useMemo(
    () => [
      ...OBSERVATION_QUEUE_BASE_COLUMNS,
      {
        key: 'actions',
        label: 'เครื่องมือ',
        width: 140,
        align: 'right',
        sortable: false,
        render: (patient) => {
          if (patient.status === 'empty') {
            return (
              <BrandSubdueButton
                leadingIcon='add'
                size='sm'
                onClick={(e) => {
                  e.stopPropagation();
                  setAdmitForm((prev) => ({ ...prev, bedId: patient.id }));
                  setShowAdmitModal(true);
                }}
              >
                ครองเตียง
              </BrandSubdueButton>
            );
          }
          return (
            <BrandPrimaryButton
              leadingIcon='clinical_notes'
              size='sm'
              onClick={(e) => {
                e.stopPropagation();
                history.push(`/observation/record/${patient.id}`);
              }}
            >
              เปิดแฟ้ม
            </BrandPrimaryButton>
          );
        },
      },
    ],
    [history],
  );
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modal states for Quick Vitals Log & Admit Patient
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [selectedPatientForVitals, setSelectedPatientForVitals] = useState(null);
  const [vitalsForm, setVitalsForm] = useState({ bpSys: '', bpDia: '', pulse: '', temp: '', spo2: '', rr: '', note: '' });

  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [admitForm, setAdmitForm] = useState({
    bedId: 'obs-005',
    patientName: '',
    hn: '',
    vn: `VN${new Date().toISOString().slice(2,10).replace(/-/g,'')}-0${Math.floor(Math.random()*90+10)}`,
    age: '',
    gender: 'ชาย',
    chiefComplaint: '',
    diagnosis: '',
    doctorName: 'นพ. วรวิทย์ เกียรติเจริญ',
    nurseName: 'พว. สุภาพร ชัยมงคล',
  });

  // Calculate summary counts
  const totalBeds = patients.length;
  const occupiedCount = patients.filter((p) => p.status === 'observing').length;
  const readyDischargeCount = patients.filter((p) => p.status === 'ready_discharge').length;
  const emptyCount = patients.filter((p) => p.status === 'empty').length;
  const criticalCount = patients.filter((p) => {
    if (p.status === 'empty') return false;
    const latest = p.vitalsTrend?.[p.vitalsTrend.length - 1];
    if (!latest) return false;
    return calculateEwsScore(latest).score >= 3;
  }).length;

  const summaryCards = [
    { label: 'เตียงทั้งหมด', value: `${totalBeds} เตียง`, indicator: 'พร้อมใช้งาน 24 ชม.', color: 'info', icon: 'hotel' },
    { label: 'กำลังสังเกตอาการ', value: `${occupiedCount} ราย`, indicator: 'ครองเตียงสังเกตอาการ', color: 'info', icon: 'child_care' },
    { label: 'พร้อมจำหน่าย', value: `${readyDischargeCount} ราย`, indicator: 'รอยืนยันกลับบ้าน', color: 'positive', icon: 'check_circle' },
    { label: 'เตียงว่าง', value: `${emptyCount} เตียง`, indicator: 'พร้อมรับผู้ป่วยใหม่', color: 'positive', icon: 'meeting_room' },
    { label: 'เฝ้าระวังพิเศษ (EWS ≥3)', value: `${criticalCount} ราย`, indicator: 'ประเมินด่วนที่สุด', color: 'destructive', icon: 'warning' },
  ];

  const tabs = [
    { key: 'all', label: `ทั้งหมด (${totalBeds})` },
    { key: 'observing', label: `กำลังสังเกตอาการ (${occupiedCount})` },
    { key: 'ready_discharge', label: `พร้อมจำหน่าย (${readyDischargeCount})` },
    { key: 'empty', label: `เตียงว่าง (${emptyCount})` },
  ];

  // Filter patients based on tab & search
  const filteredPatients = patients.filter((p) => {
    if (activeTab === 'observing' && p.status !== 'observing') return false;
    if (activeTab === 'ready_discharge' && p.status !== 'ready_discharge') return false;
    if (activeTab === 'empty' && p.status !== 'empty') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.patientName?.toLowerCase().includes(q);
      const matchHn = p.hn?.toLowerCase().includes(q);
      const matchBed = p.bedNo?.toLowerCase().includes(q);
      const matchDoctor = p.doctorName?.toLowerCase().includes(q);
      return matchName || matchHn || matchBed || matchDoctor;
    }
    return true;
  });

  const handleOpenVitalsModal = (patient) => {
    setSelectedPatientForVitals(patient);
    const latest = patient.vitalsTrend?.[patient.vitalsTrend.length - 1] || {};
    setVitalsForm({
      bpSys: latest.bpSys || 120,
      bpDia: latest.bpDia || 80,
      pulse: latest.pulse || 80,
      temp: latest.temp || 36.6,
      spo2: latest.spo2 || 98,
      rr: latest.rr || 18,
      note: '',
    });
    setShowVitalsModal(true);
  };

  const handleSaveVitals = (e) => {
    e.preventDefault();
    if (!selectedPatientForVitals) return;

    const nowStr = `${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} น.`;
    const newVitalLog = {
      time: nowStr,
      bpSys: Number(vitalsForm.bpSys),
      bpDia: Number(vitalsForm.bpDia),
      pulse: Number(vitalsForm.pulse),
      temp: Number(vitalsForm.temp),
      spo2: Number(vitalsForm.spo2),
      rr: Number(vitalsForm.rr),
      note: vitalsForm.note || 'บันทึกสัญญาณชีพประจำช่วงเวลา',
    };

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === selectedPatientForVitals.id) {
          return {
            ...p,
            vitalsTrend: [...p.vitalsTrend, newVitalLog],
          };
        }
        return p;
      })
    );
    setShowVitalsModal(false);
  };

  const handleAdmitSubmit = (e) => {
    e.preventDefault();
    const nowStr = `${new Date().getFullYear()}-${(new Date().getMonth()+1).toString().padStart(2,'0')}-${new Date().getDate().toString().padStart(2,'0')} ${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} น.`;

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === admitForm.bedId) {
          return {
            ...p,
            status: 'observing',
            patientName: admitForm.patientName,
            hn: admitForm.hn,
            vn: admitForm.vn,
            age: Number(admitForm.age) || 45,
            gender: admitForm.gender,
            admitTime: nowStr,
            durationMinutes: 0,
            chiefComplaint: admitForm.chiefComplaint,
            diagnosis: admitForm.diagnosis || 'Observe Symptoms',
            doctorName: admitForm.doctorName,
            nurseName: admitForm.nurseName,
            rights: 'สิทธิบัตรทอง (NHSO)',
            vitalsTrend: [
              { time: `${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} น.`, bpSys: 130, bpDia: 85, pulse: 88, temp: 36.8, spo2: 98, rr: 18, note: 'แรกรับเข้าเตียงสังเกตอาการ' }
            ],
            statOrders: [],
            nursingNotes: [
              { time: `${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} น.`, nurse: admitForm.nurseName, note: 'แรกรับผู้ป่วยเข้านอนเตียงสังเกตอาการ' }
            ],
            dischargeSummary: {
              disposition: 'home',
              doctorSummary: '',
              dischargeVitals: null,
              dischargeAdvice: '',
              referHospital: '',
              isDischarged: false,
            }
          };
        }
        return p;
      })
    );
    setShowAdmitModal(false);
  };

  return (
    <QueuePageShell
      activeKey='observation'
      breadcrumb={['หน้าหลัก PHCIS', 'ระบบสังเกตอาการ (Observation)']}
      title='ห้องเฝ้าสังเกตอาการ (Observation Unit)'
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={
        <div className='flex items-center gap-2'>
          <BrandPrimaryButton leadingIcon='add' onClick={() => setShowAdmitModal(true)}>
            รับผู้ป่วยเข้าเตียงสังเกตอาการ
          </BrandPrimaryButton>
        </div>
      }
    >
      {/* Page Content Container with 24px Padding (Top, Left, Right, Bottom) */}
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-600, 24px)',
        }}
      >
        {/* Main White Body Card Surface (Matching Screening / OPD Queue Work List Page) */}
        <div
          className='w-full flex flex-col space-y-6'
          style={{
            background: 'var(--surface-card-100, #FFFFFF)',
            borderRadius: 'var(--dim-radius-500, 24px)',
            border: 'none',
            boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))',
            padding: 'var(--dim-space-600, 24px)',
          }}
        >
        {/* Centered Primary Search (Figma 115:35757 / 2056:4246 — 640px centered search box) */}
        <div className='w-full flex items-start justify-center pt-2'>
          <PrimarySearch
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='ค้นหาคิว / HN / ชื่อ-สกุลผู้ป่วย / เลขเตียง / แพทย์ผู้ดูแล...'
            width={640}
            emptyMessage='ไม่พบข้อมูลเตียงสังเกตอาการที่ค้นหา'
          />
        </div>

        {/* Action & View Mode Bar */}
        <div className='flex items-center justify-between gap-4 pt-2 border-t border-ink-line'>
          <div className='text-xs text-ink-tertiary font-medium flex items-center gap-2'>
            <span>รายการเตียงสังเกตอาการทั้งหมด ({filteredPatients.length} รายการ)</span>
          </div>

          <div className='flex items-center gap-3 shrink-0'>
            <div className='inline-flex p-1 bg-ink-neutral rounded-xl border border-ink-line shadow-2xs gap-1'>
              <BrandIconButton
                icon='grid_view'
                variant={viewMode === 'grid' ? 'fill' : 'ghost'}
                size='sm'
                onClick={() => setViewMode('grid')}
                title='ผังเตียง (Grid View)'
                aria-label='ผังเตียง'
              />
              <BrandIconButton
                icon='view_list'
                variant={viewMode === 'table' ? 'fill' : 'ghost'}
                size='sm'
                onClick={() => setViewMode('table')}
                title='ตาราง (List View)'
                aria-label='ตาราง'
              />
            </div>
          </div>
        </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
          {filteredPatients.map((patient) => {
            const isEmpty = patient.status === 'empty';
            const latestVitals = patient.vitalsTrend?.[patient.vitalsTrend.length - 1];
            const ewsResult = latestVitals ? calculateEwsScore(latestVitals) : null;

            if (isEmpty) {
              return (
                <div
                  key={patient.id}
                  className='rounded-2xl p-6 flex flex-col items-center justify-center min-h-[260px] text-center transition-all group'
                  style={{
                    background: 'var(--surface-neutral-quaternary)',
                    border: 'var(--dim-stroke-200) dashed var(--border-card-default)',
                  }}
                >
                  <div
                    className='w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all'
                    style={{
                      background: 'var(--surface-card-100)',
                      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                      boxShadow: 'var(--shadow-2xs, none)',
                      color: 'var(--text-content-quaternary)',
                    }}
                  >
                    <span className='material-symbols-outlined text-2xl'>king_bed</span>
                  </div>
                  <h3 style={{ fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)', fontSize: 'var(--type-size-base)', marginBottom: 'var(--dim-space-050, 2px)' }}>
                    {patient.bedNo}
                  </h3>
                  <p style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)', marginBottom: 'var(--dim-space-400)' }}>
                    {patient.bedType} (ว่าง)
                  </p>
                  <BrandSubdueButton
                    leadingIcon='person_add'
                    size='sm'
                    onClick={() => {
                      setAdmitForm((prev) => ({ ...prev, bedId: patient.id }));
                      setShowAdmitModal(true);
                    }}
                  >
                    ลงทะเบียนครองเตียง
                  </BrandSubdueButton>
                </div>
              );
            }

            return (
              <div
                key={patient.id}
                className='rounded-2xl p-5 transition-all flex flex-col justify-between relative overflow-hidden mih-summary-card'
                style={{ background: 'var(--surface-card-100)', border: 'none', boxShadow: 'var(--shadow-card-strong)' }}
              >
                {/* Status bar accent */}
                <div
                  className='absolute top-0 left-0 right-0 h-1.5'
                  style={{
                    background:
                      ewsResult?.tier.level === 'high'
                        ? 'var(--surface-colorfulbadge-red-bold)'
                        : ewsResult?.tier.level === 'medium'
                        ? 'var(--surface-colorfulbadge-orange-bold)'
                        : 'var(--surface-colorfulbadge-green-bold)',
                  }}
                />

                {/* Card Header */}
                <div>
                  <div className='flex items-center justify-between mb-3 pt-1'>
                    <div className='flex items-center gap-2'>
                      <span
                        style={{
                          padding: 'var(--dim-space-150, 6px) var(--dim-space-250, 10px)',
                          background: 'var(--surface-brandPrimary-quaternary)',
                          color: 'var(--text-brandPrimary-default)',
                          borderRadius: 'var(--dim-radius-150, 6px)',
                          border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                          fontWeight: 'var(--type-weight-bold)',
                          fontSize: 'var(--type-size-xs)',
                        }}
                      >
                        {patient.bedNo}
                      </span>
                      <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>
                        {patient.rights}
                      </span>
                    </div>

                    <StatusBadge
                      style={
                        patient.status === 'ready_discharge'
                          ? 'success'
                          : ewsResult?.tier.level === 'high'
                          ? 'error'
                          : ewsResult?.tier.level === 'medium'
                          ? 'yellow'
                          : 'info'
                      }
                      size='small'
                      showDot
                    >
                      {patient.status === 'ready_discharge' ? 'พร้อมจำหน่าย' : `กำลังเฝ้าระวัง (${ewsResult?.score ?? 0})`}
                    </StatusBadge>
                  </div>

                  {/* Patient Primary Details */}
                  <div className='mb-4'>
                    <div className='flex items-center gap-2.5 mb-2'>
                      <img
                        src={patient.avatar || getPatientByHN(patient.hn)?.avatarUrl || '/avatars/somchai-mock.png'}
                        alt={patient.patientName}
                        className='w-10 h-10 rounded-full object-cover border border-ink-line shrink-0 shadow-2xs'
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/avatars/somchai-mock.png';
                        }}
                      />
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-baseline justify-between gap-1'>
                          <h3
                            className='font-bold text-ink text-base leading-tight hover:text-brand-600 cursor-pointer truncate'
                            onClick={() => history.push(`/observation/record/${patient.id}`)}
                          >
                            {patient.patientName}
                          </h3>
                          <span className='text-xs font-semibold text-ink-tertiary shrink-0'>
                            {patient.gender}, {patient.age} ปี
                          </span>
                        </div>
                        <div className='flex items-center gap-2 text-xs text-ink-secondary mt-0.5'>
                          <span>HN: <strong className='text-ink font-mono'>{patient.hn}</strong></span>
                          <span>•</span>
                          <span className='font-mono text-ink-tertiary text-[11px]'>{patient.vn}</span>
                        </div>
                      </div>
                    </div>
                    <div className='bg-ink-neutral p-2.5 rounded-lg border border-ink-line text-xs text-ink-secondary mb-3'>
                      <div className='text-ink-tertiary font-medium mb-0.5'>อาการสำคัญ / การวินิจฉัย:</div>
                      <div className='font-semibold text-ink line-clamp-2'>{patient.chiefComplaint}</div>
                    </div>
                  </div>

                  {/* Vitals Trend Snapshot */}
                  {latestVitals && (
                    <div className='bg-brand-50/50 rounded-xl p-3 border border-brand-200/60 mb-4'>
                      <div className='flex items-center justify-between text-xs mb-2'>
                        <span className='font-bold text-brand-800 flex items-center gap-1'>
                          <span className='material-symbols-outlined text-sm text-brand-600'>monitor_heart</span>
                          สัญญาณชีพล่าสุด ({latestVitals.time})
                        </span>
                        <StatusBadge style={ewsResult.tier.style} size='small' showDot>
                          EWS: {ewsResult.score}
                        </StatusBadge>
                      </div>
                      <div className='grid grid-cols-4 gap-2 text-center text-xs'>
                        <div className='bg-surface-card p-1.5 rounded-lg shadow-2xs border border-ink-line'>
                          <div className='text-[10px] text-ink-quaternary font-medium'>ความดัน</div>
                          <div className='font-bold text-ink text-[11px]'>{latestVitals.bpSys}/{latestVitals.bpDia}</div>
                        </div>
                        <div className='bg-surface-card p-1.5 rounded-lg shadow-2xs border border-ink-line'>
                          <div className='text-[10px] text-ink-quaternary font-medium'>ชีพจร</div>
                          <div className='font-bold text-brand-600 text-[11px]'>{latestVitals.pulse} <span className='text-[9px] font-normal text-ink-quaternary'>bpm</span></div>
                        </div>
                        <div className='bg-surface-card p-1.5 rounded-lg shadow-2xs border border-ink-line'>
                          <div className='text-[10px] text-ink-quaternary font-medium'>SpO2</div>
                          <div className='font-bold text-badge-blueText text-[11px]'>{latestVitals.spo2}%</div>
                        </div>
                        <div className='bg-surface-card p-1.5 rounded-lg shadow-2xs border border-ink-line'>
                          <div className='text-[10px] text-ink-quaternary font-medium'>อุณหภูมิ</div>
                          <div className='font-bold text-badge-orangeText text-[11px]'>{latestVitals.temp}°C</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Doctor & Admission Time */}
                  <div className='flex items-center justify-between text-xs text-ink-tertiary mb-4 px-1'>
                    <div className='flex items-center gap-1'>
                      <span className='material-symbols-outlined text-sm text-ink-quaternary'>schedule</span>
                      สังเกตอาการแล้ว <strong className='text-ink-secondary'>{Math.floor(patient.durationMinutes / 60)} ชม. {patient.durationMinutes % 60} นาที</strong>
                    </div>
                    <div className='text-ink-secondary truncate max-w-[140px]' title={patient.doctorName}>
                      {patient.doctorName}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className='pt-3 border-t border-ink-line grid grid-cols-2 gap-2'>
                  <NeutralSubdueButton
                    leadingIcon='add_chart'
                    size='sm'
                    onClick={() => handleOpenVitalsModal(patient)}
                  >
                    วัด Vital Signs
                  </NeutralSubdueButton>
                  <BrandPrimaryButton
                    leadingIcon='clinical_notes'
                    size='sm'
                    onClick={() => history.push(`/observation/record/${patient.id}`)}
                  >
                    เปิดแฟ้มสังเกตอาการ
                  </BrandPrimaryButton>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View — shared <Table> component (see OBSERVATION_QUEUE_BASE_COLUMNS
           above) instead of a bespoke Tailwind-gray <table>, matching the OPD
           screening worklist. */
        <Table
          columns={columns}
          rows={filteredPatients}
          rowKey={(patient) => patient.id}
          emptyMessage='ไม่พบข้อมูลเตียงสังเกตอาการ'
        />
      )}
      </div>
      </div>

      {/* Modal: Log Timed Vital Signs */}
      {showVitalsModal && selectedPatientForVitals && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowVitalsModal(false); }}
          className='fixed inset-0 z-[1400] flex items-center justify-center p-4 animate-fade-in'
          style={{ backgroundColor: 'var(--surface-overlay-default, rgba(0, 0, 0, 0.5))', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        >
          <div className='bg-surface-card rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-ink-line'>
            <div className='bg-brand-800 text-white px-6 py-4 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <span className='material-symbols-outlined text-2xl'>monitor_heart</span>
                <h3 className='font-bold text-base'>บันทึกสัญญาณชีพประจำช่วงเวลา</h3>
              </div>
              <BrandCircleIconButton
                icon='close'
                variant='ghost'
                size='sm'
                onClick={() => setShowVitalsModal(false)}
                title='ปิดหน้าต่าง'
                aria-label='ปิดหน้าต่าง'
              />
            </div>

            <form onSubmit={handleSaveVitals} className='p-6 space-y-4 text-xs text-ink-secondary'>
              <div className='bg-brand-50 p-3 rounded-xl border border-brand-100 flex items-center justify-between'>
                <div>
                  <span className='font-bold text-ink text-sm'>{selectedPatientForVitals.patientName}</span>
                  <span className='text-ink-tertiary ml-2'>({selectedPatientForVitals.bedNo})</span>
                </div>
                <span className='text-xs text-brand-800 font-mono font-semibold'>HN: {selectedPatientForVitals.hn}</span>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <InputField
                  label='ความดัน Systolic (mmHg)'
                  type='number'
                  value={vitalsForm.bpSys}
                  onChange={(val) => setVitalsForm({ ...vitalsForm, bpSys: val })}
                  size='sm'
                  required
                />
                <InputField
                  label='ความดัน Diastolic (mmHg)'
                  type='number'
                  value={vitalsForm.bpDia}
                  onChange={(val) => setVitalsForm({ ...vitalsForm, bpDia: val })}
                  size='sm'
                  required
                />
                <InputField
                  label='ชีพจร Pulse (bpm)'
                  type='number'
                  value={vitalsForm.pulse}
                  onChange={(val) => setVitalsForm({ ...vitalsForm, pulse: val })}
                  size='sm'
                  required
                />
                <InputField
                  label='อุณหภูมิ Temp (°C)'
                  type='number'
                  step='0.1'
                  value={vitalsForm.temp}
                  onChange={(val) => setVitalsForm({ ...vitalsForm, temp: val })}
                  size='sm'
                  required
                />
                <InputField
                  label='ออกซิเจน SpO2 (%)'
                  type='number'
                  value={vitalsForm.spo2}
                  onChange={(val) => setVitalsForm({ ...vitalsForm, spo2: val })}
                  size='sm'
                  required
                />
                <InputField
                  label='อัตราการหายใจ RR (bpm)'
                  type='number'
                  value={vitalsForm.rr}
                  onChange={(val) => setVitalsForm({ ...vitalsForm, rr: val })}
                  size='sm'
                  required
                />
              </div>

              <Textarea
                label='หมายเหตุเพิ่มเติม / อาการขณะวัด'
                rows={2}
                value={vitalsForm.note}
                onChange={(val) => setVitalsForm({ ...vitalsForm, note: val })}
                placeholder='เช่น พ่นยาครบคอร์ส, ผู้ป่วยลุกนั่งได้ดี, มีอาการเวียนศีรษะเบาลง'
              />

              {/* Calculated Live EWS Badge */}
              <div className='p-3 bg-ink-neutral rounded-xl border border-ink-line flex items-center justify-between'>
                <span className='font-semibold text-ink-secondary'>คะแนนเตือนภัยล่วงหน้า (EWS Calculated):</span>
                {(() => {
                  const res = calculateEwsScore({
                    bpSys: Number(vitalsForm.bpSys),
                    pulse: Number(vitalsForm.pulse),
                    temp: Number(vitalsForm.temp),
                    spo2: Number(vitalsForm.spo2),
                    rr: Number(vitalsForm.rr),
                  });
                  return (
                    <span
                      className='px-3 py-1 rounded-lg font-bold font-mono text-xs shadow-2xs'
                      style={{ backgroundColor: res.tier.color + '20', color: res.tier.color }}
                    >
                      Score: {res.score} ({res.tier.label})
                    </span>
                  );
                })()}
              </div>

              <div className='pt-3 flex items-center justify-end gap-3 border-t border-ink-line'>
                <NeutralSubdueButton type='button' onClick={() => setShowVitalsModal(false)}>
                  ยกเลิก
                </NeutralSubdueButton>
                <BrandPrimaryButton type='submit' leadingIcon='save'>
                  บันทึกสัญญาณชีพ
                </BrandPrimaryButton>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Admit Patient to Bed */}
      {showAdmitModal && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdmitModal(false); }}
          className='fixed inset-0 z-[1400] flex items-center justify-center p-4 animate-fade-in'
          style={{ backgroundColor: 'var(--surface-overlay-default, rgba(0, 0, 0, 0.5))', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        >
          <div className='bg-surface-card rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-ink-line'>
            <div className='bg-brand-800 text-white px-6 py-4 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <span className='material-symbols-outlined text-2xl'>hotel</span>
                <h3 className='font-bold text-base'>ลงทะเบียนรับผู้ป่วยเข้าเตียงสังเกตอาการ</h3>
              </div>
              <BrandCircleIconButton
                icon='close'
                variant='ghost'
                size='sm'
                onClick={() => setShowAdmitModal(false)}
                title='ปิดหน้าต่าง'
                aria-label='ปิดหน้าต่าง'
              />
            </div>

            <form onSubmit={handleAdmitSubmit} className='p-6 space-y-4 text-xs text-ink-secondary'>
              <div className='grid grid-cols-2 gap-4'>
                <Select
                  label='เลือกเตียงสังเกตอาการ'
                  value={admitForm.bedId}
                  onChange={(val) => setAdmitForm({ ...admitForm, bedId: val })}
                  options={patients.map((p) => ({
                    value: p.id,
                    label: `${p.bedNo} (${p.bedType}) ${p.status !== 'empty' ? '- ครองเตียงแล้ว' : '- ว่าง'}`,
                    disabled: p.status !== 'empty' && p.id !== admitForm.bedId
                  }))}
                  size='sm'
                />
                <InputField
                  label='เลข VN / Visit No.'
                  value={admitForm.vn}
                  onChange={(val) => setAdmitForm({ ...admitForm, vn: val })}
                  size='sm'
                  required
                />
                <InputField
                  label='ชื่อ-นามสกุล ผู้ป่วย'
                  placeholder='เช่น นาย สนั่น มั่นคง'
                  value={admitForm.patientName}
                  onChange={(val) => setAdmitForm({ ...admitForm, patientName: val })}
                  size='sm'
                  required
                />
                <InputField
                  label='เลข HN (Hospital No.)'
                  placeholder='เช่น 67009988'
                  value={admitForm.hn}
                  onChange={(val) => setAdmitForm({ ...admitForm, hn: val })}
                  size='sm'
                  required
                />
                <InputField
                  label='อายุ (ปี)'
                  type='number'
                  placeholder='เช่น 45'
                  value={admitForm.age}
                  onChange={(val) => setAdmitForm({ ...admitForm, age: val })}
                  size='sm'
                  required
                />
                <Select
                  label='เพศ'
                  value={admitForm.gender}
                  onChange={(val) => setAdmitForm({ ...admitForm, gender: val })}
                  options={['ชาย', 'หญิง']}
                  size='sm'
                />
              </div>

              <Textarea
                label='อาการสำคัญแรกรับ (Chief Complaint)'
                rows={2}
                placeholder='เช่น แน่นหน้าอก เวียนศีรษะ ปวดท้องรุนแรง มีไข้สูง'
                value={admitForm.chiefComplaint}
                onChange={(val) => setAdmitForm({ ...admitForm, chiefComplaint: val })}
                required
              />

              <div className='grid grid-cols-2 gap-4'>
                <InputField
                  label='แพทย์ผู้ดูแลสั่งการ'
                  value={admitForm.doctorName}
                  onChange={(val) => setAdmitForm({ ...admitForm, doctorName: val })}
                  size='sm'
                  required
                />
                <InputField
                  label='พยาบาลรับผู้ป่วย'
                  value={admitForm.nurseName}
                  onChange={(val) => setAdmitForm({ ...admitForm, nurseName: val })}
                  size='sm'
                  required
                />
              </div>

              <div className='pt-3 flex items-center justify-end gap-3 border-t border-ink-line'>
                <NeutralSubdueButton type='button' onClick={() => setShowAdmitModal(false)}>
                  ยกเลิก
                </NeutralSubdueButton>
                <BrandPrimaryButton type='submit' leadingIcon='check'>
                  ยืนยันครองเตียงสังเกตอาการ
                </BrandPrimaryButton>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </QueuePageShell>
  );
}
