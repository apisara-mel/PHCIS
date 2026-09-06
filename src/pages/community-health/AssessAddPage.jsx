import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Textarea from '@/components/forms/Textarea';
import RadioGroup from '@/components/radio/RadioGroup';
import CheckboxGroup from '@/components/checkbox/CheckboxGroup';
import PhotoUploadField from '@/components/forms/PhotoUploadField';
import { SectionTitle, FieldGrid, Field } from '@/components/forms/Fields';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import { PHCIS_CURRENT_USER } from '@/data/phcisCurrentUser';
import CommunityLayout from './CommunityLayout';
import { CommunityCard } from './communityShared';
import {
  DISTRICT_OPTIONS,
  SUBDISTRICT_BY_DISTRICT,
  COMMUNITY_BY_SUBDISTRICT,
  COMMUNITY_META,
  INFO_TYPE_OPTIONS,
  PIN_STATUS_OPTIONS,
  RESIDENCE_TYPE_OPTIONS,
  SURVEY_CONDITION_OPTIONS,
  INFORMANT_OPTIONS,
  SANITATION_CRITERIA,
  SANITATION_LEVELS,
  RISK_ISSUE_OPTIONS,
  ANIMAL_ROWS,
  ASSESS_RESULT_OPTIONS,
} from './communityAssessData';

/* เพิ่มการประเมิน (ประเมินสภาพแวดล้อมและสุขาภิบาล) — ported from claude/Community
   assess-add.html. Source is a single scrollable form with progressive
   disclosure ("data-gate" sections revealed once เขต/ชุมชน is chosen), NOT a
   step wizard — no "ถัดไป" in the source footer, only ยกเลิก / บันทึก — so
   this stays one CommunityCard per source `.formcard`, using the same
   Section/Field primitives as the Registration MR form (`@/components/forms/
   Fields`) instead of inventing new form chrome. The 13 sukapiban criteria
   (source `.fgrid--3` selects of ดี/พอใช้/ควรปรับปรุง) become RadioGroup rows
   per CLAUDE.md's checkbox/radio-first rule; the multi-select risk-issue list
   becomes CheckboxGroup. */

const emptyAnimalRow = () => ({ count: '', vac: '', neuter: '' });

const INITIAL_FORM = {
  district: '',
  subdistrict: '',
  community: '',
  infoType: '',
  pinStatus: '',
  resType: '',
  surveyCond: '',
  informant: '',
  sanitation: {},
  riskIssues: [],
  animals: { dog: emptyAnimalRow(), cat: emptyAnimalRow(), other: emptyAnimalRow() },
  surveyDate: '',
  result: '',
  note: '',
};

const InfoRow = ({ label, value }) => (
  <div
    className='flex items-center justify-between w-full'
    style={{ paddingTop: 'var(--dim-space-150, 6px)', paddingBottom: 'var(--dim-space-150, 6px)' }}
  >
    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary, #858C92)' }}>
      {label}
    </span>
    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-content-default, #363B3F)' }}>
      {value}
    </span>
  </div>
);

