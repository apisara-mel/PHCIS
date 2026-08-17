import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import BrandButton from '@/components/button/BrandButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import StatusBadge from '@/components/badge/StatusBadge';
import { QUESTIONNAIRE_MODULES, QUESTIONNAIRE_META, QUESTIONNAIRE_TOTAL } from '@/data/questionnaire';
import QUESTIONNAIRE_NAV from '@/pages/questionnaire/questionnaireNav';
import ProgressBar from '@/pages/questionnaire/ProgressBar';
import {
  useQuestionnaireStore, tally, moduleItems, exportCsv, exportJson, importState, clearAll,
} from '@/pages/questionnaire/questionnaireStore';

/* ภาพรวมการสัมภาษณ์ — แทนชีต 0_Overview_Tracker ของไฟล์ Excel ต้นทาง
   บอกว่าโมดูลไหนตอบไปเท่าไร เหลืออะไร และเป็นจุดส่งออก/สำรองข้อมูลของทั้งชุด */

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
};

const LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
};
const VALUE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.6,
};
const TITLE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  lineHeight: 1.5,
};

const MetaRow = ({ label, value }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)', minWidth: 'min(100%, 220px)', flex: '1 1 220px' }}>
    <span style={LABEL}>{label}</span>
    <span style={VALUE}>{value}</span>
  </div>
);

