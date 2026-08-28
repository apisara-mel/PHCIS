import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import Table, { EllipsisText as TableEllipsisText } from '@/components/table/Table';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import { FilterDropdown } from '@/components/forms/FilterTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import Popup from '@/components/popup/Popup';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import DutyRosterAction from '@/components/patient/DutyRosterAction';
import { withEmrRowAction, EmrRowAction } from '@/components/patient/EmrRowAction';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import { getPatientByHN } from '@/data/patientProfiles';
import { CURRENT_CLINICIAN } from '@/data/treatmentAudit';
import {
  TREAT_CLINICS, TRIAGE_LEVELS, CASE_STATUS,
  clinicLabel, clinicShortLabel, comparePoolRows, groupRowsByClinic,
  getUnassignedRows, claimCase, releaseCase, subscribeUnassignedPool,
} from '@/data/unassignedWorklist';

/* MIH UnassignedWorklistPage — "คิวรวมรอรับเคส" (/treat/unassigned)
   ══════════════════════════════════════════════════════════════════════════
   ศูนย์บริการสาธารณสุขบางแห่งไม่ให้พยาบาลที่จุดคัดกรองเลือกแพทย์ผู้รักษา
   พยาบาลเลือก "ไม่ระบุแพทย์" แล้วเคสมากองรวมกันที่หน้านี้ ให้แพทย์ที่ว่างหยิบเอง
   (มติผู้ใช้ 28 ส.ค. 69)

   ทำไมเป็นเมนูแยก ไม่ใช่แท็บในคิวตรวจรักษา
     เมนูอื่นใต้ "บันทึกการรักษา" แตกตามคลินิก แต่กองกลางนี้ตั้งใจ *ไม่* แยก
     คลินิก — คุณค่าทั้งหมดของมันคือเห็นเคสของทุกคลินิกพร้อมกันในที่เดียว
     ถ้าไปเป็นแท็บใต้คลินิกใดคลินิกหนึ่ง เคสของคลินิกอื่นจะมองไม่เห็น

   สองมุมมองตามที่ลูกค้าสั่ง
     • worklist  — ตารางเดียวเรียงลงมา มีคอลัมน์ "คลินิก" บอกปลายทาง
     • แยกตามคลินิก — ตารางย่อยต่อคลินิก สำหรับแพทย์ที่ดูเฉพาะคลินิกของตัวเอง
   ทั้งสองใช้ชุดคอลัมน์เดียวกัน ต่างกันแค่คอลัมน์คลินิกที่ในมุมมองกลุ่มย้ายขึ้นไป
   เป็นหัวกลุ่มแล้ว จึงไม่ต้องซ้ำในทุกแถว */

const breadcrumb = ['บันทึกการรักษา', 'คิวรวมรอรับเคส'];
const SUMMARY_TITLE = 'คิวรวมรอรับเคส';
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:treat-unassigned';

/* ป้ายมุมมอง — ใช้ TabBar + TabPill แบบมีข้อความ (ชุดเดียวกับที่ ViewToggle
   ประกอบขึ้น) ไม่ใช่ ViewToggle ที่เป็นไอคอนล้วน เพราะ "เรียงลงมา" กับ
   "แยกตามคลินิก" ไม่มีไอคอนที่คนอ่านแล้วเดาถูกโดยไม่ต้อง hover */
const VIEW_MODES = [
  { key: 'list',   label: 'ดูแบบ worklist' },
  { key: 'clinic', label: 'ดูแยกตามคลินิก' },
];

const TABS = [
  { key: 'pool', label: 'รอรับเคส',    icon: 'pending_actions' },
  { key: 'mine', label: 'เคสของฉัน',   icon: 'assignment_ind'  },
  { key: 'all',  label: 'ทั้งหมด',      icon: 'group'           },
];

const FILTER_DEFAULTS = { clinic: 'all', esi: 'all' };

const CLINIC_FILTER_OPTIONS = [
  { value: 'all', label: 'ทุกคลินิก' },
  ...TREAT_CLINICS.map((c) => ({ value: c.key, label: c.label })),
];