const AssessAddPage = () => {
  const history = useHistory();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); };
  const clearError = (key) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));

  const subdistrictOptions = form.district ? (SUBDISTRICT_BY_DISTRICT[form.district] || []) : [];
  const communityOptions = form.subdistrict ? (COMMUNITY_BY_SUBDISTRICT[form.subdistrict] || []) : [];
  const meta = COMMUNITY_META[form.community];

  const onDistrictChange = (v) => { set({ district: v, subdistrict: '', community: '' }); clearError('district'); };
  const onSubdistrictChange = (v) => { set({ subdistrict: v, community: '' }); clearError('subdistrict'); };
  const onCommunityChange = (v) => { set({ community: v }); clearError('community'); };

  const setSanitation = (key, value) => set({ sanitation: { ...form.sanitation, [key]: value } });
  const setAnimal = (key, field, value) => set({ animals: { ...form.animals, [key]: { ...form.animals[key], [field]: value } } });

  /* ผลรวมเกณฑ์สุขาภิบาล — สรุปให้ผู้ใช้เห็นก่อนเลือก "ผลการประเมิน" เอง
     (ที่มา assess-add.html ไม่ auto-derive ผลจาก checklist ผู้ประเมินเลือกเอง) */
  const sanitationSummary = useMemo(() => {
    const values = Object.values(form.sanitation);
    const answered = values.length;
    const needsImprove = values.filter((v) => v === 'ควรปรับปรุง').length;
    return { answered, total: SANITATION_CRITERIA.length, needsImprove };
  }, [form.sanitation]);

  const validate = () => {
    const next = {};
    if (!form.district) next.district = 'กรุณาระบุเขต';
    if (!form.subdistrict) next.subdistrict = 'กรุณาระบุแขวง';
    if (!form.community) next.community = 'กรุณาระบุชุมชนที่ประเมิน';
    if (!form.surveyDate) next.surveyDate = 'กรุณาระบุวันที่สำรวจ';
    if (!form.result) next.result = 'กรุณาระบุผลการประเมิน';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const leaveToList = () => history.push('/community-health/assess');

  const onCancel = () => {
    if (dirty) setCancelOpen(true);
    else leaveToList();
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    if (!validate()) return;
    setSaving(true);
    /* Prototype save — no backend; mirrors source's setTimeout-then-dialog flow. */
    window.setTimeout(() => {
      setSaving(false);
      setDirty(false);
      setSuccessOpen(true);
    }, 500);
  };

  return (
    <CommunityLayout activeKey='assess' breadcrumb={['การประเมิน', 'เพิ่มการประเมิน']}>
      <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <BrandSubdueButton variant='outline' size='md' leadingIcon='arrow_back' onClick={onCancel}>
          กลับ
        </BrandSubdueButton>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
            fontSize: 'var(--type-size-lg, 18px)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-medium, 500))',
            color: 'var(--text-topic-tertiary-title, #363B3F)',
          }}
        >
          เพิ่มการประเมิน
        </h1>
      </div>

      <form onSubmit={onSubmit} noValidate className='flex flex-col' style={{ gap: 'var(--dim-space-600, 24px)' }}>
        <CommunityCard>
          <SectionTitle icon='location_on'>เลือกพื้นที่ประเมิน</SectionTitle>
          <p style={{ margin: 0, marginTop: 'calc(-1 * var(--dim-space-300, 12px))', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            ประเมินทั้งชุมชนเป็นหนึ่งเขตประเมิน — เลือก “เขต” ก่อน ระบบจะแสดงรายการแขวงและชุมชนในเขตนั้น
          </p>

          <FieldGrid cols={2}>
            <Field label='เขต' required>
              <Select
                placeholder='-- เลือก --'
                value={form.district}
                onChange={onDistrictChange}
                options={DISTRICT_OPTIONS}
                error={errors.district}
              />
            </Field>
          </FieldGrid>

          {form.district && (
            <FieldGrid cols={2}>
              <Field label='แขวง' required>
                <Select
                  placeholder='-- เลือก --'
                  value={form.subdistrict}
                  onChange={onSubdistrictChange}
                  options={subdistrictOptions}
                  error={errors.subdistrict}
                />
              </Field>
              <Field label='ชุมชนที่ประเมิน' required>
                <Select
                  placeholder='-- เลือก --'
                  value={form.community}
                  onChange={onCommunityChange}
                  options={communityOptions}
                  disabled={!form.subdistrict}
                  error={errors.community}
                />
              </Field>
            </FieldGrid>
          )}

          {form.community && (
            <FieldGrid cols={2}>
              <Field label='พื้นที่ / ที่ตั้ง'>
                <InputField value={meta?.area || ''} readOnly disabled showLeadingIcon={false} />
              </Field>
              <Field label='พิกัด (GPS)'>
                <InputField value={meta?.geo || ''} readOnly disabled showLeadingIcon={false} />
              </Field>
            </FieldGrid>
          )}

          {meta && (
            <div
              className='flex flex-col w-full'
              style={{
                padding: 'var(--dim-space-400, 16px)',
                borderRadius: 'var(--dim-radius-300, 10px)',
                background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
              }}
            >
              <SectionTitle icon='groups'>ข้อมูลประชากรในชุมชน (ภาพรวมทั้งชุมชน)</SectionTitle>
              <div style={{ marginTop: 'var(--dim-space-200, 8px)' }}>
                <InfoRow label='ประชากรทั้งหมด' value={meta.popTotal} />
                <InfoRow label='จำนวนครัวเรือน' value={meta.popHh} />
                <InfoRow label='ผู้สูงอายุ (60 ปีขึ้นไป)' value={meta.popElder} />
                <InfoRow label='เด็กเล็ก (0 - 5 ปี)' value={meta.popChild} />
                <InfoRow label='ผู้ป่วยติดเตียง' value={meta.popBed} />
              </div>
            </div>
          )}
        </CommunityCard>

        {form.community && (
          <>
            <CommunityCard>
              <SectionTitle icon='info'>ข้อมูลทั่วไป</SectionTitle>
              <FieldGrid cols={3}>
                <Field label='ประเภทการได้รับข้อมูล'>
                  <Select placeholder='-- เลือก --' value={form.infoType} onChange={(v) => set({ infoType: v })} options={INFO_TYPE_OPTIONS} />
                </Field>
                <Field label='สถานะการปักหมุดชุมชน'>
                  <Select placeholder='-- เลือก --' value={form.pinStatus} onChange={(v) => set({ pinStatus: v })} options={PIN_STATUS_OPTIONS} />
                </Field>
                <Field label='ประเภทที่อยู่อาศัย'>
                  <Select placeholder='-- เลือก --' value={form.resType} onChange={(v) => set({ resType: v })} options={RESIDENCE_TYPE_OPTIONS} />
                </Field>
                <Field label='สถานการณ์การสำรวจ'>
                  <Select placeholder='-- เลือก --' value={form.surveyCond} onChange={(v) => set({ surveyCond: v })} options={SURVEY_CONDITION_OPTIONS} />
                </Field>
                <Field label='ผู้ให้ข้อมูลเป็น'>
                  <Select placeholder='-- เลือก --' value={form.informant} onChange={(v) => set({ informant: v })} options={INFORMANT_OPTIONS} />
                </Field>
              </FieldGrid>
            </CommunityCard>

            <CommunityCard>
              <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <SectionTitle icon='eco'>สุขาภิบาลในชุมชนและสิ่งแวดล้อม</SectionTitle>
                <span
                  style={{
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs, 12px)',
                    color: sanitationSummary.needsImprove > 0 ? 'var(--text-danger-secondary, #DC2626)' : 'var(--text-content-tertiary, #858C92)',
                  }}
                >
                  ประเมินแล้ว {sanitationSummary.answered}/{sanitationSummary.total} ข้อ
                  {sanitationSummary.needsImprove > 0 ? ` · ควรปรับปรุง ${sanitationSummary.needsImprove} ข้อ` : ''}
                </span>
              </div>
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                {SANITATION_CRITERIA.map((c) => (
                  <RadioGroup
                    key={c.key}
                    legend={c.label}
                    direction='row'
                    options={SANITATION_LEVELS}
                    value={form.sanitation[c.key]}
                    onChange={(v) => setSanitation(c.key, v)}
                    name={`sanitation-${c.key}`}
                  />
                ))}
              </div>
            </CommunityCard>

            <CommunityCard>
              <SectionTitle icon='warning'>ปัจจัยเสี่ยง / ประเด็นที่พบ</SectionTitle>
              <CheckboxGroup
                options={RISK_ISSUE_OPTIONS}
                value={form.riskIssues}
                onChange={(v) => set({ riskIssues: v })}
                name='issue'
              />
            </CommunityCard>

            <CommunityCard>
              <SectionTitle icon='pets'>จำนวนสัตว์เลี้ยงและการดูแล</SectionTitle>
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                {ANIMAL_ROWS.map((row) => (
                  <div key={row.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-content-default, #363B3F)' }}>
                      {row.label}
                    </span>
                    <FieldGrid cols={3}>
                      <Field label='จำนวน (ตัว)'>
                        <InputField type='number' min={0} placeholder='ระบุ' value={form.animals[row.key].count} onChange={(v) => setAnimal(row.key, 'count', v)} showLeadingIcon={false} />
                      </Field>
                      <Field label='ต้องการฉีดวัคซีน (ตัว)'>
                        <InputField type='number' min={0} placeholder='ระบุ' value={form.animals[row.key].vac} onChange={(v) => setAnimal(row.key, 'vac', v)} showLeadingIcon={false} />
                      </Field>
                      <Field label='ต้องการทำหมัน (ตัว)'>
                        <InputField type='number' min={0} placeholder='ระบุ' value={form.animals[row.key].neuter} onChange={(v) => setAnimal(row.key, 'neuter', v)} showLeadingIcon={false} />
                      </Field>
                    </FieldGrid>
                  </div>
                ))}
              </div>
            </CommunityCard>

            <CommunityCard>
              <SectionTitle icon='image'>รูปภาพ / เอกสารประกอบ</SectionTitle>
              <PhotoUploadField
                label='ลากและวางรูป หรือคลิกเพื่ออัปโหลด'
                icon='upload'
                accept='image/png,image/jpeg'
                multiple
                fullWidth
                onFiles={() => setDirty(true)}
              />
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                รองรับไฟล์ PNG, JPG ขนาดไม่เกิน 10 MB ต่อไฟล์
              </span>
            </CommunityCard>

            <CommunityCard>
              <SectionTitle icon='assignment_turned_in'>ข้อมูลการสำรวจ</SectionTitle>
              <FieldGrid cols={3}>
                <Field label='วันที่สำรวจ' required>
                  <InputField type='date' value={form.surveyDate} onChange={(v) => { set({ surveyDate: v }); clearError('surveyDate'); }} error={errors.surveyDate} showLeadingIcon={false} />
                </Field>
                <Field label='ผู้สำรวจ'>
                  <InputField value={PHCIS_CURRENT_USER.displayName} readOnly disabled showLeadingIcon={false} />
                </Field>
                <Field label='ผลการประเมิน' required>
                  <Select
                    placeholder='-- เลือก --'
                    value={form.result}
                    onChange={(v) => { set({ result: v }); clearError('result'); }}
                    options={ASSESS_RESULT_OPTIONS}
                    error={errors.result}
                  />
                </Field>
              </FieldGrid>
              <FieldGrid cols={1}>
                <Field label='หมายเหตุ'>
                  <Textarea placeholder='ระบุข้อมูลเพิ่มเติมจากการประเมินครั้งนี้' rows={3} value={form.note} onChange={(v) => set({ note: v })} />
                </Field>
              </FieldGrid>
            </CommunityCard>
          </>
        )}

        {/* Sticky footer — ยกเลิก / บันทึก, matching source `.footer.footer--nodraft`
            (no "บันทึกร่าง" — this list has no draft affordance). */}
        <section
          className='flex items-center justify-end w-full sticky bottom-0'
          style={{
            gap: 'var(--dim-space-300, 12px)',
            padding: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px)',
            background: 'var(--surface-card-100, #FFFFFF)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            boxShadow: 'var(--shadow-brand-drop-bottom-200, 0 1px 4px rgba(8,167,104,0.10), 0 1px 2px rgba(8,167,104,0.08))',
            zIndex: 10,
          }}
        >
          <BrandSubdueButton type='button' variant='outline' size='lg' onClick={onCancel}>
            ยกเลิก
          </BrandSubdueButton>
          <BrandButton type='submit' size='lg' leadingIcon={saving ? undefined : 'save'} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </BrandButton>
        </section>
      </form>

      <AlertDialog
        open={cancelOpen}
        type='warning'
        title='ยกเลิกการเพิ่มการประเมิน'
        description='ข้อมูลที่กรอกไว้จะไม่ถูกบันทึก คุณต้องการยกเลิกหรือไม่?'
        cancelLabel='อยู่ต่อ'
        confirmLabel='ยกเลิกการประเมิน'
        onClose={() => setCancelOpen(false)}
        onCancel={() => setCancelOpen(false)}
        onConfirm={() => { setCancelOpen(false); leaveToList(); }}
      />

      <AlertDialog
        open={successOpen}
        type='success'
        title='บันทึกการประเมินเรียบร้อยแล้ว'
        description='ระบบบันทึกผลการประเมินสภาพแวดล้อมและสุขาภิบาลของชุมชนเรียบร้อยแล้ว'
        confirmLabel='ตกลง'
        showCancel={false}
        onClose={() => { setSuccessOpen(false); leaveToList(); }}
        onConfirm={() => { setSuccessOpen(false); leaveToList(); }}
      />
    </CommunityLayout>
  );
};

export default AssessAddPage;
