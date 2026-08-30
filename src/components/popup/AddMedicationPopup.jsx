import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Stepper from '@/components/stepper/Stepper';
import { Field, FieldGrid } from '@/components/forms/Fields';
import InputField from '@/components/forms/InputField';
import {
  MEDICATION_NAME_OPTIONS,
  resolveMedicationImage,
} from '@/data/medicationCatalog';

/* MIH AddMedicationPopup — opens from the Step 5 "เพิ่มยา" CTAs in
   TreatmentSteps' Treatment Order section. Mirrors the medication row
   shape (MED_TABLE_COLUMNS) so the doctor fills the same fields the
   row renders. Every field below is required — labels carry the red
   asterisk and ตกลง stays disabled until they are all filled:
     • ชื่อยา        — required text
     • วิธีใช้       — required Select (Oral / Topical / Injection / Drop / Inhalation)
     • หน่วย         — required Select (เม็ด / แคปซูล / ขวด / หลอด / ml / mg)
     • ทานครั้งละ    — required number text (> 0)
     • จำนวน         — required number text (> 0)
     • ความถี่       — required Select (วันละ 1 / 2 / 3 ครั้ง · ทุก 4 / 6 / 8 / 12 ชม.)
     • เวลาใช้ยา     — required Select (ก่อน / หลัง / พร้อม อาหาร · ก่อนนอน · PRN)
     • การใช้        — required text (purpose — e.g. "ลดไข้", "บรรเทาปวด")
     • คำเตือน       — required full-width VoiceTextarea (mic + language
                        picker; WARNING_SUGGESTIONS popover after 1+ chars)

   Footer:
     • ล้างค่า — resets the form to empty.
     • ตกลง   — commits one medication row via `onConfirm`. Disabled
                until every field above is filled.

   Closing — three deliberate paths dismiss the popup: ตกลง
   (primary action commits the row), the header X (standard Popup
   affordance), or clicking outside the dialog (overlay). The
   keyboard Escape shortcut is suppressed (`closeOnEscape={false}`)
   so a stray key can not silently discard a half-typed
   prescription. The popup resets every re-open so the next visit
   starts fresh. */

/* Common medication "purpose" phrases — short descriptions of what the
   drug is being prescribed FOR. Fed into the การใช้ SuggestibleTextarea
   (voice mode) so the doctor can pick a stock indication or dictate /
   free-type a custom one. Mirrors the `purpose` strings used across
   DEFAULT_MEDICATION_ORDERS / PAST_VISIT_MEDICATIONS. */
const PURPOSE_SUGGESTIONS = [
  'ลดไข้ บรรเทาปวด',
  'บรรเทาอาการอักเสบ',
  'ลดความดันโลหิต',
  'ลดไขมันในเลือด',
  'ลดน้ำตาลในเลือด',
  'บรรเทาอาการแพ้',
  'บรรเทาไอ ขับเสมหะ',
  'บรรเทาท้องเสีย',
  'ลดกรดในกระเพาะอาหาร',
  'ป้องกันการเกิดลิ่มเลือด',
  'ฆ่าเชื้อแบคทีเรีย',
  'ขยายหลอดลม',
  'คลายกล้ามเนื้อ',
  'บำรุงร่างกาย / วิตามินเสริม',
];

/* Common warnings — fed to the คำเตือน SuggestibleTextarea so the
   doctor can pick a stock phrase or free-type a custom one. Trimmed
   list mirrors the warnings used in DEFAULT_MEDICATION_ORDERS. */
const WARNING_SUGGESTIONS = [
  'รับประทานขณะท้องว่าง',
  'รับประทานพร้อมอาหารหรือหลังอาหารทันทีเพื่อลดการระคายเคืองกระเพาะ',
  'อาจทำให้ง่วงซึม หลีกเลี่ยงการขับขี่ยานพาหนะหรือใช้เครื่องจักร',
  'ห้ามใช้ในผู้ที่แพ้ Penicillin',
  'รับประทานจนหมดตามแพทย์สั่งแม้อาการดีขึ้นแล้ว',
  'ห้ามดื่มแอลกอฮอล์ระหว่างใช้ยา',
  'ระวังในผู้ป่วยโรคไต / โรคตับ',
  'หากมีอาการแพ้ ผื่น หรือบวม หยุดใช้ยาและพบแพทย์ทันที',
];

