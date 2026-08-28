import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import SearchResultCount from '@/components/search/SearchResultCount';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Table from '@/components/table/Table';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import {
  SwSectionCard, SwBanner, SwEmptyHint, SwField,
} from '@/pages/clinic/social-work/SocialWorkShared';
import {
  SW_HOME_CENTER,
  SW_CURRENT_USER,
  searchSwPeople,
  searchSwCrossCenter,
  formatCid,
  normalizeCid,
  hasSocialWorkRights,
  setSocialWorkRights,
  getSwQueueRows,
  getSwRegistryRows,
  formatSwDate,
  formatSwDateTime,
} from '@/data/socialWorkClinic';
import { resolveSwProblemCodeLabel, isSwProblemCodeSensitive } from '@/data/socialWorkProblems';
import { getSwReferrals } from '@/data/socialWorkReferrals';
import { getSwActivities } from '@/data/socialWorkActivities';
import { getSwNutritionCases } from '@/data/socialWorkNutrition';
import DutyRosterAction from '@/components/patient/DutyRosterAction';

/* SocialWorkHomePage — หน้าต่างแรกของงานสังคมสงเคราะห์ (TOR §1.10.11.2)
   ตามมติ คทง.10 ครั้งที่ 3 ข้อ 1:

     • ช่องค้นหาอยู่ส่วนบน — ชื่อ / สกุล / เลขประจำตัวประชาชน / HN / SN
     • เมนูหลัก 5 ปุ่มอยู่ส่วนล่าง — ส.ส.2 · ส.ส.3 · ส.ส.4 · รายงาน · โภชนาการ
     • การตรวจสอบข้อมูลผู้ใช้บริการ "ข้ามศูนย์บริการสาธารณสุข" ด้วยเลข
       ประจำตัวประชาชน 13 หลัก — กรณีพบแสดงตาราง HN | SN | ชื่อ-สกุล | อายุ |
       วดป.เกิด | เลขบัตร | วันที่ใช้บริการ | รหัสปัญหาหลัก เรียงจากครั้งล่าสุด
       กรณีไม่พบ ขึ้นแสดงคำว่า "ไม่พบ"

   Edge case ที่ครอบคลุม: ค้นหาไม่พบ → empty state · เลขบัตรไม่ครบ 13 หลัก
   หรือ checksum ผิด → validation ก่อนยิงค้นหา · รหัสปัญหาหลักที่เป็นข้อมูลลับ
   §1.4.2 ถูกปกปิดเมื่อผู้ใช้ไม่มีสิทธิงานสังคมสงเคราะห์. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานสังคมสงเคราะห์'];

const CARD_GAP = { gap: 'var(--dim-space-400, 16px)' };

/* ── ปุ่มเมนูหลัก (Figma: การ์ดเมนูใหญ่ 5 ใบ) ─────────────────────── */
const MenuTile = ({ icon, title, subtitle, badge, onClick, disabled }) => (
  <button
    type='button'
    onClick={onClick}
    disabled={disabled}
    className='flex flex-col items-start text-left min-w-0'
    style={{
      flex: '1 1 220px',
      minWidth: 220,
      gap: 'var(--dim-space-200, 8px)',
      paddingTop: 'var(--dim-space-500, 20px)',
      paddingBottom: 'var(--dim-space-500, 20px)',
      paddingLeft: 'var(--dim-space-500, 20px)',
      paddingRight: 'var(--dim-space-500, 20px)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
      background: disabled
        ? 'var(--surface-disabled-tertiary, #F4F5F5)'
        : 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
      boxShadow: 'var(--shadow-card)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
    }}
  >
    <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      <span style={{ color: 'var(--icon-brandPrimary-default, #007549)' }}><Icon name={icon} size={24} /></span>
      <div className='flex-1' />
      {badge != null && (
        <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{badge}</ColorfulBadge>
      )}
    </div>
    <span
      style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-base, 16px)',
        fontWeight: 'var(--type-weight-bold)',
        color: 'var(--text-brandPrimary-default, #007549)',
      }}
    >
      {title}
    </span>
    <span
      style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
        color: 'var(--text-content-secondary, #636B72)',
      }}
    >
      {subtitle}
    </span>
  </button>
);

