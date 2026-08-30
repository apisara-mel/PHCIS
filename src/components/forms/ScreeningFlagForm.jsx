import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { SubCard, FieldGrid, Field, Sym } from '@/components/forms/Fields';
import InputField from '@/components/forms/InputField';
import DatePicker from '@/components/forms/DatePicker';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import CheckboxButton from '@/components/checkbox/CheckboxButton';
import { formatThaiBuddhistDate, parseThaiBuddhistDate } from '@/data/registrationForm';

/**
 * Flag panel for the OPD screening step "ประวัติการแพ้ / โรคประจำตัว".
 *
 * ขั้นนี้ของหน้าคัดกรองเดิมมีเฉพาะหมวดที่เป็น "ประวัติ" (แพ้ยา · แพ้อาหาร ·
 * แพ้สารเคมี · โรคประจำตัว · อื่น ๆ) ส่วน Flag ตาม TOR ๑.๑.๑.๑๙ (VIP ·
 * ความปลอดภัย · DNR · บริจาคอวัยวะ) มีอยู่แต่ในขั้นลงทะเบียน จุดคัดกรองจึง
 * อ่านไม่เห็นและแก้ไม่ได้ ทั้งที่เป็นข้อมูลที่ต้องยืนยันซ้ำตอนซักประวัติ
 * (มติผู้ใช้ 31 ส.ค. 69) — แถบหมวดของสองหน้าจึงเป็นชุดเดียวกันเก้าใบ
 *
 * รูปทรงยึดตามแผง Flag ของ `RegistrationSteps` ตัวต่อตัว: ปุ่มการ์ดเปิด/ปิดธง
 * อยู่บนสุด แล้วรายละเอียดค่อยกางออกเมื่อธงถูกเปิด ต่างกันที่ขั้นนี้ไม่รับ
 * ไฟล์แนบ — สำเนาหนังสือแสดงเจตนา/บัตรผู้แสดงความจำนงเก็บที่ขั้นลงทะเบียน
 * ซึ่งเป็นเจ้าของเอกสาร จุดคัดกรองเพียงยืนยันว่ามีธงและรายละเอียดตรงกับที่แจ้ง
 *
 * ตัวฟอร์มขับด้วย schema เพื่อให้สี่หมวดใช้โค้ดชุดเดียวกัน — เหมือนที่
 * `HistoryListForm` รับ schema ของสามหมวดแพ้ในขั้นเดียวกันนี้
 *
 * schema:
 *   key                  รหัสหมวด (ใช้ตั้งชื่อ radio group / aria)
 *   icon, topic          ไอคอนและชื่อหมวด (ชื่อไปโผล่ที่ขั้นตรวจสอบข้อมูล)
 *   toggleLabel          ข้อความบนปุ่มการ์ดเปิด/ปิดธง
 *   panelTitle           หัวการ์ดรายละเอียด (ไม่ใส่ = ไม่มีหัว)
 *   presenceRecordName   ชื่อรายการที่ส่งให้ขั้นตรวจสอบเมื่อหมวดนี้ไม่มีตัวเลือก
 *   choices              { label, required, options: [{key,label,icon}] }
 *   fields               [{ key, label, type: 'text' | 'date', placeholder, required }]
 *   note                 { label, placeholder, suggestions, required }
 */

/* ปุ่มการ์ดของขั้นนี้ใช้ไอคอนวงกลมทรงเดียวกับ "สภาพของผู้รับบริการ" ในขั้น
   ลงทะเบียน (Figma 210:21275) */
const FlagCircleIcon = ({ icon }) => (
  <span
    className='inline-flex items-center justify-center shrink-0'
    style={{
      width: 36,
      height: 36,
      borderRadius: 'var(--dim-radius-full)',
      background: 'var(--surface-brandPrimary-quaternary)',
      color: 'var(--text-brandPrimary-default)',
    }}
  >
    <Sym name={icon} size={20} color='currentColor' />
  </span>
);

/* ทุกปุ่มในแถวเดียวกันกว้างเท่ากัน (มติผู้ใช้ 29 ส.ค. 69) — ชุดเดียวกับ
   `CHOICE_GRID` ของขั้นลงทะเบียน */
const CHOICE_GRID = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 260px))',
  gap: 'var(--dim-space-300)',
};
const CHOICE_ITEM = { width: '100%', maxWidth: '100%' };

const nonEmpty = (v) => String(v ?? '').trim().length > 0;