const USAGE_OPTIONS = [
  { value: 'รับประทาน (Oral)',    label: 'รับประทาน (Oral)'    },
  { value: 'ทาภายนอก (Topical)',  label: 'ทาภายนอก (Topical)'  },
  { value: 'ฉีด (Injection)',      label: 'ฉีด (Injection)'      },
  { value: 'หยอด (Drop)',          label: 'หยอด (Drop)'          },
  { value: 'สูดดม (Inhalation)',   label: 'สูดดม (Inhalation)'   },
];

const UNIT_OPTIONS = [
  { value: 'เม็ด',    label: 'เม็ด'    },
  { value: 'แคปซูล',  label: 'แคปซูล'  },
  { value: 'ขวด',     label: 'ขวด'     },
  { value: 'หลอด',    label: 'หลอด'    },
  { value: 'ซอง',     label: 'ซอง'     },
  { value: 'ml',      label: 'ml'      },
  { value: 'mg',      label: 'mg'      },
];

const FREQUENCY_OPTIONS = [
  { value: 'วันละ 1 ครั้ง', label: 'วันละ 1 ครั้ง' },
  { value: 'วันละ 2 ครั้ง', label: 'วันละ 2 ครั้ง' },
  { value: 'วันละ 3 ครั้ง', label: 'วันละ 3 ครั้ง' },
  { value: 'วันละ 4 ครั้ง', label: 'วันละ 4 ครั้ง' },
  { value: 'ทุก 4 ชม.',     label: 'ทุก 4 ชม.'     },
  { value: 'ทุก 6 ชม.',     label: 'ทุก 6 ชม.'     },
  { value: 'ทุก 8 ชม.',     label: 'ทุก 8 ชม.'     },
  { value: 'ทุก 12 ชม.',    label: 'ทุก 12 ชม.'    },
  { value: 'เมื่อมีอาการ',   label: 'เมื่อมีอาการ (PRN)' },
];

const WHEN_OPTIONS = [
  { value: 'ก่อนอาหาร',  label: 'ก่อนอาหาร'  },
  { value: 'หลังอาหาร',  label: 'หลังอาหาร'  },
  { value: 'พร้อมอาหาร', label: 'พร้อมอาหาร' },
  { value: 'ก่อนนอน',    label: 'ก่อนนอน'    },
  { value: 'เช้า-เย็น',   label: 'เช้า-เย็น'   },
  { value: 'เมื่อมีอาการ', label: 'เมื่อมีอาการ' },
];

const ORDER_STATUS_OPTIONS = [
  { value: 'continue', label: 'Continue' },
  /* สองลักษณะคำสั่งที่เพิ่ม 31 ส.ค. 69 (มติผู้ใช้) — คำสั่งที่ให้ครั้งเดียวจบ และ
     คำสั่งฉุกเฉินที่ต้องให้ทันที ต่างจากสี่ตัวเดิมที่บอก "สถานะของคำสั่งต่อเนื่อง" */
  { value: 'one-time', label: 'รายครั้ง (One-time)' },
  { value: 'stat', label: 'ฉุกเฉิน — ให้ทันที (STAT)' },
  { value: 'discontinue', label: 'Discontinue' },
  { value: 'completed', label: 'Completed' },
  { value: 'on-hold', label: 'On hold' },
];

const EFFECTIVE_MODE_OPTIONS = [
  { value: 'immediate', label: 'มีผลทันที' },
  { value: 'scheduled', label: 'กำหนดวัน–เวลา' },
];