const SocialWorkHomePage = () => {
  const history = useHistory();
  const [, setRightsTick] = useState(0);

  /* ── ค้นหาในศูนย์ตนเอง ─────────────────────────────────────────── */
  const searchHistory = useSearchHistory('mih:primarysearch-history:social-work-home');
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  /* ── ตรวจสอบข้ามศูนย์ด้วยเลขบัตรประชาชน ────────────────────────── */
  const [cid, setCid] = useState('');
  const [crossResult, setCrossResult] = useState(null); /* null | { ok, error, rows } */

  const canRead = hasSocialWorkRights();
  const toggleRightsDemo = () => {
    setSocialWorkRights(!hasSocialWorkRights());
    setRightsTick((t) => t + 1);
  };

  const allPeople = useMemo(() => searchSwPeople(''), []);
  const results = useMemo(() => searchSwPeople(submitted), [submitted]);

  const liveSuggestions = useMemo(() => {
    if (!query || query.trim().length < 2) return [];
    return searchSwPeople(query).slice(0, 6).map((p) => ({
      id: p.hn,
      label: p.name,
      sublabel: `HN ${p.hn} · ${p.sn} · ใช้บริการล่าสุด ${formatSwDate(p.visitDate)}`,
      value: p.name,
      icon: 'person',
    }));
  }, [query]);

  const queueCount = useMemo(
    () => getSwQueueRows().filter((r) => r.statusKey !== 'done').length,
    [],
  );
  const registryCount = useMemo(
    () => getSwRegistryRows().filter((r) => r.status !== 'cancelled').length,
    [],
  );
  const referralPending = useMemo(
    () => getSwReferrals().filter((r) => r.status === 'pending').length,
    [],
  );
  const activityCount = useMemo(
    () => getSwActivities().filter((r) => r.status !== 'cancelled').length,
    [],
  );
  const nutritionActive = useMemo(
    () => getSwNutritionCases().filter((r) => r.status === 'active').length,
    [],
  );

  const summaryCards = useMemo(() => ([
    { key: 'queue', label: 'คิวรอรับบริการวันนี้', value: String(queueCount), color: 'info', icon: 'groups' },
    { key: 'registry', label: 'ทะเบียนผู้รับบริการที่ใช้งาน', value: String(registryCount), color: 'positive', icon: 'contact_page' },
    { key: 'referral', label: 'ใบส่งต่อรอตอบกลับ (ส.ส.3)', value: String(referralPending), color: 'warning', icon: 'forward_to_inbox' },
    { key: 'activity', label: 'กิจกรรมที่บันทึกแล้ว (ส.ส.4)', value: String(activityCount), color: 'info', icon: 'diversity_3' },
    { key: 'nutrition', label: 'เคสโภชนาการที่ช่วยเหลืออยู่', value: String(nutritionActive), color: 'positive', icon: 'nutrition' },
  ]), [queueCount, registryCount, referralPending, activityCount, nutritionActive]);

  const runSearch = (value) => {
    const text = String(value ?? query).trim();
    setQuery(text);
    setSubmitted(text);
    if (text) searchHistory.push(text);
  };

  const runCrossCenter = () => setCrossResult(searchSwCrossCenter(cid));

  const openRecord = (hn) => history.push({
    pathname: `/clinic/social-work/record/${hn}`,
    state: { hn },
  });

  const resultColumns = useMemo(() => ([
    { key: 'hn', label: 'HN' },
    { key: 'sn', label: 'SN' },
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 180 },
    { key: 'age', label: 'อายุ', render: (r) => (r.age == null ? '—' : `${r.age} ปี`) },
    { key: 'birthDate', label: 'วัน เดือน ปีเกิด', render: (r) => formatSwDate(r.birthDate) },
    { key: 'cid', label: 'เลขประจำตัวประชาชน', render: (r) => formatCid(r.cid) },
    { key: 'visitDate', label: 'วันที่ใช้บริการล่าสุด', render: (r) => formatSwDate(r.visitDate) },
    {
      key: 'problemCode',
      label: 'รหัสปัญหาหลัก',
      flex: true,
      minWidth: 240,
      render: (r) => (
        <span title={isSwProblemCodeSensitive(r.problemCode) && !canRead ? 'ข้อมูลลับ §1.4.2 — สิทธิไม่เพียงพอ' : undefined}>
          {resolveSwProblemCodeLabel(r.problemCode)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <BrandSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='edit_document'
          onClick={(e) => { e.stopPropagation(); openRecord(r.hn); }}
        >
          เปิดแบบ ส.ส.2
        </BrandSubdueButton>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canRead]);

  const crossColumns = useMemo(() => ([
    { key: 'hn', label: 'HN' },
    { key: 'sn', label: 'SN' },
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 180 },
    { key: 'age', label: 'อายุ', render: (r) => (r.age == null ? '—' : `${r.age} ปี`) },
    { key: 'birthDate', label: 'วัน เดือน ปีเกิด', render: (r) => formatSwDate(r.birthDate) },
    { key: 'cid', label: 'เลขประจำตัวประชาชน', render: (r) => formatCid(r.cid) },
    {
      key: 'centerName',
      label: 'ศูนย์บริการสาธารณสุข',
      flex: true,
      minWidth: 220,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <span>{r.centerName}</span>
          {r.center === SW_HOME_CENTER.code && (
            <ColorfulBadge style='teal' size='small' hierarchy='secondary'>ศูนย์ของท่าน</ColorfulBadge>
          )}
        </div>
      ),
    },
    { key: 'visitDate', label: 'วันที่ใช้บริการงานสังคมสงเคราะห์', render: (r) => formatSwDate(r.visitDate) },
    {
      key: 'problemCode',
      label: 'รหัสปัญหาหลัก',
      flex: true,
      minWidth: 240,
      render: (r) => (
        <span title={isSwProblemCodeSensitive(r.problemCode) && !canRead ? 'ข้อมูลลับ §1.4.2 — สิทธิไม่เพียงพอ' : undefined}>
          {resolveSwProblemCodeLabel(r.problemCode)}
        </span>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canRead]);

  const cidDigits = normalizeCid(cid);

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      /* ทุกหน้าของเมนูบันทึกการรักษามีปุ่มนี้ (มติผู้ใช้ 28 ส.ค. 69) */
      leadingActions={<DutyRosterAction />}
      title='งานสังคมสงเคราะห์'
      summaryCards={summaryCards}
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canRead ? 'lock_open' : 'lock'}
            onClick={toggleRightsDemo}
            title='สลับสิทธิงานสังคมสงเคราะห์ (สำหรับทดสอบ)'
          >
            {canRead ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
          </NeutralSubdueButton>
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='groups'
            onClick={() => history.push('/clinic/social-work/queue')}
          >
            คิวงานสังคมสงเคราะห์
          </BrandSubdueButton>
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
          gap: 'var(--dim-space-600, 24px)',
        }}
      >
        {!canRead && (
          <SwBanner tone='warning' icon='lock'>
            บัญชีนี้ไม่มีสิทธิงานสังคมสงเคราะห์ (§1.4.2) — ค้นหาและดูรายการได้
            แต่รหัสปัญหาที่เป็นข้อมูลลับถูกปกปิด และบันทึก/แก้ไข/ยกเลิกไม่ได้
          </SwBanner>
        )}

        {/* ══ ส่วนบน: ค้นหา ══════════════════════════════════════════ */}
        <SwSectionCard
          icon='search'
          title='ค้นหาผู้ใช้บริการ'
          aside={(
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              {`${SW_HOME_CENTER.name} · ผู้ใช้งาน ${SW_CURRENT_USER}`}
            </span>
          )}
        >
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
            ค้นได้จาก ชื่อ · นามสกุล · เลขประจำตัวประชาชน · HN · SN
          </span>
          <div className='flex w-full flex-wrap items-center' style={CARD_GAP}>
            <PrimarySearch
              value={query}
              onChange={setQuery}
              onSubmit={runSearch}
              placeholder='ค้นหา ชื่อ / สกุล / เลขประจำตัวประชาชน / HN / SN'
              width={640}
              suggestions={liveSuggestions}
              history={searchHistory.history}
              onHistoryClear={searchHistory.history.length > 0 ? searchHistory.clear : undefined}
            />
            <BrandButton size='md' leadingIcon='search' onClick={() => runSearch()}>
              ค้นหา
            </BrandButton>
            {submitted && (
              <NeutralSubdueButton size='md' leadingIcon='close' onClick={() => { setQuery(''); setSubmitted(''); }}>
                ล้างผลการค้นหา
              </NeutralSubdueButton>
            )}
          </div>

          {submitted ? (
            <>
              <SearchResultCount found={results.length} total={allPeople.length} unit='ราย' />
              {results.length === 0 ? (
                <SwEmptyHint icon='person_search'>
                  {`ไม่พบผู้ใช้บริการที่ตรงกับ "${submitted}" ในศูนย์บริการสาธารณสุขของท่าน —
                    ลองตรวจสอบข้ามศูนย์ด้วยเลขประจำตัวประชาชน 13 หลักในกล่องด้านล่าง`}
                </SwEmptyHint>
              ) : (
                <Table
                  columns={resultColumns}
                  rows={results}
                  rowKey={(r) => r.id}
                  onRowClick={(r) => openRecord(r.hn)}
                  pageSize={20}
                  emptyMessage='ไม่พบผู้ใช้บริการ'
                />
              )}
            </>
          ) : (
            <SwEmptyHint icon='search'>
              พิมพ์คำค้นแล้วกด &quot;ค้นหา&quot; เพื่อดูรายชื่อผู้ใช้บริการในศูนย์ของท่าน
              — คลิกที่แถวเพื่อเปิดแบบบันทึกผู้ใช้บริการ (ส.ส.2) ของ HN นั้น
            </SwEmptyHint>
          )}
        </SwSectionCard>

        {/* ══ ตรวจสอบข้ามศูนย์บริการสาธารณสุข ═══════════════════════ */}
        <SwSectionCard icon='travel_explore' title='ตรวจสอบข้อมูลผู้ใช้บริการข้ามศูนย์บริการสาธารณสุข'>
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
            ตรวจสอบได้จากเลขประจำตัวประชาชน 13 หลักเท่านั้น (มติ คทง.10 ครั้งที่ 3)
            — ระบบจะแสดงประวัติการใช้บริการงานสังคมสงเคราะห์ทุกศูนย์ เรียงจากครั้งล่าสุด
          </span>
          <div className='flex w-full flex-wrap items-end' style={CARD_GAP}>
            <SwField
              label='เลขประจำตัวประชาชน'
              required
              minWidth={280}
              grow={false}
              hint={crossResult && crossResult.ok === false ? crossResult.error : `กรอกแล้ว ${cidDigits.length}/13 หลัก`}
              hintTone={crossResult && crossResult.ok === false ? 'error' : undefined}
            >
              <InputField
                value={cid}
                onChange={(v) => { setCid(v); setCrossResult(null); }}
                placeholder='เช่น 3100600287451'
                error={!!(crossResult && crossResult.ok === false)}
                showHelperText={false}
                inputMode='numeric'
                maxLength={17}
              />
            </SwField>
            <BrandButton
              size='md'
              leadingIcon='travel_explore'
              disabled={cidDigits.length === 0}
              onClick={runCrossCenter}
            >
              ตรวจสอบข้ามศูนย์
            </BrandButton>
            {crossResult && (
              <NeutralSubdueButton size='md' leadingIcon='close' onClick={() => { setCid(''); setCrossResult(null); }}>
                ล้าง
              </NeutralSubdueButton>
            )}
          </div>

          {crossResult && crossResult.ok === false && (
            <SwBanner tone='danger' icon='error'>{crossResult.error}</SwBanner>
          )}

          {crossResult && crossResult.ok && crossResult.rows.length === 0 && (
            /* มติ: กรณีไม่พบ ให้ "ขึ้นแสดงคำว่า ไม่พบ" — ไม่ใช่ตารางว่าง */
            <div
              className='flex flex-col items-center justify-center w-full text-center'
              style={{
                gap: 'var(--dim-space-200, 8px)',
                paddingTop: 'var(--dim-space-800, 48px)',
                paddingBottom: 'var(--dim-space-800, 48px)',
                paddingLeft: 'var(--dim-space-600, 24px)',
                paddingRight: 'var(--dim-space-600, 24px)',
                borderRadius: 'var(--dim-radius-400, 12px)',
                border: 'var(--dim-stroke-100, 1px) dashed var(--border-neutral-tertiary, #E2E4E6)',
                background: 'var(--surface-card-quaternary, #F9FBFB)',
              }}
            >
              <Icon name='search_off' size={32} />
              <span
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xl, 20px)',
                  fontWeight: 'var(--type-weight-bold)',
                  color: 'var(--text-content-default, #363B3F)',
                }}
              >
                ไม่พบ
              </span>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
                {`ไม่พบประวัติการใช้บริการงานสังคมสงเคราะห์ของเลขประจำตัวประชาชน ${formatCid(cid)} ในทุกศูนย์บริการสาธารณสุข`}
              </span>
            </div>
          )}

          {crossResult && crossResult.ok && crossResult.rows.length > 0 && (
            <>
              <SearchResultCount found={crossResult.rows.length} total={crossResult.rows.length} unit='ครั้งที่ใช้บริการ' />
              <Table
                columns={crossColumns}
                rows={crossResult.rows}
                rowKey={(r) => r.id}
                pageSize={20}
                emptyMessage='ไม่พบ'
              />
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                {`ตรวจสอบโดย ${SW_CURRENT_USER} · ${formatSwDateTime(new Date().toISOString())} — การเรียกดูข้อมูลข้ามศูนย์ถูกบันทึกไว้ใน audit log`}
              </span>
            </>
          )}
        </SwSectionCard>

        {/* ══ ส่วนล่าง: เมนูหลัก 5 ปุ่ม ═══════════════════════════════ */}
        <SwSectionCard icon='apps' title='เมนูหลัก'>
          <div className='flex w-full flex-wrap' style={CARD_GAP}>
            <MenuTile
              icon='edit_document'
              title='เมนูที่ 1 — แบบบันทึกผู้ใช้บริการ (ส.ส.2)'
              subtitle='Intake + Fact Finding และแบบย่อย 10 ชุดในรูปแบบ Pop-up แก้ไขได้ตลอด'
              badge={`คิว ${queueCount}`}
              onClick={() => history.push('/clinic/social-work/queue')}
            />
            <MenuTile
              icon='forward_to_inbox'
              title='เมนูที่ 2 — แบบส่งต่อผู้ใช้บริการ (ส.ส.3)'
              subtitle='ออกใบส่งต่อ ติดตามสถานะตอบกลับ และพิมพ์แบบ ส.ส.3'
              badge={referralPending ? `รอตอบ ${referralPending}` : null}
              onClick={() => history.push('/clinic/social-work/referral')}
            />
            <MenuTile
              icon='diversity_3'
              title='เมนูที่ 3 — แบบบันทึกกิจกรรม (ส.ส.4)'
              subtitle='งานกลุ่ม เยี่ยมบ้าน ออกหน่วย พร้อมทีมสหวิชาชีพและภาพกิจกรรม'
              badge={activityCount ? `${activityCount} รายการ` : null}
              onClick={() => history.push('/clinic/social-work/activities')}
            />
            <MenuTile
              icon='bar_chart'
              title='เมนูที่ 4 — รายงานที่เกี่ยวข้อง'
              subtitle='รายงาน 12 ฉบับ เลือกช่วงวัน/เดือน/ปีงบประมาณ + นำส่งออก Excel/PDF/CSV'
              badge='12 ฉบับ'
              onClick={() => history.push('/clinic/social-work/reports')}
            />
            <MenuTile
              icon='nutrition'
              title='เมนูที่ 5 — การช่วยเหลือด้านโภชนาการ'
              subtitle='เด็ก · หญิงตั้งครรภ์ · ผู้ใหญ่ · ผู้สูงอายุ พร้อมคำนวณภาวะโภชนาการอัตโนมัติ'
              badge={nutritionActive ? `${nutritionActive} เคส` : null}
              onClick={() => history.push('/clinic/social-work/nutrition')}
            />
          </div>
        </SwSectionCard>

        {/* ══ เมนูรอง ═══════════════════════════════════════════════ */}
        <SwSectionCard icon='more_horiz' title='เมนูอื่นของงานสังคมสงเคราะห์'>
          <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <BrandSubdueButton variant='outline' leadingIcon='groups' onClick={() => history.push('/clinic/social-work/queue')}>
              คิวงานสังคมสงเคราะห์
            </BrandSubdueButton>
            <BrandSubdueButton variant='outline' leadingIcon='contact_page' onClick={() => history.push('/clinic/social-work/registry')}>
              ทะเบียนผู้รับบริการ (ส.ส.1)
            </BrandSubdueButton>
            <BrandSubdueButton variant='outline' leadingIcon='inventory_2' onClick={() => history.push('/clinic/social-work/supplies')}>
              รับ-จ่ายวัสดุและอุปกรณ์
            </BrandSubdueButton>
            <BrandSubdueButton variant='outline' leadingIcon='assignment_ind' onClick={() => history.push('/clinic/social-work/requesters')}>
              ทะเบียนผู้ขอรับวัสดุ
            </BrandSubdueButton>
            <BrandSubdueButton variant='outline' leadingIcon='monitoring' onClick={() => history.push('/clinic/social-work/follow-up')}>
              ติดตามผลการให้บริการ
            </BrandSubdueButton>
          </div>
        </SwSectionCard>
      </div>
    </QueuePageShell>
  );
};

export default SocialWorkHomePage;
