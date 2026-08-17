import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Redirect } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import SecondarySearch from '@/components/search/SecondarySearch';
import BrandButton from '@/components/button/BrandButton';
import InputField from '@/components/forms/InputField';
import DatePicker from '@/components/forms/DatePicker';
import { QUESTIONNAIRE_MODULES } from '@/data/questionnaire';
import QUESTIONNAIRE_NAV from '@/pages/questionnaire/questionnaireNav';
import QuestionCard from '@/pages/questionnaire/QuestionCard';
import ProgressBar from '@/pages/questionnaire/ProgressBar';
import {
  useQuestionnaireStore, setSession, resolveStatus, tally, moduleItems, exportCsv,
} from '@/pages/questionnaire/questionnaireStore';

/* หน้าตอบคำถามรายโมดูล — ผู้สัมภาษณ์เปิดค้างไว้ระหว่างประชุมกับสำนักอนามัย
   แล้วพิมพ์คำตอบลงไปทีละข้อ ระบบบันทึกอัตโนมัติลง localStorage
   (ดู questionnaireStore.js) และส่งออกเป็น CSV กลับเข้าไฟล์ Excel ต้นทางได้ */

const SECTION_TITLE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  lineHeight: 1.5,
};

const HINT = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
};

const FILTERS = [
  { key: 'all',      label: 'ทั้งหมด' },
  { key: 'pending',  label: 'รอคำตอบ' },
  { key: 'answered', label: 'ตอบแล้ว' },
  { key: 'followup', label: 'ต้องติดตาม' },
];

const parseDate = (iso) => (iso ? new Date(iso) : null);

