import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import StatusBadge from '@/components/badge/StatusBadge';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import BrandCircleIconButton from '@/components/button/BrandCircleIconButton';
import Icon from '@/components/icons/Icon';
import PrimarySearch from '@/components/search/PrimarySearch';
import { MOCK_OBSERVATION_PATIENTS, calculateEwsScore, EWS_RISK_TIERS } from '@/data/observationMock';

export default function ObservationQueuePage() {
  const history = useHistory();
  const [patients, setPatients] = useState(MOCK_OBSERVATION_PATIENTS);
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
            border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
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
        <div className='flex items-center justify-between gap-4 pt-2 border-t border-gray-100'>
          <div className='text-xs text-gray-500 font-medium flex items-center gap-2'>
            <span>รายการเตียงสังเกตอาการทั้งหมด ({filteredPatients.length} รายการ)</span>
          </div>

          <div className='flex items-center gap-3 shrink-0'>
            <div className='inline-flex p-1 bg-gray-50 rounded-xl border border-gray-200 shadow-2xs gap-1'>
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
                  className='bg-[#F8FAFC] border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[260px] text-center hover:border-brand-600 hover:bg-brand-50/20 transition-all group'
                >
                  <div className='w-12 h-12 rounded-full bg-white border border-gray-200 shadow-2xs flex items-center justify-center text-gray-400 group-hover:text-brand-600 group-hover:border-brand-300 transition-all mb-3'>
                    <span className='material-symbols-outlined text-2xl'>king_bed</span>
                  </div>
                  <h3 className='font-bold text-gray-900 text-base mb-0.5'>{patient.bedNo}</h3>
                  <p className='text-xs text-gray-500 mb-4'>{patient.bedType} (ว่าง)</p>
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
                className='bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden mih-summary-card'
              >
                {/* Status bar accent */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    ewsResult?.tier.level === 'high'
                      ? 'bg-rose-500'
                      : ewsResult?.tier.level === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-brand-500'
                  }`}
                />

                {/* Card Header */}
                <div>
                  <div className='flex items-center justify-between mb-3 pt-1'>
                    <div className='flex items-center gap-2'>
                      <span className='px-2.5 py-1 bg-brand-50 text-brand-700 rounded-md font-bold text-xs border border-brand-200'>
                        {patient.bedNo}
                      </span>
                      <span className='text-xs text-gray-500 font-medium'>{patient.rights}</span>
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
                        src={patient.avatar || '/avatars/patient-mock-01.png'}
                        alt={patient.patientName}
                        className='w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0 shadow-2xs'
                      />
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-baseline justify-between gap-1'>
                          <h3
                            className='font-bold text-gray-900 text-base leading-tight hover:text-brand-600 cursor-pointer truncate'
                            onClick={() => history.push(`/observation/record/${patient.id}`)}
                          >
                            {patient.patientName}
                          </h3>
                          <span className='text-xs font-semibold text-gray-500 shrink-0'>
                            {patient.gender}, {patient.age} ปี
                          </span>
                        </div>
                        <div className='flex items-center gap-2 text-xs text-gray-600 mt-0.5'>
                          <span>HN: <strong className='text-gray-800 font-mono'>{patient.hn}</strong></span>
                          <span>•</span>
                          <span className='font-mono text-gray-500 text-[11px]'>{patient.vn}</span>
                        </div>
                      </div>
                    </div>
                    <div className='bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs text-gray-700 mb-3'>
                      <div className='text-gray-500 font-medium mb-0.5'>อาการสำคัญ / การวินิจฉัย:</div>
                      <div className='font-semibold text-gray-900 line-clamp-2'>{patient.chiefComplaint}</div>
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
                        <span
                          className='px-2 py-0.5 rounded font-mono font-bold text-[11px]'
                          style={{
                            backgroundColor: ewsResult.tier.color + '20',
                            color: ewsResult.tier.color,
                          }}
                        >
                          EWS: {ewsResult.score}
                        </span>
                      </div>
                      <div className='grid grid-cols-4 gap-2 text-center text-xs'>
                        <div className='bg-white p-1.5 rounded-lg shadow-2xs border border-gray-100'>
                          <div className='text-[10px] text-gray-400 font-medium'>ความดัน</div>
                          <div className='font-bold text-gray-800 text-[11px]'>{latestVitals.bpSys}/{latestVitals.bpDia}</div>
                        </div>
                        <div className='bg-white p-1.5 rounded-lg shadow-2xs border border-gray-100'>
                          <div className='text-[10px] text-gray-400 font-medium'>ชีพจร</div>
                          <div className='font-bold text-brand-600 text-[11px]'>{latestVitals.pulse} <span className='text-[9px] font-normal text-gray-400'>bpm</span></div>
                        </div>
                        <div className='bg-white p-1.5 rounded-lg shadow-2xs border border-gray-100'>
                          <div className='text-[10px] text-gray-400 font-medium'>SpO2</div>
                          <div className='font-bold text-blue-700 text-[11px]'>{latestVitals.spo2}%</div>
                        </div>
                        <div className='bg-white p-1.5 rounded-lg shadow-2xs border border-gray-100'>
                          <div className='text-[10px] text-gray-400 font-medium'>อุณหภูมิ</div>
                          <div className='font-bold text-amber-700 text-[11px]'>{latestVitals.temp}°C</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Doctor & Admission Time */}
                  <div className='flex items-center justify-between text-xs text-gray-500 mb-4 px-1'>
                    <div className='flex items-center gap-1'>
                      <span className='material-symbols-outlined text-sm text-gray-400'>schedule</span>
                      สังเกตอาการแล้ว <strong className='text-gray-700'>{Math.floor(patient.durationMinutes / 60)} ชม. {patient.durationMinutes % 60} นาที</strong>
                    </div>
                    <div className='text-gray-600 truncate max-w-[140px]' title={patient.doctorName}>
                      {patient.doctorName}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className='pt-3 border-t border-gray-100 grid grid-cols-2 gap-2'>
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
        /* Table View */
        <div className='bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-xs border-collapse'>
              <thead>
                <tr className='bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider'>
                  <th className='py-3.5 px-4'>เลขเตียง</th>
                  <th className='py-3.5 px-4'>ชื่อ-นามสกุล / HN</th>
                  <th className='py-3.5 px-4'>เพศ / อายุ</th>
                  <th className='py-3.5 px-4'>เวลาเข้าเตียง</th>
                  <th className='py-3.5 px-4'>อาการสำคัญ / วินิจฉัย</th>
                  <th className='py-3.5 px-4 text-center'>สัญญาณชีพล่าสุด</th>
                  <th className='py-3.5 px-4 text-center'>EWS Score</th>
                  <th className='py-3.5 px-4 text-center'>สถานะ</th>
                  <th className='py-3.5 px-4 text-right'>เครื่องมือ</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100 text-gray-800'>
                {filteredPatients.map((patient) => {
                  if (patient.status === 'empty') {
                    return (
                      <tr key={patient.id} className='bg-gray-50/50 hover:bg-gray-50'>
                        <td className='py-3 px-4 font-bold text-gray-500'>{patient.bedNo}</td>
                        <td className='py-3 px-4 text-gray-400 italic' colSpan={7}>
                          เตียงว่าง ({patient.bedType})
                        </td>
                        <td className='py-3 px-4 text-right'>
                          <BrandSubdueButton
                            leadingIcon='add'
                            size='sm'
                            onClick={() => {
                              setAdmitForm((prev) => ({ ...prev, bedId: patient.id }));
                              setShowAdmitModal(true);
                            }}
                          >
                            ครองเตียง
                          </BrandSubdueButton>
                        </td>
                      </tr>
                    );
                  }

                  const latestVitals = patient.vitalsTrend?.[patient.vitalsTrend.length - 1];
                  const ews = latestVitals ? calculateEwsScore(latestVitals) : null;

                  return (
                    <tr key={patient.id} className='hover:bg-brand-50/20 transition-colors'>
                      <td className='py-3.5 px-4 font-bold text-brand-700'>{patient.bedNo}</td>
                      <td className='py-3.5 px-4'>
                        <div className='flex items-center gap-2.5'>
                          <img
                            src={patient.avatar || '/avatars/patient-mock-01.png'}
                            alt={patient.patientName}
                            className='w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0 shadow-2xs'
                          />
                          <div>
                            <div className='font-bold text-gray-900'>{patient.patientName}</div>
                            <div className='text-[11px] text-gray-500 font-mono'>HN: {patient.hn}</div>
                          </div>
                        </div>
                      </td>
                      <td className='py-3.5 px-4'>{patient.gender}, {patient.age} ปี</td>
                      <td className='py-3.5 px-4'>
                        <div>{patient.admitTime}</div>
                        <div className='text-[11px] text-gray-500'>
                          ({Math.floor(patient.durationMinutes / 60)} ชม. {patient.durationMinutes % 60} นาที)
                        </div>
                      </td>
                      <td className='py-3.5 px-4 max-w-xs'>
                        <div className='font-medium text-gray-900 truncate' title={patient.chiefComplaint}>
                          {patient.chiefComplaint}
                        </div>
                        <div className='text-[11px] text-gray-500 truncate'>{patient.diagnosis}</div>
                      </td>
                      <td className='py-3.5 px-4 text-center'>
                        {latestVitals ? (
                          <div className='font-mono font-semibold text-gray-800 text-[11px]'>
                            <div>{latestVitals.bpSys}/{latestVitals.bpDia} mmHg</div>
                            <div className='text-[10px] text-gray-500'>P: {latestVitals.pulse} | SpO2: {latestVitals.spo2}%</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className='py-3.5 px-4 text-center'>
                        {ews ? (
                          <span
                            className='inline-block px-2 py-1 rounded font-bold font-mono text-xs'
                            style={{ backgroundColor: ews.tier.color + '20', color: ews.tier.color }}
                          >
                            {ews.score} ({ews.tier.level.toUpperCase()})
                          </span>
                        ) : '-'}
                      </td>
                      <td className='py-3.5 px-4 text-center'>
                        <StatusBadge
                          style={patient.status === 'ready_discharge' ? 'success' : 'info'}
                          size='small'
                        >
                          {patient.status === 'ready_discharge' ? 'พร้อมจำหน่าย' : 'สังเกตอาการ'}
                        </StatusBadge>
                      </td>
                      <td className='py-3.5 px-4 text-right'>
                        <BrandPrimaryButton
                          leadingIcon='clinical_notes'
                          size='sm'
                          onClick={() => history.push(`/observation/record/${patient.id}`)}
                        >
                          เปิดแฟ้ม
                        </BrandPrimaryButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
      </div>

      {/* Modal: Log Timed Vital Signs */}
      {showVitalsModal && selectedPatientForVitals && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowVitalsModal(false); }}
          className='fixed inset-0 bg-black/50 z-[1400] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in'
        >
          <div className='bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100'>
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

            <form onSubmit={handleSaveVitals} className='p-6 space-y-4 text-xs text-gray-700'>
              <div className='bg-brand-50 p-3 rounded-xl border border-brand-100 flex items-center justify-between'>
                <div>
                  <span className='font-bold text-gray-900 text-sm'>{selectedPatientForVitals.patientName}</span>
                  <span className='text-gray-500 ml-2'>({selectedPatientForVitals.bedNo})</span>
                </div>
                <span className='text-xs text-brand-800 font-mono font-semibold'>HN: {selectedPatientForVitals.hn}</span>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block font-semibold text-gray-700 mb-1'>ความดัน Systolic (mmHg)</label>
                  <input
                    type='number'
                    value={vitalsForm.bpSys}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, bpSys: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none'
                    required
                  />
                </div>
                <div>
                  <label className='block font-semibold text-gray-700 mb-1'>ความดัน Diastolic (mmHg)</label>
                  <input
                    type='number'
                    value={vitalsForm.bpDia}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, bpDia: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none'
                    required
                  />
                </div>
                <div>
                  <label className='block font-semibold text-gray-700 mb-1'>ชีพจร Pulse (bpm)</label>
                  <input
                    type='number'
                    value={vitalsForm.pulse}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, pulse: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none'
                    required
                  />
                </div>
                <div>
                  <label className='block font-semibold text-gray-700 mb-1'>อุณหภูมิ Temp (°C)</label>
                  <input
                    type='number'
                    step='0.1'
                    value={vitalsForm.temp}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, temp: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none'
                    required
                  />
                </div>
                <div>
                  <label className='block font-semibold text-gray-700 mb-1'>ออกซิเจน SpO2 (%)</label>
                  <input
                    type='number'
                    value={vitalsForm.spo2}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none'
                    required
                  />
                </div>
                <div>
                  <label className='block font-semibold text-gray-700 mb-1'>อัตราการหายใจ RR (bpm)</label>
                  <input
                    type='number'
                    value={vitalsForm.rr}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, rr: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none'
                    required
                  />
                </div>
              </div>

              <div>
                <label className='block font-semibold text-gray-700 mb-1'>หมายเหตุเพิ่มเติม / อาการขณะวัด</label>
                <textarea
                  rows={2}
                  value={vitalsForm.note}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, note: e.target.value })}
                  placeholder='เช่น พ่นยาครบคอร์ส, ผู้ป่วยลุกนั่งได้ดี, มีอาการเวียนศีรษะเบาลง'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none'
                />
              </div>

              {/* Calculated Live EWS Badge */}
              <div className='p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between'>
                <span className='font-semibold text-gray-700'>คะแนนเตือนภัยล่วงหน้า (EWS Calculated):</span>
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

              <div className='pt-3 flex items-center justify-end gap-3 border-t border-gray-100'>
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
          className='fixed inset-0 bg-black/50 z-[1400] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in'
        >
          <div className='bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-gray-100'>
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

            <form onSubmit={handleAdmitSubmit} className='p-6 space-y-4 text-xs text-gray-700'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block font-semibold text-gray-700 mb-1'>เลือกเตียงสังเกตอาการ</label>
                  <select
                    value={admitForm.bedId}
                    onChange={(e) => setAdmitForm({ ...admitForm, bedId: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none'
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.status !== 'empty' && p.id !== admitForm.bedId}>
                        {p.bedNo} ({p.bedType}) {p.status !== 'empty' ? '- ครองเตียงแล้ว' : '- ว่าง'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block font-semibold text-gray-700 mb-1'>เลข VN / Visit No.</label>
                  <input
                    type='text'
                    value={admitForm.vn}
                    onChange={(e) => setAdmitForm({ ...admitForm, vn: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none font-mono'
                    required
                  />
                </div>
                <div>
                  <label className='block font-semibold text-gray-700 mb-1'>ชื่อ-นามสกุล ผู้ป่วย</label>
                  <input
                    type='text'
                    placeholder='เช่น นาย สนั่น มั่นคง'
                    value={admitForm.patientName}
                    onChange={(e) => setAdmitForm({ ...admitForm, patientName: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none'
                    required
                  />
                </div>
                <div>
                  <label className='block font-semibold text-gray-700 mb-1'>เลข HN (Hospital No.)</label>
                  <input
                    type='text'
                    placeholder='เช่น 67009988'
                    value={admitForm.hn}
                    onChange={(e) => setAdmitForm({ ...admitForm, hn: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none font-mono'
                    required
                  />
                </div>
                <div>
                  <label className='block font-semibold text-gray-700 mb-1'>อายุ (ปี)</label>
                  <input
                    type='number'
                    placeholder='เช่น 45'
                    value={admitForm.age}
                    onChange={(e) => setAdmitForm({ ...admitForm, age: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none'
                    required
                  />
                </div>
                <div>
                  <label className='block font-semibold text-gray-700 mb-1'>เพศ</label>
                  <select
                    value={admitForm.gender}
                    onChange={(e) => setAdmitForm({ ...admitForm, gender: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none'
                  >
                    <option value='ชาย'>ชาย</option>
                    <option value='หญิง'>หญิง</option>
                  </select>
                </div>
              </div>

              <div>
                <label className='block font-semibold text-gray-700 mb-1'>อาการสำคัญแรกรับ (Chief Complaint)</label>
                <textarea
                  rows={2}
                  placeholder='เช่น แน่นหน้าอก เวียนศีรษะ ปวดท้องรุนแรง มีไข้สูง'
                  value={admitForm.chiefComplaint}
                  onChange={(e) => setAdmitForm({ ...admitForm, chiefComplaint: e.target.value })}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none'
                  required
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block font-semibold text-gray-700 mb-1'>แพทย์ผู้ดูแลสั่งการ</label>
                  <input
                    type='text'
                    value={admitForm.doctorName}
                    onChange={(e) => setAdmitForm({ ...admitForm, doctorName: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none'
                    required
                  />
                </div>
                <div>
                  <label className='block font-semibold text-gray-700 mb-1'>พยาบาลรับผู้ป่วย</label>
                  <input
                    type='text'
                    value={admitForm.nurseName}
                    onChange={(e) => setAdmitForm({ ...admitForm, nurseName: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none'
                    required
                  />
                </div>
              </div>

              <div className='pt-3 flex items-center justify-end gap-3 border-t border-gray-100'>
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
