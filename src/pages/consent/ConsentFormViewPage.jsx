import React, { useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import BrandButton from '@/components/button/BrandButton';
import { StepReview } from '@/pages/consent/CreateConsentFormPage';
import { CONSENT_FORM_RECORDS } from '@/data/consentFormRecords';
import CONSENT_NAV from '@/pages/consent/consentNav';

/* PHCIS | Consent — ดูแบบฟอร์มความยินยอม (Figma 336:170901).
   The "ดู" (view) action on the form registry opens this page. Its CONTENT is
   the SAME layout as Step 3 of the create wizard (StepReview — full document
   preview + live patient-view phone), rendered read-only for an existing form.
   Reuses the shared consent shell + side menu so it never leaves the system. */

/* Registry types (Thai) → create-wizard TYPE_OPTIONS values, so StepReview
   resolves the right type label. */
const TYPE_VALUE = {
  'การวิจัย': 'research',
  'บันทึกภาพ/สื่อ': 'media',
  'การรักษา': 'treatment',
  'ผ่าตัด': 'surgical',
  'วัคซีน': 'vaccine',
  'PDPA': 'data',
};

/* Representative consent clauses shown in the preview (registry rows carry no
   clause body, so a realistic default set stands in). */
const PREVIEW_SECTIONS = [
  { id: 's1', title: 'วัตถุประสงค์ของการให้ความยินยอม', detail: 'ข้าพเจ้าได้รับคำอธิบายถึงวัตถุประสงค์ ขั้นตอน ประโยชน์ และความเสี่ยงที่อาจเกิดขึ้นจากการรักษา/หัตถการนี้จากแพทย์ผู้ดูแลอย่างครบถ้วนแล้ว' },
  { id: 's2', title: 'ความเสี่ยงและภาวะแทรกซ้อนที่อาจเกิดขึ้น', detail: 'ข้าพเจ้าเข้าใจว่าการรักษาทุกชนิดมีความเสี่ยง และอาจเกิดภาวะแทรกซ้อนที่ไม่สามารถคาดการณ์ได้ ซึ่งทีมแพทย์จะดูแลอย่างเต็มความสามารถตามมาตรฐานวิชาชีพ' },
  { id: 's3', title: 'การเปิดเผยและคุ้มครองข้อมูลส่วนบุคคล', detail: 'ข้าพเจ้ายินยอมให้สถานพยาบาลเก็บรวบรวมและใช้ข้อมูลสุขภาพเพื่อการรักษาพยาบาล ภายใต้พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)' },
  { id: 's4', title: 'สิทธิในการเพิกถอนความยินยอม', detail: 'ข้าพเจ้าทราบว่าสามารถเพิกถอนความยินยอมนี้ได้ทุกเมื่อ โดยไม่กระทบต่อสิทธิในการรับบริการอื่น ๆ' },
];

const PATIENT_FIELD_KEYS = new Set(['name', 'hn', 'doctor', 'birth']);

export default function ConsentFormViewPage() {
  const history = useHistory();
  const { id } = useParams();

  const record = useMemo(
    () => CONSENT_FORM_RECORDS.find((r) => String(r.id) === String(id)) || CONSENT_FORM_RECORDS[0],
    [id],
  );

  return (
    <QueuePageShell
      activeKey='consent-forms'
      sidebarItems={CONSENT_NAV}
      sidebarFallbackKey='consent-forms'
      brandTitle='ระบบจัดการความยินยอม'
      breadcrumb={['แบบฟอร์มความยินยอม', 'ดูแบบฟอร์ม']}
      title={record.name}
      onBack={() => history.push('/consent/forms')}
      actions={(
        <BrandButton variant='fill' size='md' leadingIcon='edit' onClick={() => history.push('/consent/forms/new')}>
          แก้ไขแบบฟอร์ม
        </BrandButton>
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)' }}>
        <StepReview
          name={record.name}
          docTitle={record.name}
          code={record.code}
          type={TYPE_VALUE[record.type] || 'general'}
          version={record.version}
          ttl='30'
          sections={PREVIEW_SECTIONS}
          patientFields={PATIENT_FIELD_KEYS}
          allowESign
        />
      </div>
    </QueuePageShell>
  );
}
