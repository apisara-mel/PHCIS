import React, { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import { CONSENT_FORM_RECORDS } from '@/data/consentFormRecords';
import { buildWizardPrefillFromRecord } from '@/data/consentFormWizardContent';
import { ConsentFormViewBody } from '@/pages/consent/ConsentFormViewPopup';
import CONSENT_NAV from '@/pages/consent/consentNav';

/* PHCIS | Consent — ดูแบบฟอร์มความยินยอม (deep link /consent/forms/:id/view).
   เนื้อหาใช้ร่วมกับ ConsentFormViewPopup — จากเมนูรายการเปิดเป็น popup แทน. */

export default function ConsentFormViewPage() {
  const history = useHistory();
  const { id } = useParams();
  const [toast, setToast] = useState(null);

  const record = useMemo(
    () => CONSENT_FORM_RECORDS.find((r) => String(r.id) === String(id)) || CONSENT_FORM_RECORDS[0],
    [id],
  );

  const goCreateVersion = () => {
    history.push('/consent/forms/new', {
      prefill: buildWizardPrefillFromRecord(record, { newVersion: true }),
    });
  };

  const handleEdit = () => {
    history.push('/consent/forms/new', {
      prefill: buildWizardPrefillFromRecord(record, { newVersion: false }),
    });
  };

  return (
    <>
      <QueuePageShell
        activeKey='consent-forms'
        sidebarItems={CONSENT_NAV}
        sidebarFallbackKey='consent-forms'
        brandTitle='ระบบจัดการความยินยอม'
        breadcrumb={['แบบฟอร์มความยินยอม', 'ดูแบบฟอร์ม']}
        title={record.name}
        onBack={() => history.push('/consent/forms')}
      >
        <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)' }}>
          <ConsentFormViewBody
            record={record}
            onEdit={handleEdit}
            onCreateVersion={goCreateVersion}
            onToast={setToast}
          />
        </div>
      </QueuePageShell>
      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
