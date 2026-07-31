import React, { useMemo, useState } from 'react';
import Checkbox from '@/components/checkbox/Checkbox';
import Badge from '@/components/badge/Badge';
import Alert from '@/components/alert/Alert';
import { Icon } from '@/components/icons/Icon';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  LAB_TESTS, LAB_GROUPS, LAB_TEST_BY_ID, getTube,
  summariseSelection, duplicateWarning, repeatWindowDays,
} from '@/data/labCatalog';
import LabTubeDot from '@/pages/lab/LabTubeDot';

/* "เลือกรายการตรวจ" — the lab order-entry control a doctor or nurse uses to
   place a request. Drop-in for Treatment Step 5's `labs[]` slice and for
   any other screen that needs to order lab work.

   The team reviewed an earlier flat checkbox grid of six tests in
   `Lab dicussion with team.pdf` (Kaebrain folder, MIH-Docs-Vault) and wrote
   down five specific things wrong with it. This component is that list,
   implemented — each fix is marked below with the number the team gave it:

     1. ยังไม่จัดกลุ่ม — "ทั้ง 6 รายการเรียงแบบแถวเดียว ควรจัดหัวข้อตามกลุ่ม
        (Hematology / Chemistry / Urinalysis) ให้ตรงกับวิธีคิดต่อหน้าแลปและ
        ตรงกับ worklist" → grouped headers, keyed off the same LAB_GROUPS
        the worklist column and the Setup page use.
     2. ไม่บอกผลกระทบของสิ่งที่เลือก — "ควรมีสรุปปลายฟอร์ม เช่น 'เลือก 2 รายการ ·
        เจาะ 2 หลอด (EDTA, Fluoride) · ต้องงดอาหาร 8 ชม.' นี่คือจุดที่ช่วยได้
        มากที่สุด เพราะกันเจาะซ้ำและกันผู้ป่วยมาผิดเงื่อนไข" → the sticky
        summary bar at the foot.
     3. ยังไม่มีเตือนสั่งซ้ำ — "TOR ข้อ 1.15 บังคับเรื่องนี้ ถ้าเคยตรวจ FBS มา
        2 วันก่อน ต้องขึ้นเตือนตรงตัวเลือกนั้นเลย" → note "ตรงตัวเลือกนั้นเลย":
        the warning renders inline on the option, not in a summary banner.
     4. ปนระดับกัน — "Lipid profile และ Electrolytes เป็น panel (หลายค่า) แต่
        Creatinine เป็น analyte เดี่ยว ควรแยกส่วน 'ชุดตรวจ (Panel/Order set)'
        ออกจาก 'รายการเดี่ยว' หรือ panel ให้กางดูรายการย่อยได้" → panels carry
        a "ชุดตรวจ" badge and expand to show their member analytes.
     5. ชื่อไม่สม่ำเสมอ — Electrolytes (not Electrolyte), Urinalysis (UA)
        (not Urine analysis), Thai name on every row → fixed at the source
        in labCatalog.js, so every screen inherits the corrected names.       */

/* Groups render in clinical reading order, and only when they actually hold
   a test — the catalog has seven groups but a given order form may only
   offer three of them. */
const orderedGroups = (tests) => LAB_GROUPS
  .map((g) => ({ group: g, items: tests.filter((t) => t.group === g.key) }))
  .filter((g) => g.items.length > 0);

/* Fix #4 — a panel's member analytes, shown when the row is expanded so the
   ordering clinician can see that "Lipid profile" is four values, not one. */
const PanelMembers = ({ test }) => (
  <div
    className='flex flex-col'
    style={{
      gap: 'var(--dim-space-100)',
      marginTop: 'var(--dim-space-150)',
      paddingLeft: 'var(--dim-space-300)',
      borderLeft: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
    }}
  >
    {test.analytes.map((a) => (
      <span
        key={a.key}
        style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}
      >
        {a.label}
        {a.normalRange ? ` · ปกติ ${a.normalRange}${a.unit ? ` ${a.unit}` : ''}` : ''}
      </span>
    ))}
  </div>
);