const ESI_FILTER_OPTIONS = [
  { value: 'all', label: 'ทุกระดับ' },
  ...Object.entries(TRIAGE_LEVELS).map(([value, t]) => ({ value, label: t.label })),
];

const PatientAvatar = ({ row }) => {
  const [imgError, setImgError] = useState(false);
  const src = row.avatarUrl || getPatientByHN(row.hn)?.avatarUrl;
  return (
    <div
      className='shrink-0 flex items-center justify-center text-white overflow-hidden'
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'var(--surface-neutral-tertiary, #9AA1A8)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: 1,
      }}
      aria-hidden
    >
      {src && !imgError ? (
        <img
          src={src}
          alt=''
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (row.name || '?').trim().charAt(0)}
    </div>
  );
};

/* Vitals ที่พยาบาลวัดไว้ — แพทย์ใช้ตัดสินว่าจะหยิบเคสไหนก่อน จึงต้องอยู่ในตาราง
   ไม่ใช่ต้องเปิดเข้าไปดูทีละคน */
const VitalsCell = ({ vitals }) => {
  if (!vitals) return null;
  const rowStyle = {
    display: 'flex',
    gap: 'var(--dim-space-200)',
    alignItems: 'baseline',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-xs)',
    fontWeight: 'var(--type-weight-medium)',
    lineHeight: 1.5,
  };
  const labelStyle = { color: 'var(--text-neutral-tertiary, #ADB2B7)' };
  return (
    <div className='flex flex-col'>
      <div style={rowStyle}>
        <span style={labelStyle}>BP</span>
        <span style={{ color: 'var(--text-content-default)' }}>{vitals.bp}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>PR</span>
        <span style={{ color: 'var(--text-content-default)' }}>{vitals.pr}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>O₂</span>
        <span style={{ color: 'var(--text-content-default)' }}>{vitals.spo2}</span>
      </div>
    </div>
  );
};

/* ── มุมมอง "แยกตามคลินิก" — บอร์ดคอลัมน์แนวนอน ────────────────────────────
   ตารางซ้อนกันลงมาต่อคลินิกทำให้ต้อง scroll ยาวมากกว่าจะเห็นคลินิกที่สอง และ
   หัวตารางซ้ำทุกกลุ่มก็กินที่เปล่า ๆ คอลัมน์แนวนอนอ่านทั้งกระดานได้ในสายตาเดียว
   ว่าคลินิกไหนเคสค้างเยอะ (มติผู้ใช้ 28 ส.ค. 69)

   หลักการออกแบบให้ดูง่าย
     • คอลัมน์กว้างคงที่ พื้นหลังจาง — การ์ดสีขาวจึงเด้งออกมาเป็นหน่วยที่นับได้
     • หัวคอลัมน์เกาะอยู่กับที่เวลาเลื่อนในแนวตั้ง จะได้ไม่หลงว่ากำลังดูคลินิกไหน
     • แถบสีซ้ายการ์ดตามระดับคัดแยก — เคสเร่งด่วนหาเจอโดยไม่ต้องอ่านตัวอักษร
     • ข้อมูลในการ์ดเรียงตามลำดับที่แพทย์ใช้ตัดสินใจจริง: ด่วนแค่ไหน → ใคร →
       มาด้วยอาการอะไร → สัญญาณชีพ → ปุ่มรับเคส */

const COLUMN_WIDTH = 320;

/* สีแถบซ้ายของการ์ดตามระดับ ESI — bold ของ ColorfulBadge ชุดเดียวกับป้ายในการ์ด
   จึงเป็นสีเดียวกันทั้งใบ ไม่ใช่จานสีใหม่ */
const ESI_ACCENT = {
  red:    'var(--surface-colorfulbadge-red-bold, #EF4444)',
  orange: 'var(--surface-colorfulbadge-orange-bold, #F97316)',
  blue:   'var(--surface-colorfulbadge-blue-bold, #3B82F6)',
  grey:   'var(--surface-colorfulbadge-grey-bold, #858C92)',
};