const QuestionnaireOverviewPage = () => {
  const history = useHistory();
  const snapshot = useQuestionnaireStore();
  const fileRef = useRef(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const rows = useMemo(() => QUESTIONNAIRE_MODULES.map((m) => ({
    mod: m,
    stats: tally(moduleItems(m), snapshot.answers),
    session: snapshot.session[m.key] || {},
  })), [snapshot]);

  const overall = useMemo(() => {
    const all = QUESTIONNAIRE_MODULES.flatMap((m) => moduleItems(m));
    return tally(all, snapshot.answers);
  }, [snapshot.answers]);

  const handleImport = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importState(String(reader.result));
        setNotice('นำเข้าไฟล์สำรองเรียบร้อย');
      } catch (err) {
        setNotice('ไฟล์ไม่ถูกต้อง — ต้องเป็นไฟล์ JSON ที่ส่งออกจากหน้านี้');
      }
      setTimeout(() => setNotice(''), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const summaryCards = [
    { key: 'total',    icon: 'help',           color: 'info',     value: String(QUESTIONNAIRE_TOTAL), label: 'คำถามทั้งหมด' },
    { key: 'answered', icon: 'task_alt',       color: 'positive', value: String(overall.answered),    label: 'ตอบแล้ว' },
    { key: 'followup', icon: 'flag',           value: String(overall.followup), label: 'ต้องติดตาม',
      tileBg: 'var(--surface-statusbadge-warning)', iconInk: 'var(--text-statusbadge-warning)' },
    { key: 'pending',  icon: 'pending_actions', value: String(overall.pending),  label: 'ยังไม่ได้ถาม',
      tileBg: 'var(--surface-neutral-tertiary)', iconInk: 'var(--text-neutral-default)' },
  ];

  return (
    <QueuePageShell
      activeKey='q-overview'
      sidebarItems={QUESTIONNAIRE_NAV}
      sidebarFallbackKey='q-overview'
      sidebarWrapLabels
      brandTitle='แบบสัมภาษณ์ลูกค้า'
      breadcrumb={['แบบสัมภาษณ์ลูกค้า', 'ภาพรวมการสัมภาษณ์']}
      title='ภาพรวมการสัมภาษณ์'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <BrandButton variant='ghost' size='sm' leadingIcon='upload' onClick={() => fileRef.current && fileRef.current.click()}>
            นำเข้าไฟล์สำรอง
          </BrandButton>
          <BrandButton variant='outline' size='sm' leadingIcon='save' onClick={() => exportJson(snapshot)}>
            สำรองข้อมูล (JSON)
          </BrandButton>
          <BrandButton variant='fill' size='sm' leadingIcon='download' onClick={() => exportCsv(QUESTIONNAIRE_MODULES, snapshot, 'all')}>
            ส่งออก CSV ทั้งหมด
          </BrandButton>
        </div>
      )}
      summaryCards={summaryCards}
    >
      <input ref={fileRef} type='file' accept='application/json,.json' onChange={handleImport} style={{ display: 'none' }} />

      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-400)',
          paddingRight: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-800)',
          paddingLeft: 'var(--dim-space-600)',
          gap: 'var(--dim-space-400)',
        }}
      >
        {notice && (
          <div
            style={{
              ...CARD,
              background: 'var(--surface-brandPrimary-quaternary)',
              paddingTop: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-400)',
              paddingBottom: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-400)',
              color: 'var(--text-brandPrimary-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            {notice}
          </div>
        )}

        {/* ข้อมูลโครงการ (จากหัวไฟล์ Excel ต้นทาง) */}
        <section
          className='flex flex-col w-full'
          style={{
            ...CARD,
            paddingTop: 'var(--dim-space-500)',
            paddingRight: 'var(--dim-space-500)',
            paddingBottom: 'var(--dim-space-500)',
            paddingLeft: 'var(--dim-space-500)',
            gap: 'var(--dim-space-400)',
          }}
        >
          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <h2 style={{ ...TITLE, margin: 0, flex: 1 }}>{QUESTIONNAIRE_META.project}</h2>
            <StatusBadge style='info' size='small'>{QUESTIONNAIRE_META.version}</StatusBadge>
          </div>
          <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <MetaRow label='ลูกค้า / Owner' value={QUESTIONNAIRE_META.owner} />
            <MetaRow label='ผู้จัดทำ / Vendor' value={QUESTIONNAIRE_META.vendor} />
            <MetaRow label='วันที่จัดทำ' value={QUESTIONNAIRE_META.createdDate} />
            <MetaRow label='ไฟล์ต้นทาง' value={QUESTIONNAIRE_META.source} />
          </div>
          <ProgressBar stats={overall} />
          <span style={LABEL}>
            คำตอบทั้งหมดถูกบันทึกไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น (ไม่ส่งขึ้นเซิร์ฟเวอร์) —
            กด “สำรองข้อมูล (JSON)” ก่อนเปลี่ยนเครื่องหรือล้างแคช และกด “ส่งออก CSV ทั้งหมด” เพื่อเปิดต่อใน Excel
          </span>
        </section>

        {/* รายโมดูล */}
        <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <h2 style={{ ...TITLE, margin: 0 }}>ความคืบหน้ารายโมดูล</h2>
          {rows.map(({ mod, stats, session }) => (
            <button
              key={mod.key}
              type='button'
              onClick={() => history.push(`/questionnaire/${mod.key}`)}
              className='flex flex-col w-full text-left'
              style={{
                ...CARD,
                borderRadius: 'var(--dim-radius-400)',
                paddingTop: 'var(--dim-space-400)',
                paddingRight: 'var(--dim-space-400)',
                paddingBottom: 'var(--dim-space-400)',
                paddingLeft: 'var(--dim-space-400)',
                gap: 'var(--dim-space-300)',
                cursor: 'pointer',
              }}
            >
              <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <span
                  className='material-symbols-outlined'
                  style={{ fontFamily: 'Material Symbols Outlined', fontSize: 20, color: 'var(--text-brandPrimary-default)', lineHeight: 1 }}
                  aria-hidden
                >
                  {mod.icon}
                </span>
                <span style={{ ...TITLE, flex: 1, minWidth: 'min(100%, 200px)' }}>{mod.label}</span>
                <span style={LABEL}>{stats.total} ข้อ</span>
                <StatusBadge
                  style={stats.percent === 100 ? 'success' : stats.done > 0 ? 'yellow' : 'neutral'}
                  size='small'
                  showDot
                >
                  {stats.percent === 100
                    ? 'สัมภาษณ์ครบแล้ว'
                    : stats.done > 0
                      ? `กำลังสัมภาษณ์ ${stats.done}/${stats.total}`
                      : 'รอคำตอบจากลูกค้า'}
                </StatusBadge>
              </div>
              <ProgressBar stats={stats} compact />
              <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
                <span style={LABEL}>ตอบแล้ว {stats.answered} · ต้องติดตาม {stats.followup} · เหลือ {stats.pending}</span>
                {session.interviewDate && (
                  <span style={LABEL}>สัมภาษณ์ {new Date(session.interviewDate).toLocaleDateString('th-TH')}</span>
                )}
                {session.respondent && <span style={LABEL}>ผู้ตอบ {session.respondent}</span>}
              </div>
            </button>
          ))}
        </section>

        {/* เขตอันตราย */}
        <section className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
          {confirmClear ? (
            <>
              <span style={{ ...VALUE, color: 'var(--text-danger-default)' }}>
                ล้างคำตอบทั้งหมด {overall.answered + overall.followup} รายการ? กู้คืนไม่ได้
              </span>
              <DangerSubdueButton size='sm' onClick={() => { clearAll(); setConfirmClear(false); }}>
                ยืนยันล้างข้อมูล
              </DangerSubdueButton>
              <BrandButton variant='ghost' size='sm' onClick={() => setConfirmClear(false)}>ยกเลิก</BrandButton>
            </>
          ) : (
            <DangerSubdueButton size='sm' leadingIcon='delete' onClick={() => setConfirmClear(true)}>
              ล้างคำตอบทั้งหมด
            </DangerSubdueButton>
          )}
        </section>
      </div>
    </QueuePageShell>
  );
};

export default QuestionnaireOverviewPage;
