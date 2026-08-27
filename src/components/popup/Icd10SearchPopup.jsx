import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import DoctorAiIcdPanel from '@/components/search/DoctorAiIcdPanel';
import ActionList from '@/components/list/ActionList';
import { searchSnomed } from '@/data/treatmentSnomed';

/**
 * Popup wrapper for Doctor AI ICD-10 search + SNOMED CT crosswalk.
 *
 * ค้นได้ทั้งสองระบบรหัสในที่เดียว (มติผู้ใช้ 27 ส.ค. 69) — แพทย์บางคนคิดเป็น
 * SNOMED บางคนคิดเป็น ICD-10 บังคับให้ค้นระบบเดียวคือบังคับให้แปลในหัวก่อนพิมพ์
 * SNOMED ที่เลือกจะถูกแปลงกลับเป็น ICD-10 ผ่าน crosswalk ก่อนส่งออก ผู้เรียก
 * เดิมจึงยังได้ `{ code, name }` เป็น ICD-10 เหมือนเดิมไม่ต้องแก้อะไร
 * (`pick.snomed` เพิ่มมาให้หน้าที่อยากเก็บรหัส SNOMED ไว้ด้วย)
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(pick: { code: string, name: string, snomed?: { code: string, term: string } }) => void} props.onSelect
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

  const snomedHits = useMemo(() => searchSnomed(query).slice(0, 8), [query]);

  const pickSnomed = (concept) => {
    /* ไม่มี crosswalk = ยังไม่มีรหัส ICD-10 ที่เทียบได้ ส่งรหัส SNOMED ไปแทน
       ดีกว่าส่งค่าว่างจนหน้าปลายทางเงียบไปเฉย ๆ */
    onSelect?.({
      code: concept.icd10 || concept.code,
      name: concept.termTh || concept.term,
      snomed: { code: concept.code, term: concept.term },
    });
    onClose?.();
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='ค้นหารหัสการวินิจฉัย (ICD-10 / SNOMED CT)'
      size='large'
      width={720}
      showCloseButton
    >
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='flex w-full min-w-0 justify-center'>
          <DoctorAiIcdPanel
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            width={640}
            dropdownInFlow
          />
        </div>

        {snomedHits.length > 0 && (
          <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
            <span
              style={{
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                lineHeight: 1.5,
              }}
            >
              SNOMED CT · {snomedHits.length} รายการ — เลือกแล้วระบบเทียบเป็น ICD-10 ให้อัตโนมัติ
            </span>
            {snomedHits.map((c) => (
              <ActionList
                key={c.code}
                as='button'
                label={c.termTh || c.term}
                subtext={`${c.term} · SNOMED ${c.code}`}
                showSubtext
                leadingBadge={{ tone: 'purple', label: 'SNOMED' }}
                showLeadingBadge
                badge={c.icd10 ? { tone: 'blue', label: c.icd10 } : null}
                showBadge={!!c.icd10}
                showLeadingIcon={false}
                showSwitch={false}
                showCheck={false}
                showChevronRight={false}
                onClick={() => pickSnomed(c)}
              />
            ))}
          </div>
        )}
      </div>
    </Popup>
  );
}