const CaseCard = ({ row, renderActions }) => {
  const triage = TRIAGE_LEVELS[row.esi];
  return (
    <div
      className='flex w-full overflow-hidden'
      style={{
        background: 'var(--surface-card-100)',
        borderRadius: 'var(--dim-radius-300)',
        border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* แถบระดับคัดแยก — กว้าง 4px พอให้เห็นจากมุมตา ไม่แย่งความสนใจจากเนื้อหา */}
      <span
        aria-hidden
        style={{
          width: 4,
          flexShrink: 0,
          background: ESI_ACCENT[triage?.badge] ?? ESI_ACCENT.grey,
        }}
      />
      <div
        className='flex flex-col min-w-0 flex-1'
        style={{
          padding: 'var(--dim-space-400)',
          gap: 'var(--dim-space-300)',
        }}
      >
        <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug'>{row.queue}</ColorfulBadge>
          {triage && (
            <ColorfulBadge style={triage.badge} size='small' hierarchy='secondary' width='hug'>
              {`ESI ${row.esi}`}
            </ColorfulBadge>
          )}
          <div className='flex-1' />
          <span style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            color: 'var(--text-content-tertiary)',
            whiteSpace: 'nowrap',
          }}
          >
            {`รอ ${row.waitMinutes} นาที`}
          </span>
        </div>

        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
          <PatientAvatar row={row} />
          <div className='flex flex-col min-w-0'>
            <MaskedWorklistName name={row.name} recordKey={row.hn || row.queue} />
            <span style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              color: 'var(--text-content-tertiary)',
            }}
            >
              {`HN ${row.hn} · คัดกรอง ${row.screenedAt}`}
            </span>
          </div>
        </div>

        {/* อาการสำคัญ — ตัดที่สองบรรทัด ยาวกว่านั้นการ์ดจะสูงไม่เท่ากันจนกระดาน
            อ่านยาก ตัวเต็มอยู่ใน title ให้ hover อ่านได้ */}
        <span
          title={row.cc}
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            color: 'var(--text-content-secondary)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {row.cc}
        </span>

        {row.vitals && (
          <div
            className='flex items-center flex-wrap'
            style={{
              gap: 'var(--dim-space-300)',
              paddingTop: 'var(--dim-space-200)',
              borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
            }}
          >
            {[['BP', row.vitals.bp], ['PR', row.vitals.pr], ['O₂', row.vitals.spo2]].map(([label, value]) => (
              <span key={label} className='inline-flex items-baseline' style={{ gap: 'var(--dim-space-150)' }}>
                <span style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                  color: 'var(--text-neutral-tertiary, #ADB2B7)',
                }}
                >
                  {label}
                </span>
                <span style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                  fontWeight: 'var(--type-weight-medium)',
                  color: 'var(--text-content-default)',
                }}
                >
                  {value}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* ปุ่ม EMR อยู่ในการ์ดของบอร์ดด้วย (มติผู้ใช้ 29 ส.ค. 69) — มุมมอง
            worklist มีปุ่มนี้ในคอลัมน์การดำเนินการอยู่แล้ว การ์ดในบอร์ดคือ
            แถวเดียวกันในอีกรูปทรง จึงต้องทำได้เท่ากัน ไม่งั้นสลับมุมมองแล้ว
            ความสามารถหาย */}
        <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-150)' }}>
          <EmrRowAction hn={row.hn} name={row.name} />
          {renderActions(row)}
        </div>
      </div>
    </div>
  );
};

