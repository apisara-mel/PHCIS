import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import DoctorAiIcdPanel from '@/components/search/DoctorAiIcdPanel';

/**
 * Popup wrapper for Doctor AI ICD-10 search.
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(pick: { code: string, name: string }) => void} props.onSelect
 * @param {string} [props.initialQuery]
 */
export default function Icd10SearchPopup({
  open,
  onClose,
  onSelect,
  initialQuery = '',
}) {
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    if (open) setQuery(initialQuery || '');
  }, [open, initialQuery]);

  const handleSubmit = (_next, picked) => {
    if (!picked) return;
    const code = picked.badge ?? picked.id;
    const name = picked.label;
    if (!code) return;
    onSelect?.({ code: String(code), name: name || '' });
    onClose?.();
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='ค้นหารหัสการวินิจฉัย (ICD10)'
      size='large'
      width={720}
      showCloseButton
    >
      <div className='flex w-full min-w-0 justify-center'>
        <DoctorAiIcdPanel
          value={query}
          onChange={setQuery}
          onSubmit={handleSubmit}
          width={640}
          dropdownInFlow
        />
      </div>
    </Popup>
  );
}
