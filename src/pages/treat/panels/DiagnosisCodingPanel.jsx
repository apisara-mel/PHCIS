import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import TabPill from '@/components/tab/TabPill';
import InputField from '@/components/forms/InputField';
import DiagTypeSelect from '@/components/forms/DiagTypeSelect';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import {
  PanelCard, PanelEmptyState, PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, GuardedAction, AccessDeniedPanel, PanelAlert, CountLabel,
} from '@/pages/treat/panels/panelHooks';
import {
  CODE_SYSTEMS, codeSystemMeta, searchSnomed, icd10ForSnomed, snomedForIcd10,
  EXTERNAL_CAUSE_SUGGESTIONS, UNCODED_LABEL,
} from '@/data/treatmentSnomed';
import { DIAGNOSIS_TYPE_OPTIONS, resolveDiagnosisType } from '@/data/treatmentVisits';
import { appendAudit } from '@/data/treatmentAudit';

/* PHCIS | EMR §1.4.5.2 / §1.4.5.3 / §1.4.5.4 — การลงรหัสวินิจฉัย.
   ยกระดับตาราง ICD เดิมของ Step 4 (ไม่รื้อ) ด้วย:
     • สลับระบบรหัส ICD-10 ↔ SNOMED-CT พร้อม cross-map สองทาง
     • ประเภทการวินิจฉัยครบ 4 แบบที่ TOR ระบุ — Principle / Comorbid /
       Complication / External Cause (DIAGNOSIS_TYPE_OPTIONS มีครบอยู่แล้ว
       พร้อม badge tone ต่างกัน) + กฎ "ต้องมี Principle เพียงหนึ่งเดียว"
     • ค้นไม่พบ → บันทึกเป็นข้อความตาม UNCODED_LABEL แล้วติดป้ายเตือน

   ข้อจำกัดตามจริง: cross-map เป็นตารางเทียบใน treatmentSnomed.js
   (ชุดตัวอย่าง) ยังไม่ใช่ SNOMED CT release ฉบับเต็ม. */

const SEARCH_SYSTEMS = CODE_SYSTEMS.filter((s) => s.key !== 'both');