const ClinicBoard = ({ groups, emptyMessage, renderActions }) => {
  if (groups.length === 0) {
    return (
      <div
        className='flex items-center justify-center w-full'
        style={{
          padding: 'var(--dim-space-1200)',
          background: 'var(--surface-card-200)',
          borderRadius: 'var(--dim-radius-300)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          color: 'var(--text-content-tertiary)',
        }}
      >
        {emptyMessage}
      </div>
    );
  }
  return (
    /* เลื่อนซ้ายขวาในกล่องของตัวเอง — หน้าเว็บทั้งหน้าต้องไม่เลื่อนแนวนอนตาม */
    <div
      className='w-full'
      style={{ overflowX: 'auto', paddingBottom: 'var(--dim-space-300)' }}
    >
      <div className='flex items-start' style={{ gap: 'var(--dim-space-400)' }}>
        {groups.map(({ clinic, rows }) => (
          <div
            key={clinic.key}
            className='flex flex-col shrink-0'
            style={{
              width: COLUMN_WIDTH,
              /* พื้นคอลัมน์เป็นสีแบรนด์จาง — การ์ดขาวจึงเด้งเป็นหน่วยที่นับได้
                 ชัดกว่าพื้นเทาเกือบขาวที่แทบแยกไม่ออกจากพื้นการ์ด */
              background: 'var(--surface-brandPrimary-quaternary)',
              borderRadius: 'var(--dim-radius-500)',
              border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
              padding: 'var(--dim-space-300)',
              gap: 'var(--dim-space-300)',
            }}
          >
            <div
              className='flex items-start w-full'
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                gap: 'var(--dim-space-200)',
                background: 'var(--surface-brandPrimary-quaternary)',
                /* สูงคงที่ — ชื่อคลินิกยาวสองบรรทัด (NCD) ไม่งั้นจะดันการ์ดใบแรก
                   ของคอลัมน์นั้นลงไปคนละระดับกับคอลัมน์อื่น กระดานอ่านยากทันที */
                minHeight: 56,
                paddingTop: 'var(--dim-space-200)',
                paddingRight: 'var(--dim-space-200)',
                paddingBottom: 'var(--dim-space-200)',
                paddingLeft: 'var(--dim-space-200)',
              }}
            >
              <span
                className='flex-1 min-w-0'
                style={{
                  fontFamily: 'var(--type-family-heading-content)',
                  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                  fontSize: 'var(--type-size-sm)',
                  color: 'var(--text-brandPrimary-default)',
                }}
              >
                {clinic.label}
              </span>
              <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug'>
                {rows.length}
              </ColorfulBadge>
            </div>

            {rows.map((row) => (
              <CaseCard key={row.id} row={row} renderActions={renderActions} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const UnassignedWorklistPage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('pool');
  const [viewMode, setViewMode] = useState('list');
  const [searchQ, setSearchQ] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [toast, setToast] = useState('');
  /* เคสที่รอการยืนยันรับ — เก็บทั้งแถวไว้ ไม่ใช่แค่ id เพราะข้อความยืนยันต้อง
     อ่านชื่อ คลินิก และระดับคัดแยกออกมาให้แพทย์ทวนก่อนกด */
  const [claimTarget, setClaimTarget] = useState(null);

  /* store เดียวกับที่จุดคัดกรองเขียน — subscribe ไว้ เคสที่พยาบาลเพิ่งส่งเข้ามา
     จึงโผล่เองโดยไม่ต้องรีเฟรช และเคสที่เพิ่งถูกหยิบก็หายจากกองกลางทันที */
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeUnassignedPool(() => setTick((t) => t + 1)), []);
  const allRows = useMemo(
    () => getUnassignedRows(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY);

  const setFilter = (key) => (val) => setFilters((f) => ({ ...f, [key]: val }));
  const filtersActive = filters.clinic !== FILTER_DEFAULTS.clinic
    || filters.esi !== FILTER_DEFAULTS.esi
    || searchQ.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => { setFilters(FILTER_DEFAULTS); setSearchQ(''); },
  );

  const poolRows = useMemo(() => allRows.filter((r) => !r.doctor), [allRows]);
  const myRows = useMemo(
    () => allRows.filter((r) => r.doctor === CURRENT_CLINICIAN.name),
    [allRows],
  );

  const summaryCards = useMemo(() => {
    const urgent = poolRows.filter((r) => r.esi <= 3).length;
    const clinics = new Set(poolRows.map((r) => r.clinicKey)).size;
    const longest = poolRows.reduce((max, r) => Math.max(max, r.waitMinutes ?? 0), 0);
    return [
      { key: 'pool',    label: 'รอแพทย์รับเคส',   value: poolRows.length, color: 'inprogress', icon: 'pending_actions' },
      { key: 'urgent',  label: 'เร่งด่วน (ESI 1–3)', value: urgent,        color: 'destructive', icon: 'priority_high'   },
      { key: 'clinics', label: 'คลินิกที่มีเคสรอ',  value: clinics,        color: 'info',        icon: 'apartment'       },
      { key: 'mine',    label: 'เคสที่ฉันรับไว้',   value: myRows.length,  color: 'positive',    icon: 'assignment_ind'  },
      { key: 'longest', label: 'รอนานสุด (นาที)',   value: longest,        color: 'info',        icon: 'schedule'        },
    ];
  }, [poolRows, myRows]);

  const tabsWithCounts = useMemo(() => TABS.map((t) => ({
    ...t,
    count: t.key === 'pool' ? poolRows.length
      : t.key === 'mine' ? myRows.length
        : allRows.length,
  })), [poolRows, myRows, allRows]);

  const openRecord = (row) => history.push({
    pathname: '/treat/record',
    state: { hn: row.hn, queue: row.queue, name: row.name },
  });

  /* รับเคส = แพทย์กลายเป็นเจ้าของเคสนั้น แล้วเข้าห้องตรวจต่อทันที — การให้กด
     สองครั้ง (รับ แล้วค่อยเปิด) ไม่ได้เพิ่มความปลอดภัยอะไร เพราะการรับเคสก็
     ย้อนได้อยู่แล้วด้วยปุ่ม "คืนเคส" */
  const confirmClaim = () => {
    const row = claimTarget;
    setClaimTarget(null);
    if (!row) return;
    const claimed = claimCase(row.id, CURRENT_CLINICIAN.name);
    if (!claimed) {
      setToast(`เคส ${row.name} ถูกแพทย์ท่านอื่นรับไปแล้ว`);
      return;
    }
    setToast(`รับเคส ${row.name} (${clinicShortLabel(row.clinicKey)}) เรียบร้อย`);
    openRecord(row);
  };

  /* คลิกที่แถวในตาราง = การกระทำเดียวกับปุ่มท้ายแถว (มติผู้ใช้ 28 ส.ค. 69)
     เคสในกองกลาง → ถามยืนยันรับเคส · เคสของเราเอง → เปิดหน้าตรวจเลย
     เคสของแพทย์ท่านอื่น → บอกว่าใครถือ ไม่ใช่เงียบไปเฉย ๆ ให้เดาเอง */
  const handleRowClick = (row) => {
    if (!row.doctor) { setClaimTarget(row); return; }
    if (row.doctor === CURRENT_CLINICIAN.name) { openRecord(row); return; }
    setToast(`เคสนี้ ${row.doctor} รับไว้แล้ว — เปิดตรวจได้เฉพาะแพทย์เจ้าของเคส`);
  };

  const handleRelease = (row) => {
    releaseCase(row.id);
    setToast(`คืนเคส ${row.name} กลับคิวรวมแล้ว`);
  };

  const renderActions = (row) => {
    const mine = row.doctor === CURRENT_CLINICIAN.name;
    if (!row.doctor) {
      return (
        <BrandSubdueButton
          variant='fill'
          size='sm'
          leadingIcon='person_add'
          onClick={(e) => { e.stopPropagation(); setClaimTarget(row); }}
        >
          รับเคสนี้
        </BrandSubdueButton>
      );
    }
    if (!mine) {
      /* เคสของแพทย์ท่านอื่น — เห็นได้ แต่หยิบไม่ได้ ปุ่มที่กดไม่ได้บอกเรื่องนี้
         ชัดกว่าการซ่อนแถวทิ้ง เพราะแพทย์ต้องรู้ว่าเคสไปอยู่กับใคร */
      return (
        <span style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          color: 'var(--text-content-tertiary)',
        }}
        >
          {`${row.doctor} รับไว้ ${row.claimedAt ?? ''}`.trim()}
        </span>
      );
    }
    return (
      <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
        <BrandSubdueButton
          variant='fill'
          size='sm'
          leadingIcon='stethoscope'
          onClick={(e) => { e.stopPropagation(); openRecord(row); }}
        >
          เปิดตรวจ
        </BrandSubdueButton>
        <NeutralSubdueButton
          variant='outline'
          size='sm'
          onClick={(e) => { e.stopPropagation(); handleRelease(row); }}
        >
          คืนเคส
        </NeutralSubdueButton>
      </div>
    );
  };

  /* คอลัมน์คลินิกมีเฉพาะมุมมอง worklist — มุมมองแยกตามคลินิกมีชื่อคลินิกเป็น
     หัวกลุ่มอยู่แล้ว ซ้ำในทุกแถวคือเสียพื้นที่เปล่า */
  const buildColumns = (withClinic) => [
    {
      key: 'queue', label: 'คิวคัดกรอง',
      render: (row) => (
        <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{row.queue}</ColorfulBadge>
      ),
    },
    { key: 'hn', label: 'HN' },
    {
      key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 170,
      render: (row) => (
        <div className='flex items-center gap-2 min-w-0'>
          <PatientAvatar row={row} />
          <MaskedWorklistName name={row.name} recordKey={row.hn || row.queue} />
        </div>
      ),
    },
    ...(withClinic ? [{
      key: 'clinic', label: 'คลินิก', flex: true, minWidth: 150,
      render: (row) => (
        <ColorfulBadge style='indigo' size='small' hierarchy='secondary' width='hug'>
          {clinicShortLabel(row.clinicKey)}
        </ColorfulBadge>
      ),
    }] : []),
    {
      key: 'cc', label: 'อาการสำคัญ (CC)', flex: true, minWidth: 200,
      render: (row) => <TableEllipsisText text={row.cc} />,
    },
    { key: 'vitals', label: 'Vitals', sortable: false, render: (row) => <VitalsCell vitals={row.vitals} /> },
    {
      key: 'esi', label: 'คัดแยก (ESI)',
      render: (row) => {
        const t = TRIAGE_LEVELS[row.esi];
        return t ? (
          <ColorfulBadge style={t.badge} size='small' hierarchy='secondary' width='hug'>
            {`ESI ${row.esi}`}
          </ColorfulBadge>
        ) : null;
      },
    },
    { key: 'screenedAt', label: 'คัดกรองเมื่อ' },
    { key: 'waitMinutes', label: 'รอนาน', render: (row) => `${row.waitMinutes} นาที` },
    {
      key: 'status', label: 'สถานะ',
      render: (row) => {
        const s = row.doctor ? CASE_STATUS.mine : CASE_STATUS.pool;
        return (
          <ColorfulBadge style={s.badge} size='small' hierarchy='secondary' width='hug'>
            {s.label}
          </ColorfulBadge>
        );
      },
    },
    { key: 'actions', label: 'การดำเนินการ', sortable: false, align: 'center', render: withEmrRowAction(renderActions) },
  ];

  const tabRows = activeTab === 'pool' ? poolRows
    : activeTab === 'mine' ? myRows
      : allRows;

  const filtered = useMemo(() => {
    let result = tabRows;
    if (filters.clinic !== 'all') result = result.filter((r) => r.clinicKey === filters.clinic);
    if (filters.esi !== 'all') result = result.filter((r) => String(r.esi) === filters.esi);
    const q = searchQ.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => [r.queue, r.hn, r.name, r.cc, clinicLabel(r.clinicKey)]
        .some((f) => f && String(f).toLowerCase().includes(q)));
    }
    return result;
  }, [tabRows, filters, searchQ]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return filtered.slice().sort(comparePoolRows);
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const normalize = (row, key) => {
      switch (key) {
        case 'clinic': return clinicShortLabel(row.clinicKey);
        case 'esi': return row.esi ?? 9;
        case 'waitMinutes': return row.waitMinutes ?? 0;
        case 'status': return row.doctor ? 1 : 0;
        default: return row[key] ?? '';
      }
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    const numericKeys = ['esi', 'waitMinutes', 'status'];
    return filtered.slice().sort((a, b) => {
      const av = normalize(a, sortConfig.key);
      const bv = normalize(b, sortConfig.key);
      const primary = numericKeys.includes(sortConfig.key)
        ? (Number(av) || 0) - (Number(bv) || 0)
        : collator.compare(String(av), String(bv));
      return primary !== 0 ? sign * primary : comparePoolRows(a, b);
    });
  }, [filtered, sortConfig]);

  const clinicGroups = useMemo(() => groupRowsByClinic(sortedRows), [sortedRows]);

  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
  ));

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return allRows
      .filter((r) => [r.queue, r.hn, r.name].some((f) => f && f.toLowerCase().includes(q)))
      .slice(0, 8)
      .map((r) => ({
        id: r.id,
        label: r.name,
        sublabel: clinicShortLabel(r.clinicKey),
        value: r.name,
        badges: [
          { label: r.queue, tone: 'teal' },
          { label: r.hn, tone: 'indigo' },
        ],
        avatarSrc: r.avatarUrl || getPatientByHN(r.hn)?.avatarUrl,
      }));
  }, [allRows, searchQ]);

  const emptyMessage = activeTab === 'mine'
    ? 'ยังไม่ได้รับเคสใดไว้ — กด "รับเคสนี้" จากแท็บรอรับเคส'
    : activeTab === 'pool'
      ? 'ไม่มีเคสรอแพทย์รับ — ทุกเคสที่คัดกรองแล้วมีแพทย์เจ้าของครบ'
      : 'ไม่พบรายการ';

  return (
    <>
      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />

      {/* ยืนยันก่อนรับเคส (มติผู้ใช้ 28 ส.ค. 69) — การรับเคสทำให้แพทย์กลายเป็น
          เจ้าของผู้ป่วยรายนั้นและพาเข้าห้องตรวจทันที กดพลาดบนกระดานที่การ์ดชิดกัน
          จึงต้องทวนก่อนว่ากำลังรับใคร คลินิกไหน */}
      {/* ยืนยันรับเคส — ทรงเดียวกับ ScreeningConfirmPopup ("Popup Large" +
          PatientSummaryCard) ที่จุดคัดกรองใช้ตอนรับผู้ป่วย (มติผู้ใช้ 29 ส.ค. 69)
          การรับเคสคือการ "รับผู้ป่วย" ในอีกจุดของทางเดินงาน จึงต้องหน้าตาเดียวกัน
          และการ์ดผู้ป่วยอ่านทวนชื่อ/HN/คลินิก/ESI ได้เร็วกว่าประโยคยาวใน AlertDialog */}
      <Popup
        open={!!claimTarget}
        onClose={() => setClaimTarget(null)}
        title='รับเคสนี้เป็นของคุณ?'
        subtitle={`${CURRENT_CLINICIAN.name} จะเป็นแพทย์เจ้าของเคส และระบบจะเปิดหน้าตรวจรักษาให้ทันที`}
        size='large'
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setClaimTarget(null) }}
        primaryAction={{ label: 'รับเคสและเปิดตรวจ', onClick: confirmClaim }}
      >
        {claimTarget && (
          <PatientSummaryCard
            avatarUrl={claimTarget.avatarUrl || getPatientByHN(claimTarget.hn)?.avatarUrl}
            avatarAlt={claimTarget.name}
            cells={[
              { label: 'ชื่อ-นามสกุล ผู้ป่วย', value: claimTarget.name || '—' },
              { label: 'HN (Hospital Number)', value: claimTarget.hn || '—' },
              { label: 'คลินิกที่ต้องการรักษา', value: clinicLabel(claimTarget.clinicKey) },
              {
                label: 'ระดับคัดแยก (ESI)',
                children: TRIAGE_LEVELS[claimTarget.esi] ? (
                  <ColorfulBadge style={TRIAGE_LEVELS[claimTarget.esi].badge} size='small' hierarchy='secondary' width='hug'>
                    {TRIAGE_LEVELS[claimTarget.esi].label}
                  </ColorfulBadge>
                ) : null,
              },
            ]}
          />
        )}
      </Popup>

      <QueuePageShell
        activeKey='treat'
        breadcrumb={breadcrumb}
        summaryTitle={SUMMARY_TITLE}
        summaryCards={summaryCards}
        tabs={tabsWithCounts}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        /* ปุ่มประจำ worklist ของบันทึกการรักษา — ดูคำอธิบายใน EmrWorklistAction */
        leadingActions={<DutyRosterAction />}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}
        >
          <div
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              boxShadow: 'var(--shadow-card-strong)',
              padding: 'var(--dim-space-600)',
              gap: 'var(--dim-space-600)',
            }}
          >
            <div className='w-full flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex-1' />
              <PrimarySearch
                value={searchQ}
                onChange={setSearchQ}
                onSubmit={(label, item) => {
                  setSearchQ(label);
                  pushHistory(item ?? label);
                }}
                suggestions={searchSuggestions}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                placeholder='ค้นหา HN / ชื่อ-สกุล / คิว / อาการ'
                width={640}
              />
              <div className='flex-1' />
            </div>

            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <OverflowFlexRow
                className='flex-1 min-w-0'
                itemGap='var(--dim-space-200)'
                moreAriaLabel='แสดงตัวกรองที่ซ่อน'
              >
                <FilterDropdown prefix='คลินิก:' options={CLINIC_FILTER_OPTIONS} value={filters.clinic} onChange={setFilter('clinic')} />
                <FilterDropdown prefix='คัดแยก:' options={ESI_FILTER_OPTIONS} value={filters.esi} onChange={setFilter('esi')} />
                <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
              </OverflowFlexRow>

              {/* ตัวสลับมุมมองอยู่แถวเดียวกับตัวกรอง แต่ชิดขวาสุด (มติผู้ใช้
                  28 ส.ค. 69) — ตัวกรองคือการ "ตัดรายการออก" ส่วนตัวสลับคือการ
                  "จัดวางรายการที่เหลือ" คนละหน้าที่กัน จึงแยกไปคนละฝั่งของแถว
                  และอยู่นอก OverflowFlexRow เพื่อไม่ให้ถูกยุบเข้าเมนู "เพิ่มเติม"
                  เวลาตัวกรองยาว — มันไม่ใช่ตัวกรองที่จะซ่อนได้
                  คำนำหน้า "มุมมอง:" ใช้สีและขนาดเดียวกับคำนำหน้าของ FilterTag */}
              <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
                <span
                  className='whitespace-nowrap'
                  style={{
                    color: 'var(--text-brandtag-title)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs)',
                    fontWeight: 'var(--type-weight-medium)',
                  }}
                >
                  มุมมอง:
                </span>
                <TabBar aria-label='มุมมองคิวรวมรอรับเคส'>
                  {VIEW_MODES.map((m) => (
                    <TabPill
                      key={m.key}
                      size='small'
                      selected={viewMode === m.key}
                      onClick={() => setViewMode(m.key)}
                    >
                      {m.label}
                    </TabPill>
                  ))}
                </TabBar>
              </div>
            </div>

            <SmoothFilterResults opaque={resultsOpaque}>
              <SearchResultCount found={sortedRows.length} total={tabRows.length} />

              {viewMode === 'list' ? (
                <Table
                  columns={buildColumns(true)}
                  rows={sortedRows}
                  rowKey={(row) => row.id}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  onRowClick={handleRowClick}
                  stickyColCount={3}
                  /* ตารางกว้างเกินจอ ปุ่มรับเคสจึงหลุดขอบขวาไป — ตรึงคอลัมน์
                     การดำเนินการไว้ ปุ่มอยู่ในสายตาเสมอโดยไม่ต้องเลื่อนกลับ */
                  stickyRightColCount={1}
                  stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                  emptyMessage={emptyMessage}
                />
              ) : (
                <ClinicBoard
                  groups={clinicGroups}
                  emptyMessage={emptyMessage}
                  renderActions={renderActions}
                />
              )}
            </SmoothFilterResults>
          </div>
        </div>
      </QueuePageShell>
    </>
  );
};

export default UnassignedWorklistPage;
