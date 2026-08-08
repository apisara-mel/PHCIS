import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import FormScopeAccessEditor from '@/components/consent/FormScopeAccessEditor';
import PharmacyDrugMetaBanner from '@/components/pharmacy/PharmacyDrugMetaBanner';
import { CONSENT_FORM_SCOPE_CATALOG } from '@/data/consentFormRecords';
import { consentScopeKey, dedupeConsentScopes, stripConsentScopes } from '@/data/consentFormScopes';

/* Pharmacy registry — pick Group Policy / สาขาย่อย / แผนก ที่อนุญาตให้สั่ง
   (same chrome as consent FormScopeViewPopup edit mode). */

const scopesToKeySet = (scopes) => new Set((scopes || []).map(consentScopeKey));

const keySetToScopes = (keys, catalog) =>
  dedupeConsentScopes(catalog.filter((s) => keys.has(consentScopeKey(s))));

const PharmacyPrescriberScopePopup = ({
  open,
  scopes = [],
  drugCode = '',
  drugName = '',
  drugImage = '',
  onClose,
  onSave,
  catalog = CONSENT_FORM_SCOPE_CATALOG,
}) => {
  const [draftKeys, setDraftKeys] = useState(() => new Set());

  const baselineScopes = useMemo(
    () => stripConsentScopes(scopes),
    [scopes],
  );

  const resetDraft = useCallback(() => {
    setDraftKeys(scopesToKeySet(baselineScopes));
  }, [baselineScopes]);

  useEffect(() => {
    if (open) resetDraft();
  }, [open, resetDraft]);

  const originalKeys = useMemo(
    () => scopesToKeySet(baselineScopes),
    [baselineScopes],
  );

  const isDirty = useMemo(() => {
    if (draftKeys.size !== originalKeys.size) return true;
    for (const key of draftKeys) {
      if (!originalKeys.has(key)) return true;
    }
    return false;
  }, [draftKeys, originalKeys]);

  const handleToggle = (scope) => {
    const key = consentScopeKey(scope);
    setDraftKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleToggleMany = (list, select) => {
    setDraftKeys((prev) => {
      const next = new Set(prev);
      list.forEach((scope) => {
        const key = consentScopeKey(scope);
        if (select) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  };

  const handleSave = () => {
    onSave?.(keySetToScopes(draftKeys, catalog));
  };

  return (
    <Popup
      open={!!open}
      onClose={onClose}
      size='extraLarge'
      title='เลือก Group Policy ที่มีสิทธิสั่งจ่ายได้'
      primaryAction={{
        label: 'บันทึก',
        onClick: handleSave,
        disabled: !isDirty,
      }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        <PharmacyDrugMetaBanner
          drugCode={drugCode}
          drugName={drugName}
          drugImage={drugImage}
        />

        <FormScopeAccessEditor
          catalog={catalog}
          selectedKeys={draftKeys}
          onToggle={handleToggle}
          onToggleMany={handleToggleMany}
          columns={2}
          showHeading={false}
          allLabel='ทุก Group Policy'
        />
      </div>
    </Popup>
  );
};

export default PharmacyPrescriberScopePopup;