const DiagnosisCodingPanel = ({ form, setForm, patient }) => {
  const access = useTreatmentAccess();
  const hn = patient?.hn || '';

  const [system, setSystem] = useState('icd10');
  const [query, setQuery] = useState('');
  const [uncodedOpen, setUncodedOpen] = useState(false);
  const [uncodedText, setUncodedText] = useState('');
  const [principleGuard, setPrincipleGuard] = useState(null);
  const [externalTarget, setExternalTarget] = useState(null);

  const rows = form?.diagnoses || [];

  const snomedHits = useMemo(
    () => (system === 'snomed' ? searchSnomed(query) : []),
    [system, query],
  );

  const principleRows = rows.filter((r) => r.type === 'principle');

  const setRows = (updater) => setForm((f) => ({
    ...f,
    diagnoses: typeof updater === 'function' ? updater(f.diagnoses || []) : updater,
  }));

  /* เพิ่มจาก SNOMED — เขียนทั้งรหัส SNOMED และ ICD-10 คู่ (ถ้ามี) */
  const addSnomed = (concept) => {
    const icd = icd10ForSnomed(concept.code);
    setRows((rs) => {
      if (rs.some((r) => r.snomedCode === concept.code)) return rs;
      return [...rs, {
        id: `dx-sn-${concept.code}`,
        code: icd || UNCODED_LABEL,
        snomedCode: concept.code,
        system: 'SNOMED-CT',
        name: `${concept.termTh} (${concept.term})`,
        type: rs.some((r) => r.type === 'principle') ? 'comorbidity' : 'principle',
      }];
    });
    appendAudit({
      hn, category: 'diagnosis', field: `ลงรหัส SNOMED-CT ${concept.code}`,
      oldValue: '—',
      newValue: `${concept.termTh} · cross-map ICD-10: ${icd || 'ไม่มีรหัสคู่'}`,
    });
    setQuery('');
  };

  /* บันทึกเป็นข้อความเมื่อค้นไม่พบ */
  const addUncoded = () => {
    if (!uncodedText.trim()) return;
    setRows((rs) => [...rs, {
      id: `dx-un-${Date.now()}`,
      code: '',
      system: codeSystemMeta(system).label,
      name: uncodedText.trim(),
      type: rs.some((r) => r.type === 'principle') ? 'comorbidity' : 'principle',
      uncoded: true,
    }]);
    appendAudit({
      hn, category: 'diagnosis', field: 'บันทึกการวินิจฉัยแบบยังไม่ระบุรหัส',
      oldValue: '—', newValue: `${uncodedText.trim()} (${UNCODED_LABEL})`,
    });
    setUncodedText('');
    setUncodedOpen(false);
  };

  /* กฎ Principle เดียว — เปลี่ยนประเภทแล้วชนต้องถามก่อน ไม่เงียบ */
  const changeType = (row, nextType) => {
    if (nextType === 'principle') {
      const existing = rows.find((r) => r.type === 'principle' && r.id !== row.id);
      if (existing) { setPrincipleGuard({ row, existing }); return; }
    }
    applyType(row, nextType);
  };

  const applyType = (row, nextType, demoteId) => {
    setRows((rs) => rs.map((r) => {
      if (r.id === row.id) return { ...r, type: nextType };
      if (demoteId && r.id === demoteId) return { ...r, type: 'comorbidity' };
      return r;
    }));
    appendAudit({
      hn, category: 'diagnosis', field: `ประเภทการวินิจฉัย (${row.code || row.name})`,
      oldValue: resolveDiagnosisType(row.type).label,
      newValue: resolveDiagnosisType(nextType).label,
    });
    if (nextType === 'externalCause') setExternalTarget(row);
  };

  const removeRow = (row) => {
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    appendAudit({
      hn, category: 'diagnosis', field: `ลบรหัสการวินิจฉัย ${row.code || row.name}`,
      oldValue: row.name, newValue: 'ลบออกจากการวินิจฉัยของ visit นี้',
    });
  };

  const columns = [
    {
      key: 'code', header: 'รหัส', width: 190,
      render: (row) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          {row.uncoded || !row.code ? (
            <StatusBadge style='warning' size='small' icon='help'>{UNCODED_LABEL}</StatusBadge>
          ) : (
            <ColorfulBadge style='blue' size='small' width='hug' hierarchy='primary'>{row.code}</ColorfulBadge>
          )}
          {row.snomedCode ? (
            <ColorfulBadge style='purple' size='small' width='hug'>SNOMED {row.snomedCode}</ColorfulBadge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'name', header: 'การวินิจฉัย', flex: 1,
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={PANEL_VALUE_STYLE}>{row.name}</span>
          {/* cross-map สองทาง — แสดงตรง ๆ ว่ามีคู่หรือไม่มี ไม่เดารหัสให้ */}
          {row.snomedCode ? (
            <span style={PANEL_LABEL_STYLE}>
              {icd10ForSnomed(row.snomedCode)
                ? `เทียบ ICD-10: ${icd10ForSnomed(row.snomedCode)}`
                : 'ไม่มีรหัส ICD-10 ที่เทียบได้ในตาราง cross-map — ต้องลงรหัสเอง'}
            </span>
          ) : row.code ? (
            <span style={PANEL_LABEL_STYLE}>
              {snomedForIcd10(row.code).length
                ? `เทียบ SNOMED-CT: ${snomedForIcd10(row.code).map((c) => c.code).join(', ')}`
                : 'ไม่มีรหัส SNOMED-CT ที่เทียบได้ในตาราง cross-map'}
            </span>
          ) : null}
          {row.externalCauseNote ? (
            <span style={PANEL_LABEL_STYLE}>สาเหตุภายนอก: {row.externalCauseNote}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'type', header: 'ประเภทการวินิจฉัย', width: 280,
      render: (row) => (
        <DiagTypeSelect
          value={row.type}
          onChange={(v) => changeType(row, v)}
          pickedText={row.name}
          label=''
          disabled={!access.canEdit}
        />
      ),
    },
    {
      key: 'actions', header: '', width: 110,
      render: (row) => (
        <GuardedAction allowed={access.canEdit}>
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='delete' onClick={() => removeRow(row)}>
            ลบ
          </NeutralSubdueButton>
        </GuardedAction>
      ),
    },
  ];

  /* โหมด "ไม่มีสิทธิ์" — รหัสวินิจฉัยเป็นข้อมูลอ่อนไหวที่สุดของ visit
     จึงต้องถูกกันเหมือนทุก panel พี่น้อง ไม่ใช่แสดงเต็มขณะที่รอบ ๆ ถูกปิด */
  if (!access.canView) return <AccessDeniedPanel what='การลงรหัสวินิจฉัย' />;

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      <PanelCard
        title='การลงรหัสวินิจฉัย (ICD-10 และ SNOMED-CT)'
        subtitle='เลือกระบบรหัสที่ต้องการค้น — ระบบจะแสดงรหัสคู่ (cross-map) ให้อัตโนมัติทั้งสองทาง'
        action={<CountLabel n={rows.length} />}
      >
        {/* สลับระบบรหัส */}
        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {SEARCH_SYSTEMS.map((s) => (
            <TabPill key={s.key} selected={system === s.key} onClick={() => { setSystem(s.key); setQuery(''); }}>
              {s.label}
            </TabPill>
          ))}
        </div>

        {system === 'snomed' ? (
          <>
            <InputField
              label='ค้นหา SNOMED-CT'
              value={query}
              onChange={setQuery}
              leadingIcon='search'
              disabled={!access.canEdit}
              placeholder='พิมพ์รหัส หรือชื่อโรคภาษาไทย/อังกฤษ เช่น เบาหวาน หรือ Asthma'
              helperText='เลือกรายการที่ตรงเพื่อเพิ่มเข้าการวินิจฉัยของ visit นี้'
            />
            {query.trim() && snomedHits.length === 0 ? (
              <PanelEmptyState
                icon='search_off'
                title={`ไม่พบรหัส SNOMED-CT ที่ตรงกับ "${query}"`}
                subtitle='ลองพิมพ์คำที่สั้นลง หรือบันทึกเป็นข้อความไว้ก่อนแล้วกลับมาลงรหัสภายหลัง'
                action={
                  <GuardedAction allowed={access.canEdit}>
                    <NeutralSubdueButton
                      variant='outline'
                      size='sm'
                      leadingIcon='edit_note'
                      onClick={() => { setUncodedText(query); setUncodedOpen(true); }}
                    >
                      บันทึกเป็นข้อความ ({UNCODED_LABEL})
                    </NeutralSubdueButton>
                  </GuardedAction>
                }
              />
            ) : null}
            {snomedHits.length > 0 ? (
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {snomedHits.slice(0, 8).map((c) => {
                  const icd = icd10ForSnomed(c.code);
                  return (
                    <button
                      key={c.code}
                      type='button'
                      disabled={!access.canEdit}
                      onClick={() => addSnomed(c)}
                      className='flex flex-wrap items-center justify-between w-full text-left'
                      style={{
                        gap: 'var(--dim-space-200, 8px)',
                        borderRadius: 'var(--dim-radius-300, 10px)',
                        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                        background: 'var(--surface-neutral-quaternary, #F9FBFB)',
                        paddingTop: 'var(--dim-space-300, 12px)',
                        paddingRight: 'var(--dim-space-300, 12px)',
                        paddingBottom: 'var(--dim-space-300, 12px)',
                        paddingLeft: 'var(--dim-space-300, 12px)',
                        cursor: access.canEdit ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <span className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                        <span style={PANEL_VALUE_STYLE}>{c.termTh}</span>
                        <span style={PANEL_LABEL_STYLE}>{c.term}</span>
                      </span>
                      <span className='flex flex-wrap items-center shrink-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                        <ColorfulBadge style='purple' size='small' width='hug'>SNOMED {c.code}</ColorfulBadge>
                        {icd
                          ? <ColorfulBadge style='blue' size='small' width='hug'>ICD-10 {icd}</ColorfulBadge>
                          : <StatusBadge style='warning' size='small' icon='link_off'>ไม่มีรหัส ICD-10 คู่</StatusBadge>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : (
          <PanelAlert tone='info' icon='info' title='โหมด ICD-10'>
            ใช้ช่องค้นหา Doctor AI ด้านบนของขั้นตอนวินิจฉัยเพื่อค้นรหัส ICD-10 ตามเดิม —
            ตารางด้านล่างจะแสดงรหัส SNOMED-CT ที่เทียบได้ให้อัตโนมัติ
            หากค้นไม่พบให้บันทึกเป็นข้อความไว้ก่อน
            <span style={{ display: 'block', marginTop: 'var(--dim-space-200, 8px)' }}>
              <GuardedAction allowed={access.canEdit}>
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='edit_note' onClick={() => setUncodedOpen(true)}>
                  บันทึกเป็นข้อความ ({UNCODED_LABEL})
                </NeutralSubdueButton>
              </GuardedAction>
            </span>
          </PanelAlert>
        )}
      </PanelCard>

      <PanelCard
        title='ประเภทการวินิจฉัยของการตรวจครั้งนี้'
        subtitle='TOR กำหนดให้ระบุได้ครบ 4 แบบ — โรคหลัก (Principle) · โรคร่วม (Co-morbidity) · โรคแทรก (Complication) · สาเหตุภายนอก (External Cause)'
      >
        {/* กฎ Principle เดียว */}
        {principleRows.length === 0 && rows.length > 0 ? (
          <PanelAlert tone='warning' icon='error' title='ยังไม่ได้ระบุการวินิจฉัยโรคหลัก'>
            การตรวจแต่ละครั้งต้องมี PRINCIPLE DX (การวินิจฉัยโรคหลัก) หนึ่งรายการเสมอ — เลือกจากคอลัมน์ "ประเภทการวินิจฉัย"
          </PanelAlert>
        ) : null}
        {principleRows.length > 1 ? (
          <PanelAlert tone='error' icon='dangerous' title={`มีการวินิจฉัยโรคหลักซ้ำ ${principleRows.length} รายการ`}>
            ต้องเหลือ PRINCIPLE DX เพียงรายการเดียว: {principleRows.map((r) => r.name).join(' · ')}
          </PanelAlert>
        ) : null}
        {rows.some((r) => r.uncoded || !r.code) ? (
          <PanelAlert tone='warning' icon='help' title='มีการวินิจฉัยที่ยังไม่ได้ลงรหัส'>
            {rows.filter((r) => r.uncoded || !r.code).map((r) => r.name).join(' · ')} — ต้องกลับมาลงรหัสก่อนส่งข้อมูลเบิกจ่าย
          </PanelAlert>
        ) : null}

        {rows.length === 0 ? (
          <PanelEmptyState
            icon='clinical_notes'
            title='ยังไม่มีบันทึกรหัสการวินิจฉัย'
            subtitle='ค้นรหัสจากช่องด้านบน หรือใช้ Doctor AI ค้น ICD-10 แล้วรายการจะมาแสดงที่นี่'
          />
        ) : (
          <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
            <Table columns={columns} rows={rows} rowKey={(r) => r.id || r.code} />
          </div>
        )}

        {/* สรุปประเภทที่ใช้ */}
        {rows.length > 0 ? (
          <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {DIAGNOSIS_TYPE_OPTIONS.filter((o) => rows.some((r) => r.type === o.value)).map((o) => (
              <ColorfulBadge key={o.value} style={o.badgeStyle} size='small' width='hug'>
                {o.labelTh} {rows.filter((r) => r.type === o.value).length}
              </ColorfulBadge>
            ))}
          </div>
        ) : null}
      </PanelCard>

      {/* กันเลือก Principle มากกว่าหนึ่ง */}
      <AlertDialog
        open={!!principleGuard}
        type='warning'
        title='มีการวินิจฉัยโรคหลักอยู่แล้ว'
        description={
          principleGuard
            ? `"${principleGuard.existing.name}" ถูกกำหนดเป็น PRINCIPLE DX อยู่แล้ว — การตรวจแต่ละครั้งมีโรคหลักได้เพียงหนึ่งเดียว\n\nต้องการย้ายโรคหลักมาที่ "${principleGuard.row.name}" และเปลี่ยนรายการเดิมเป็น CO-MORBIDITY หรือไม่`
            : ''
        }
        confirmLabel='ย้ายโรคหลักมาที่รายการนี้'
        cancelLabel='คงไว้ตามเดิม'
        onConfirm={() => {
          applyType(principleGuard.row, 'principle', principleGuard.existing.id);
          setPrincipleGuard(null);
        }}
        onCancel={() => setPrincipleGuard(null)}
        onClose={() => setPrincipleGuard(null)}
      />

      {/* บันทึกเป็นข้อความเมื่อค้นไม่พบ */}
      <AlertDialog
        open={uncodedOpen}
        type='info'
        title={`บันทึกการวินิจฉัยเป็นข้อความ (${UNCODED_LABEL})`}
        description='ใช้เมื่อยังหารหัสที่ตรงไม่ได้ — ระบบจะติดป้ายเตือนไว้ว่ายังไม่ลงรหัส และให้กลับมาลงรหัสภายหลังได้'
        confirmLabel='บันทึกเป็นข้อความ'
        cancelLabel='ยกเลิก'
        onConfirm={addUncoded}
        onCancel={() => { setUncodedText(''); setUncodedOpen(false); }}
        onClose={() => setUncodedOpen(false)}
      >
        <InputField
          label='ข้อความการวินิจฉัย'
          required
          value={uncodedText}
          onChange={setUncodedText}
          showLeadingIcon={false}
          placeholder='เช่น ปวดท้องด้านขวาล่าง ยังไม่สามารถระบุสาเหตุได้'
          error={uncodedText.trim() ? undefined : 'ต้องระบุข้อความการวินิจฉัย'}
        />
      </AlertDialog>

      {/* External Cause ต้องมีบันทึกสาเหตุ */}
      <AlertDialog
        open={!!externalTarget}
        type='info'
        title='บันทึกรายละเอียดสาเหตุภายนอก (External Cause)'
        description={externalTarget ? `${externalTarget.name} — TOR กำหนดให้รหัสสาเหตุภายนอกต้องมีคำอธิบายเหตุการณ์ประกอบ` : ''}
        confirmLabel='บันทึก'
        cancelLabel='ข้ามไปก่อน'
        onConfirm={() => {
          setRows((rs) => rs.map((r) => (
            r.id === externalTarget.id ? { ...r, externalCauseNote: form?.externalCauseDraft || '' } : r
          )));
          setForm((f) => ({ ...f, externalCauseDraft: '' }));
          setExternalTarget(null);
        }}
        onCancel={() => setExternalTarget(null)}
        onClose={() => setExternalTarget(null)}
      >
        <SuggestibleTextarea
          voice
          label='รายละเอียดเหตุการณ์'
          value={form?.externalCauseDraft || ''}
          onChange={(e) => setForm((f) => ({
            ...f, externalCauseDraft: typeof e === 'string' ? e : e?.target?.value ?? '',
          }))}
          suggestions={EXTERNAL_CAUSE_SUGGESTIONS}
          minChars={2}
          height={120}
          minHeight={88}
          popoverAriaLabel='ตัวอย่างสาเหตุภายนอก'
          placeholder='ระบุลักษณะเหตุการณ์ สถานที่ และกลไกการบาดเจ็บ'
        />
      </AlertDialog>
    </div>
  );
};

export default DiagnosisCodingPanel;