const ScreeningFlagForm = ({ schema, onValidityChange, onRecordsChange }) => {
  const [on, setOn] = useState(false);
  const [choiceKeys, setChoiceKeys] = useState([]);
  const [values, setValues] = useState({});
  const [note, setNote] = useState('');

  const choices = schema.choices;
  const fields = useMemo(() => schema.fields ?? [], [schema.fields]);

  const toggleChoice = useCallback((key) => (checked) => {
    setChoiceKeys((prev) => (
      checked ? [...prev.filter((k) => k !== key), key] : prev.filter((k) => k !== key)
    ));
  }, []);

  const setValue = useCallback((key) => (v) => {
    setValues((prev) => ({ ...prev, [key]: v?.target ? v.target.value : v }));
  }, []);

  /* บรรทัดสรุปของหมวด — เลขที่หนังสือ/วันที่ลงนามที่กรอกไว้ต้องอ่านได้จากขั้น
     "ตรวจสอบข้อมูล" ไม่ใช่จมอยู่ในแท็บที่ต้องกดกลับเข้าไปดู */
  const detailLine = useMemo(() => (
    fields
      .filter((f) => nonEmpty(values[f.key]))
      .map((f) => `${f.label} ${String(values[f.key]).trim()}`)
      .join(' · ')
  ), [fields, values]);

  /* ส่งให้ขั้นตรวจสอบอ่านต่อในทรงเดียวกับหมวดประวัติการแพ้ (`declaresPresence`
     + `records`) — ธงที่ปิดอยู่คือ "ไม่มี" ซึ่งเป็นคำตอบ ไม่ใช่ช่องที่ลืมกรอก */
  useEffect(() => {
    if (typeof onRecordsChange !== 'function') return;
    const names = choices
      ? choiceKeys
        .map((k) => choices.options.find((o) => o.key === k)?.label)
        .filter(Boolean)
      : [schema.presenceRecordName].filter(Boolean);
    const summary = [note.trim(), detailLine].filter(nonEmpty).join(' · ');
    onRecordsChange({
      topic: schema.topic,
      declaresPresence: on,
      records: on
        ? names.map((name, i) => ({ name, symptom: i === 0 ? summary : '' }))
        : [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, choiceKeys, detailLine, note]);

  useEffect(() => {
    if (typeof onValidityChange !== 'function') return;
    if (!on) {
      onValidityChange(true);
      return;
    }
    const choicesOk = !choices?.required || choiceKeys.length > 0;
    const fieldsOk = fields.every((f) => !f.required || nonEmpty(values[f.key]));
    const noteOk = !schema.note?.required || nonEmpty(note);
    onValidityChange(choicesOk && fieldsOk && noteOk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, choiceKeys, values, note]);

  const hasPanel = !!(choices || fields.length || schema.note);

  return (
    <section className='bg-surface-card rounded-b-card p-6 flex flex-col gap-4'>
      {/* ธงของหมวดที่เปิดอยู่ — หนึ่งแท็บมีธงเดียว ปุ่มจึงอยู่บนสุดของแผง
          และจัดกึ่งกลางให้ตรงกับแถบแท็บที่อยู่เหนือมัน (มติผู้ใช้ 30 ส.ค. 69) */}
      <div className='flex flex-wrap w-full justify-center' style={{ gap: 'var(--dim-space-300)' }}>
        <CheckboxButton
          checked={on}
          onChange={setOn}
          label={schema.toggleLabel}
          showCircleIcon
          circleIcon={<FlagCircleIcon icon={schema.icon} />}
        />
      </div>

      {on && hasPanel && (
        <SubCard surfaceTone='brandQuaternary' title={schema.panelTitle}>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            {choices && (
              <Field label={choices.label} required={choices.required}>
                <div className='w-full' style={CHOICE_GRID}>
                  {choices.options.map((o) => (
                    <CheckboxButton
                      key={o.key}
                      checked={choiceKeys.includes(o.key)}
                      onChange={toggleChoice(o.key)}
                      label={o.label}
                      style={CHOICE_ITEM}
                      showCircleIcon
                      circleIcon={<FlagCircleIcon icon={o.icon} />}
                    />
                  ))}
                </div>
              </Field>
            )}

            {fields.length > 0 && (
              <FieldGrid cols={3}>
                {fields.map((f) => (
                  <Field key={f.key} label={f.label} required={f.required}>
                    {f.type === 'date' ? (
                      <DatePicker
                        size='lg'
                        value={parseThaiBuddhistDate(values[f.key])}
                        onChange={(d) => setValue(f.key)(d ? formatThaiBuddhistDate(d) : '')}
                        format={formatThaiBuddhistDate}
                        placeholder={f.placeholder || 'วว/ดด/ปปปป'}
                        showLabel={false}
                        showHelperText={false}
                      />
                    ) : (
                      <InputField
                        value={values[f.key] ?? ''}
                        onChange={setValue(f.key)}
                        placeholder={f.placeholder}
                        showLabel={false}
                      />
                    )}
                  </Field>
                ))}
              </FieldGrid>
            )}

            {schema.note && (
              <SuggestibleTextarea
                voice
                label={schema.note.label}
                required={schema.note.required}
                style={{ maxWidth: 'none', width: '100%' }}
                value={note}
                onChange={(e) => setNote(e?.target ? e.target.value : e)}
                placeholder={schema.note.placeholder}
                suggestions={schema.note.suggestions}
                minChars={1}
                height={112}
                minHeight={80}
                popoverAriaLabel={schema.note.label}
              />
            )}
          </div>
        </SubCard>
      )}
    </section>
  );
};

export default ScreeningFlagForm;