const QuestionnaireModulePage = () => {
  const { moduleKey } = useParams();
  const snapshot = useQuestionnaireStore();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  /* เปลี่ยนโมดูลแล้วต้องเริ่มอ่านจากข้อแรก — router v5 ไม่รีเซ็ต scroll ให้ */
  useEffect(() => { window.scrollTo(0, 0); setFilter('all'); setQuery(''); }, [moduleKey]);

  const mod = QUESTIONNAIRE_MODULES.find((m) => m.key === moduleKey);
  const items = useMemo(() => moduleItems(mod), [mod]);
  const stats = useMemo(() => tally(items, snapshot.answers), [items, snapshot.answers]);

  const counts = useMemo(() => ({
    all: stats.total, pending: stats.pending, answered: stats.answered, followup: stats.followup,
  }), [stats]);

  const needle = query.trim().toLowerCase();
  const sections = useMemo(() => {
    if (!mod) return [];
    return mod.sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((it) => {
          const st = resolveStatus(snapshot.answers[it.id]);
          if (filter !== 'all' && st !== filter) return false;
          if (!needle) return true;
          const entry = snapshot.answers[it.id] || {};
          return `${it.no} ${it.topic} ${it.question} ${it.types.join(' ')} ${entry.answer || ''} ${entry.note || ''}`
            .toLowerCase().includes(needle);
        }),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [mod, snapshot.answers, filter, needle]);

  if (!mod) return <Redirect to='/questionnaire' />;

  const ses = snapshot.session[mod.key] || {};
  const shown = sections.reduce((n, s) => n + s.items.length, 0);

  const jumpToNextPending = () => {
    const next = items.find((it) => resolveStatus(snapshot.answers[it.id]) === 'pending');
    if (!next) return;
    if (filter !== 'all' && filter !== 'pending') setFilter('all');
    setQuery('');
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`q-${next.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  return (
    <QueuePageShell
      activeKey={`q-${mod.key}`}
      sidebarItems={QUESTIONNAIRE_NAV}
      sidebarFallbackKey='q-overview'
      sidebarWrapLabels
      brandTitle='แบบสัมภาษณ์ลูกค้า'
      breadcrumb={['แบบสัมภาษณ์ลูกค้า', mod.label]}
      title={mod.label}
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <BrandButton
            variant='ghost'
            size='sm'
            leadingIcon='arrow_downward'
            onClick={jumpToNextPending}
            disabled={stats.pending === 0}
          >
            ข้อที่ยังไม่ตอบ
          </BrandButton>
          <BrandButton
            variant='outline'
            size='sm'
            leadingIcon='download'
            onClick={() => exportCsv([mod], snapshot, mod.key)}
          >
            ส่งออก CSV
          </BrandButton>
        </div>
      )}
      headerInfo={(
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <ProgressBar stats={stats} />
          <div className='flex items-end flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <div style={{ flex: '1 1 180px', minWidth: 'min(100%, 180px)' }}>
              <DatePicker
                label='สัมภาษณ์วันที่'
                size='md'
                showHelperText={false}
                value={parseDate(ses.interviewDate)}
                onChange={(d) => setSession(mod.key, { interviewDate: d ? d.toISOString() : '' })}
              />
            </div>
            <div style={{ flex: '1 1 200px', minWidth: 'min(100%, 200px)' }}>
              <InputField
                label='ผู้สัมภาษณ์'
                size='md'
                showHelperText={false}
                showLeadingIcon={false}
                placeholder='ชื่อ BA / SA'
                value={ses.interviewer || ''}
                onChange={(v) => setSession(mod.key, { interviewer: v })}
              />
            </div>
            <div style={{ flex: '1 1 200px', minWidth: 'min(100%, 200px)' }}>
              <InputField
                label='ผู้ตอบ (ลูกค้า)'
                size='md'
                showHelperText={false}
                showLeadingIcon={false}
                placeholder='ชื่อ / ตำแหน่ง ฝั่งสำนักอนามัย'
                value={ses.respondent || ''}
                onChange={(v) => setSession(mod.key, { respondent: v })}
              />
            </div>
          </div>
        </div>
      )}
      tabs={FILTERS.map((f) => ({ key: f.key, label: `${f.label} (${counts[f.key]})` }))}
      activeTab={filter}
      onTabChange={setFilter}
    >
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
        <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <div style={{ flex: '1 1 320px', minWidth: 'min(100%, 280px)' }}>
            <SecondarySearch
              fullWidth
              value={query}
              onChange={setQuery}
              placeholder='ค้นหาคำถาม หัวข้อ หรือคำตอบที่บันทึกไว้'
            />
          </div>
          <span style={HINT}>
            แสดง {shown} จาก {stats.total} ข้อ · บันทึกอัตโนมัติในเครื่องนี้
          </span>
        </div>

        {sections.length === 0 ? (
          <div
            className='flex flex-col items-center justify-center w-full'
            style={{
              background: 'var(--surface-card-100)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              borderRadius: 'var(--dim-radius-400)',
              paddingTop: 'var(--dim-space-800)',
              paddingBottom: 'var(--dim-space-800)',
              gap: 'var(--dim-space-200)',
            }}
          >
            <span style={{ ...SECTION_TITLE }}>ไม่พบคำถามที่ตรงกับเงื่อนไข</span>
            <span style={HINT}>ลองล้างคำค้น หรือเปลี่ยนตัวกรองด้านบน</span>
          </div>
        ) : sections.map((sec, si) => (
          /* หัวข้อหมวดในไฟล์ต้นทางซ้ำกันได้ (เช่น "งานทันตกรรม" โผล่ 2 หมวด) — key ต้องมี index */
          <section key={`${si}-${sec.title}`} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='flex items-baseline w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <h2 style={{ ...SECTION_TITLE, margin: 0 }}>{sec.title}</h2>
              <span style={HINT}>{sec.items.length} ข้อ</span>
            </div>
            {sec.items.map((it, i) => (
              <QuestionCard key={it.id} item={it} entry={snapshot.answers[it.id]} index={i} />
            ))}
          </section>
        ))}
      </div>
    </QueuePageShell>
  );
};

export default QuestionnaireModulePage;
