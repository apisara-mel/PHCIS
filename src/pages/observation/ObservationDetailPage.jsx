import React, { useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import StatusBadge from '@/components/badge/StatusBadge';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Textarea from '@/components/forms/Textarea';
import BrandButton from '@/components/button/BrandButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Alert from '@/components/alert/Alert';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import { MOCK_OBSERVATION_PATIENTS, calculateEwsScore, EWS_RISK_TIERS } from '@/data/observationMock';
import VitalTrendChart from '@/components/observation/VitalTrendChart';

export default function ObservationDetailPage() {
  const { id } = useParams();
  const history = useHistory();

  // Find patient record by ID (or default to obs-001)
  const initialPatient = MOCK_OBSERVATION_PATIENTS.find((p) => p.id === id) || MOCK_OBSERVATION_PATIENTS[0];
  const [patient, setPatient] = useState(initialPatient);
  const [activeTab, setActiveTab] = useState('vitals'); // 'vitals' | 'orders' | 'notes' | 'discharge'
  const [selectedTrendParam, setSelectedTrendParam] = useState('bp'); // 'bp' | 'pulse' | 'spo2' | 'temp' | 'rr'

  // Forms states
  const [newVital, setNewVital] = useState({
    bpSys: '', bpDia: '', pulse: '', temp: '', spo2: '', rr: '', note: ''
  });

  const [newOrderText, setNewOrderText] = useState('');
  const [newNursingNote, setNewNursingNote] = useState('');

  const [dischargeForm, setDischargeForm] = useState({
    disposition: patient.dischargeSummary?.disposition || 'home',
    doctorSummary: patient.dischargeSummary?.doctorSummary || '',
    dischargeAdvice: patient.dischargeSummary?.dischargeAdvice || '',
    referHospital: patient.dischargeSummary?.referHospital || '',
    isDischarged: patient.dischargeSummary?.isDischarged || false,
  });

  // Calculate EWS for latest vitals
  const latestVitals = patient.vitalsTrend?.[patient.vitalsTrend.length - 1];
  const currentEws = latestVitals ? calculateEwsScore(latestVitals) : { score: 0, tier: EWS_RISK_TIERS.NORMAL };

  const handleAddVital = (e) => {
    e.preventDefault();
    const nowStr = `${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} น.`;
    const newLog = {
      time: nowStr,
      bpSys: Number(newVital.bpSys) || 120,
      bpDia: Number(newVital.bpDia) || 80,
      pulse: Number(newVital.pulse) || 80,
      temp: Number(newVital.temp) || 36.6,
      spo2: Number(newVital.spo2) || 98,
      rr: Number(newVital.rr) || 18,
      note: newVital.note || 'บันทึกประจำช่วงเวลา',
    };

    setPatient((prev) => ({
      ...prev,
      vitalsTrend: [...prev.vitalsTrend, newLog],
    }));

    setNewVital({ bpSys: '', bpDia: '', pulse: '', temp: '', spo2: '', rr: '', note: '' });
  };

  const handleAddOrder = (e) => {
    e.preventDefault();
    if (!newOrderText.trim()) return;

    const nowStr = `${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} น.`;
    const newOrd = {
      id: `ord-${Date.now()}`,
      orderTime: nowStr,
      orderText: newOrderText,
      status: 'pending',
      executedBy: '-',
      executedTime: '-',
    };

    setPatient((prev) => ({
      ...prev,
      statOrders: [...prev.statOrders, newOrd],
    }));

    setNewOrderText('');
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    const nowStr = `${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} น.`;
    setPatient((prev) => ({
      ...prev,
      statOrders: prev.statOrders.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status: newStatus,
            executedBy: newStatus === 'completed' || newStatus === 'in_progress' ? prev.nurseName : ord.executedBy,
            executedTime: newStatus === 'completed' || newStatus === 'in_progress' ? nowStr : ord.executedTime,
          };
        }
        return ord;
      }),
    }));
  };

  const handleAddNursingNote = (e) => {
    e.preventDefault();
    if (!newNursingNote.trim()) return;

    const nowStr = `${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} น.`;
    const newNote = {
      time: nowStr,
      nurse: patient.nurseName,
      note: newNursingNote,
    };

    setPatient((prev) => ({
      ...prev,
      nursingNotes: [...prev.nursingNotes, newNote],
    }));

    setNewNursingNote('');
  };

  const handleSaveDischarge = (e) => {
    e.preventDefault();
    setPatient((prev) => ({
      ...prev,
      status: dischargeForm.isDischarged ? 'discharged' : 'ready_discharge',
      dischargeSummary: {
        ...dischargeForm,
        dischargeVitals: latestVitals ? { ...latestVitals } : null,
      },
    }));
    alert('บันทึกผลการสรุปจำหน่ายสังเกตอาการเรียบร้อยแล้ว!');
  };

  const tabs = [
    { key: 'vitals', label: `1. แนวโน้มสัญญาณชีพตามเวลา (${patient.vitalsTrend?.length || 0})` },
    { key: 'orders', label: `2. คำสั่งการรักษาด่วน/STAT (${patient.statOrders?.length || 0})` },
    { key: 'notes', label: `3. บันทึกทางการพยาบาล (${patient.nursingNotes?.length || 0})` },
    { key: 'discharge', label: '4. สรุปผลสังเกตอาการ & จำหน่าย' },
  ];

  return (
    <QueuePageShell
      activeKey='observation'
      breadcrumb={['หน้าหลัก PHCIS', 'ห้องสังเกตอาการ', `แฟ้มสังเกตอาการ: ${patient.patientName}`]}
      title={`แฟ้มบันทึกสังเกตอาการ (Observation Record)`}
      onBack={() => history.push('/observation')}
      backLabel='กลับสู่ผังเตียง'
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={
        <div className='flex items-center gap-2'>
          <NeutralSubdueButton leadingIcon='print' onClick={() => window.print()}>
            พิมพ์ใบสังเกตอาการ (Timed Sheet)
          </NeutralSubdueButton>
          <BrandPrimaryButton leadingIcon='assignment_turned_in' onClick={() => setActiveTab('discharge')}>
            สรุปการจำหน่าย
          </BrandPrimaryButton>
        </div>
      }
    >
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
        {/* Patient Profile Header Card */}
        <div className='bg-white rounded-2xl p-5 border-none' style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}>
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100'>
          <div className='flex items-center gap-3.5'>
            <div className='w-12 h-12 rounded-2xl bg-brand-700 text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0'>
              {patient.bedNo.replace('เตียง ', '')}
            </div>
            <div>
              <div className='flex items-center gap-3 mb-1'>
                <h2 className='text-lg font-bold text-gray-900 leading-tight'>{patient.patientName}</h2>
                <span className='px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold'>
                  {patient.gender}, {patient.age} ปี
                </span>
                <StatusBadge
                  style={
                    patient.status === 'discharged'
                      ? 'neutral'
                      : patient.status === 'ready_discharge'
                      ? 'success'
                      : currentEws.score >= 3
                      ? 'error'
                      : 'info'
                  }
                  size='small'
                  showDot
                >
                  {patient.status === 'discharged'
                    ? 'จำหน่ายแล้ว'
                    : patient.status === 'ready_discharge'
                    ? 'พร้อมจำหน่าย'
                    : 'กำลังสังเกตอาการ'}
                </StatusBadge>
              </div>
              <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 font-mono'>
                <span>HN: <strong className='text-gray-900'>{patient.hn}</strong></span>
                <span>•</span>
                <span>VN: <strong className='text-gray-900'>{patient.vn}</strong></span>
                <span>•</span>
                <span className='font-sans text-brand-800 font-semibold'>{patient.rights}</span>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-4 bg-brand-50/60 p-3 rounded-xl border border-brand-100 text-xs'>
            <div>
              <div className='text-gray-500 font-medium text-[11px] mb-0.5'>แพทย์ผู้ดูแล:</div>
              <div className='font-bold text-gray-900'>{patient.doctorName}</div>
            </div>
            <div className='h-8 w-px bg-brand-200/60' />
            <div>
              <div className='text-gray-500 font-medium text-[11px] mb-0.5'>พยาบาลเจ้าของไข้:</div>
              <div className='font-bold text-gray-900'>{patient.nurseName}</div>
            </div>
            <div className='h-8 w-px bg-brand-200/60' />
            <div>
              <div className='text-gray-500 font-medium text-[11px] mb-0.5'>เวลาเข้าเตียง:</div>
              <div className='font-bold text-brand-900'>{patient.admitTime}</div>
            </div>
          </div>
        </div>

        {/* Diagnosis & Chief Complaint Bar */}
        <div className='pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs'>
          <div className='bg-gray-50 p-3 rounded-xl border border-gray-100'>
            <span className='font-bold text-gray-500 block mb-0.5'>อาการสำคัญ (Chief Complaint):</span>
            <span className='font-semibold text-gray-900'>{patient.chiefComplaint}</span>
          </div>
          <div className='bg-gray-50 p-3 rounded-xl border border-gray-100'>
            <span className='font-bold text-gray-500 block mb-0.5'>การวินิจฉัย (Diagnosis):</span>
            <span className='font-semibold text-brand-900 font-mono'>{patient.diagnosis}</span>
          </div>
        </div>
      </div>

      {/* Tab 1: Timed Vital Signs & EWS Trend */}
      {activeTab === 'vitals' && (
        <div className='space-y-6'>
          {/* EWS Score & Clinical Escalation Protocol Card */}
          <div className='bg-white rounded-2xl p-5 border-none' style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}>
            <div className='flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-gray-100 mb-4'>
              <div className='flex items-center gap-3'>
                <div
                  className='w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-sm shrink-0 font-mono'
                  style={{ backgroundColor: currentEws.tier.color }}
                >
                  {currentEws.score}
                </div>
                <div>
                  <h3 className='font-bold text-gray-900 text-sm flex items-center gap-2'>
                    คะแนนเตือนภัยล่วงหน้า (National Early Warning Score - EWS)
                  </h3>
                  <p className='text-xs font-semibold' style={{ color: currentEws.tier.color }}>
                    ระดับความเสี่ยง: {currentEws.tier.label}
                  </p>
                </div>
              </div>

              {/* Clinical Protocol Directive Alert */}
              <div className='w-full lg:w-auto max-w-lg shrink-0'>
                <Alert
                  type={currentEws.score >= 5 ? 'error' : currentEws.score >= 2 ? 'warning' : 'success'}
                  title='แนวทางปฏิบัติทางคลินิกตาม EWS Score:'
                  subtext={
                    currentEws.score >= 5
                      ? '🚨 ระดับวิกฤต (High Risk): พยาบาลเข้าประเมินทันที, รายงานแพทย์ผู้ดูแลด่วน, เตรียมเครื่อง Defibrillator / O2 High Flow, และพิจารณาส่งต่อห้องฉุกเฉิน (ER) หรือ ICU ด่วน!'
                      : currentEws.score >= 2
                      ? '⚠️ ระดับเฝ้าระวัง (Medium Risk): แจ้งพยาบาลหัวหน้าเวรและปรึกษาแพทย์, เพิ่มความถี่ในการวัดสัญญาณชีพเป็นทุก 30–60 นาที'
                      : '✅ ระดับปกติ (Low Risk): ผู้ป่วยสัญญาณชีพคงที่ เฝ้าสังเกตอาการตามปกติ วัด V/S ตามรอบ q 4 ชม.'
                  }
                  showCloseButton={false}
                />
              </div>
            </div>

            {/* Vital Signs Trend Charts (SVG Sparklines) */}
            <div className='space-y-3'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <h4 className='font-bold text-gray-800 text-xs flex items-center gap-1.5'>
                  <span className='material-symbols-outlined text-brand-600 text-base'>show_chart</span>
                  กราฟแนวโน้มสัญญาณชีพตามช่วงเวลา (Vital Signs Trend Visualizer)
                </h4>
                <TabBar align='end'>
                  {[
                    { key: 'bp', label: 'ความดัน (BP)' },
                    { key: 'pulse', label: 'ชีพจร (Pulse)' },
                    { key: 'spo2', label: 'SpO2' },
                    { key: 'temp', label: 'อุณหภูมิ' },
                    { key: 'rr', label: 'หายใจ (RR)' },
                  ].map((param) => (
                    <TabPill
                      key={param.key}
                      size='small'
                      selected={selectedTrendParam === param.key}
                      onClick={() => setSelectedTrendParam(param.key)}
                      role='tab'
                    >
                      {param.label}
                    </TabPill>
                  ))}
                </TabBar>
              </div>

              <VitalTrendChart data={patient.vitalsTrend} parameter={selectedTrendParam} height={160} />
            </div>
          </div>

          {/* Add Vital Form Card */}
          <div className='bg-white rounded-2xl p-5 border-none' style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}>
            <h3 className='font-bold text-gray-900 text-sm mb-4 flex items-center gap-2'>
              <span className='material-symbols-outlined text-brand-600'>add_chart</span>
              ลงบันทึกสัญญาณชีพประจำช่วงเวลา (Add Timed Vitals)
            </h3>

            <form onSubmit={handleAddVital} className='space-y-4 text-xs'>
              <div className='grid grid-cols-2 md:grid-cols-6 gap-3'>
                <InputField
                  label='BP Systolic (mmHg)'
                  type='number'
                  placeholder='120'
                  value={newVital.bpSys}
                  onChange={(val) => setNewVital({ ...newVital, bpSys: val })}
                  size='sm'
                  required
                />
                <InputField
                  label='BP Diastolic (mmHg)'
                  type='number'
                  placeholder='80'
                  value={newVital.bpDia}
                  onChange={(val) => setNewVital({ ...newVital, bpDia: val })}
                  size='sm'
                  required
                />
                <InputField
                  label='Pulse (bpm)'
                  type='number'
                  placeholder='80'
                  value={newVital.pulse}
                  onChange={(val) => setNewVital({ ...newVital, pulse: val })}
                  size='sm'
                  required
                />
                <InputField
                  label='Temp (°C)'
                  type='number'
                  step='0.1'
                  placeholder='36.6'
                  value={newVital.temp}
                  onChange={(val) => setNewVital({ ...newVital, temp: val })}
                  size='sm'
                  required
                />
                <InputField
                  label='SpO2 (%)'
                  type='number'
                  placeholder='98'
                  value={newVital.spo2}
                  onChange={(val) => setNewVital({ ...newVital, spo2: val })}
                  size='sm'
                  required
                />
                <InputField
                  label='RR (bpm)'
                  type='number'
                  placeholder='18'
                  value={newVital.rr}
                  onChange={(val) => setNewVital({ ...newVital, rr: val })}
                  size='sm'
                  required
                />
              </div>

              <div className='flex items-end gap-3'>
                <div className='flex-1'>
                  <InputField
                    placeholder='หมายเหตุ / อาการขณะวัด (เช่น หลังพ่นยา 15 นาที, หายใจเหนื่อยลดลง)'
                    value={newVital.note}
                    onChange={(val) => setNewVital({ ...newVital, note: val })}
                    size='sm'
                  />
                </div>
                <BrandPrimaryButton type='submit' leadingIcon='add' size='sm'>
                  บันทึก
                </BrandPrimaryButton>
              </div>
            </form>
          </div>

          {/* Timed Vitals History Table */}
          <div className='bg-white rounded-2xl border-none overflow-hidden' style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}>
            <div className='p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between'>
              <h3 className='font-bold text-gray-900 text-sm flex items-center gap-2'>
                <span className='material-symbols-outlined text-brand-600'>table_chart</span>
                ตารางบันทึกสัญญาณชีพตามเวลา (Timed Vital Signs Sheet)
              </h3>
              <span className='text-xs text-gray-500 font-medium'>บันทึกแล้ว {patient.vitalsTrend.length} รอบ</span>
            </div>

            <div className='overflow-x-auto'>
              <table className='w-full text-left text-xs border-collapse'>
                <thead>
                  <tr className='bg-gray-100/70 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider'>
                    <th className='py-3 px-4'>เวลาบันทึก</th>
                    <th className='py-3 px-4 text-center'>ความดันโลหิต (mmHg)</th>
                    <th className='py-3 px-4 text-center'>ชีพจร (bpm)</th>
                    <th className='py-3 px-4 text-center'>อุณหภูมิ (°C)</th>
                    <th className='py-3 px-4 text-center'>SpO2 (%)</th>
                    <th className='py-3 px-4 text-center'>RR (bpm)</th>
                    <th className='py-3 px-4 text-center'>EWS Score</th>
                    <th className='py-3 px-4'>หมายเหตุ / การประเมิน</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 text-gray-800 font-mono'>
                  {patient.vitalsTrend.map((log, idx) => {
                    const ewsRes = calculateEwsScore(log);
                    return (
                      <tr key={idx} className='hover:bg-brand-50/20 transition-colors'>
                        <td className='py-3 px-4 font-bold text-brand-800 font-sans'>{log.time}</td>
                        <td className='py-3 px-4 text-center font-bold text-gray-900'>
                          {log.bpSys}/{log.bpDia}
                        </td>
                        <td className='py-3 px-4 text-center font-bold text-brand-700'>{log.pulse}</td>
                        <td className='py-3 px-4 text-center font-bold text-amber-700'>{log.temp}</td>
                        <td className='py-3 px-4 text-center font-bold text-blue-700'>{log.spo2}%</td>
                        <td className='py-3 px-4 text-center font-bold text-gray-700'>{log.rr}</td>
                        <td className='py-3 px-4 text-center'>
                          <span
                            className='inline-block px-2.5 py-0.5 rounded font-bold text-xs shadow-2xs font-sans'
                            style={{ backgroundColor: ewsRes.tier.color + '20', color: ewsRes.tier.color }}
                          >
                            Score: {ewsRes.score}
                          </span>
                        </td>
                        <td className='py-3 px-4 font-sans text-gray-700'>{log.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: STAT / Urgent Orders */}
      {activeTab === 'orders' && (
        <div className='space-y-6'>
          {/* Add Stat Order Form */}
          <div className='bg-white rounded-2xl p-5 border-none' style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}>
            <h3 className='font-bold text-gray-900 text-sm mb-3 flex items-center gap-2'>
              <span className='material-symbols-outlined text-rose-600'>order_approve</span>
              เพิ่มคำสั่งการรักษาด่วน (Add STAT / Urgent Order)
            </h3>
            <form onSubmit={handleAddOrder} className='flex items-end gap-3 text-xs'>
              <div className='flex-1'>
                <InputField
                  placeholder='ระบุคำสั่งการรักษา STAT เช่น Berodual 1 respule Nebulizer Stat, Oxygen Cannula 3 LPM, IV NSS 1,000 ml'
                  value={newOrderText}
                  onChange={(val) => setNewOrderText(val)}
                  size='sm'
                  required
                />
              </div>
              <BrandPrimaryButton type='submit' leadingIcon='bolt' size='sm'>
                สั่งการ STAT
              </BrandPrimaryButton>
            </form>
          </div>

          {/* Orders List */}
          <div className='bg-white rounded-2xl border-none overflow-hidden' style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}>
            <div className='p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between'>
              <h3 className='font-bold text-gray-900 text-sm flex items-center gap-2'>
                <span className='material-symbols-outlined text-brand-600'>format_list_bulleted</span>
                รายการคำสั่งการรักษา & การพยาบาลด่วน (STAT Order List)
              </h3>
              <span className='text-xs text-gray-500 font-medium'>ทั้งหมด {patient.statOrders.length} รายการ</span>
            </div>

            <div className='divide-y divide-gray-100'>
              {patient.statOrders.map((ord) => (
                <div key={ord.id} className='p-4 hover:bg-gray-50/80 transition-colors flex items-center justify-between gap-4'>
                  <div className='flex items-start gap-3'>
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        ord.status === 'completed'
                          ? 'bg-brand-100 text-brand-800'
                          : ord.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800 animate-pulse'
                      }`}
                    >
                      <span className='material-symbols-outlined text-xl'>
                        {ord.status === 'completed' ? 'check_circle' : ord.status === 'in_progress' ? 'hourglass_top' : 'error'}
                      </span>
                    </span>

                    <div>
                      <div className='font-bold text-gray-900 text-sm mb-1'>{ord.orderText}</div>
                      <div className='flex flex-wrap items-center gap-3 text-xs text-gray-500 font-mono'>
                        <span>เวลาสั่งการ: <strong className='text-gray-800'>{ord.orderTime}</strong></span>
                        <span>•</span>
                        <span>ผู้ดำเนินการ: <strong className='text-brand-800 font-sans'>{ord.executedBy}</strong> ({ord.executedTime})</span>
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center gap-2 shrink-0'>
                    {ord.status === 'pending' && (
                      <BrandSubdueButton
                        leadingIcon='play_arrow'
                        size='sm'
                        onClick={() => handleUpdateOrderStatus(ord.id, 'in_progress')}
                      >
                        เริ่มดำเนินการ
                      </BrandSubdueButton>
                    )}
                    {ord.status === 'in_progress' && (
                      <BrandPrimaryButton
                        leadingIcon='check'
                        size='sm'
                        onClick={() => handleUpdateOrderStatus(ord.id, 'completed')}
                      >
                        เสร็จสิ้น
                      </BrandPrimaryButton>
                    )}
                    {ord.status === 'completed' && (
                      <span className='px-3 py-1 bg-brand-50 text-brand-800 rounded-md text-xs font-bold border border-brand-200/60'>
                        ดำเนินการแล้ว
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Nursing Focus Notes */}
      {activeTab === 'notes' && (
        <div className='space-y-6'>
          {/* Add Nursing Note */}
          <div className='bg-white rounded-2xl p-5 border-none' style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}>
            <h3 className='font-bold text-gray-900 text-sm mb-3 flex items-center gap-2'>
              <span className='material-symbols-outlined text-brand-600'>edit_note</span>
              บันทึกทางการพยาบาลเพิ่มเติม (Focus Nursing Log)
            </h3>
            <form onSubmit={handleAddNursingNote} className='space-y-3 text-xs'>
              <Textarea
                rows={3}
                placeholder='ระบุบันทึกทางการพยาบาล อาการเปลี่ยนแปลง การตอบสนองต่อการรักษา หรือการประเมินความเสี่ยง'
                value={newNursingNote}
                onChange={(val) => setNewNursingNote(val)}
                required
              />
              <div className='flex justify-end'>
                <BrandPrimaryButton type='submit' leadingIcon='save' size='sm'>
                  บันทึกโน้ตพยาบาล
                </BrandPrimaryButton>
              </div>
            </form>
          </div>

          {/* Nursing Notes Timeline */}
          <div className='bg-white rounded-2xl p-6 border-none' style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}>
            <h3 className='font-bold text-gray-900 text-sm mb-6 flex items-center gap-2 border-b border-gray-100 pb-3'>
              <span className='material-symbols-outlined text-brand-600'>history</span>
              ประวัติการบันทึกทางการพยาบาล (Nursing Activity Log)
            </h3>

            <div className='relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-brand-200'>
              {patient.nursingNotes.map((note, idx) => (
                <div key={idx} className='relative pl-4 group'>
                  <div className='absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-full bg-brand-600 border-2 border-white shadow-2xs group-hover:scale-125 transition-transform' />
                  <div className='flex items-center gap-3 text-xs mb-1 font-mono'>
                    <span className='font-bold text-brand-900 bg-brand-50 px-2 py-0.5 rounded border border-brand-200/60'>
                      {note.time}
                    </span>
                    <span className='text-gray-500 font-sans font-medium'>บันทึกโดย: {note.nurse}</span>
                  </div>
                  <div className='text-xs text-gray-800 bg-gray-50 p-3 rounded-xl border border-gray-100 font-medium leading-relaxed'>
                    {note.note}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Discharge Summary & Disposition */}
      {activeTab === 'discharge' && (
        <div className='bg-white rounded-2xl p-6 border-none' style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}>
          <h3 className='font-bold text-gray-900 text-sm mb-6 flex items-center gap-2 border-b border-gray-100 pb-3'>
            <span className='material-symbols-outlined text-brand-600'>output</span>
            แบบฟอร์มสรุปการจำหน่ายผู้ป่วย (Discharge Summary & Disposition)
          </h3>

          <form onSubmit={handleSaveDischarge} className='space-y-6 text-xs text-gray-700'>
            {/* Disposition Selector */}
            <div>
              <label className='block font-bold text-gray-800 mb-2'>1. สรุปประเภทการจำหน่าย (Discharge Disposition)</label>
              <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
                {[
                  { key: 'home', label: 'อนุญาตกลับบ้าน (Discharge Home)', icon: 'home', color: 'teal' },
                  { key: 'refer', label: 'ส่งต่อโรงพยาบาลใหญ่ (E-Referral)', icon: 'local_hospital', color: 'rose' },
                  { key: 'admit_ipd', label: 'ส่งเข้าตึกผู้ป่วยใน (Admit IPD)', icon: 'bed', color: 'amber' },
                  { key: 'opd', label: 'ส่งกลับตรวจ OPD ปกติ', icon: 'directions_walk', color: 'blue' },
                ].map((disp) => (
                  <label
                    key={disp.key}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2 ${
                      dischargeForm.disposition === disp.key
                        ? 'bg-brand-50 border-brand-600 ring-2 ring-brand-600/20 text-brand-900 font-bold'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type='radio'
                      name='disposition'
                      value={disp.key}
                      checked={dischargeForm.disposition === disp.key}
                      onChange={(e) => setDischargeForm({ ...dischargeForm, disposition: e.target.value })}
                      className='sr-only'
                    />
                    <span className='material-symbols-outlined text-2xl text-brand-700'>{disp.icon}</span>
                    <span className='text-xs leading-snug'>{disp.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Refer Hospital Selector if refer */}
            {dischargeForm.disposition === 'refer' && (
              <div className='p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-3 animate-fade-in'>
                <Select
                  label='โรงพยาบาลรับส่งต่อ (Destination Referral Hospital):'
                  value={dischargeForm.referHospital}
                  onChange={(val) => setDischargeForm({ ...dischargeForm, referHospital: val })}
                  options={[
                    '-- เลือกโรงพยาบาลส่งต่อ --',
                    'โรงพยาบาลตากสิน',
                    'โรงพยาบาลเจริญกรุงประชารักษ์',
                    'โรงพยาบาลกลาง',
                    'โรงพยาบาลศิริราช'
                  ]}
                  size='sm'
                />
              </div>
            )}

            {/* Doctor Discharge Note */}
            <Textarea
              label='2. สรุปความเห็นแพทย์ (Doctor Discharge Note)'
              rows={3}
              value={dischargeForm.doctorSummary}
              onChange={(val) => setDischargeForm({ ...dischargeForm, doctorSummary: val })}
              placeholder='ระบุสรุปการรักษา ผลการติดตาม และเหตุผลในการจำหน่าย...'
              required
            />

            {/* Discharge Advice */}
            <Textarea
              label='คำแนะนำและข้อควรระวังเมื่อจำหน่าย (Discharge Instructions)'
              rows={3}
              placeholder='ระบุคำแนะนำการรับประทานยา การดูแลตนเองที่บ้าน หรือสัญญาณอันตรายที่ต้องกลับมาพบแพทย์'
              value={dischargeForm.dischargeAdvice}
              onChange={(val) => setDischargeForm({ ...dischargeForm, dischargeAdvice: val })}
            />

            {/* Checkbox Complete */}
            <div className='p-4 bg-brand-50/60 rounded-xl border border-brand-100 flex items-center gap-3'>
              <input
                type='checkbox'
                id='isDischargedCheck'
                checked={dischargeForm.isDischarged}
                onChange={(e) => setDischargeForm({ ...dischargeForm, isDischarged: e.target.checked })}
                className='w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer'
              />
              <label htmlFor='isDischargedCheck' className='font-bold text-brand-900 cursor-pointer text-xs'>
                ยืนยันการจำหน่ายผู้ป่วยออกจากเตียงสังเกตอาการ (Discharge & Release Bed)
              </label>
            </div>

            {/* Action Bar */}
            <div className='pt-4 border-t border-gray-100 flex items-center justify-between'>
              <NeutralSubdueButton
                type='button'
                onClick={() => history.push('/observation')}
              >
                ยกเลิก
              </NeutralSubdueButton>
              <BrandPrimaryButton
                type='submit'
                leadingIcon='check_circle'
              >
                บันทึกการสรุปจำหน่าย
              </BrandPrimaryButton>
            </div>
          </form>
        </div>
      )}
      </div>
    </QueuePageShell>
  );
}