const STATUS_REASON_OPTIONS = {
  discontinue: [
    { value: 'เกิดอาการไม่พึงประสงค์จากยา', label: 'เกิดอาการไม่พึงประสงค์จากยา' },
    { value: 'เปลี่ยนแผนการรักษา', label: 'เปลี่ยนแผนการรักษา' },
    { value: 'ยาไม่ได้ผลตามเป้าหมาย', label: 'ยาไม่ได้ผลตามเป้าหมาย' },
    { value: 'พบข้อห้ามใช้หรือความเสี่ยง', label: 'พบข้อห้ามใช้หรือความเสี่ยง' },
    { value: 'รายการยาซ้ำซ้อน', label: 'รายการยาซ้ำซ้อน' },
    { value: 'ผู้ป่วยปฏิเสธหรือขอหยุดยา', label: 'ผู้ป่วยปฏิเสธหรือขอหยุดยา' },
    { value: 'อื่น ๆ', label: 'อื่น ๆ' },
  ],
  completed: [
    { value: 'ให้ยาครบตามแผนการรักษา', label: 'ให้ยาครบตามแผนการรักษา' },
    { value: 'ครบระยะเวลาการรักษา', label: 'ครบระยะเวลาการรักษา' },
    { value: 'อาการหรือภาวะที่รักษาสิ้นสุดแล้ว', label: 'อาการหรือภาวะที่รักษาสิ้นสุดแล้ว' },
    { value: 'อื่น ๆ', label: 'อื่น ๆ' },
  ],
  'on-hold': [
    { value: 'งดยาก่อนทำหัตถการ', label: 'งดยาก่อนทำหัตถการ' },
    { value: 'งดน้ำและอาหาร (NPO)', label: 'งดน้ำและอาหาร (NPO)' },
    { value: 'รอผลตรวจทางห้องปฏิบัติการ', label: 'รอผลตรวจทางห้องปฏิบัติการ' },
    { value: 'รอประเมินอาการหรือทบทวนแผนการรักษา', label: 'รอประเมินอาการหรือทบทวนแผนการรักษา' },
    { value: 'ยาไม่พร้อมใช้ชั่วคราว', label: 'ยาไม่พร้อมใช้ชั่วคราว' },
    { value: 'อื่น ๆ', label: 'อื่น ๆ' },
  ],
};

const EMPTY = {
  name: '',
  orderStatus: 'continue',
  statusEffectiveMode: 'immediate',
  statusEffectiveAt: '',
  lastDoseAt: '',
  statusReason: '',
  usage: 'รับประทาน (Oral)',
  dosePerTake: '1',
  unit: 'เม็ด',
  frequency: 'วันละ 1 ครั้ง',
  when: 'หลังอาหาร',
  quantity: '1',
  purpose: '',
  warning: '',
  reimbursable: false,
};