const LabOrderPicker = ({
  /* Prior lab results for THIS patient — [{ testId, daysAgo, resultSummary }].
     Callers get it from `labHistoryFor(hn)` in labOrders.js. */
  history = [],
  value,
  onChange,
  /* Restricts the offered catalog, e.g. an ANC form offering only its own
     panel. Defaults to everything orderable. */
  testIds,
  patientName,
  disabled = false,
}) => {
  const [internal, setInternal] = useState([]);
  const isControlled = value !== undefined;
  const selected = isControlled ? value : internal;

  const [expanded, setExpanded] = useState([]);
  const toggleExpanded = (id) => setExpanded((prev) => (
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  ));

  /* A retired test stays in the catalog so old orders still resolve, but it
     must not be orderable any more — see `setLabTestRetired` in
     labCatalog.js for why retiring beats deleting. */
  const tests = useMemo(() => {
    const base = testIds ? testIds.map((id) => LAB_TEST_BY_ID[id]).filter(Boolean) : LAB_TESTS;
    return base.filter((t) => !t.retired);
  }, [testIds]);
  const groups = useMemo(() => orderedGroups(tests), [tests]);

  const setSelected = (next) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  const toggle = (id) => {
    if (disabled) return;
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  /* Fix #2 — the impact summary. Tubes are deduplicated by type inside
     `summariseSelection`, which is what makes "กันเจาะซ้ำ" true rather than
     just claimed: two Chemistry tests that both want a Clot tube are one
     draw, and the summary says two tubes only when it really is two. */
  const summary = useMemo(() => summariseSelection(selected), [selected]);

  /* Fix #3 — repeat warnings, resolved once per render for every offered
     test so the inline note and the roll-up count agree. */
  const warnings = useMemo(() => {
    const map = {};
    tests.forEach((t) => {
      const w = duplicateWarning(t.id, history);
      if (w) map[t.id] = w;
    });
    return map;
  }, [tests, history]);

  const selectedRepeats = selected.filter((id) => warnings[id]);

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-500)' }}>
      {/* Fix #1 — one section per group, headed by the group's Thai and
          English names so it matches both the worklist column and the
          bench's own vocabulary. */}
      {groups.map(({ group, items }) => (
        <div key={group.key} className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <div
            className='flex items-center'
            style={{
              gap: 'var(--dim-space-200)',
              paddingBottom: 'var(--dim-space-150)',
              borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--type-family-heading-content)',
                fontWeight: 'var(--type-weight-bold)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-content-default)',
              }}
            >
              {group.thai}
            </span>
            <span
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                color: 'var(--text-content-tertiary)',
                textTransform: 'none',
              }}
            >
              {group.code}
            </span>
          </div>

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
            {items.map((test) => {
              const isSelected = selected.includes(test.id);
              const warning = warnings[test.id];
              const isPanel = test.type === 'panel';
              const isExpanded = expanded.includes(test.id);

              return (
                <div
                  key={test.id}
                  className='flex flex-col w-full min-w-0'
                  style={{
                    borderRadius: 'var(--dim-radius-300)',
                    border: `var(--dim-stroke-100) solid ${isSelected ? 'var(--border-brandPrimary-secondary)' : 'var(--border-neutral-quaternary)'}`,
                    background: isSelected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
                    /* Inline `padding:` shorthand carrying var() is dropped
                       by CSSOM in React — longhand only. */
                    paddingTop: 'var(--dim-space-300)',
                    paddingRight: 'var(--dim-space-300)',
                    paddingBottom: 'var(--dim-space-300)',
                    paddingLeft: 'var(--dim-space-300)',
                  }}
                >
                  <div className='flex items-start w-full min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggle(test.id)}
                      disabled={disabled}
                      aria-label={`${test.nameEn} — ${test.nameTh}`}
                    />
                    <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
                      {/* Name row: corrected English name (fix #5), the
                          ชุดตรวจ marker for a panel (fix #4), and the tube
                          this test will draw. */}
                      <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                        <span
                          style={{
                            fontFamily: 'var(--type-family-body)',
                            fontWeight: 'var(--type-weight-medium)',
                            fontSize: 'var(--type-size-sm)',
                            color: 'var(--text-content-default)',
                          }}
                        >
                          {test.nameEn}
                        </span>
                        {isPanel && <Badge style='info' size='small'>ชุดตรวจ · {test.analytes.length} ค่า</Badge>}
                        <LabTubeDot tube={getTube(test)} count={test.tubeCount} size={8} />
                      </div>

                      {/* Thai name + full English name — fix #5 asked for a
                          Thai label on every row. */}
                      <span
                        style={{
                          fontFamily: 'var(--type-family-body)',
                          fontSize: 'var(--type-size-xs)',
                          color: 'var(--text-content-tertiary)',
                        }}
                      >
                        {test.nameTh} — {test.nameFull}
                        {test.fastingHours > 0 && ` · งดอาหาร ${test.fastingHours} ชม.`}
                        {` · ${test.price.toLocaleString('th-TH')} บาท`}
                      </span>

                      {/* Fix #3 — the repeat warning, inline on this option,
                          exactly where the team asked for it. */}
                      {warning && (
                        <span
                          className='inline-flex items-start'
                          style={{
                            gap: 'var(--dim-space-150)',
                            marginTop: 'var(--dim-space-100)',
                            color: 'var(--text-statusbadge-warning, #C2410C)',
                            fontFamily: 'var(--type-family-body)',
                            fontSize: 'var(--type-size-xs)',
                            fontWeight: 'var(--type-weight-medium)',
                          }}
                        >
                          <span className='shrink-0' style={{ marginTop: 1 }}><Icon name='content_copy' size={14} /></span>
                          <span>
                            {warning.message}
                            {warning.resultSummary ? ` — ${warning.resultSummary}` : ''}
                            {' '}(แนะนำให้ตรวจซ้ำเมื่อครบ {warning.windowDays} วัน)
                          </span>
                        </span>
                      )}

                      {/* Fix #4 — a panel can be opened to see what it
                          actually reports, so it never reads as one value. */}
                      {isPanel && (
                        <NeutralSubdueButton
                          variant='outline'
                          size='sm'
                          trailingIcon={isExpanded ? 'expand_less' : 'expand_more'}
                          onClick={() => toggleExpanded(test.id)}
                          className='self-start'
                          style={{ marginTop: 'var(--dim-space-100)' }}
                        >
                          {isExpanded ? 'ซ่อนรายการย่อย' : `ดูรายการย่อย (${test.analytes.length})`}
                        </NeutralSubdueButton>
                      )}
                      {isPanel && isExpanded && <PanelMembers test={test} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Fix #2 — the impact summary. Sticks to the bottom of the scroll
          area so it stays visible while the clinician works down a long
          catalog; it is the one place that answers "what does this order
          actually mean for the patient in front of me". */}
      <div
        className='flex flex-col w-full'
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--surface-card-200)',
          borderRadius: 'var(--dim-radius-300)',
          border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          boxShadow: 'var(--shadow-card)',
          paddingTop: 'var(--dim-space-400)',
          paddingRight: 'var(--dim-space-400)',
          paddingBottom: 'var(--dim-space-400)',
          paddingLeft: 'var(--dim-space-400)',
          gap: 'var(--dim-space-250, 10px)',
        }}
      >
        {summary.testCount === 0 ? (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
            ยังไม่ได้เลือกรายการตรวจ
          </span>
        ) : (
          <>
            {/* The exact sentence the team wrote out as the target:
                "เลือก 2 รายการ · เจาะ 2 หลอด (EDTA, Fluoride) · ต้องงดอาหาร 8 ชม." */}
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <span
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontWeight: 'var(--type-weight-medium)',
                  fontSize: 'var(--type-size-sm)',
                  color: 'var(--text-content-default)',
                }}
              >
                เลือก {summary.testCount} รายการ
              </span>
              <span style={{ color: 'var(--text-content-quaternary)' }}>·</span>
              <span
                className='inline-flex items-center flex-wrap'
                style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}
              >
                เจาะ {summary.tubeCount} หลอด (
                {summary.tubes.map((t, i) => (
                  <React.Fragment key={t.tube.key}>
                    {i > 0 && <span style={{ color: 'var(--text-content-quaternary)' }}>,</span>}
                    <LabTubeDot tube={t.tube} count={t.count} size={8} />
                  </React.Fragment>
                ))}
                )
              </span>
              {summary.fastingHours > 0 && (
                <>
                  <span style={{ color: 'var(--text-content-quaternary)' }}>·</span>
                  <span
                    className='inline-flex items-center'
                    style={{
                      gap: 'var(--dim-space-100)',
                      fontFamily: 'var(--type-family-body)',
                      fontWeight: 'var(--type-weight-medium)',
                      fontSize: 'var(--type-size-sm)',
                      color: 'var(--text-statusbadge-warning, #C2410C)',
                    }}
                  >
                    <Icon name='schedule' size={14} />
                    ต้องงดอาหาร {summary.fastingHours} ชม.
                  </span>
                </>
              )}
            </div>

            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              ปริมาตรที่ต้องเก็บรวม {summary.volumeMl} mL · ยอดรวม {summary.totalPrice.toLocaleString('th-TH')} บาท
              {patientName ? ` · ${patientName}` : ''}
            </span>

            {/* Fasting is the condition that sends a patient home unserved,
                so when it applies it gets its own alert rather than only the
                inline chip above. */}
            {summary.fastingHours > 0 && (
              <Alert
                type='warning'
                iconName='schedule'
                iconFill={1}
                title={`ผู้ป่วยต้องงดอาหารก่อนตรวจ ${summary.fastingHours} ชั่วโมง`}
                subtext='แจ้งผู้ป่วยและนัดเวลาเจาะเลือดให้ตรงเงื่อนไข มิฉะนั้นผลตรวจจะใช้ไม่ได้'
                showBadge={false}
                showIndicator={false}
                showDetail={false}
              />
            )}

            {/* Roll-up of the inline repeat warnings — the doctor may have
                scrolled past the one that matters. Ordering anyway is
                allowed (TOR requires the warning, not a hard block), so this
                informs rather than prevents. */}
            {selectedRepeats.length > 0 && (
              <Alert
                type='warning'
                iconName='content_copy'
                iconFill={1}
                title={`มี ${selectedRepeats.length} รายการที่เพิ่งตรวจไปไม่นาน`}
                subtext={selectedRepeats
                  .map((id) => `${LAB_TEST_BY_ID[id].nameEn} (${warnings[id].daysAgo} วันก่อน · รอบแนะนำ ${repeatWindowDays(id)} วัน)`)
                  .join(' · ')}
                showBadge={false}
                showIndicator={false}
                showDetail={false}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LabOrderPicker;
