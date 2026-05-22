import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Stepper from '@/components/stepper/Stepper';
import { Field, FieldGrid } from '@/components/forms/Fields';
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

const EMPTY = {
  name: '',
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
  const canConfirm =
    isFilled(draft.name) &&
    isFilled(draft.usage) &&
    isFilled(draft.unit) &&
    isPositiveNumber(draft.dosePerTake) &&
    isPositiveNumber(draft.quantity) &&
    isFilled(draft.frequency) &&
    isFilled(draft.when) &&
    isFilled(draft.purpose) &&
    isFilled(draft.warning);
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
      size='large'
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
      <FieldGrid cols={2}>
        <Field label='ชื่อยา' required span={2}>
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
        <Field label='วิธีใช้' required>
          <Select
            value={draft.usage}
            onChange={setField('usage')}
            options={USAGE_OPTIONS}
          />
        </Field>
        <Field label='หน่วย' required>
          <Select
            value={draft.unit}
            onChange={setField('unit')}
            options={UNIT_OPTIONS}
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