const AddMedicationPopup = ({
  open,
  onClose,
  onConfirm,
  /** Pre-fill the fields when opened (edit mode). */
  initialValue,
  title = 'เพิ่มรายการยา',
  clearLabel = 'ล้างค่า',
  confirmLabel = 'ตกลง',
}) => {
  const [draft, setDraft] = useState(EMPTY);

  /* Reset every time the popup re-opens — previous in-popup typing
     does not bleed across sessions. When `initialValue` is supplied
     (edit mode) the fields seed from it. */
  useEffect(() => {
    if (open) setDraft({ ...EMPTY, ...(initialValue || {}) });
  }, [open, initialValue]);

  const setField = (key) => (next) =>
    setDraft((s) => ({ ...s, [key]: typeof next === 'object' && next?.target ? next.target.value : next }));

  /* When the doctor picks a ชื่อยา from the dropdown, also capture the
     catalog thumbnail so the committed row's รูป column shows the same
     blister-pack photo as the Select option — not the pill glyph. */
  const setName = (next) => {
    const name = typeof next === 'object' && next?.target ? next.target.value : next;
    setDraft((s) => ({
      ...s,
      name,
      image: resolveMedicationImage(name, s.image),
    }));
  };

  const setOrderStatus = (next) => {
    const orderStatus = typeof next === 'object' && next?.target ? next.target.value : next;
    setDraft((s) => ({
      ...s,
      orderStatus,
      statusReason: orderStatus === s.orderStatus ? s.statusReason : '',
      ...(orderStatus === 'continue'
        ? {
          statusEffectiveMode: 'immediate',
          statusEffectiveAt: '',
          lastDoseAt: '',
          statusReason: '',
        }
        : {}),
    }));
  };

  /* Every field is required (Figma `เพิ่มยา` popup spec) — the
     primary CTA stays disabled until ชื่อยา / วิธีใช้ / หน่วย /
     ทานครั้งละ / จำนวน / ความถี่ / เวลาใช้ยา / การใช้ / คำเตือน
     are all non-empty. Numeric inputs additionally must parse to a
     positive number so "0" or blank does not slip through. The
     Select fields seed from EMPTY with sensible defaults so they
     read as filled on first open; clearing those (via ล้างค่า)
     also clears the defaults and re-disables ตกลง. */
  const isFilled = (v) => typeof v === 'string' && v.trim() !== '';
  const isPositiveNumber = (v) => {
    if (v === '' || v === null || v === undefined) return false;
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  };
  const needsStatusDetails = draft.orderStatus !== 'continue';
  const needsStatusReason = ['discontinue', 'on-hold'].includes(draft.orderStatus);
  const hasValidStatusDetails = !needsStatusDetails || (
    isFilled(draft.statusEffectiveMode) &&
    (draft.statusEffectiveMode !== 'scheduled' || isFilled(draft.statusEffectiveAt)) &&
    (!needsStatusReason || isFilled(draft.statusReason))
  );
  const canConfirm =
    isFilled(draft.name) &&
    isFilled(draft.orderStatus) &&
    isFilled(draft.usage) &&
    isFilled(draft.unit) &&
    isPositiveNumber(draft.dosePerTake) &&
    isPositiveNumber(draft.quantity) &&
    isFilled(draft.frequency) &&
    isFilled(draft.when) &&
    isFilled(draft.purpose) &&
    isFilled(draft.warning) &&
    hasValidStatusDetails;
  const handleClear = () => setDraft(EMPTY);
  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm?.({
      ...draft,
      name: draft.name.trim(),
      image: resolveMedicationImage(draft.name, draft.image),
      purpose: draft.purpose.trim(),
      warning: draft.warning.trim(),
      quantity: Number(draft.quantity) || 0,
    });
    onClose?.();
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='extraLarge'
      title={title}
      tertiaryAction={{ label: clearLabel, onClick: handleClear }}
      primaryAction={{ label: confirmLabel, onClick: handleConfirm, disabled: !canConfirm }}
      bodyStyle={{ gap: '32px' }}
      /* Dismissal hardening — the popup may close via three
         deliberate paths only: the ตกลง (primary) button, the
         header X (standard Popup affordance), or clicking outside
         the dialog (overlay). The keyboard Escape shortcut stays
         suppressed so a stray key can't silently discard a half-
         typed prescription. */
      closeOnEscape={false}
    >
      <FieldGrid
        cols={2}
        rowGap='var(--dim-space-600, 24px)'
        columnGap='var(--dim-space-600, 24px)'
      >
        {/* ชื่อยา + สถานะคำสั่งยา อยู่บรรทัดเดียวกัน (มติผู้ใช้ 31 ส.ค. 69) —
            ทั้งคู่เคยกินเต็มสองคอลัมน์ ทำให้ป๊อปอัปยาวโดยไม่จำเป็น */}
        <Field label='ชื่อยา' required>
          {/* Typeable combobox — the trigger doubles as an input,
              so the doctor can type to filter MEDICATION_NAME_OPTIONS
              in place (e.g. typing "P" narrows the list to entries
              that contain "P", case-insensitive substring match on
              both label and value). Selection still requires
              clicking a row in the dropdown — typing alone never
              commits. `searchable` defaults to true on Select so no
              extra prop is needed here. */}
          <Select
            value={draft.name}
            onChange={setName}
            options={MEDICATION_NAME_OPTIONS}
            placeholder='เลือกชื่อยา หรือพิมพ์เพื่อค้นหา'
          />
        </Field>
        <Field label='สถานะคำสั่งยา' required>
          <Select
            value={draft.orderStatus}
            onChange={setOrderStatus}
            options={ORDER_STATUS_OPTIONS}
          />
        </Field>
        {needsStatusDetails && (
          <>
            <Field label='เริ่มมีผล' required>
              <Select
                value={draft.statusEffectiveMode}
                onChange={setField('statusEffectiveMode')}
                options={EFFECTIVE_MODE_OPTIONS}
              />
            </Field>
            {draft.statusEffectiveMode === 'scheduled' ? (
              <Field label='วัน–เวลาที่มีผล' required>
                <InputField
                  type='datetime-local'
                  value={draft.statusEffectiveAt}
                  onChange={setField('statusEffectiveAt')}
                  showLabel={false}
                  showHelperText={false}
                />
              </Field>
            ) : <div />}
            <Field label='วัน–เวลาที่ให้ยาครั้งสุดท้าย'>
              <InputField
                type='datetime-local'
                value={draft.lastDoseAt}
                onChange={setField('lastDoseAt')}
                showLabel={false}
                showHelperText={false}
                className='w-full min-w-0'
                style={{ width: '100%', minWidth: 0 }}
                inputStyle={{ width: '100%', minWidth: 0 }}
              />
            </Field>
            <Field label='เหตุผล' required={needsStatusReason}>
              <Select
                value={draft.statusReason}
                onChange={setField('statusReason')}
                options={STATUS_REASON_OPTIONS[draft.orderStatus] || []}
                placeholder='เลือกเหตุผล'
              />
            </Field>
          </>
        )}
        {/* วิธีใช้ + หน่วย แก้ไม่ได้ (มติผู้ใช้ 31 ส.ค. 69) — เป็นคุณสมบัติของตัวยา
            ที่มาจากทะเบียนยา ไม่ใช่สิ่งที่แพทย์ตั้งเองรายใบสั่ง ค่ายังถูกส่งกลับ
            ไปกับ `draft` ตามเดิม แค่ล็อกไม่ให้แก้ */}
        <Field label='วิธีใช้' required>
          <Select
            value={draft.usage}
            onChange={setField('usage')}
            options={USAGE_OPTIONS}
            disabled
          />
        </Field>
        <Field label='หน่วย' required>
          <Select
            value={draft.unit}
            onChange={setField('unit')}
            options={UNIT_OPTIONS}
            disabled
          />
        </Field>
        <Field label='ทานครั้งละ' required>
          {/* Stepper (-/+) — Figma 2709:6338. Value flows back as a
              string (Stepper's 2nd onChange arg) so the existing
              `draft.dosePerTake: string` shape stays unchanged and
              `isPositiveNumber` validation keeps working. */}
          <Stepper
            min={0}
            value={draft.dosePerTake === '' ? null : Number(draft.dosePerTake)}
            onChange={(_n, str) => setField('dosePerTake')(str)}
          />
        </Field>
        <Field label='จำนวน' required>
          <Stepper
            min={0}
            value={draft.quantity === '' ? null : Number(draft.quantity)}
            onChange={(_n, str) => setField('quantity')(str)}
          />
        </Field>
        <Field label='ความถี่' required>
          <Select
            value={draft.frequency}
            onChange={setField('frequency')}
            options={FREQUENCY_OPTIONS}
          />
        </Field>
        <Field label='เวลาใช้ยา' required>
          <Select
            value={draft.when}
            onChange={setField('when')}
            options={WHEN_OPTIONS}
          />
        </Field>
        <Field label='การใช้' required span={2}>
          {/* Same voice + suggestion treatment as คำเตือน below —
              SuggestibleTextarea in `voice` mode brings the mic +
              language toolbar; PURPOSE_SUGGESTIONS opens after 1+
              chars are typed so the doctor can pick a stock indication
              or dictate / free-type a custom one. */}
          <SuggestibleTextarea
            voice
            value={draft.purpose}
            onChange={(e) => setField('purpose')(e?.target?.value ?? '')}
            suggestions={PURPOSE_SUGGESTIONS}
            minChars={1}
            placeholder='เช่น ลดไข้ บรรเทาปวด ลดการอักเสบ'
          />
        </Field>
        <Field label='คำเตือน' required span={2}>
          {/* SuggestibleTextarea in `voice` mode — its inner control
              becomes a <VoiceTextarea> (mic + language picker toolbar)
              while keeping the WARNING_SUGGESTIONS popover that opens
              after 1+ chars are typed. The doctor can either dictate,
              type, or pick a stock phrase. Matches the Add Diagnosis
              popup's voice-textarea treatment. */}
          <SuggestibleTextarea
            voice
            value={draft.warning}
            onChange={(e) => setField('warning')(e?.target?.value ?? '')}
            suggestions={WARNING_SUGGESTIONS}
            minChars={1}
            placeholder='เช่น แพ้ Penicillin: ห้ามใช้ · ระวังในผู้ป่วยที่ขับรถ'
          />
        </Field>
      </FieldGrid>
    </Popup>
  );
};

export default AddMedicationPopup;
