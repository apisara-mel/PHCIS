import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useHistory, useLocation, Link } from 'react-router-dom';
import SummaryCardsBar from '@/components/layout/SummaryCardsBar';
import TabUnderline, { TabUnderlineItem } from '@/components/tab/TabUnderline';
import TabCapsule from '@/components/tab/TabCapsule';
import StepProgress from '@/components/step/StepProgress';
import Step from '@/components/step/Step';
import Stepper from '@/components/stepper/Stepper';
import HistoryTimeline from '@/components/timeline/HistoryTimeline';
import VitalsSignGraph from '@/components/graph/VitalsSignGraph';
import {
  Donut, HBarList, VBars, LineChart, Gauge, Pyramid, PyramidPct, AreaLineChart, Pie,
} from '@/components/graph/Charts';
import {
  PopulationPyramidCard,
  OpdTypeLineCard,
  ResidencePieCard,
  ServiceCenterMapCard,
} from '@/components/graph/BigCharts';
import {
  Top10DiseasesCard,
  VisitTotalCard,
  AgeServicePyramidCard,
  RightsDonutCard,
  Top10DiseasesShortCard,
  MonthlyVisitsCard,
  Disease21GroupsCard,
  DmHtNewPatientsCard,
  DmControlGaugeCard,
  HtControlGaugeCard,
  WorkingAgeGroupsCard,
  CocCard,
  ConsentCard,
  DmComplicationsCard,
  DEFAULT_TOP10,
  DEFAULT_PYRAMID,
  DEFAULT_VISITS_LINE,
  DEFAULT_DM_HT_BARS,
  DEFAULT_VISIT_DONUT,
  DEFAULT_RIGHTS_DONUT,
} from '@/components/graph/DashboardCards';
import HeaderChrome from '@/components/layout/Header';
import SubHeaderChrome from '@/components/layout/SubHeader';
import FooterChrome from '@/components/layout/Footer';
import SidebarChrome from '@/components/layout/Sidebar';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import SideSubMenu, { SideSubMenuItem, SideSubMenuHeader } from '@/components/layout/SideSubMenu';
import QueuePageShell from '@/templates/QueuePageShell';
import FormShell from '@/templates/FormShell';
import TreatmentFormShell from '@/templates/TreatmentFormShell';
import { Step1Personal } from '@/components/forms/RegistrationSteps';
import { Step1History, Step2Screening, Step3Examination } from '@/components/forms/TreatmentSteps';
import BodyDiagramPanel from '@/components/examination/BodyDiagramPanel';
import BodyRecordPopup from '@/components/examination/BodyRecordPopup';
import DrawingCanvasPopup from '@/components/popup/DrawingCanvasPopup';
import {
  BodyMarkReeditLogicPreview,
  BodyMarkStatesPreview,
} from '@/components/examination/BodyDrawingCanvas';
import ExamSupportList from '@/components/examination/ExamSupportList';
import ExamNotesPanel from '@/components/examination/ExamNotesPanel';
import {
  DEFAULT_NURSE_EXAM_NOTES,
  DEFAULT_DOCTOR_EXAM_NOTES,
  DEFAULT_EXAM_ATTACHMENTS,
  DEFAULT_BODY_MARKERS,
  DEMO_BODY_MARKERS,
  DEFAULT_ICD_SUGGESTIONS,
} from '@/data/treatmentVisits';
import PatientCard from '@/components/card/PatientCard';
import VitalCard, { PressureCard, BMICard } from '@/components/card/VitalCard';
import VitalReadingCard from '@/components/card/VitalReadingCard';
import VitalSignTimelineCard from '@/components/card/VitalSignTimelineCard';
import InventoryCard from '@/components/card/InventoryCard';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralIconButton from '@/components/button/NeutralIconButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import DangerButton from '@/components/button/DangerButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import NeutralButton from '@/components/button/NeutralButton';
import DangerIconButton from '@/components/button/DangerIconButton';
import DangerSubdueIconButton from '@/components/button/DangerSubdueIconButton';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import BrandCircleIconButton from '@/components/button/BrandCircleIconButton';
import BrandCircleSubdueIconButton from '@/components/button/BrandCircleSubdueIconButton';
import DangerCircleIconButton from '@/components/button/DangerCircleIconButton';
import DangerCircleSubdueIconButton from '@/components/button/DangerCircleSubdueIconButton';
import BrandRadiusSubdueIconButton from '@/components/button/BrandRadiusSubdueIconButton';
import PhotoUploadField from '@/components/forms/PhotoUploadField';
import BrandSubdueFloatButton from '@/components/button/BrandSubdueFloatButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import CheckboxBox from '@/components/checkbox/CheckboxBox';
import CheckboxAtom from '@/components/checkbox/Checkbox';
import CheckboxButtonComp from '@/components/checkbox/CheckboxButton';
import CheckboxGroupComp from '@/components/checkbox/CheckboxGroup';
import RadioBoxAtom from '@/components/radio/RadioBox';
import RadioAtom from '@/components/radio/Radio';
import RadioGroupComp from '@/components/radio/RadioGroup';
import RadioButtonComp from '@/components/radio/RadioButton';
import Switch from '@/components/switch/Switch';
import Timeslot from '@/components/timeslot/Timeslot';
import Topic from '@/components/topic/Topic';
import Tooltip, { TooltipBubble } from '@/components/tooltip/Tooltip';
import Information from '@/components/information/Information';
import FormBuilderContent from '@/components/form-builder/Content';
import FormBuilderSignature from '@/components/form-builder/Signature';
import FormBuilderDragAndDrop, { FileCard as FormBuilderFileCard } from '@/components/form-builder/DragAndDrop';
import InputFieldComp from '@/components/forms/InputField';
import VoiceInputFieldComp from '@/components/forms/VoiceInputField';
import InputFieldSlashComp from '@/components/forms/InputFieldSlash';
import InputFieldRangeComp from '@/components/forms/InputFieldRange';
import TextareaComp from '@/components/forms/Textarea';
import SuggestibleTextareaComp from '@/components/forms/SuggestibleTextarea';
import VoiceTextareaComp, {
  VOICE_TEXTAREA_HEIGHT,
  VOICE_TEXTAREA_HEIGHT_EXTRA,
  VOICE_TEXTAREA_HEIGHT_TALL,
  VOICE_TEXTAREA_LANGUAGE_OPTIONS,
  VOICE_TEXTAREA_MIN_HEIGHT,
} from '@/components/forms/VoiceTextarea';
import {
  CHIEF_COMPLAINT_SUGGESTIONS,
  PRESENT_ILLNESS_SUGGESTIONS,
  PHYSICAL_EXAM_SUGGESTIONS,
  DURATION_SUGGESTIONS,
} from '@/pages/opd/ScreeningPage';
import PrimarySearch from '@/components/search/PrimarySearch';
import AISearch from '@/components/search/AISearch';
import SecondarySearch from '@/components/search/SecondarySearch';
import FilterTag, { FilterDropdown, TagDivider } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import SelectableTag from '@/components/forms/SelectableTag';
import TabPill, { TabBar, TabPillSmall } from '@/components/tab/TabPill';
import Dropdown, { DropdownRowPreview } from '@/components/forms/Dropdown';
import Select from '@/components/forms/Select';
import Calendar, { CalendarDayPreview, CalendarChevronPreview } from '@/components/forms/Calendar';
import DatePicker from '@/components/forms/DatePicker';
import Popover from '@/components/popup/Popover';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import Table, { HeaderCell as TableHeaderCell, DataCell as TableDataCell, FooterCell as TableFooterCell, TableRow, TableSelectAllRow, TableSummary } from '@/components/table/Table';
import DateFilterPopup from '@/components/popup/DateFilterPopup';
import ProfilePopover from '@/components/popup/ProfilePopover';
import SettingsModal from '@/components/popup/SettingsModal';
import VitalsGraphPopup from '@/components/popup/VitalsGraphPopup';
import VitalsSignGraphDialog from '@/components/vitals/VitalsSignGraphDialog';
import Pagination from '@/components/pagination/Pagination';
import ActionList from '@/components/list/ActionList';
import ServiceDateList from '@/components/list/ServiceDateList';
import { TREATMENT_STEPS } from '@/templates/TreatmentFormShell';
import { findVisitDetailsByHn } from '@/data/treatmentVisits';
import Alert from '@/components/alert/Alert';
import SmallAlert from '@/components/alert/SmallAlert';
import StatusBadgeComp from '@/components/badge/StatusBadge';
import ColorfulBadgeComp from '@/components/badge/ColorfulBadge';
import { HistoryPillBadge } from '@/components/forms/historyPillBadges';
import ColorfulIconBadgeComp from '@/components/badge/ColorfulIconBadge';
import AllergyForm from '@/components/forms/AllergyForm';
import DiseaseForm from '@/components/forms/DiseaseForm';
import VitalsForm from '@/components/forms/VitalsForm';
import FormsLibrary from '@/components/forms/FormsLibrary';
import Icon from '@/components/icons/Icon';
import {
  SectionTitle, SubCard, FieldGrid, Field,
  AddRowButton,
} from '@/components/forms/Fields';
import InputField from '@/components/forms/InputField';

/* MIH Components Library — /components/:slug
   Standalone design-system browser. Independent from PHCIS app chrome:
   its own top bar + left side menu listing every reusable component by
   name. Clicking a name navigates to /components/<slug> and renders that
   component's demo block in the main panel. */

/* ── Demo helpers ─────────────────────────────────────────── */

const Section = ({ title, summary, children }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
    <header className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
      <h1 style={{
        margin: 'var(--dim-space-0)',
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-heading-content)',
        fontSize: 'var(--type-size-xl, 24px)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        lineHeight: 1.4,
      }}>{title}</h1>
      {summary && (
        <p style={{
          margin: 'var(--dim-space-0)',
          color: 'var(--text-content-secondary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          lineHeight: 1.5,
        }}>{summary}</p>
      )}
    </header>
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>{children}</div>
  </div>
);

const Variant = ({ label, code, children, stack, omitPreviewTopBorder = false }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
    <div className='flex items-baseline flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
      <span style={{
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
      }}>{label}</span>
      {code && (
        <code style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: 'var(--type-size-xs)',
        }}>{code}</code>
      )}
    </div>
    <div
      className='w-full'
      style={{
        padding: 'var(--dim-space-500)',
        background: 'var(--surface-card-100)',
        borderRadius: 'var(--dim-radius-300)',
        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
        /* SummaryCardsBar / flush-toolbar demos: remove top stroke from the preview chrome so it matches real queue pages (not a component bug). */
        ...(omitPreviewTopBorder
          ? { borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }
          : {}),
      }}
    >
      <div
        className={stack ? 'flex flex-col' : 'flex items-center flex-wrap'}
        style={{ gap: 'var(--dim-space-300)' }}
      >
        {children}
      </div>
    </div>
  </div>
);

/* Guidelines — usage/behavior panel rendered inside a demo Section.
   Mirrors design.md §6.30 (Component Interaction & Usage Guidelines)
   so designers and engineers see the same do's and don'ts here as in
   the design-system doc. */
const Guidelines = ({ behavior = [], dos = [], donts = [] }) => {
  const TITLE = {
    color: 'var(--text-content-default)',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm)',
    fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    margin: 'var(--dim-space-0)',
  };
  const LIST = {
    margin: 'var(--dim-space-0)',
    paddingLeft: 'var(--dim-space-400, 16px)',
    color: 'var(--text-content-secondary, #4D5358)',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm)',
    lineHeight: 1.6,
  };
  const Column = ({ label, items, accent }) => (
    <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      <h4 style={{ ...TITLE, color: accent || TITLE.color }}>{label}</h4>
      <ul style={LIST}>
        {items.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </div>
  );
  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
      <span style={{
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
      }}>Behavior & Guidelines</span>
      <div
        className='w-full'
        style={{
          padding: 'var(--dim-space-500)',
          background: 'var(--surface-card-100)',
          borderRadius: 'var(--dim-radius-300)',
          border: 'var(--dim-stroke-100) solid var(--border-card-default)',
        }}
      >
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-500, 20px)' }}>
          {behavior.length > 0 && <Column label='Behavior' items={behavior} />}
          {dos.length > 0      && <Column label='Do'       items={dos}      accent='var(--text-brandprimary-default, var(--brand-p700, #007549))' />}
          {donts.length > 0    && <Column label="Don't"    items={donts}    accent='var(--text-danger-default, #B91C1C)' />}
        </div>
      </div>
    </div>
  );
};

const SAMPLE_OPTIONS = [
  { value: 'all',  label: 'ทุกแผนก' },
  { value: 'med',  label: 'อายุรกรรม' },
  { value: 'surg', label: 'ศัลยกรรม' },
  { value: 'ped',  label: 'กุมารเวช' },
];

/* PHCIS | OPD 334:56417 — Select popover preview (three severity ColorfulBadges). */
/* Figma CPOE 245:24395 — ระดับความรุนแรง */
const SEVERITY_SELECT_OPTS_334 = [
  { value: 'critical', label: 'วิกฤต',     colorfulBadgeStyle: 'red' },
  { value: 'high',     label: 'รุนแรง',     colorfulBadgeStyle: 'orange' },
  { value: 'medium',   label: 'ปานกลาง',   colorfulBadgeStyle: 'blue' },
  { value: 'low',      label: 'เล็กน้อย',   colorfulBadgeStyle: 'teal' },
];

/* PHCIS | OPD 334:56749 — allergy likelihood (four ColorfulBadge rows). */
/* Figma CPOE 245:24530 — ความน่าจะเป็น */
const LIKELIHOOD_SELECT_OPTS_334 = [
  { value: 'definite', label: 'แน่นอน', colorfulBadgeStyle: 'teal' },
  { value: 'probable', label: 'น่าจะใช่', colorfulBadgeStyle: 'blue' },
  { value: 'possible', label: 'เป็นไปได้', colorfulBadgeStyle: 'indigo' },
  { value: 'unlikely', label: 'สงสัย', colorfulBadgeStyle: 'purple' },
];

/* Figma CPOE 245:24603 — สถานะการรักษา */
const TREATMENT_STATUS_SELECT_OPTS = [
  { value: 'untreated',   label: 'ไม่ได้รักษา', colorfulBadgeStyle: 'grey' },
  { value: 'chronic',     label: 'เรื้อรังไม่หาย', colorfulBadgeStyle: 'red' },
  { value: 'inTreatment', label: 'อยู่ระหว่างการรักษา', colorfulBadgeStyle: 'orange' },
  { value: 'controlled',  label: 'ควบคุมได้', colorfulBadgeStyle: 'indigo' },
  { value: 'remission',   label: 'สงบ/หายดีชั่วคราว', colorfulBadgeStyle: 'blue' },
  { value: 'resolved',    label: 'หายแล้ว', colorfulBadgeStyle: 'teal' },
];

/* ── Per-component demos — stateful pieces wrapped as components ── */

/* Sample data used by the PrimarySearch dropdown demos — mirrors the OPD
   queue's search payload (queue / HN / patient name / doctor name) so the
   preview reflects how a real page wires the component. */
const SAMPLE_QUEUE_ROWS = [
  { id: 'q1', queue: 'A001', hn: '67-00001', name: 'สมชาย มีสุข',     doctor: 'พญ.สมหญิง รักษ์ดี' },
  { id: 'q2', queue: 'A002', hn: '67-00002', name: 'ดวงใจ พินิจ',     doctor: 'นพ.สมชาย ใจดี'    },
  { id: 'q3', queue: 'A003', hn: '67-00003', name: 'ปริญญา รัตนา',     doctor: 'พญ.วิภา สุขศรี'   },
  { id: 'q4', queue: 'A004', hn: '67-00004', name: 'ภูริ ใจกล้า',       doctor: 'นพ.ณัฐวุฒิ บุญมี' },
  { id: 'q5', queue: 'A005', hn: '67-00005', name: 'สุดา ปลอดโปร่ง',   doctor: 'พญ.สมหญิง รักษ์ดี' },
  { id: 'q6', queue: 'A006', hn: '67-00006', name: 'ศุภชัย แก้วใส',    doctor: 'นพ.สมชาย ใจดี'    },
];

const PrimarySearchDemo = () => {
  const [v, setV] = useState('');

  /* Wired interactive demo — seeds history with the Figma 3345:2981 rich
     row shape (queue + HN colorful pills + name + doctor sublabel) so the
     dropdown matches the reference on first focus. Click-into-input →
     history dropdown; start typing → live suggestion dropdown derived
     from SAMPLE_QUEUE_ROWS. */
  const sampleRowToItem = (row) => ({
    id: row.id,
    label: row.name,
    sublabel: row.doctor,
    value: row.name,
    badges: [
      { label: row.queue, tone: 'teal'   },   // queue badge (Figma A001)
      { label: row.hn,    tone: 'indigo' },   // HN badge   (Figma 67-00001)
    ],
  });
  const [history, setHistory] = useState(() =>
    SAMPLE_QUEUE_ROWS.slice(0, 4).map(sampleRowToItem)
  );
  const pushHistory = (item) => {
    if (!item) return;
    setHistory((prev) => {
      const keyOf = (h) => (h && typeof h === 'object' ? (h.id ?? h.value ?? h.label) : h);
      const k = keyOf(item);
      return [item, ...prev.filter((h) => keyOf(h) !== k)].slice(0, 8);
    });
  };
  const clearHistory = () => setHistory([]);

  const suggestions = useMemo(() => {
    const q = v.trim().toLowerCase();
    if (!q) return [];
    return SAMPLE_QUEUE_ROWS
      .filter((row) => [row.queue, row.hn, row.name, row.doctor]
        .some((f) => f && f.toLowerCase().includes(q)))
      .slice(0, 6)
      .map(sampleRowToItem);
  }, [v]);

  return (
    <Section title='PrimarySearch' summary='Primary 56px pill search input (Figma 2056:4246). Five states: default · hover · focus · typing · filled. Pass `state` to force the visual state; otherwise it resolves from focus/hover/value — `focused + empty → focus`, `focused + value → typing`. Focus + typing open the dropdown (recent vs suggestions). Typing alone adds the 40px X Button + Brand Circle Icon Button; all other states contain only the search glyph and text.'>
      <Variant label='State matrix · 5 states' stack>
        <SearchStateTable
          Component={PrimarySearch}
          states={PRIMARY_SEARCH_STATE_COLS}
          extraProps={{ width: 360, placeholder: 'ค้นหาด้วย HN / เลขบัตร / ชื่อ-สกุล' }}
          filledProps={{ defaultValue: 'นพ. สมชาย ใจดี' }}
          cellMinWidth={400}
        />
      </Variant>
      <Variant
        label='Dropdown conditions · click to see history · type to see suggestions'
        code='<PrimarySearch history suggestions onSubmit onHistoryClear />'
        stack
      >
        {/* Extra bottom padding leaves room for the absolutely-positioned
            dropdown so it doesn't overflow the preview card. */}
        <div style={{ width: '100%', maxWidth: 640, paddingBottom: 320 }}>
          <PrimarySearch
            value={v}
            onChange={setV}
            onSubmit={(next) => {
              pushHistory(next);
              setV(next);
            }}
            placeholder='ค้นหาคิว / HN / ชื่อ-สกุลผู้ป่วย / ชื่อแพทย์'
            history={history}
            onHistoryClear={history.length > 0 ? clearHistory : undefined}
            suggestions={suggestions}
          />
          <p
            style={{
              margin: 'var(--dim-space-300, 12px) 0 0',
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              lineHeight: 1.5,
            }}
          >
            ตัวอย่างคิวที่ใช้ค้นหา: A001 · HN 67-00001 · สมชาย · พญ.สมหญิง (ลองพิมพ์ตัวใดตัวหนึ่ง)
          </p>
        </div>
      </Variant>
      <Variant label='Interactive · history & suggestions disabled' code='<PrimarySearch value onChange placeholder />'>
        <div style={{ flex: 1, minWidth: 'var(--dim-size-2500, 320px)' }}>
          <PrimarySearch value={v} onChange={setV} placeholder='ค้นหาด้วย HN / เลขบัตร / ชื่อ-สกุล' />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Five states per Figma 2056:4246: `default` · `hover` · `focus` · `typing` · `filled`. Resolved by the component as `focused + empty → focus`, `focused + value → typing`; the `state` prop overrides for state-matrix previews.',
          'Right-side controls render only in Typing: the 40px X Button clears the query and the 40px Brand Circle Icon Button submits it. Default, Hover, Focus, and Filled have no trailing controls, matching the current Figma variant set.',
          'Dropdown opens on focus + typing. Empty input → recent-search history with the "ค้นหาล่าสุด" header (Figma 3345:2981). Typing (≥ 1 char) → live suggestions (Figma 3346:8231). Both share the same row layout — text-only by default; pass `item.badges = [{ label, tone }, …]` to render colorful leading pills (queue + HN per the Figma reference).',
          'Row leading slot precedence: `item.badges` (Colorful pills) → `item.icon` (Material symbol) → text-only. Trailing `chevron_right` is always in the DOM but fades in only on `:hover` (CSS `.mih-search-row__chevron`) so resting rows stay quiet.',
          'Empty history still opens the dropdown and shows `historyEmptyMessage` ("ยังไม่มีประวัติการค้นหา" by default) so users discover the feature. Pass `historyEmptyMessage={null}` to revert to the silent-closed behaviour.',
          'Typing with no match shows `emptyMessage` ("ไม่พบรายการที่ค้นหา" by default) instead of silently closing.',
          'Click on a row commits `value ?? label` via `onChange` + `onSubmit`. Pages use the `onSubmit` hook to push the committed query into history.',
          '`history` and `suggestions` default to `[]` — pages opt in. Each accepts plain strings or rich records `{ id?, label, sublabel?, value?, icon? }`.',
          'Row hover: the whole row morphs to the design-system list tokens — `--surface-list-hover` background + `--text-list-hover` label/sublabel/icon. Driven by the `.mih-search-row` class in src/index.css so the hover state survives Tailwind v2.1\'s arbitrary-value quirks and inline-style specificity.',
          'Section header reuses body4 (Sarabun Regular 14px) tertiary text — no uppercase, no letter-spacing. The trailing slot hosts a `<NeutralSubdueButton variant="outline" size="sm">` (e.g. "ล้างประวัติ").',
          'On focus, the page scrolls so the search bar sits `scrollOffsetTop` px below the top of the viewport (default 120) — keeps the ~10-row recent-search list inside one screen without manual scrolling.',
        ]}
        dos={[
          'Persist `history` per page via the `useSearchHistory(storageKey)` hook (keys like `mih:primarysearch-history:opd-queue`); the hook handles 8-item cap + case-insensitive dedupe + localStorage.',
          'Wire `suggestions` to match the fields advertised in `placeholder` — if the placeholder mentions ชื่อแพทย์, the dropdown must surface doctor matches.',
          'Show `onHistoryClear` ("ล้างประวัติ") only when history.length > 0 so the affordance doesn\'t appear as a no-op.',
          'Render rich suggestion rows with `sublabel` to disambiguate (e.g. HN + แพทย์) when a single label could match multiple patients.',
        ]}
        donts={[
          "Don't ship fake placeholder suggestions — leaving `suggestions` empty keeps the typing dropdown closed once the user pastes text, which is the correct default.",
          "Don't make Enter / row click commit different things — both must fire `onSubmit` with the same value so history stays consistent.",
          "Don't open the suggestion dropdown when the input is empty — that surface belongs to history.",
          "Don't add a default leading icon to every row — Figma 2692:5995 shows text-only rows; the icon column appears only when callers provide `item.icon` explicitly.",
        ]}
      />
    </Section>
  );
};

/* AISearch state-matrix table — mirrors ButtonStateTable's layout.
   Single AISearch size (Large 64), so the table is one row × five state
   columns matching Figma 3396:1598. Each cell pins its `state` prop so
   the visual variant is reproduced side-by-side. Focus + Typing cells
   receive the seeded `history` so the dropdown renders inline (matches
   Figma "State=Focus" 3396:1625 and "State=Typing" 3396:1628). */
const AISEARCH_STATE_COLS = [
  { key: 'default', label: 'Default', props: {} },
  { key: 'hover',   label: 'Hover',   props: { state: 'hover' } },
  { key: 'focus',   label: 'Focus',   props: { state: 'focus' } },
  {
    key: 'typing',
    label: 'Typing',
    props: { state: 'typing', value: 'ปวด' },
  },
  {
    key: 'filled',
    label: 'Filled',
    props: {
      state: 'filled',
      value: 'Dorsalgia, unspecified (ปวดหลังไม่ระบุรายละเอียด)',
      filledBadge: { label: 'M54.9', style: 'blue' },
    },
  },
];

const AISearchStateTable = ({ history = [], onClearHistory, cellMinWidth = 380 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th
            style={{
              textAlign: 'left',
              padding: 'var(--dim-space-200) var(--dim-space-300)',
              borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
              fontWeight: 'var(--type-weight-medium)',
              color: 'var(--text-content-default)',
              whiteSpace: 'nowrap',
            }}
          >
            Size
          </th>
          {AISEARCH_STATE_COLS.map((c) => (
            <th
              key={c.key}
              style={{
                textAlign: 'left',
                padding: 'var(--dim-space-200) var(--dim-space-300)',
                borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
                fontWeight: 'var(--type-weight-medium)',
                color: 'var(--text-content-secondary)',
                whiteSpace: 'nowrap',
                minWidth: cellMinWidth,
              }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td
            style={{
              padding: 'var(--dim-space-300)',
              color: 'var(--text-content-tertiary)',
              whiteSpace: 'nowrap',
              verticalAlign: 'top',
            }}
          >
            Large (64)
          </td>
          {AISEARCH_STATE_COLS.map((col) => {
            const dropdownStates = ['focus', 'typing'];
            const cellHistory = dropdownStates.includes(col.key) ? history : [];
            const cellClear = col.key === 'focus' ? onClearHistory : undefined;
            return (
              <td
                key={col.key}
                style={{
                  padding: 'var(--dim-space-300)',
                  verticalAlign: 'top',
                  minWidth: cellMinWidth,
                }}
              >
                <AISearch
                  {...col.props}
                  onChange={() => { /* design-system grid — no-op */ }}
                  history={cellHistory}
                  onClearHistory={cellClear}
                />
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  </div>
);

/* Token alias table — Figma 3396:1598 / design.md §6.17.6b.
   Lists each design token and its underlying indigo primitive in light +
   dark mode. The AISearch component's state→token mapping reuses
   `border/aiSearch/default` for default/focus/typing (so focusing the
   input does not introduce a visible darker outline), keeps
   `border/aiSearch/hover` for hover, and `border/aiSearch/filled` for
   filled. Icons retint across all five states. */
const AISEARCH_TOKEN_ROWS = [
  { token: 'border/aiSearch/default', light: { alias: 'indigo/500', hex: '#6F82FF' }, dark: { alias: 'indigo/500', hex: '#6F82FF' } },
  { token: 'border/aiSearch/hover',   light: { alias: 'indigo/700', hex: '#4338CA' }, dark: { alias: 'indigo/300', hex: '#A5B4FC' } },
  { token: 'border/aiSearch/typing',  light: { alias: 'indigo/700', hex: '#4338CA' }, dark: { alias: 'indigo/300', hex: '#A5B4FC' } },
  { token: 'border/aiSearch/filled',  light: { alias: 'indigo/600', hex: '#4F46E5' }, dark: { alias: 'indigo/400', hex: '#818CF8' } },
  { token: 'icon/aiSearch/default',   light: { alias: 'indigo/600', hex: '#4F46E5' }, dark: { alias: 'indigo/400', hex: '#818CF8' } },
  { token: 'icon/aiSearch/hover',     light: { alias: 'indigo/700', hex: '#4338CA' }, dark: { alias: 'indigo/300', hex: '#A5B4FC' } },
  { token: 'icon/aiSearch/typing',    light: { alias: 'indigo/700', hex: '#4338CA' }, dark: { alias: 'indigo/300', hex: '#A5B4FC' } },
  { token: 'icon/aiSearch/filled',    light: { alias: 'indigo/600', hex: '#4F46E5' }, dark: { alias: 'indigo/400', hex: '#818CF8' } },
];

const AISearchAliasSwatch = ({ alias, hex }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-200)' }}>
    <span
      aria-hidden
      style={{
        width: 16,
        height: 16,
        borderRadius: 'var(--dim-radius-150, 6px)',
        background: hex,
        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
        flexShrink: 0,
      }}
    />
    <span style={{ fontFamily: 'var(--type-family-body)', color: 'var(--text-content-default)' }}>{alias}</span>
    <span style={{ fontFamily: 'var(--type-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace)', color: 'var(--text-content-tertiary)' }}>{hex}</span>
  </span>
);

const AISearchTokenAliasTable = () => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>Token</th>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap' }}>Light mode</th>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap' }}>Dark mode</th>
        </tr>
      </thead>
      <tbody>
        {AISEARCH_TOKEN_ROWS.map((row, i) => (
          <tr key={row.token}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', whiteSpace: 'nowrap', verticalAlign: 'middle', fontFamily: 'var(--type-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace)', color: 'var(--text-content-default)' }}>{row.token}</td>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
              <AISearchAliasSwatch alias={row.light.alias} hex={row.light.hex} />
            </td>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
              <AISearchAliasSwatch alias={row.dark.alias} hex={row.dark.hex} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* Live ICD-10 catalog used by the AISearch "Live · with suggestions"
   demo — pulls the same `DEFAULT_ICD_SUGGESTIONS` the Doctor AI panel
   in TreatmentSteps.jsx consumes, so the preview reviewers see is the
   exact same realistic ~80-code pool the real Doctor AI surface
   filters. Single source of truth in src/data/treatmentVisits.js. */
const AISEARCH_DEMO_ICD_CATALOG = DEFAULT_ICD_SUGGESTIONS;

const AISearchDemo = () => {
  const [v, setV] = useState('');
  const [history, setHistory] = useState([
    { id: 'a90',   label: 'Dengue fever (ไข้แดงกี)', badge: 'A90',  badgeStyle: 'blue' },
    { id: 'm549',  label: 'Dorsalgia, unspecified (ปวดหลังไม่ระบุรายละเอียด)', badge: 'M54.9', badgeStyle: 'blue' },
    { id: 'g439',  label: 'Migraine, unspecified', badge: 'G43.9', badgeStyle: 'blue' },
    { id: 'i10',   label: 'Essential (primary) hypertension', badge: 'I10', badgeStyle: 'blue' },
  ]);
  const clearHistory = () => setHistory([]);

  /* "With suggestions" demo state — separate from the basic Live so the
     two variants don't fight each other for the input value. */
  const [icdQuery, setIcdQuery] = useState('');
  const [icdHistory, setIcdHistory] = useState([]);
  const icdSuggestions = useMemo(() => {
    const q = icdQuery.trim().toLowerCase();
    if (!q) return undefined; // fall back to history rows when empty
    return AISEARCH_DEMO_ICD_CATALOG
      .filter((c) => `${c.code} ${c.name}`.toLowerCase().includes(q))
      .slice(0, 8)
      .map((c) => ({
        id: c.code, label: c.name, badge: c.code, badgeStyle: 'blue', value: c.name,
      }));
  }, [icdQuery]);
  const submitIcd = (next, picked) => {
    if (!next?.trim()) return;
    const entry = picked || { label: next };
    setIcdHistory((prev) => {
      const key = entry.id || entry.value || entry.label;
      return [entry, ...prev.filter((h) => (h.id || h.value || h.label) !== key)].slice(0, 8);
    });
    setIcdQuery(picked ? picked.label : next);
  };

  const submit = (next, picked) => {
    if (!next?.trim()) return;
    if (picked) setV(picked.label);
    else setV(next);
  };

  return (
    <Section
      title='AISearch'
      summary='Indigo-themed search input (Figma MIH-DS Foundation 3396:1598) for AI-assisted lookup surfaces — designed for Doctor-AI ICD search (Figma PHCIS · Medical-examination 156:27359). Same 64 px Large shell as PrimarySearch, but every brand-green hook is replaced with the indigo `aiSearch` semantic group (`--border-aiSearch-*` / `--icon-aiSearch-*`, design.md §6.17.6b) and the drop uses `--shadow-indigo-drop-bottom`. Five states (`default` · `hover` · `focus` · `typing` · `filled`) — `state` prop overrides the auto-resolver (`focused + value → typing`, `focused + empty → focus`, `blurred + value → filled`). Typing exposes a 36 px gradient submit (`#6F82FF → #C079EA`) + 32 px indigo-100 X clear chip. Filled shows an optional `filledBadge` prefix (commit-state ICD code).'
    >
      <Variant label='State matrix · 1 size × 5 states' stack>
        <AISearchStateTable history={history} onClearHistory={clearHistory} />
      </Variant>
      <Variant label='Token aliases · border + icon per state' stack>
        <AISearchTokenAliasTable />
      </Variant>
      <Variant
        label='Live · focus to open recent · type to see X + submit · ↑↓ to navigate · Enter to commit'
        code='<AISearch value onChange onSubmit history onClearHistory loading />'
        stack
      >
        {/* Extra bottom padding leaves room for the recent-history dropdown
            so the absolutely-stacked popover doesn't overflow the card. */}
        <div style={{ width: '100%', maxWidth: 640, paddingBottom: 320 }}>
          <AISearch
            value={v}
            onChange={setV}
            onSubmit={submit}
            history={history}
            onClearHistory={history.length > 0 ? clearHistory : undefined}
          />
        </div>
      </Variant>
      <Variant
        label='Live · with suggestions · focus opens recent · type filters ICD-10 catalog'
        code='<AISearch value onChange onSubmit history suggestions emptyMessage />'
        stack
      >
        {/* Same 320 px bottom padding so the suggestions popover doesn't
            overflow the card. */}
        <div style={{ width: '100%', maxWidth: 640, paddingBottom: 320 }}>
          <AISearch
            value={icdQuery}
            onChange={setIcdQuery}
            onSubmit={submitIcd}
            history={icdHistory}
            onClearHistory={icdHistory.length > 0 ? () => setIcdHistory([]) : undefined}
            suggestions={icdSuggestions}
            emptyMessage='ไม่พบรหัสที่ตรงกับคำค้น'
            historyEmptyMessage='ยังไม่มีประวัติการค้นหา — พิมพ์เพื่อค้นจากแคตตาล็อก ICD-10'
            placeholder='ค้นด้วยรหัส หรือชื่อโรค เช่น I10 / ไมเกรน / Dengue'
          />
          <p style={{
            margin: 'var(--dim-space-300) 0 0',
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            lineHeight: 1.5,
          }}>
            Type any of: <code>I10</code>, <code>M54</code>, <code>ปวด</code>, <code>Dengue</code>, <code>headache</code> — the typing dropdown filters
            the inline ICD-10 catalog by case-insensitive substring on
            <code>code</code> + <code>name</code>. Pick a row to commit; the picked record (with its blue-bold ICD badge) is pushed into history.
            Same pattern the Doctor AI panel in <code>TreatmentSteps.jsx</code> uses, backed by <code>useSearchHistory</code>.
          </p>
        </div>
      </Variant>
      <Variant
        label='Loading state · spinner replaces X + submit'
        code='<AISearch value="ปวด" loading />'
        stack
      >
        <div style={{ width: '100%', maxWidth: 640 }}>
          <AISearch value='ปวด' state='typing' onChange={() => {}} loading />
        </div>
        <p style={{
          margin: 'var(--dim-space-200) 0 0',
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          lineHeight: 1.5,
        }}>
          Pass `loading={`{true}`}` while the parent fetches results (e.g. ICD lookup API).
          The X + gradient submit are swapped for a single spinning indigo-100 chip so the
          user can't double-submit. Flip `loading` back to false when the response lands.
        </p>
      </Variant>
      <Guidelines
        behavior={[
          'Five states per Figma 3396:1598: `default` · `hover` · `focus` · `typing` · `filled`. Auto-resolves from focus + value (`focused + empty → focus`, `focused + value → typing`, `blurred + value → filled`). `state` prop overrides for design-system grids.',
          'Border + icon retint per state via `--border-aiSearch-{default,hover,typing,filled}` and `--icon-aiSearch-{default,hover,typing,filled}` (design.md §6.17.6b). Dark mode flips indigo/600 → indigo/400 and indigo/700 → indigo/300 automatically when `<html data-theme="dark">` or `prefers-color-scheme: dark`.',
          'Submit button (Figma "Sent Button" 3401:6262 · Default 3401:6254 / Hover 3401:6261): linear-gradient `#6F82FF → #C079EA` 16 px `arrow_upward`. Size morphs `--dim-size-700` (36 px) → `--dim-size-800` (40 px) on hover so it visually "grows" toward the cursor as an active-target cue. Renders **only** in Typing.',
          'X clear chip (Figma 3396:3243 default · 3396:3245 hover · 3396:3250 click-contract): 32 px circle, bg morphs `--color-indigo-100` (#EEF2FF) → `--color-indigo-200` (#E0E7FF) on hover, radius morphs `--dim-radius-600` (24 px) → `--dim-radius-full` (9999 px). Renders **only** in Typing. Clicking wipes the value (`onChange("")` + optional `onClear?.()`) and refocuses the input — state collapses Typing → Focus, X + gradient submit disappear, the recent-history "ค้นหาล่าสุด" header reappears. Same contract as PrimarySearch\'s XButton.',
          'Caret behavior matches PrimarySearch: the browser-default blinking caret is visible whenever the input is focused (no `caret-color: transparent` rule), so the user always sees where their typing inserts.',
          'Keyboard navigation: while the recent-history dropdown is open, ↑ / ↓ move a highlight through the rows (wrap-around), Enter commits the highlighted row, Escape clears + blurs. Hover and the keyboard highlight share the same `--surface-list-hover` + `--text-list-hover` tokens so there\'s one visual "active" state regardless of input device. Mouse hover also updates the keyboard cursor so the two never disagree.',
          'Click-outside: clicking anywhere outside the AISearch wrapper blurs the input (state collapses out of focus/typing → dropdown unmounts). Bound on `mousedown` so the blur fires before any focus-stealing click target on the page interferes.',
          'Loading: pass `loading={true}` while the parent fetches results. The right cluster swaps the X + gradient submit for a 36 px indigo-100 chip housing a spinning `progress_activity` glyph so the user can\'t double-submit while a query is in flight. Clears automatically when the parent flips `loading` back to false.',
          'Submit button interactions: 36 px at rest, grows to 40 px on hover (Figma 3401:6261), presses with `translateY(1px) scale(0.95)` on mousedown for tactile feedback — same press pattern as BrandButton / NeutralSubdueButton. Width/height + transform animations compose via a single transform so they stack smoothly.',
          'Dropdown (Focus + Typing): same `--surface-dropdown-default` chrome as PrimarySearch. Focus state shows a `ค้นหาล่าสุด` header + optional `ล้างประวัติ` Neutral Subdue Button; Typing omits the header. Hovered rows inherit `--surface-list-hover` + `--text-list-hover` and reveal a trailing `chevron_right`.',
          'History rows accept rich records `{ id?, label, value?, badge?, badgeStyle? }`. Pass `badge="A90"` for the ICD-code chip prefix; `badgeStyle` defaults to `blue` (alias of `--surface-colorfulbadge-blue-bold`). The badge sits in a 64 px fixed-width column (Figma 3396:1627 / 3401:4292) so codes of varying length (`I10` vs `M54.9`) keep the label text vertically aligned across rows.',
          'Suggestions vs history (same contract as PrimarySearch): pass `suggestions` (array, possibly empty) and AISearch swaps the Typing dropdown to render those rows — typically a parent-filtered slice of a larger catalog. An empty `suggestions` array renders `emptyMessage` ("ไม่พบรายการที่ค้นหา" by default) instead of swallowing the dropdown. When `suggestions` is undefined / not passed, Typing falls back to showing `history` rows (legacy behavior). Focus state always shows `history` rows + the "ค้นหาล่าสุด" header; an empty history renders `historyEmptyMessage` ("ยังไม่มีประวัติการค้นหา" by default).',
          'Trailing icon on each row is a 16 px `add_circle` ("add this code to the active query"), always visible per Figma 3396:1627 — not a hover-reveal chevron. Icon color resolves to `--text-content-tertiary` on rest and `--text-list-hover` (brand-aware) on row hover.',
          'Filled state can render its own committed-value badge via `filledBadge` — pass a string for label-only (defaults to blue) or `{ label, style }` to override.',
          'Drop shadow uses `--shadow-indigo-drop-bottom` (`0 1px 8px var(--color-shadow-indigo-100)`) so the violet glow stays consistent across every brand mode.',
        ]}
        dos={[
          'Use AISearch for AI-assisted lookup surfaces (ICD codes, drug search, decision-support queries) — the indigo accent signals "AI" vs the green PrimarySearch which signals "patient lookup".',
          'Wire `onClearHistory` so users can wipe their AI-search log when needed (HIPAA / data-minimisation friendly).',
          'Show `filledBadge` once a result is committed — the badge surfaces the canonical code/identifier alongside the verbose label.',
        ]}
        donts={[
          "Don't use AISearch for patient-roster search — that's the PrimarySearch (brand-green) surface.",
          "Don't customise the gradient submit color — the indigo→fuchsia gradient is the visual signature of every AI surface in the system.",
          "Don't show the X chip without the gradient submit — both belong to the Typing state and render as a pair.",
        ]}
      />
    </Section>
  );
};

const SecondarySearchDemo = () => {
  const [v, setV] = useState('');
  return (
    <Section title='SecondarySearch' summary='Compact search input (Figma 305:43) for inline filters and popups. 2 sizes (default 40 / small 36) × 5 states (default · hover · focus · typing · filled). Typography: default = body4 14px · small = caption1 12px. Color matrix matches Primary Search — brand border + drop shadow on every state; compact 8 px radius shell with clear X when filled. Pass `state` to force the visual state.'>
      <Variant label='State matrix · 2 sizes × 5 states' stack>
        <SearchStateTable
          Component={SecondarySearch}
          states={SECONDARY_SEARCH_STATE_COLS}
          sizes={[
            { key: 'default', label: 'Default (40)' },
            { key: 'small',   label: 'Small (36)'   },
          ]}
          extraProps={{ placeholder: 'Search...' }}
          filledProps={{ defaultValue: 'Search query' }}
          cellMinWidth={280}
        />
      </Variant>
      <Variant label='Interactive' code='<SecondarySearch value onChange placeholder />'>
        <div style={{ flex: 1, minWidth: 320 }}>
          <SecondarySearch value={v} onChange={setV} placeholder='ค้นหา' />
        </div>
      </Variant>
      <Variant
        label='Clear (X) button — Figma 3345:2713 · hover to see radius morph'
        code='<SecondarySearch defaultValue="..." />'
        stack
      >
        <div style={{ width: 320 }}>
          <SecondarySearch defaultValue='ค้นหาด้วย HN / ชื่อ-สกุล' />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Clear (X) button (Figma 3345:2713) appears only when the input is `filled`. Click clears the value back to `default` state.',
          '32×32 chip with brand-quaternary (`--surface-brandPrimary-quaternary` → brand/p50) background. Hover swaps surface to `--surface-brandPrimary-quaternary-hover` (brand/p100) AND morphs `border-radius` from 24 px → 9999 px (square → circle) over 200 ms.',
          'Icon color uses `--text-brandPrimary-default` (brand/p700) so the X stays readable on both default and hover surfaces. All three values are brand-aware — flipping `data-brand` retints the chip automatically.',
          '`onMouseDown` is `preventDefault()`ed so clicking the X never blurs the input first — the clear action stays in `typing` state for one-shot edits.',
        ]}
        dos={[
          'Trust the component to hide the X when the field is empty. Don\'t guard it externally.',
          'Pair Secondary Search + X-clear with `value` / `onChange` so the controlled state stays the source of truth for both the input text and the clear affordance.',
        ]}
        donts={[
          "Don't recolor the X chip per page — the brand-aware tokens are intentional, and override styles would break theme switching.",
          "Don't replace the X with a text 'Clear' link — Figma reserves text-link clears for `<PrimarySearch>`'s `ล้างประวัติ` (NeutralSubdueButton outline-sm) inside the dropdown header.",
        ]}
      />
    </Section>
  );
};

const FilterToolbarOverflowPreview = () => {
  const [a, setA] = useState('all');
  const [b, setB] = useState('all');
  const [c, setC] = useState('all');
  const [d, setD] = useState('all');
  return (
    <div
      style={{
        maxWidth: 280,
        width: '100%',
        padding: 'var(--dim-space-300)',
        borderRadius: 'var(--dim-radius-200)',
        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
        background: 'var(--surface-card-100)',
      }}
    >
      <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
        <FilterTag value='ทั้งหมด' selected onClick={() => {}} />
        <FilterDropdown prefix='แผนก:' options={SAMPLE_OPTIONS} value={a} onChange={setA} />
        <FilterDropdown prefix='แพทย์:' options={SAMPLE_OPTIONS} value={b} onChange={setB} />
        <TagDivider />
        <FilterDropdown prefix='ประเภท:' options={SAMPLE_OPTIONS} value={c} onChange={setC} />
        <FilterDropdown prefix='เวลา:' options={SAMPLE_OPTIONS} value={d} onChange={setD} />
      </OverflowFlexRow>
    </div>
  );
};

const FilterTagDemo = () => {
  const [dept, setDept] = useState('all');
  const [speechLang, setSpeechLang] = useState('th-TH');
  return (
    <Section title='FilterTag' summary='Filter chip per Figma "Tag" (node 2056:4263). 2 styles (Neutral/Brand) × 3 sizes (sm/md/lg) × 5 states (Default/Hover/Selected/Selected-Hover/Open). Show-flags for Leading icon, Tailing icon (chevron), and Title (prefix). Brand variant retints with [data-brand]; Neutral always stays gray.'>
      <Variant label='Brand × 3 sizes × 3 base states'>
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <FilterTag variant='brand' size='sm' value='Small'  leadingIcon='filter_alt' onClick={() => {}} />
          <FilterTag variant='brand' size='md' value='Medium' leadingIcon='filter_alt' onClick={() => {}} />
          <FilterTag variant='brand' size='lg' value='Large'  leadingIcon='filter_alt' onClick={() => {}} />
        </div>
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)', marginTop: 'var(--dim-space-300)' }}>
          <FilterTag variant='brand' state='default'        value='Default'        leadingIcon='filter_alt' onClick={() => {}} />
          <FilterTag variant='brand' state='hover'          value='Hover'          leadingIcon='filter_alt' onClick={() => {}} />
          <FilterTag variant='brand' state='selected'       value='Selected'       leadingIcon='filter_alt' onClick={() => {}} />
          <FilterTag variant='brand' state='selected-hover' value='Selected-Hover' leadingIcon='filter_alt' onClick={() => {}} />
          <FilterTag variant='brand' state='open'           value='Open'           leadingIcon='filter_alt' showTailingIcon onClick={() => {}} />
        </div>
      </Variant>
      <Variant label='Neutral × 3 sizes × 3 base states'>
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <FilterTag variant='neutral' size='sm' value='Small'  leadingIcon='filter_alt' onClick={() => {}} />
          <FilterTag variant='neutral' size='md' value='Medium' leadingIcon='filter_alt' onClick={() => {}} />
          <FilterTag variant='neutral' size='lg' value='Large'  leadingIcon='filter_alt' onClick={() => {}} />
        </div>
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)', marginTop: 'var(--dim-space-300)' }}>
          <FilterTag variant='neutral' state='default'        value='Default'        leadingIcon='filter_alt' onClick={() => {}} />
          <FilterTag variant='neutral' state='hover'          value='Hover'          leadingIcon='filter_alt' onClick={() => {}} />
          <FilterTag variant='neutral' state='selected'       value='Selected'       leadingIcon='filter_alt' onClick={() => {}} />
          <FilterTag variant='neutral' state='selected-hover' value='Selected-Hover' leadingIcon='filter_alt' onClick={() => {}} />
        </div>
      </Variant>
      <Variant label='Show / hide every slot (matches Figma Properties)'>
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <FilterTag value='Title + Leading + Tailing' prefix='แผนก:' leadingIcon='filter_alt' showTailingIcon onClick={() => {}} />
          <FilterTag value='No Leading'                prefix='แผนก:' showLeadingIcon={false} showTailingIcon onClick={() => {}} />
          <FilterTag value='No Tailing'                prefix='แผนก:' leadingIcon='filter_alt' onClick={() => {}} />
          <FilterTag value='No Title'                  prefix='แผนก:' showTitle={false} leadingIcon='filter_alt' showTailingIcon onClick={() => {}} />
        </div>
      </Variant>
      <Variant label='Overflow row · narrow container (More + dropdown, matches queue pages)' stack>
        <p style={{
          margin: 'var(--dim-space-0)',
          color: 'var(--text-content-secondary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          lineHeight: 1.5,
        }}>
          When the toolbar is narrower than the sum of chip widths, trailing filters collapse into the same <code>more_horiz</code> + <code>keyboard_arrow_down</code> trigger as <code>TabUnderline</code> overflow (see design.md §6.15.1).
        </p>
        <FilterToolbarOverflowPreview />
      </Variant>
      <Variant label='Live dropdown + divider'>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <FilterTag value='ทั้งหมด' selected onClick={() => {}} />
          <FilterDropdown prefix='แผนก:' options={SAMPLE_OPTIONS} value={dept} onChange={setDept} />
          <TagDivider />
          <FilterTag value='วันนี้' onClick={() => {}} />
        </div>
      </Variant>
      <Variant label='Language picker (VoiceTextarea toolbar · design.md §6.16.1)'>
        <FilterDropdown
          leadingIcon='language'
          options={VOICE_TEXTAREA_LANGUAGE_OPTIONS}
          value={speechLang}
          onChange={setSpeechLang}
          menuZIndex='var(--sm-z-modal-popover, 1450)'
          tagStyle={{ height: 36, maxWidth: 192, minWidth: 40 }}
        />
      </Variant>
      <Guidelines
        behavior={[
          'Real <button> with role="button"; receives keyboard focus and fires onClick on Enter / Space.',
          '5 states (default · hover · selected · selected-hover · open) — `open` is used when the chip backs a popover/dropdown.',
          'FilterDropdown portalled menu uses class <code>mih-search-popover</code>; pass <code>menuZIndex</code> when nested in modals (VoiceTextarea / body-mark editor).',
          'Brand variant retints with [data-brand]; Neutral always stays gray.',
          'Title (prefix) renders inline before the value (e.g. "แผนก: อายุรกรรม").',
        ]}
        dos={[
          'Use FilterTag for an applied or selectable filter chip above a list.',
          'Pair with FilterDropdown for chips that open a multi-option popover; use the `open` state while the popover is showing.',
          'On queue / MR / Treatment list pages, wrap the filter chip row in <code>OverflowFlexRow</code> so narrow viewports get the Tab-style More menu instead of squashing chips.',
          'Use Brand variant for the primary filter axis (date / department); Neutral for secondary chips.',
        ]}
        donts={[
          "Don't use FilterTag for navigation — it reads as a filter affordance.",
          "Don't mix selectable FilterTags with removable Tags in the same row — the affordances conflict.",
          "Don't render a long inline-only chip row without <code>OverflowFlexRow</code> or another overflow strategy — chips become unreadable on small widths.",
        ]}
      />
    </Section>
  );
};

const FilterDateTagDemo = () => {
  const [v, setV] = useState({ quick: 'today' });
  return (
    <Section title='FilterDateTag' summary='Composite of FilterTag (dropdown chip) + DateFilterPopup. Click to open the popup; pick a quick option (today / 7days / thismonth …) or a custom range. Value shape: { quick, tab?, single?, range? }.'>
      <Variant label='Default · controlled'>
        <FilterDateTag value={v} onChange={setV} />
        <span style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: 'var(--type-size-xs)',
        }}>value = {JSON.stringify(v)}</span>
      </Variant>
      <Guidelines
        behavior={[
          'Click the chip to open DateFilterPopup; the chip enters the `open` state while the popover is showing.',
          'Quick presets (วันนี้ / 7 วัน / เดือนนี้) emit { quick } only; custom range emits { quick: "custom", range: { start, end } }.',
          'Outside-click and Escape close the popover and revert to the most-recently-committed value.',
        ]}
        dos={[
          'Use FilterDateTag as the primary date filter on list pages (queue, history) — pair with TagDivider and other FilterTags.',
          'Render the human-readable label inside the chip (e.g. "วันนี้" / "1–7 พ.ค. 2569") so users see the active range at a glance.',
          'Preserve the previous value if the user cancels — don\'t clear on close.',
        ]}
        donts={[
          "Don't use FilterDateTag as a form field — use DatePicker for committing dates into a record.",
          "Don't show seconds/minutes in the chip label — keep it day-level granularity.",
          "Don't auto-apply on quick-preset click without closing the popup — the close confirms the commit.",
        ]}
      />
    </Section>
  );
};

const SelectDemo = () => {
  const [v, setV] = useState('');
  const [sev334, setSev334] = useState('high');
  const [like334, setLike334] = useState('definite');
  const optsWithIcon = SAMPLE_OPTIONS.map((o) => ({ ...o, icon: 'person' }));
  return (
    <Section title='Select' summary='Single-select dropdown per Figma "Default Select" (node 268:55). 3 sizes × 6 states × show-flags. Options may include `colorfulBadgeStyle` for ColorfulBadge rows + success check when selected (PHCIS | OPD 334:56417 — allergy severity; 334:56749 — likelihood).'>
      <Variant label='3 sizes (Small / Medium / Large)'>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)', maxWidth: 360 }}>
          <Select size='sm' label='Small'  required helperText='Helper text' leadingIcon='calendar_today' options={SAMPLE_OPTIONS} />
          <Select size='md' label='Medium' required helperText='Helper text' leadingIcon='calendar_today' options={SAMPLE_OPTIONS} />
          <Select size='lg' label='Large'  required helperText='Helper text' leadingIcon='calendar_today' options={SAMPLE_OPTIONS} />
        </div>
      </Variant>
      <Variant label='6 states (forced via state prop)'>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)', maxWidth: 360 }}>
          <Select label='Default'  state='default'  helperText='Helper text' leadingIcon='calendar_today' options={SAMPLE_OPTIONS} />
          <Select label='Hover'    state='hover'    helperText='Helper text' leadingIcon='calendar_today' options={SAMPLE_OPTIONS} />
          <Select label='Filled'   state='filled'   helperText='Helper text' leadingIcon='calendar_today' options={SAMPLE_OPTIONS} defaultValue={SAMPLE_OPTIONS[0]?.value} />
          <Select label='Error'    error='This field is required'           leadingIcon='calendar_today' options={SAMPLE_OPTIONS} />
          <Select label='Disabled' disabled                                  leadingIcon='calendar_today' options={SAMPLE_OPTIONS} />
        </div>
      </Variant>
      <Variant label='Interactive (click to open)'>
        <div style={{ maxWidth: 360 }}>
          <Select
            label='เลือกแผนก'
            required
            helperText='Helper text'
            leadingIcon='calendar_today'
            options={optsWithIcon}
            value={v}
            onChange={setV}
          />
        </div>
      </Variant>
      <Variant label='Severity popover (Figma 334:56417 · 3 levels)'>
        <div style={{ maxWidth: 360 }}>
          <Select
            label='ระดับความรุนแรง'
            required
            showLeadingIcon={false}
            showHelperText={false}
            options={SEVERITY_SELECT_OPTS_334}
            value={sev334}
            onChange={setSev334}
          />
        </div>
      </Variant>
      <Variant label='Likelihood popover (Figma 334:56749 · 4 levels)'>
        <div style={{ maxWidth: 360 }}>
          <Select
            label='ระดับความน่าจะเป็น'
            required
            showLeadingIcon={false}
            showHelperText={false}
            options={LIKELIHOOD_SELECT_OPTS_334}
            value={like334}
            onChange={setLike334}
          />
        </div>
      </Variant>
      <Variant label='Show / hide every slot (matches Figma Properties)'>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)', maxWidth: 360 }}>
          <Select label='No leading icon'   showLeadingIcon={false} options={SAMPLE_OPTIONS} />
          <Select label='No helper'         showHelperText={false}  options={SAMPLE_OPTIONS} />
          <Select label='No asterisk'       required showRequired={false} options={SAMPLE_OPTIONS} />
          <Select label='No field name row' showFieldName={false}   options={SAMPLE_OPTIONS} />
          <Select label='With badge slot'   showBadge   leadingIcon='calendar_today' options={SAMPLE_OPTIONS} />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Single-select with a popover list. State auto-resolves from disabled / error / focus / value; pass `state` to force.',
          'Options may carry `colorfulBadgeStyle` to render ColorfulBadge rows (severity / likelihood pickers).',
        ]}
        dos={[
          'Use when the user picks ONE option from a known list (≤ 30 options is the comfort zone).',
          'Pair with leading icon + helper text in narrow form rows so the empty value still tells the user what to pick.',
          'Use the badge option layout for clinical category pickers (severity / likelihood) so the colour map carries through.',
        ]}
        donts={[
          "Don't use for multi-select — use CheckboxGroup.",
          "Don't use for very long lists (50+) — use a searchable Dropdown / autocomplete instead.",
          "Don't ship without a label — narrow Selects without a label are unscannable.",
        ]}
      />
    </Section>
  );
};

const SelectableTagDemo = () => {
  const [on, setOn] = useState(false);
  return (
    <Section title='SelectableTag' summary='Toggleable tag — used for multi-select filters and chip groups. Three sizes: sm 28h (default · NotePreset chips) · md 32h · lg 40h (Figma 3362:3326 — matches FilterTag Large so SelectableTag + FilterTag can share a toolbar row).'>
      <Variant label='Toggleable / selected / unselected'>
        <SelectableTag selected={on} onClick={() => setOn(!on)}>Toggle me</SelectableTag>
        <SelectableTag selected onClick={() => {}}>Selected</SelectableTag>
        <SelectableTag onClick={() => {}}>Unselected</SelectableTag>
      </Variant>
      <Variant label='Sizes (sm 28h · md 32h · lg 40h per Figma 3362:3326)'>
        <SelectableTag size='sm' onClick={() => {}}>Small</SelectableTag>
        <SelectableTag size='md' onClick={() => {}}>Medium</SelectableTag>
        <SelectableTag size='lg' onClick={() => {}}>Large</SelectableTag>
      </Variant>
      <Variant label='Large — selected vs unselected (Figma 3362:3326)'>
        <SelectableTag size='lg' onClick={() => {}}>Outline</SelectableTag>
        <SelectableTag size='lg' selected onClick={() => {}}>Selected</SelectableTag>
      </Variant>
      <Guidelines
        behavior={[
          'Toggle button — clicking flips `selected`. Acts as a checkbox in chip clothing.',
          'aria-pressed reflects selected state (toggle-button semantics).',
          'Keyboard focus and Enter / Space activation are inherited from the underlying <button>.',
        ]}
        dos={[
          'Use SelectableTag for multi-select filters where order doesn\'t matter (categories, symptoms, tags).',
          'Render selected chips with the brand surface; unselected chips with the neutral surface.',
          'Pair with a "ล้างทั้งหมด" clear-all action when a row of selectable tags can have many active.',
        ]}
        donts={[
          "Don't use SelectableTag for navigation or single-select filters — use Radio / FilterTag.",
          "Don't render SelectableTag without an onClick — it implies togglability.",
          "Don't mix SelectableTag with removable Tag chips in the same row — affordances conflict.",
        ]}
      />
    </Section>
  );
};

/* ── Generic TabPill state-matrix table — rows × 4 states ── */
const TAB_PILL_STATE_COLS = [
  { key: 'default',  label: 'Default',  props: {} },
  { key: 'hover',    label: 'Hover',    props: { state: 'hover' } },
  { key: 'selected', label: 'Selected', props: { state: 'selected' } },
  { key: 'disabled', label: 'Disabled', props: { state: 'disabled' } },
];

const TabPillStateTable = ({ rows, cellMinWidth = 140 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>
            Variant
          </th>
          {TAB_PILL_STATE_COLS.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.key}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
              {row.label}
            </td>
            {TAB_PILL_STATE_COLS.map((col) => (
              <td key={col.key} style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
                <TabPill
                  size={row.size}
                  style={row.style}
                  leadingIcon={row.leadingIcon}
                  {...col.props}
                >
                  {row.style === 'icon' ? null : 'Tab'}
                </TabPill>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TabPillDemo = () => {
  const [v, setV] = useState('today');
  return (
    <Section title='TabPill' summary='Pill-shaped segmented tab (Figma 370:30). 2 styles (text / icon) × 2 sizes (small 32 / large auto) × 4 states (default · hover · selected · disabled). Wraps inside <TabBar /> with an animated indicator at runtime; pass `state` to force the visual state for design-system docs. Tables below mirror the Figma variant matrix — rows are style × size, columns are states.'>
      <Variant label='State matrix · 2 styles × 2 sizes × 4 states' stack>
        <TabPillStateTable
          rows={[
            { key: 'text-small', label: 'Text · Small',  size: 'small', style: 'text', leadingIcon: 'pets' },
            { key: 'text-large', label: 'Text · Large',  size: 'large', style: 'text', leadingIcon: 'pets' },
            { key: 'icon-small', label: 'Icon · Small',  size: 'small', style: 'icon', leadingIcon: 'view_list' },
            { key: 'icon-large', label: 'Icon · Large',  size: 'large', style: 'icon', leadingIcon: 'view_list' },
          ]}
        />
      </Variant>
      <Variant label='Inside <TabBar /> — animated indicator (interactive)'>
        <TabBar>
          {[
            { key: 'today', label: 'วันนี้' },
            { key: 'week',  label: 'สัปดาห์นี้' },
            { key: 'month', label: 'เดือนนี้' },
          ].map((t) => (
            <TabPillSmall key={t.key} selected={v === t.key} onClick={() => setV(t.key)}>{t.label}</TabPillSmall>
          ))}
        </TabBar>
      </Variant>
      <Guidelines
        behavior={[
          'role="tablist" + role="tab"; aria-selected flips on the active tab.',
          'Arrow keys move between tabs within the list; Enter / Space activate (or auto-activate on arrow for navigation tabs).',
          'TabBar paints an animated underline/pill indicator that slides to the selected tab.',
          'state="hover" / state="selected" / state="disabled" are docs-only overrides — runtime uses pointer + selected props.',
        ]}
        dos={[
          'Use TabPill when tabs live inside a card and need a softer chrome (filters, mini-toggles).',
          'Keep labels short (≤2 words, ≤14 Thai chars) so 3-4 tabs fit on a row without truncation.',
          'Use the icon variant when the tab represents a view mode (list / grid) and the icon is universally understood.',
        ]}
        donts={[
          "Don't mix TabPill with TabUnderline on the same surface — pick one Tab family per screen.",
          "Don't use Tabs for fewer than 3 sections — use a SegmentedControl or two buttons.",
          "Don't use Tabs as a workflow stepper — use Step / StepProgress. Tabs imply parallel content.",
        ]}
      />
    </Section>
  );
};

/* ── TabCapsule state-matrix table — 3 types × 4 states ── */
const TAB_CAPSULE_STATE_COLS = [
  { key: 'default',  label: 'Default',  props: {} },
  { key: 'hover',    label: 'Hover',    props: { state: 'hover' } },
  { key: 'active',   label: 'Active',   props: { state: 'active' } },
  { key: 'disabled', label: 'Disabled', props: { state: 'disabled' } },
];

const TAB_CAPSULE_ROWS = [
  { key: 'default',     label: 'Default · link',     type: 'default' },
  { key: 'in-progress', label: 'In progress · dot',  type: 'in-progress' },
  { key: 'success',     label: 'Success · check',    type: 'success' },
];

const TabCapsuleStateTable = ({ cellMinWidth = 180 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>
            Type
          </th>
          {TAB_CAPSULE_STATE_COLS.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {TAB_CAPSULE_ROWS.map((row, i) => (
          <tr key={row.key}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
              {row.label}
            </td>
            {TAB_CAPSULE_STATE_COLS.map((col) => (
              <td key={col.key} style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
                <TabCapsule type={row.type} label='Outline' {...col.props} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const HISTORY_FILTER_TABS = [
  'ผลการคัดกรองและซักประวัติ',
  'ผลการตรวจแล็บ',
  'ผลการ X-ray / RIS',
  'ผลการตรวจร่างกาย',
  'ผลการวินิจฉัย',
];

const TabCapsuleDemo = () => {
  const [sel, setSel] = useState('default');
  const [filterTab, setFilterTab] = useState(0);
  return (
    <Section title='TabCapsule' summary='Capsule-shaped tab (Figma 2612:7791). Default width hugs label text (filter-tag pattern). Pass maxWidth only when truncation is needed.'>
      <Variant label='Filter tags · width hugs label (Treatment Step 1)' stack>
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
          {HISTORY_FILTER_TABS.map((label, i) => (
            <TabCapsule
              key={label}
              variant='filter'
              label={label}
              selected={filterTab === i}
              onClick={() => setFilterTab(i)}
            />
          ))}
        </div>
      </Variant>
      <Variant label='State matrix · 3 types × 4 states' stack>
        <TabCapsuleStateTable />
      </Variant>
      <Variant label='Interactive group (click to select)'>
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
          {TAB_CAPSULE_ROWS.map((row) => (
            <TabCapsule
              key={row.key}
              type={row.type}
              label={row.label}
              selected={sel === row.key}
              onClick={() => setSel(row.key)}
            />
          ))}
        </div>
      </Variant>
      <Variant label='Optional maxWidth (truncation)'>
        <TabCapsule label='ชื่อแท็บยาวมากที่ถูกตัดด้วย ellipsis' maxWidth={192} showLeadingIcon={false} showTrailingIcon={false} />
      </Variant>
      <Variant
        label='With ColorfulBadge prefix + add-circle action (Doctor AI suggestion chip · Figma 331:44658)'
        stack
      >
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <TabCapsule
            label='Dengue fever (ไข้แดงกี)'
            badge='A90'
            badgeStyle='indigo'
            badgeHierarchy='primary'
            showLeadingIcon={false}
            showTrailingIcon={false}
            showAddIcon
          />
          <TabCapsule
            label='Dorsalgia, unspecified (ปวดหลังไม่ระบุรายละเอียด)'
            badge='M54.9'
            badgeStyle='indigo'
            badgeHierarchy='primary'
            showLeadingIcon={false}
            showTrailingIcon={false}
            showAddIcon
          />
          <TabCapsule
            label='Migraine, unspecified'
            badge={{ label: 'G43.9', style: 'magenta', hierarchy: 'primary' }}
            showLeadingIcon={false}
            showTrailingIcon={false}
            showAddIcon
          />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Capsule-shaped tab with optional leading indicator + label + trailing chevron.',
          'Width follows label text by default — each filter tag sizes to its copy.',
          'Real <button>; hover/selected unless `state` is forced for design-system grids.',
          '`badge` + `showAddIcon` are opt-in slots from the design-system Figma 2612:7791 — pass a string (badge label only) or `{ label, style, hierarchy }` to override the ColorfulBadge styling. A badge automatically suppresses the type leading icon. `showAddIcon` swaps the trailing chevron for `add_circle` (Doctor AI suggestion chip pattern).',
        ]}
        dos={[
          'Use TabCapsule variant="filter" for treatment history filter rows (CPOE 176:38632); width hugs the label.',
          'Use type="success" / type="in-progress" when the leading indicator shows step progress.',
          'Use `badge="A90"` + `showAddIcon` for Doctor-AI / ICD suggestion chips (Step 4 · Figma 156:27354).',
          'Pass maxWidth={192} only when a long label must truncate.',
        ]}
        donts={[
          "Don't set a fixed min-width on filter tags — let each chip hug its label.",
          "Don't use TabCapsule for static category labels — use Tag instead.",
          "Don't combine `showTrailingIcon` + `showAddIcon` — only one trailing slot renders at a time.",
        ]}
      />
    </Section>
  );
};

/* ── TabUnderline state-matrix table — rows × 5 states ── */
const TAB_UNDERLINE_STATE_COLS = [
  { key: 'default',        label: 'Default',         props: {} },
  { key: 'hover',          label: 'Hover',           props: { state: 'hover' } },
  { key: 'selected',       label: 'Selected',        props: { state: 'selected' } },
  { key: 'selected-hover', label: 'Selected-Hover',  props: { state: 'selected-hover' } },
  { key: 'disabled',       label: 'Disabled',        props: { state: 'disabled' } },
];

const TAB_UNDERLINE_ROWS = [
  { key: 'lg', label: 'Large (44)'  },
  { key: 'md', label: 'Medium (40)' },
  { key: 'sm', label: 'Small (36)'  },
];

const TabUnderlineStateTable = ({ cellMinWidth = 160 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>
            Size
          </th>
          {TAB_UNDERLINE_STATE_COLS.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {TAB_UNDERLINE_ROWS.map((row, i) => (
          <tr key={row.key}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
              {row.label}
            </td>
            {TAB_UNDERLINE_STATE_COLS.map((col) => (
              <td key={col.key} style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
                <TabUnderlineItem
                  size={row.key}
                  label='Tab Label'
                  {...col.props}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TabUnderlineDemo = () => {
  const [a, setA] = useState('all');
  const [b, setB] = useState('all');
  const [c, setC] = useState('overview');
  const [d, setD] = useState('all');
  const [e, setE] = useState('sched');
  return (
    <Section title='TabUnderline' summary='Page-level underline tab strip (Figma 371:30). 3 sizes (Large 44 / Medium 40 / Small 36) × 5 states (default · hover · selected · selected-hover · disabled). Multi-tab `<TabUnderline>` paints a single sliding indicator; single `<TabUnderlineItem>` is for state-matrix docs. Tables below mirror the Figma variant matrix — rows are sizes, columns are states.'>
      <Variant label='State matrix · 3 sizes × 5 states' stack>
        <TabUnderlineStateTable />
      </Variant>
      <Variant label='Text only' stack>
        <TabUnderline
          tabs={[
            { key: 'all',   label: 'ทั้งหมด' },
            { key: 'pend',  label: 'กำลังรอ' },
            { key: 'done',  label: 'เสร็จแล้ว' },
            { key: 'draft', label: 'ที่ร่างไว้' },
          ]}
          value={a}
          onChange={setA}
          className='w-full'
          style={{
            gap: 'var(--dim-space-200)',
            borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          }}
        />
      </Variant>
      <Variant label='With count badges' stack>
        <TabUnderline
          tabs={[
            { key: 'all',     label: 'ทั้งหมด',          count: 130 },
            { key: 'waiting', label: 'รอตรวจ',           count: 7   },
            { key: 'progress',label: 'กำลังตรวจ',         count: 3   },
            { key: 'done',    label: 'เสร็จแล้ว',         count: 6   },
          ]}
          value={b}
          onChange={setB}
          className='w-full'
          style={{
            gap: 'var(--dim-space-200)',
            borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          }}
        />
      </Variant>
      <Variant label='With leading icons + counts' stack>
        <TabUnderline
          tabs={[
            { key: 'overview', label: 'ภาพรวม',  icon: 'dashboard' },
            { key: 'patient',  label: 'ผู้ป่วย',  icon: 'group',     count: 24 },
            { key: 'report',   label: 'รายงาน',  icon: 'analytics' },
            { key: 'setting',  label: 'ตั้งค่า',  icon: 'settings' },
          ]}
          value={c}
          onChange={setC}
          className='w-full'
          style={{
            gap: 'var(--dim-space-200)',
            borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          }}
        />
      </Variant>
      <Variant
        label='Underline width = label text only (icon + count excluded; design.md §6.15.1)'
        stack
      >
        <TabUnderline
          tabs={[
            { key: 'sched', label: 'schedule', icon: 'calendar_month', count: 83 },
            { key: 'queue', label: 'คิวรอซักประวัติ', icon: 'description', count: 12 },
            { key: 'short', label: 'สั้น', icon: 'check' },
          ]}
          value={e}
          onChange={setE}
          className='w-full'
          style={{
            gap: 'var(--dim-space-200)',
            borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          }}
        />
      </Variant>
      <Variant
        label='Overflow → More dropdown (Figma 2867:4170)'
        stack
      >
        <div style={{ width: 480, maxWidth: '100%' }}>
          <TabUnderline
            tabs={[
              { key: 'all',       label: 'ทั้งหมด',          count: 130 },
              { key: 'waiting',   label: 'รอตรวจ',           count: 7   },
              { key: 'progress',  label: 'กำลังตรวจ',         count: 3   },
              { key: 'lab',       label: 'รอผลแลป',          count: 12  },
              { key: 'xray',      label: 'รอผลเอ็กซเรย์',     count: 4   },
              { key: 'pharmacy',  label: 'รอเภสัชจ่ายยา',     count: 9   },
              { key: 'done',      label: 'เสร็จแล้ว',         count: 86  },
              { key: 'cancelled', label: 'ยกเลิก',           count: 2   },
            ]}
            value={d}
            onChange={setD}
            className='w-full'
            style={{
              gap: 'var(--dim-space-200)',
              borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            }}
          />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'role="tablist" + role="tab"; aria-selected flips on the active tab.',
          'Arrow keys move between tabs and immediately activate (recommended for navigation tabs that swap content).',
          'A single sliding indicator under the active tab is painted by <TabUnderline>; single <TabUnderlineItem> is for state-matrix docs.',
          'The underline (sliding ink, or per-tab bar when `animated={false}`) is sized to the **label** bounding box — icons and count pills do not widen it (see variant above + design.md §6.15.1).',
          'Tab labels can carry an optional `count` chip and an optional `icon`.',
          'When the container is narrower than the full tab strip, trailing tabs are auto-collapsed into a "More" trigger (Figma 2867:4170 — more_horiz + keyboard_arrow_down). Clicking it opens a dropdown listing the hidden tabs; selecting one calls the same onChange. Queue filter toolbars use the same trigger via <code>OverflowFlexRow</code> (see FilterTag demo + design.md §6.15.1).',
        ]}
        dos={[
          'Use TabUnderline as the page-level navigation inside a section (queue / register / history).',
          'Show counts on tabs that summarize lists (รอตรวจ 7 / กำลังตรวจ 3) — the count is what tells the user where to look.',
          'Keep tab order stable across screens — moving tabs around between contexts is disorienting.',
        ]}
        donts={[
          "Don't use TabUnderline inside a small card — the underline visual disappears against busy chrome. Use TabPill instead.",
          "Don't use Tabs as a workflow stepper — use Step / StepProgress.",
          "Don't ship a TabUnderline with disabled tabs as the only state for an entire section — hide the tab or move the feature.",
        ]}
      />
    </Section>
  );
};

/* ── Dropdown state-matrix tables — trigger (6 states × 2 sizes) + row (4 states) ── */
const DROPDOWN_TRIGGER_COLS = [
  { key: 'default',  label: 'Default',  props: {} },
  { key: 'hover',    label: 'Hover',    props: { state: 'hover' } },
  { key: 'open',     label: 'Open',     props: { state: 'open' } },
  { key: 'filled',   label: 'Filled',   props: { state: 'filled', value: SAMPLE_OPTIONS[0]?.value } },
  { key: 'error',    label: 'Error',    props: { state: 'error' } },
  { key: 'disabled', label: 'Disabled', props: { state: 'disabled' } },
];
const DROPDOWN_TRIGGER_ROWS = [
  { key: 'lg', label: 'Large (40)' },
  { key: 'md', label: 'Medium (36)' },
];

const DROPDOWN_ROW_COLS = [
  { key: 'default',         label: 'Default',         state: 'default' },
  { key: 'hover',           label: 'Hover',           state: 'hover' },
  { key: 'selected',        label: 'Selected',        state: 'selected' },
  { key: 'selected-hover',  label: 'Selected-Hover',  state: 'selected-hover' },
];

const DropdownTriggerStateTable = ({ cellMinWidth = 220 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>Size</th>
          {DROPDOWN_TRIGGER_COLS.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {DROPDOWN_TRIGGER_ROWS.map((row, i) => (
          <tr key={row.key}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{row.label}</td>
            {DROPDOWN_TRIGGER_COLS.map((col) => (
              <td key={col.key} style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
                <Dropdown
                  size={row.key}
                  options={SAMPLE_OPTIONS}
                  placeholder='เลือกแผนก'
                  {...col.props}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const DROPDOWN_ROW_ICON_TONES = [
  { key: 'default', label: 'Icon · Default' },
  { key: 'darker',  label: 'Icon · Darker' },
];

const DropdownRowStateTable = ({ cellMinWidth = 300 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>Icon tone</th>
          {DROPDOWN_ROW_COLS.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {DROPDOWN_ROW_ICON_TONES.map((row, i) => (
          <tr key={row.key}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
              {row.label}
            </td>
            {DROPDOWN_ROW_COLS.map((col, j) => (
              <td key={col.key} style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
                <DropdownRowPreview
                  state={col.state}
                  icon={row.key}
                  label={`List0${j + 1}`}
                  switchOn={col.state === 'selected' || col.state === 'selected-hover'}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* Show-flag matrix — one row per flag toggled off, others on. Helps eyeball
   how the row collapses when any slot is hidden via Figma's property panel. */
const DROPDOWN_ROW_SLOT_VARIANTS = [
  { key: 'all',          label: 'All slots',           flags: { showLeadingIcon: true,  showSwitch: true,  showBadge: true,  showCheck: true,  showChevron: true  } },
  { key: 'no-leading',   label: 'No Leading icon',     flags: { showLeadingIcon: false, showSwitch: true,  showBadge: true,  showCheck: true,  showChevron: true  } },
  { key: 'no-switch',    label: 'No Switch',           flags: { showLeadingIcon: true,  showSwitch: false, showBadge: true,  showCheck: true,  showChevron: true  } },
  { key: 'no-badge',     label: 'No Badge',            flags: { showLeadingIcon: true,  showSwitch: true,  showBadge: false, showCheck: true,  showChevron: true  } },
  { key: 'no-check',     label: 'No Check',            flags: { showLeadingIcon: true,  showSwitch: true,  showBadge: true,  showCheck: false, showChevron: true  } },
  { key: 'no-chevron',   label: 'No Chevron right',    flags: { showLeadingIcon: true,  showSwitch: true,  showBadge: true,  showCheck: true,  showChevron: false } },
  { key: 'label-only',   label: 'Label only',          flags: { showLeadingIcon: false, showSwitch: false, showBadge: false, showCheck: false, showChevron: false } },
];

const DropdownRowSlotsTable = ({ cellMinWidth = 300 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>Slot config</th>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>Default</th>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>Selected</th>
        </tr>
      </thead>
      <tbody>
        {DROPDOWN_ROW_SLOT_VARIANTS.map((row, i) => (
          <tr key={row.key}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{row.label}</td>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
              <DropdownRowPreview state='default' label='List01' {...row.flags} />
            </td>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
              <DropdownRowPreview state='selected' label='List01' switchOn {...row.flags} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const DropdownDemo = () => {
  const [v, setV] = useState('all');
  return (
    <Section title='Dropdown' summary='Generic select with options array (Figma 382:14360, 311:3, 382:14565). Trigger has 2 sizes (Large 40 / Medium 36) × 6 states (default · hover · open · filled · error · disabled). List items have 4 row states (default · hover · selected · selected-hover). Pass `state` to force the trigger visual; the dropdown panel handles row hover/selected internally at runtime. Tables below mirror the Figma variant matrix.'>
      <Variant label='Trigger · state matrix · 2 sizes × 6 states' stack>
        <DropdownTriggerStateTable />
      </Variant>
      <Variant label='List item · state matrix · 2 icon tones × 4 states' stack>
        <DropdownRowStateTable />
      </Variant>
      <Variant label='List item · show / hide every slot (matches Figma Properties)' stack>
        <DropdownRowSlotsTable />
      </Variant>
      <Variant label='Interactive (click to open)'>
        <div style={{ minWidth: 240 }}>
          <Dropdown options={SAMPLE_OPTIONS} value={v} onChange={setV} placeholder='เลือกแผนก' />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Trigger uses Select-style state machine (default · hover · open · filled · error · disabled).',
          'Keyboard: ↑ / ↓ move focus, Enter activates, Escape closes, Tab closes and moves focus to the next element.',
          'Panel rows can show leading icon, switch, badge, check, and chevron — composed via the row property panel.',
        ]}
        dos={[
          'Use Dropdown when the user is picking one or more values from a constrained list.',
          'Show a leading icon only when it disambiguates the choice (brand modes, status); otherwise rely on the label.',
          'Pair the trigger with a label + helper text for form context.',
        ]}
        donts={[
          "Don't put destructive actions (delete account, drop table) inside a Dropdown without a confirmation step.",
          "Don't use Dropdown for navigation — the chevron sets the expectation of value selection. Use ActionList for navigation.",
          "Don't render more than ~12 rows without a scrollable panel or search — long lists kill the keyboard flow.",
        ]}
      />
    </Section>
  );
};

/* ── Calendar state-matrix tables — day cell + chevron ── */
const CALENDAR_DAY_STATE_COLS = [
  { key: 'default',  label: 'Default',  state: 'default' },
  { key: 'hover',    label: 'Hover',    state: 'hover' },
  { key: 'range',    label: 'In-range', state: 'range' },
  { key: 'selected', label: 'Selected', state: 'selected' },
  { key: 'disabled', label: 'Disabled', state: 'disabled' },
];

const CALENDAR_CHEVRON_STATE_COLS = [
  { key: 'default', label: 'Default', state: 'default' },
  { key: 'hover',   label: 'Hover',   state: 'hover' },
];

const CalendarMatrixTable = ({ title, cols, render, cellMinWidth = 120 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>
            {title}
          </th>
          {cols.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ padding: 'var(--dim-space-300)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
            Default
          </td>
          {cols.map((col) => (
            <td key={col.key} style={{ padding: 'var(--dim-space-300)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
              {render(col.state)}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  </div>
);

const CalendarDemo = () => {
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [single, setSingle] = useState(null);
  const [range, setRange] = useState({ start: null, end: null });

  const handleRangeSelect = (date) => {
    setRange((prev) => {
      if (!prev.start || (prev.start && prev.end)) return { start: date, end: null };
      return { start: prev.start, end: date };
    });
  };

  const navigate = (delta) => {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  };

  return (
    <Section title='Calendar' summary='Month-grid date picker (Figma 2074:6402, day cell 325:3609, chevron 3070:4061). Day cell has 5 states (default · hover · in-range · selected · disabled); chevron has 2 (default · hover). Single-month layout is 320w; range picker renders two months side-by-side with only the outer chevrons. Tables below mirror the Figma variant matrix.'>
      <Variant label='Day cell · state matrix · 5 states' stack>
        <CalendarMatrixTable
          title='Day cell'
          cols={CALENDAR_DAY_STATE_COLS}
          render={(state) => <CalendarDayPreview state={state} />}
        />
      </Variant>
      <Variant label='Chevron · state matrix · 2 states' stack>
        <CalendarMatrixTable
          title='Chevron'
          cols={CALENDAR_CHEVRON_STATE_COLS}
          render={(state) => <CalendarChevronPreview state={state} direction='left' />}
        />
      </Variant>
      <Variant label='Single-date · mode="single"' code='viewMonth · selection: Date · onSelect · onNavigate'>
        <Calendar
          viewMonth={viewMonth}
          mode='single'
          selection={single}
          onSelect={setSingle}
          onNavigate={navigate}
        />
      </Variant>
      <Variant label='Date range · mode="range"' code='selection: { start, end }'>
        <Calendar
          viewMonth={viewMonth}
          mode='range'
          selection={range}
          onSelect={handleRangeSelect}
          onNavigate={navigate}
        />
      </Variant>
      <Guidelines
        behavior={[
          'Arrow keys move between days within a month; Enter commits the selection; Escape closes the popup.',
          'Today is outlined in brand-p*; selected day uses the brand-p* surface; in-range days use a tinted background.',
          'mode="single" returns a Date via onSelect; mode="range" returns { start, end } — caller resets start/end based on click order.',
          'Chevron buttons fire onNavigate(+1 / -1) for month transitions; the parent owns viewMonth state.',
        ]}
        dos={[
          'Disable past dates with minDate={new Date()} for booking flows; future dates beyond a window with maxDate.',
          'Render two months side-by-side for range selection (hide the inner chevrons) when screen width allows.',
          'Treat onSelect as a value setter — derive helper text (วันใกล้ถึง / กี่วันจากวันนี้) outside the component.',
        ]}
        donts={[
          "Don't use Calendar standalone for range selection without explicit start/end props — the single-day visual will mislead.",
          "Don't auto-close the popup mid-range selection (after picking `start`) — let the user pick `end`.",
          "Don't override the today outline — it's the only affordance that grounds users when they navigate months.",
        ]}
      />
    </Section>
  );
};

/* ── DatePicker state-matrix table — 2 sizes × 6 states ── */
const DATEPICKER_STATE_COLS = [
  { key: 'default',  label: 'Default',  props: {} },
  { key: 'hover',    label: 'Hover',    props: { state: 'hover' } },
  { key: 'open',     label: 'Open',     props: { state: 'open' } },
  { key: 'filled',   label: 'Filled',   props: { state: 'filled', defaultValue: new Date(2026, 3, 8) } },
  { key: 'error',    label: 'Error',    props: { error: 'Please pick a date' } },
  { key: 'disabled', label: 'Disabled', props: { disabled: true } },
];

const DATEPICKER_ROWS = [
  { key: 'md', label: 'Medium (40)' },
  { key: 'sm', label: 'Small (36)'  },
];

const DatePickerStateTable = ({ cellMinWidth = 220 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>
            Size
          </th>
          {DATEPICKER_STATE_COLS.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {DATEPICKER_ROWS.map((row, i) => (
          <tr key={row.key}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
              {row.label}
            </td>
            {DATEPICKER_STATE_COLS.map((col) => (
              <td key={col.key} style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'top', minWidth: cellMinWidth }}>
                <DatePicker
                  size={row.key}
                  label='Label'
                  helperText='Helper text'
                  {...col.props}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const DatePickerDemo = () => {
  const [d, setD] = useState(null);
  return (
    <Section title='DatePicker' summary='Single-date picker (Figma 341:6345). Select-style trigger (calendar icon + value/placeholder + chevron) that opens a single-month Calendar popup. 2 sizes (Medium 40 / Small 36) × 6 states (default · hover · open · filled · error · disabled). Pass `state` to force a visual state; otherwise it auto-resolves from focus/value/error/disabled. Tokens alias from the Select trigger so a DatePicker reads identical in a form row.'>
      <Variant label='State matrix · 2 sizes × 6 states' stack>
        <DatePickerStateTable />
      </Variant>
      <Variant label='Interactive · controlled' code='<DatePicker value={d} onChange={setD} />'>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-400)', maxWidth: 360 }}>
          <DatePicker value={d} onChange={setD} label='วันที่' helperText='เลือกวันนัด' required />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Trigger inherits Select’s state contract (default · hover · open · filled · error · disabled).',
          'Clicking the trigger toggles a single-month Calendar popup; outside-click / Escape closes.',
          'Value is a Date object (or null); onChange fires with the picked Date on day-click.',
          'Pass `error` to show a red trigger border + a helper message; `required` adds the asterisk marker on the label.',
        ]}
        dos={[
          'Pass an explicit `format` (DD/MM/YYYY or YYYY-MM-DD) per locale — don\'t rely on browser defaults.',
          'Disable past dates with minDate={new Date()} for booking flows.',
          'Pair with a label and helperText so the field reads in form context (วันนัด, วันเริ่ม).',
        ]}
        donts={[
          "Don't ship DatePicker without a clear-X affordance in the trigger — users need a way to reset.",
          "Don't use a single DatePicker for ranges — use two DatePickers (Start / End) or a Calendar in range mode.",
          "Don't show the popup without a clear close affordance on mobile — the body-click handler is the only escape.",
        ]}
      />
    </Section>
  );
};

const PopoverDemo = () => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  return (
    <Section title='Popover' summary='Lightweight floating panel. Caller renders the anchor and wraps both in a position:relative container; Popover positions itself just below the parent and closes on outside-click / Esc.'>
      <Variant label='Click the trigger to toggle' stack>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <NeutralSubdueButton
            ref={anchorRef}
            trailingIcon='expand_more'
            onClick={() => setOpen((o) => !o)}
          >
            Open popover
          </NeutralSubdueButton>
          <Popover
            open={open}
            onClose={() => setOpen(false)}
            anchorRef={anchorRef}
            style={{
              minWidth: 220,
              padding: 'var(--dim-space-400)',
              background: 'var(--surface-dropdown-default)',
              border: 'var(--dim-stroke-100) solid var(--border-dropdown-default)',
              borderRadius: 'var(--dim-radius-400)',  /* 12 */
              boxShadow: 'var(--shadow-card)',        /* Brand Drop Shadow Bottom/200 — alias of brand-p600 */
              zIndex: 1000,
            }}
          >
            <p style={{
              margin: 'var(--dim-space-0)',
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
            }}>Hello from a popover. Click outside or press Esc to close.</p>
          </Popover>
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Anchor-positioned floating panel (below caller). Caller renders both anchor + Popover inside a `position:relative` container.',
          'Closes on outside-click and Esc; does NOT trap focus (use Popup for modal interactions).',
        ]}
        dos={[
          'Use for inline contextual lists (filter dropdown, kebab menu actions, user avatar menu).',
          'Pass `anchorRef` so the panel re-positions if the trigger moves on scroll.',
        ]}
        donts={[
          "Don't use Popover for destructive confirms — use AlertDialog (focus trap + role=alertdialog).",
          "Don't nest Popovers — flatten the choice into a single layer.",
        ]}
      />
    </Section>
  );
};

/* ── AlertDialog demo ── */
const AlertDialogDemo = () => {
  const [active, setActive] = useState(null); // { type, alignment }
  const close = () => setActive(null);
  const open  = (type, alignment) => () => setActive({ type, alignment });
  const COPY = {
    info:        { title: 'Information', desc: 'This action will update your preferences. You can change them anytime in settings.' },
    success:     { title: 'Success',     desc: 'Your changes have been saved successfully. Everything is up to date.' },
    warning:     { title: 'Warning',     desc: 'This action may affect your current workflow. Are you sure you want to continue?' },
    destructive: { title: 'Delete Item', desc: 'This action cannot be undone. This will permanently delete the item and all associated data.' },
  };
  const TYPES = ['info', 'success', 'warning', 'destructive'];
  return (
    <Section
      title='AlertDialog'
      summary='Compact confirmation modal (Figma MIH DS · Popup 1:1159) for critical actions. Smooth enter/exit motion matches Popup (--motion-duration-modal). 4 types (Information · Success · Warning · Destructive) × 2 alignments (Center · Left). Center stacks the tone icon above the title; Left places the icon inline with the title. Action buttons alias <BrandButton> + <BrandSubdueButton> for info/success and <DangerButton> + <DangerSubdueButton> for warning/destructive.'
    >
      {['center', 'left'].map((alignment) => (
        <Variant
          key={alignment}
          label={alignment === 'center' ? 'Center alignment · 448px' : 'Left alignment · 320px'}
          stack
        >
          <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-300)' }}>
            {TYPES.map((t) => (
              <BrandButton key={t} variant='outline' size='md' onClick={open(t, alignment)}>
                Open {t}
              </BrandButton>
            ))}
          </div>
        </Variant>
      ))}
      <AlertDialog
        open={Boolean(active)}
        type={active?.type ?? 'info'}
        alignment={active?.alignment ?? 'center'}
        title={active ? COPY[active.type].title : 'Information'}
        description={active ? COPY[active.type].desc : ''}
        cancelLabel='Cancel'
        confirmLabel='Got it'
        onClose={close}
        onConfirm={close}
      />
      <Guidelines
        behavior={[
          '`role="alertdialog"`, `aria-modal="true"`, title + description are wired via aria-labelledby/aria-describedby.',
          'Esc and backdrop click both fire `onClose`; the primary button fires `onConfirm`.',
          'Locks body scroll while open (stack-aware so it composes with <Popup>).',
          'Enter/exit: overlay fades; panel lifts from `--motion-panel-offset-y` with scale `--motion-panel-scale-from` over `--motion-duration-modal` (`useModalMotion` + `.mih-popup-*`). Keep mounted — drive visibility with `open` only so exit animation completes.',
        ]}
        dos={[
          'Use AlertDialog when an action is reversible-with-effort (delete, sign out, discard draft) — short single decision.',
          'Pick the type that matches the action: destructive for deletes, warning for "are you sure?", success/info for soft confirmations.',
        ]}
        donts={[
          'Don\'t use AlertDialog for multi-step or form input — reach for <Popup size="large" /> instead.',
          'Don\'t show two AlertDialogs simultaneously — drive a single source of truth and update its props.',
        ]}
      />
    </Section>
  );
};

const PopupDemo = () => {
  const [open, setOpen] = useState(false);
  const [verticalOpen, setVerticalOpen] = useState(false);
  const [extraLargeOpen, setExtraLargeOpen] = useState(false);
  return (
    <Section title='Popup' summary='Centered modal dialog with size variants (default 448px · large 640px · extraLarge fluid up to 1440×1024). Smooth enter/exit: overlay fade + panel lift/scale over --motion-duration-modal. All domain wrappers inherit this motion automatically.'>
      <Variant label='Default · primary + secondary actions' stack>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
          <BrandButton onClick={() => setOpen(true)} disabled={open}>
            {open ? 'Popup is open ↑' : 'Open popup'}
          </BrandButton>
          <span style={{
            color: 'var(--text-content-secondary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
          }}>
            Click ยืนยัน / ยกเลิก / backdrop / Esc to close.
          </span>
        </div>
        <Popup
          open={open}
          title='ยืนยันการบันทึก'
          subtitle='ตรวจสอบข้อมูลก่อนบันทึกลงในระบบ'
          onClose={() => setOpen(false)}
          primaryAction={{ label: 'ยืนยัน',   onClick: () => setOpen(false) }}
          secondaryAction={{ label: 'ยกเลิก', onClick: () => setOpen(false) }}
        >
          <p style={{ margin: 'var(--dim-space-0)', color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.6 }}>
            เนื้อหา body ของ popup สามารถใส่ฟอร์ม รายการ หรือข้อความยืนยันได้
            ตามต้องการ ระบบจะล็อก scroll ของหน้าหลักและเปิด overlay สีเทาเข้ม
            จนกว่าผู้ใช้จะปิดด้วยปุ่ม / backdrop / Esc.
          </p>
        </Popup>
      </Variant>
      <Variant label='3 actions · vertical button layout' stack>
        <BrandButton onClick={() => setVerticalOpen(true)}>Open vertical popup</BrandButton>
        <Popup
          open={verticalOpen}
          title='ลบรายการนี้?'
          subtitle='การลบไม่สามารถยกเลิกได้'
          buttonLayout='vertical'
          onClose={() => setVerticalOpen(false)}
          primaryAction={{   label: 'ยืนยันลบ',  onClick: () => setVerticalOpen(false) }}
          secondaryAction={{ label: 'บันทึกร่าง', onClick: () => setVerticalOpen(false) }}
          tertiaryAction={{  label: 'ยกเลิก',     onClick: () => setVerticalOpen(false) }}
        >
          <p style={{ margin: 'var(--dim-space-0)', color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.6 }}>
            การลบรายการนี้จะส่งผลต่อข้อมูลที่เกี่ยวข้องทั้งหมด
            คุณแน่ใจหรือไม่?
          </p>
        </Popup>
      </Variant>
      <Variant label='extraLarge · fluid up to 1440×1024' stack>
        <BrandButton onClick={() => setExtraLargeOpen(true)} disabled={extraLargeOpen}>
          {extraLargeOpen ? 'extraLarge popup is open ↑' : 'Open extraLarge popup'}
        </BrandButton>
        <Popup
          open={extraLargeOpen}
          size='extraLarge'
          title='Popup extraLarge'
          subtitle='Fluid width/height — resize the browser to see growth up to 1440×1024 (24px viewport inset).'
          onClose={() => setExtraLargeOpen(false)}
          primaryAction={{ label: 'ปิด', onClick: () => setExtraLargeOpen(false) }}
        >
          <p style={{ margin: 'var(--dim-space-0)', color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.6 }}>
            ใช้ size=&quot;extraLarge&quot; โดยไม่กำหนด width — เหมือน VitalsGraphPopup และ BodyRecordPopup
          </p>
        </Popup>
      </Variant>
      <Guidelines
        behavior={[
          'Portal-rendered modal; backdrop / Esc / button-close all fire `onClose`. Locks body scroll while open (stack-aware with AlertDialog).',
          'Sizes: default (448) · large (640) · extraLarge (fluid up to 1440×1024). Focus is trapped within the dialog; restored to invoker on close.',
          'Enter/exit motion is built in — every domain wrapper (`DrawingCanvasPopup`, `AppointmentHistoryPopup`, …) inherits it. Keep `<Popup open={…} />` mounted; do not `{open && <Popup />}` or exit animation is skipped.',
        ]}
        dos={[
          'Use for multi-step forms, list editors, vitals input — places where AlertDialog is too small.',
          'Pair primaryAction with a clear verb ("ยืนยัน" / "บันทึก"); secondaryAction usually maps to "ยกเลิก".',
        ]}
        donts={[
          "Don't show two Popups at once — drive a single source of truth and update its props.",
          "Don't use Popup for destructive single-step confirms — that's AlertDialog with type='destructive'.",
        ]}
      />
    </Section>
  );
};

/* ── HeaderCell state-matrix table — 2 states × showSubtext on/off ── */
const HEADER_CELL_STATE_COLS = [
  { key: 'default', label: 'Default', state: 'default' },
  { key: 'hover',   label: 'Hover',   state: 'hover'   },
];

const HEADER_CELL_ROWS = [
  { key: 'all',     label: 'showSorting · showSubtext', flags: { showSorting: true,  showSubtext: true  } },
  { key: 'noSub',   label: 'Sorting only',              flags: { showSorting: true,  showSubtext: false } },
  { key: 'subOnly', label: 'Subtext only',              flags: { showSorting: false, showSubtext: true  } },
  { key: 'none',    label: 'Title only',                flags: { showSorting: false, showSubtext: false } },
];

const HeaderCellStateTable = ({ cellMinWidth = 240 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>Variant</th>
          {HEADER_CELL_STATE_COLS.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {HEADER_CELL_ROWS.map((row, i) => (
          <tr key={row.key}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{row.label}</td>
            {HEADER_CELL_STATE_COLS.map((col) => (
              <td key={col.key} style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
                <TableHeaderCell state={col.state} {...row.flags} style={{ width: cellMinWidth - 24 }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ── DataCell slot-matrix table — show flags from the Figma panel ── */
const DATA_CELL_SLOT_ROWS = [
  { key: 'all',      label: 'All slots (default)', flags: {} /* defaults */ },
  { key: 'text',     label: 'Text group only',     flags: { showCheckbox: false, showProfile: false, showStepper: false, showInputField: false, showSelect: false, showBadge: false, showButton1: false, showButton2: false, showButton3: false } },
  { key: 'badge',    label: 'Profile + Badge',     flags: { showCheckbox: false, showStepper: false, showInputField: false, showSelect: false, showButton1: false, showButton2: false, showButton3: false } },
  { key: 'actions',  label: 'Text + Buttons',      flags: { showCheckbox: false, showProfile: false, showStepper: false, showInputField: false, showSelect: false, showBadge: false } },
  { key: 'inputs',   label: 'Inputs only',         flags: { showCheckbox: false, showProfile: false, showTextGroup: false, showBadge: false, showButton1: false, showButton2: false, showButton3: false } },
  { key: 'switch',   label: 'Switch + Buttons',    flags: { showCheckbox: false, showProfile: false, showTextGroup: false, showStepper: false, showInputField: false, showSelect: false, showBadge: false, showSwitch: true, showButton1: false } },
];

const DATA_CELL_STATE_COLS = [
  { key: 'default', label: 'Default', state: 'default' },
  { key: 'hover',   label: 'Hover',   state: 'hover'   },
];

const DataCellStateTable = ({ cellMinWidth = 720 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>Slot mix</th>
          {DATA_CELL_STATE_COLS.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {DATA_CELL_SLOT_ROWS.map((row, i) => (
          <tr key={row.key}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{row.label}</td>
            {DATA_CELL_STATE_COLS.map((col) => (
              <td key={col.key} style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
                <TableDataCell state={col.state} {...row.flags} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ── FooterCell + Summary preview ── */
const FOOTER_SUMMARY_CELLS = [
  { title: 'Summary',  width: 280 },
  { title: '',         width: 120 },
  { title: '',         width: 120 },
  { title: '120',      width: 120 },
  { title: '฿ 24,500', width: 160 },
  { title: '',         width: 120 },
];

/* ── Live demo data ── */
const LIVE_PATIENTS = [
  { id: 'p1', queue: 'B001', hn: 'HN-0001', name: 'สมชาย ใจดี',  dept: 'อายุรกรรม', count: 3,  status: 'รอตรวจ' },
  { id: 'p2', queue: 'B003', hn: 'HN-0003', name: 'วิภา สุขศรี',  dept: 'กุมารเวช',  count: 12, status: 'รอตรวจ' },
  { id: 'p3', queue: 'B002', hn: 'HN-0002', name: 'สมหญิง รักดี', dept: 'ศัลยกรรม', count: 7,  status: 'กำลังตรวจ' },
  { id: 'p4', queue: 'B004', hn: 'HN-0004', name: 'อนงค์ มีสุข',  dept: 'อายุรกรรม', count: 1,  status: 'เสร็จแล้ว' },
];

const TABLE_LIVE_COLUMNS = [
  { key: 'queue', label: 'คิว',         subtext: 'queue no.'  },
  { key: 'hn',    label: 'HN',          subtext: 'hospital id' },
  { key: 'name',  label: 'ชื่อ-นามสกุล', subtext: 'patient' },
  { key: 'dept',  label: 'แผนก',        subtext: 'department' },
  { key: 'count', label: 'จำนวนครั้ง',   subtext: 'visit count' },
];

/* Cycle: null → asc → desc → null. Returns the next sort state. */
const nextSort = (curr, key) => {
  if (curr.key !== key) return { key, direction: 'asc' };
  if (curr.direction === 'asc') return { key, direction: 'desc' };
  return { key: null, direction: null };
};

const TableSortLiveDemo = () => {
  const [sort, setSort] = useState({ key: null, direction: null });
  const rows = useMemo(() => {
    if (!sort.key) return LIVE_PATIENTS;
    const col = TABLE_LIVE_COLUMNS.find((c) => c.key === sort.key);
    if (!col) return LIVE_PATIENTS;
    return [...LIVE_PATIENTS].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp = (typeof av === 'number' && typeof bv === 'number')
        ? av - bv
        : String(av).localeCompare(String(bv), 'th');
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [sort]);

  return (
    <div className='w-full overflow-x-auto' style={{ border: 'var(--dim-stroke-100) solid var(--border-card-default)', borderRadius: 'var(--dim-radius-200)' }}>
      <div style={{ minWidth: TABLE_LIVE_COLUMNS.reduce((s, c) => s + c.width, 0) }}>
        {/* Header row */}
        <div className='flex w-full'>
          {TABLE_LIVE_COLUMNS.map((c) => (
            <TableHeaderCell
              key={c.key}
              title={c.label}
              subtext={c.subtext}
              showSorting
              sortDirection={sort.key === c.key ? sort.direction : null}
              onClick={() => setSort((curr) => nextSort(curr, c.key))}
              style={{ width: c.width, flexShrink: 0 }}
            />
          ))}
        </div>
        {/* Data rows — wrap cells in <TableRow> so hover spans the whole row. */}
        {rows.map((row) => (
          <TableRow key={row.id}>
            {TABLE_LIVE_COLUMNS.map((c) => (
              <TableDataCell
                key={c.key}
                showCheckbox={false}
                showProfile={false}
                showStepper={false}
                showInputField={false}
                showSelect={false}
                showBadge={false}
                showButton1={false}
                showButton2={false}
                showButton3={false}
                showTextGroup={false}
                style={{ width: c.width, flexShrink: 0 }}
              >
                <span style={{
                  color: 'var(--text-content-default)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  lineHeight: 1.5,
                }}>
                  {row[c.key]}
                </span>
              </TableDataCell>
            ))}
          </TableRow>
        ))}
      </div>
    </div>
  );
};

const TableSelectLiveDemo = () => {
  const [selected, setSelected] = useState(new Set(['p1']));
  const allChecked = selected.size === LIVE_PATIENTS.length;
  const toggleRow = (id) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(LIVE_PATIENTS.map((r) => r.id)));

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
      <div className='w-full overflow-x-auto' style={{ border: 'var(--dim-stroke-100) solid var(--border-card-default)', borderRadius: 'var(--dim-radius-200)' }}>
        <div style={{ minWidth: 760 }}>
          {/* Header with select-all checkbox */}
          <div className='flex w-full items-stretch'>
            <div
              className='flex items-center'
              style={{
                width: 56, flexShrink: 0, minHeight: 44,
                background: 'var(--surface-table-header, var(--brand-p50, #F4FBF8))',
                borderBottom: 'var(--dim-stroke-200, 2px) solid var(--border-table-default, var(--brand-p100, #E2F3EB))',
                paddingLeft: 'var(--dim-space-400, 16px)',
              }}
            >
              <button
                type='button'
                aria-label={allChecked ? 'Deselect all rows' : 'Select all rows'}
                onClick={toggleAll}
                style={{ background: 'transparent', border: 'none', padding: 'var(--dim-space-0)', cursor: 'pointer', display: 'inline-flex' }}
              >
                <span style={{
                  width: 16, height: 16,
                  background: allChecked
                    ? 'var(--surface-checkbox-checked, var(--brand-p700, #007549))'
                    : 'var(--surface-switch-default, #FFFFFF)',
                  border: `var(--dim-stroke-150, 1.5px) solid ${allChecked
                    ? 'var(--surface-checkbox-checked, var(--brand-p700, #007549))'
                    : 'var(--border-switch-default, #C9CDD0)'}`,
                  borderRadius: 'var(--dim-radius-100, 4px)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-content-on-content)', fontSize: 12,
                }}>
                  {allChecked ? '✓' : selected.size > 0 ? '–' : ''}
                </span>
              </button>
            </div>
            <TableHeaderCell title='HN' subtext='hospital id' showSorting={false} style={{ width: 140, flexShrink: 0 }} />
            <TableHeaderCell title='ชื่อ-นามสกุล' subtext='patient' showSorting={false} style={{ width: 260, flexShrink: 0 }} />
            <TableHeaderCell title='แผนก' subtext='department' showSorting={false} style={{ width: 200, flexShrink: 0 }} />
            <TableHeaderCell title='สถานะ' subtext='status' showSorting={false} style={{ width: 160, flexShrink: 0, flex: 1 }} />
          </div>
          {/* Rows wrapped in <TableRow> — hover spans the whole row. */}
          {LIVE_PATIENTS.map((row) => (
            <TableRow key={row.id}>
              <TableDataCell
                showCheckbox
                checked={selected.has(row.id)}
                onCheckChange={() => toggleRow(row.id)}
                showProfile={false}
                showTextGroup={false}
                showStepper={false}
                showInputField={false}
                showSelect={false}
                showBadge={false}
                showButton1={false}
                showButton2={false}
                showButton3={false}
                style={{ width: 56, flexShrink: 0 }}
              />
              <TableDataCell showCheckbox={false} showProfile={false} showStepper={false} showInputField={false} showSelect={false} showBadge={false} showButton1={false} showButton2={false} showButton3={false} text={row.hn}    subtext={row.queue} showSubtext style={{ width: 140, flexShrink: 0 }} />
              <TableDataCell showCheckbox={false}                  showStepper={false} showInputField={false} showSelect={false} showBadge={false} showButton1={false} showButton2={false} showButton3={false} text={row.name}  subtext='ผู้ป่วยทั่วไป' showSubtext style={{ width: 260, flexShrink: 0 }} />
              <TableDataCell showCheckbox={false} showProfile={false} showStepper={false} showInputField={false} showSelect={false} showBadge={false} showButton1={false} showButton2={false} showButton3={false} text={row.dept} showSubtext={false} style={{ width: 200, flexShrink: 0 }} />
              <TableDataCell showCheckbox={false} showProfile={false} showTextGroup={false} showStepper={false} showInputField={false} showSelect={false} showSwitch={false} showButton1={false} showButton2={false} showButton3={false} badgeText={row.status} badgeIcon='circle' style={{ width: 160, flexShrink: 0, flex: 1 }} />
            </TableRow>
          ))}
        </div>
      </div>
      <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
        {selected.size === 0 ? 'No row selected — click any checkbox' : `Selected: ${[...selected].join(', ')}`}
      </span>
    </div>
  );
};

const TableActionsLiveDemo = () => {
  const [log, setLog] = useState('');
  const [switches, setSwitches] = useState({ p1: false, p2: true, p3: false, p4: true });
  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
      <div className='w-full overflow-x-auto' style={{ border: 'var(--dim-stroke-100) solid var(--border-card-default)', borderRadius: 'var(--dim-radius-200)' }}>
        <div style={{ minWidth: 760 }}>
          <div className='flex w-full'>
            <TableHeaderCell title='ชื่อ-นามสกุล' subtext='patient' showSorting={false} style={{ width: 280, flexShrink: 0 }} />
            <TableHeaderCell title='แผนก'        subtext='department' showSorting={false} style={{ width: 200, flexShrink: 0 }} />
            <TableHeaderCell title='แจ้งเตือน'    subtext='notify' showSorting={false} style={{ width: 140, flexShrink: 0 }} />
            <TableHeaderCell title='จัดการ'       subtext='actions' showSorting={false} style={{ width: 200, flexShrink: 0, flex: 1 }} />
          </div>
          {LIVE_PATIENTS.map((row) => (
            <TableRow key={row.id}>
              <TableDataCell showCheckbox={false}                showStepper={false} showInputField={false} showSelect={false} showBadge={false} showButton1={false} showButton2={false} showButton3={false} text={row.name} subtext={row.hn} showSubtext style={{ width: 280, flexShrink: 0 }} />
              <TableDataCell showCheckbox={false} showProfile={false} showStepper={false} showInputField={false} showSelect={false} showBadge={false} showButton1={false} showButton2={false} showButton3={false} text={row.dept} showSubtext={false} style={{ width: 200, flexShrink: 0 }} />
              {/* Switch + Action cells follow row hover. The slot stubs call
                  e.stopPropagation() inside interactiveSlot, so clicks on the
                  toggle / icon buttons never bubble to a row-level click. */}
              <TableDataCell showCheckbox={false} showProfile={false} showTextGroup={false} showStepper={false} showInputField={false} showSelect={false} showBadge={false} showButton1={false} showButton2={false} showButton3={false} showSwitch switchOn={switches[row.id]} onSwitchChange={(on) => { setSwitches((s) => ({ ...s, [row.id]: on })); setLog(`${row.name}: switch ${on ? 'on' : 'off'}`); }} style={{ width: 140, flexShrink: 0 }} />
              <TableDataCell
                showCheckbox={false} showProfile={false} showTextGroup={false} showStepper={false} showInputField={false} showSelect={false} showBadge={false}
                button1Icon='visibility' onButton1Click={() => setLog(`View: ${row.name}`)}
                button2Icon='edit'       onButton2Click={() => setLog(`Edit: ${row.name}`)}
                button3Icon='check'      onButton3Click={() => setLog(`Confirm: ${row.name}`)}
                style={{ width: 200, flexShrink: 0, flex: 1 }}
              />
            </TableRow>
          ))}
        </div>
      </div>
      <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
        {log || 'Toggle a switch or click an action button — events log here'}
      </span>
    </div>
  );
};

const TableDemo = () => (
  <Section
    title='Table'
    summary='Composable table primitives (Figma "MIH Design System · Table"). The generic <Table> orchestrator below remains the canonical entry for queue/list pages — it consumes a column config. The named exports <HeaderCell> (177:6297), <DataCell> (20:1894), <FooterCell> (41:6279), <TableSelectAllRow> (24:25939) and <TableSummary> (41:6764) match the Figma property panels 1:1 for callers that need pixel-exact composition or design-system docs.'
  >
    <Variant label='Live · sorting on HeaderCell (click a column header to cycle null → asc → desc)' stack>
      <TableSortLiveDemo />
    </Variant>
    <Variant label='Live · select-all + per-row checkbox' stack>
      <TableSelectLiveDemo />
    </Variant>
    <Variant label='Live · row actions (switch toggle + 3 icon buttons)' stack>
      <TableActionsLiveDemo />
    </Variant>
    <Variant label='HeaderCell · state matrix · 2 states × 4 slot mixes' stack>
      <HeaderCellStateTable />
    </Variant>
    <Variant label='DataCell · slot matrix · 6 row mixes × 2 states (matches Figma property panel)' stack>
      <DataCellStateTable />
    </Variant>
    <Variant label='FooterCell · brand-p100 surface + brand-p800 bold sm title' stack>
      <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
        <TableFooterCell title='Summary' style={{ width: 160 }} />
        <TableFooterCell title='฿ 24,500' style={{ width: 160 }} />
        <TableFooterCell title='130 รายการ' style={{ width: 200 }} />
      </div>
    </Variant>
    <Variant label='TableSummary · row of FooterCells (Figma 41:6764)' stack>
      <div className='w-full overflow-x-auto' style={{ border: 'var(--dim-stroke-100) solid var(--border-card-default)', borderRadius: 'var(--dim-radius-200)' }}>
        <TableSummary cells={FOOTER_SUMMARY_CELLS} />
      </div>
    </Variant>
    <Variant label='TableSelectAllRow · Figma 24:25939 (column-select pattern)' stack>
      <div className='w-full overflow-x-auto' style={{ border: 'var(--dim-stroke-100) solid var(--border-card-default)', borderRadius: 'var(--dim-radius-200)' }}>
        <TableSelectAllRow cells={6} cellWidth={140} />
      </div>
    </Variant>
    <Variant label='Generic Table (column config) — used by queue / list pages'>
      <div className='w-full'>
        <Table
          columns={[
            { key: 'queue', header: 'คิว' },
            { key: 'hn',    header: 'HN' },
            { key: 'name',  header: 'ชื่อ-นามสกุล', flex: 1 },
            { key: 'dept',  header: 'แผนก' },
          ]}
          rows={[
            { queue: 'B001', hn: '0001', name: 'สมชาย ใจดี',     dept: 'อายุรกรรม' },
            { queue: 'B002', hn: '0002', name: 'สมหญิง รักดี',    dept: 'ศัลยกรรม' },
            { queue: 'B003', hn: '0003', name: 'วิภา สุขศรี',     dept: 'กุมารเวช' },
          ]}
        />
      </div>
    </Variant>
    <Variant label='Loading skeleton (loading={true}, skeletonRows={4})' stack>
      <div className='w-full'>
        <Table
          columns={[
            { key: 'queue', header: 'คิว' },
            { key: 'hn',    header: 'HN' },
            { key: 'name',  header: 'ชื่อ-นามสกุล', flex: 1 },
            { key: 'dept',  header: 'แผนก' },
          ]}
          rows={[]}
          loading
          skeletonRows={4}
        />
      </div>
    </Variant>
    <Variant label='Empty state (loading={false}, rows=[])' stack>
      <div className='w-full'>
        <Table
          columns={[
            { key: 'queue', header: 'คิว' },
            { key: 'hn',    header: 'HN' },
            { key: 'name',  header: 'ชื่อ-นามสกุล', flex: 1 },
            { key: 'dept',  header: 'แผนก' },
          ]}
          rows={[]}
        />
      </div>
    </Variant>
    <Guidelines
      behavior={[
        'HeaderCell: 44h, brand-p50 surface (#F4FBF8) default, brand-p100 (#E2F3EB) on hover. Title is heading-content Regular 12px (`--type-size-table-title`, fixed) brand-p800; subtext is regular xs neutral-tertiary. Sort icon flips between unfold_more / expand_less / expand_more.',
        'DataCell: 56h, white surface default, brand-p50 hover. 13 show flags from the Figma property panel: Checkbox · Profile · TextGroup (Text + Subtext) · Stepper · InputField · Select · Badge · Switch · Button1 · Button2 · Button3.',
        'FooterCell: 44h, brand-p100 surface, brand-p800 bold sm (14px) title. Compose multiple cells side-by-side via <TableSummary cells={[…]} />.',
        'TableSelectAllRow lays a wide caption cell ("เลือกคอลัมน์ทั้งหมด →") next to N checkbox-only cells — used to bulk-select columns rather than rows.',
        'For interactive Stepper / InputField / Select inside DataCell, render the project\'s real components via the generic <Table>\'s column.render(row), or pass them as children to <DataCell>.',
      ]}
      dos={[
        'Use HeaderCell / DataCell / FooterCell when you need pixel-exact Figma composition (design-system docs, mockups).',
        'Use the generic <Table> with column.render for data-driven lists — it handles sticky columns, drag-reorder, sort, and row-click.',
        'Match column count in TableSummary to the underlying Table\'s columns so totals line up visually.',
      ]}
      donts={[
        "Don't use the show* visual stubs inside DataCell for real user input — they're static visuals. Compose the real components inside column.render or via children.",
        "Don't render TableSummary on a different total width than the main Table — it'll look misaligned on horizontal scroll.",
        "Don't apply state=\"hover\" permanently — it's a docs affordance only; runtime resolves hover from pointer.",
      ]}
    />
  </Section>
);

/* ── Step state-matrix table — 3 types × 2 states ── */
const STEP_STATE_COLS = [
  { key: 'default', label: 'Default', props: {} },
  { key: 'hover',   label: 'Hover',   props: { state: 'hover' } },
];

const STEP_ROWS = [
  { key: 'default', label: 'Default', type: 'default', number: 1 },
  { key: 'current', label: 'Current', type: 'current', number: 1 },
  { key: 'success', label: 'Success', type: 'success', number: 1 },
];

const StepStateTable = ({ cellMinWidth = 200 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>
            Type
          </th>
          {STEP_STATE_COLS.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {STEP_ROWS.map((row, i) => (
          <tr key={row.key}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
              {row.label}
            </td>
            {STEP_STATE_COLS.map((col) => (
              <td key={col.key} style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'top', minWidth: cellMinWidth }}>
                <Step
                  type={row.type}
                  number={row.number}
                  label='Step'
                  description='This is a description text.'
                  {...col.props}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const StepDemo = () => (
  <Section title='Step' summary='Single step item (Figma 2709:6562). Number/check circle + label + description + connector. 3 types (default · current · success) × 2 states (default · hover). Compose multiple `<Step>` into a row, or use the higher-level `<StepProgress>` to drive types automatically from a current index. Pass `state` to force the visual state.'>
    <Variant label='State matrix · 3 types × 2 states' stack>
      <StepStateTable />
    </Variant>
    <Variant label='Composed row · 4 steps'>
      <div className='flex items-start' style={{ gap: 'var(--dim-space-150)' }}>
        <Step type='success' number={1} label='ข้อมูลผู้รับบริการ' description='เลข HN, ชื่อ-สกุล' />
        <Step type='success' number={2} label='ตรวจร่างกาย'        description='Vital signs' />
        <Step type='current' number={3} label='สรุปผล'              description='ทบทวนข้อมูล' />
        <Step type='default' number={4} label='ยืนยัน'              description='บันทึก'         showConnector={false} />
      </div>
    </Variant>
    <Guidelines
      behavior={[
        'Visual progress indicator — no internal state. Parent flow tracks `current` and renders Steps accordingly.',
        'Hover/focus on a clickable step (provide onClick) shows the hover visual; non-clickable steps are static.',
        'Each step renders an optional trailing connector; hide it on the last step with showConnector={false}.',
      ]}
      dos={[
        'Make completed steps clickable (back-navigation); make future steps non-clickable.',
        'Pair with a sticky header so the user can see progress while scrolling the active step’s form.',
        'Prefer the higher-level <StepProgress> when you have a current index and want types resolved automatically.',
      ]}
      donts={[
        "Don't allow skipping forward in a linear flow by clicking future steps.",
        "Don't combine \"current\" + \"success\" on the same step — pick one.",
        "Don't omit the connector mid-flow; the line is what reads as progress.",
      ]}
    />
  </Section>
);

/* ── Stepper (numeric +/-) state-matrix table — 2 sizes × 4 states ── */
const STEPPER_STATE_COLS = [
  { key: 'default',  label: 'Default',  props: {} },
  { key: 'hover',    label: 'Hover',    props: { state: 'hover' } },
  { key: 'filled',   label: 'Filled',   props: { state: 'filled', defaultValue: 50 } },
  { key: 'disabled', label: 'Disabled', props: { state: 'disabled', defaultValue: 50 } },
];

const STEPPER_ROWS = [
  { key: 'large', label: 'Large (40)' },
  { key: 'small', label: 'Small (36)' },
];

const StepperStateTable = ({ cellMinWidth = 170 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>
            Size
          </th>
          {STEPPER_STATE_COLS.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {STEPPER_ROWS.map((row, i) => (
          <tr key={row.key}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
              {row.label}
            </td>
            {STEPPER_STATE_COLS.map((col) => (
              <td key={col.key} style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
                <Stepper size={row.key} min={0} {...col.props} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const StepperDemo = () => {
  const [v, setV] = useState(1);
  return (
    <Section title='Stepper' summary='Numeric +/- input (Figma 2709:6338). Two flanking buttons + centered value in Sarabun (--type-family-body, medium). 2 sizes (Large 40 / Small 36) × 4 states (default · hover · filled · disabled). Pass `state` to force the visual state for docs; in real use it resolves from focus + value + disabled. Use min/max/step to constrain. Table below mirrors the Figma variant matrix.'>
      <Variant label='State matrix · 2 sizes × 4 states' stack>
        <StepperStateTable />
      </Variant>
      <Variant label='Interactive · controlled value' code='<Stepper value={v} onChange={setV} min={0} />'>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-400)' }}>
          <Stepper value={v} onChange={(n) => setV(n ?? 0)} min={0} />
          <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm)' }}>
            value = {v}
          </span>
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Numeric input flanked by − / + buttons. − is disabled when value <= min; + is disabled when value >= max.',
          'Direct keyboard input is allowed; non-numeric characters are filtered. Enter blurs the input.',
          'Browser focus indicators are suppressed (caretColor: transparent, outline: none) — focus shows via container border.',
        ]}
        dos={[
          'Set min={0} for quantities; the boundary-aware − button prevents negatives without explicit validation.',
          'Use Small (36 h × 112 w) inside compact form cells; Large (40 h × 128 w) for primary booking flows.',
          'Pair with a unit label outside the component (e.g. "เม็ด", "วัน") — Stepper itself does not display units.',
        ]}
        donts={[
          "Don't use Stepper for arbitrary integer ranges (year selection, age) — use InputField type=number with min/max.",
          "Don't omit `min` if your value model can't represent negatives — the boundary check needs both bounds.",
          "Don't repurpose the +/- buttons for non-numeric actions — they read as increment/decrement only.",
        ]}
      />
    </Section>
  );
};

const StepProgressDemo = () => {
  const STEPS = ['ข้อมูลผู้รับบริการ', 'ตรวจร่างกาย', 'สรุปผล', 'ยืนยัน'];
  const [current, setCurrent] = useState(1);
  const [framedCurrent, setFramedCurrent] = useState(1);
  return (
    <Section title='StepProgress' summary='Horizontal stepper for multi-step forms. Past steps render as success (check), the current step is highlighted, future steps are dimmed. Pass `framed` to wrap the row in a white card chrome (the previous "Stepper" component is now this variant).'>
      <Variant label='Step 1 of 4 (start)'>
        <div className='w-full'>
          <StepProgress steps={STEPS} current={0} />
        </div>
      </Variant>
      <Variant label='Step 3 of 4 (mid)'>
        <div className='w-full'>
          <StepProgress steps={STEPS} current={2} />
        </div>
      </Variant>
      <Variant label='Clickable (state-driven · onStepClick)'>
        <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <StepProgress steps={STEPS} current={current} onStepClick={setCurrent} />
          <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs)' }}>
            current = {current} — click any past/future step to jump.
          </span>
        </div>
      </Variant>
      <Variant label='framed · white card chrome (replaces old Stepper)' stack>
        <div className='w-full'>
          <StepProgress framed steps={STEPS} current={framedCurrent} onStepClick={setFramedCurrent} />
        </div>
      </Variant>
      <Variant label='CPOE · bilingual steps (PHCIS | CPOE 176:41635)' stack>
        <div className='w-full overflow-x-auto'>
          <StepProgress steps={TREATMENT_STEPS} current={1} />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          '`completedSteps={[bool,…]}` is the opt-in validation gate — when omitted, fallback is `idx < current` ⇒ ✓ (legacy behaviour).',
          'Current step always wins (renders as `current` even if `completedSteps[idx]` is true).',
        ]}
        dos={[
          'Pass `completedSteps` derived from your form\'s validator (see getRegistrationCompletedSteps / getTreatmentCompletedSteps) so ✓ only appears when required fields are actually filled.',
          'Use `framed` when the stepper sits in a card surface that needs the white chrome top + brand-quaternary hairline divider.',
          'Wire `onStepClick` so the user can jump back to fix completed steps.',
        ]}
        donts={[
          "Don't show ✓ for steps the user hasn't completed — that's the bug the `completedSteps` prop exists to fix.",
          "Don't omit the active label — focus + bold typography is the primary feedback for keyboard / screen-reader users.",
          "Don't use for non-linear navigation — that's a Tab.",
        ]}
      />
    </Section>
  );
};

const HeaderDemo = () => (
  <Section title='Header' summary='Top-level page Header (sticky top bar). Lives in layout/Header.jsx and is the canonical entry point for the page header — every page imports it from this module so the border + shadow contract stays consistent.'>
    <Variant label='Default (breadcrumb defaults to OPD)' stack>
      <div style={{ width: '100%', position: 'relative', overflow: 'hidden', borderRadius: 'var(--dim-radius-300)' }}>
        <HeaderChrome autoHide={false} />
      </div>
    </Variant>
    <Variant label='Custom breadcrumb' stack>
      <div style={{ width: '100%', position: 'relative', overflow: 'hidden', borderRadius: 'var(--dim-radius-300)' }}>
        <HeaderChrome autoHide={false} breadcrumb={['ระบบงานเวชระเบียน', 'รายการผู้รับบริการ']} />
      </div>
    </Variant>
    <Guidelines
      behavior={[
        'Sticky top chrome — same border + shadow contract everywhere; sit at the top of every routed page.',
        'Breadcrumb is keyboard-focusable and links back to parent sections.',
      ]}
      dos={[
        'Pass a `breadcrumb` array (2–3 entries) reflecting the subsystem hierarchy.',
        'Render exactly one `<Header />` per page — it owns the global sticky offset.',
      ]}
      donts={[
        "Don't override the border / shadow tokens — they retint with the brand mode.",
        "Don't render Header inside scrollable content — it must be page-level for the sticky to work.",
      ]}
    />
  </Section>
);

const SubHeaderDemo = () => (
  <Section title='SubHeader' summary='Page sub-header that mirrors the Header chrome (1px brand-quaternary bottom border + brand-tinted shadow). Sits directly under Header for in-page action rows. Props: title (required), onBack, backLabel, children (right-aligned actions).'>
    <Variant label='Title only' stack>
      <div style={{ width: '100%' }}>
        <SubHeaderChrome title='ระบบงานเวชระเบียน'>
          <NeutralSubdueButton leadingIcon='filter_list'>การคัดกรอง</NeutralSubdueButton>
          <BrandButton leadingIcon='credit_card'>อ่านบัตรสมาร์ทการ์ด</BrandButton>
        </SubHeaderChrome>
      </div>
    </Variant>
    <Variant label='Back button + 4 action buttons' stack>
      <div style={{ width: '100%' }}>
        <SubHeaderChrome title='ข้อมูลผู้รับบริการ' onBack={() => {}}>
          <NeutralSubdueButton leadingIcon='print'>ปริ๊นบัตรคิว</NeutralSubdueButton>
          <NeutralSubdueButton leadingIcon='event'>เพิ่มการนัดหมาย</NeutralSubdueButton>
          <NeutralSubdueButton leadingIcon='upload_file'>นำเข้าข้อมูล</NeutralSubdueButton>
          <BrandButton leadingIcon='add'>สร้างใหม่</BrandButton>
        </SubHeaderChrome>
      </div>
    </Variant>
    <Guidelines
      behavior={[
        'Mirrors Header chrome (border + shadow) so the two read as a single visual unit. Optional `onBack` shows a leading back-button.',
        'Right-side children slot holds action buttons; the row wraps on small screens.',
      ]}
      dos={[
        'Use directly under Header for in-page action rows (Registration / Treatment form sub-headers).',
        'Limit to 3–4 actions max; put the primary CTA on the right.',
      ]}
      donts={[
        "Don't render multiple SubHeaders on one page — confuses the visual hierarchy.",
        "Don't combine `onBack` with the Header's breadcrumb in a way that gives the user two ways to navigate up at once.",
      ]}
    />
  </Section>
);

const FooterDemo = () => {
  const [page, setPage] = useState(1);
  return (
    <Section title='Footer' summary='Page-level footer chrome (Figma node 1:2629). Property panel: Type (No · with BTN · with Pagination) + Show Button 1 / 2 / 3 + Show Auto Save. All variants share the same legal row (© + Privacy + Terms) at the bottom; the top row swaps per type.'>
      <Variant label="Type = 'No' — legal container only (default)" stack>
        <div style={{ width: '100%' }}>
          <FooterChrome />
        </div>
      </Variant>
      <Variant label="Type = 'with BTN' — auto-save + 3 buttons (Figma node 1:2630)" stack>
        <div style={{ width: '100%' }}>
          <FooterChrome
            type='with BTN'
            showAutoSave
            showButton1 showButton2 showButton3
            button1Label='ตกลง' button1Icon='check'
            button2Label='บันทึกร่าง'
            button3Label='ยกเลิก'
          />
        </div>
      </Variant>
      <Variant label="Type = 'with BTN' · Auto-save off + 1 primary button only" stack>
        <div style={{ width: '100%' }}>
          <FooterChrome
            type='with BTN'
            showAutoSave={false}
            showButton2={false}
            showButton3={false}
            button1Label='บันทึก' button1Icon='save'
          />
        </div>
      </Variant>
      <Variant label="Type = 'with Pagination' — page count + paginator (Figma node 1:2650)" stack>
        <div style={{ width: '100%' }}>
          <FooterChrome
            type='with Pagination'
            paginationLabel={`แสดง ${(page - 1) * 20 + 1}-${Math.min(page * 20, 248)} จาก 248 รายการ`}
            currentPage={page}
            pageCount={Math.ceil(248 / 20)}
            onPageChange={setPage}
          />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          "Three variants via `type`: 'No' renders only the legal row; 'with BTN' stacks key-action row above legal; 'with Pagination' stacks pagination above legal.",
          'Show flags (`showAutoSave`, `showButton1/2/3`) toggle individual slots within the key-action row.',
          'Buttons alias canonical <BrandPrimaryButton> (button 1, fill) and <BrandSubdueButton> (buttons 2 & 3, outline). Pagination aliases canonical <Pagination>.',
          'Top border + brand-tinted shadow on the shell retint with [data-brand] via --border-brandPrimary-quaternary and --PrimaryShadow-600.',
        ]}
        dos={[
          'Use `with BTN` inside form pages where the user commits via the footer (Save / Cancel / Save Draft).',
          'Use `with Pagination` on queue/list pages where the table is the main content and pagination needs to live in the page chrome.',
          "Use `No` everywhere else — it's the legal-only default consumed by QueuePageShell.",
        ]}
        donts={[
          "Don't render `with BTN` and a separate sticky `FormActionBar` on the same page — pick one save surface.",
          "Don't override `button1Label` with text longer than ~14 Thai chars — the right-side group will wrap.",
          "Don't disable auto-save without a parallel manual save affordance — users need feedback that drafts are persisting.",
        ]}
      />
    </Section>
  );
};

const VitalSignTimelineCardDemo = () => {
  const [selectedKey, setSelectedKey] = useState('a');
  const cards = [
    { key: 'a', time: 'เวลา 21:19:27', date: '6 พฤษภาคม 2569',
      vitals: [
        { label: 'อุณหภูมิ',     value: '36.5 °C'    },
        { label: 'ความดัน',      value: '120/80 mmHg' },
        { label: 'ชีพจร',        value: '78 bpm'     },
      ] },
    { key: 'b', time: 'เวลา 09:02:11', date: '5 พฤษภาคม 2569',
      vitals: [
        { label: 'อุณหภูมิ',     value: '38.1 °C'    },
        { label: 'ความดัน',      value: '150/95 mmHg' },
        { label: 'ชีพจร',        value: '102 bpm'    },
      ], badge: 'ผิดปกติ' },
    { key: 'c', time: 'เวลา 14:48:04', date: '1 พฤษภาคม 2569',
      vitals: [
        { label: 'อุณหภูมิ',     value: '36.8 °C'    },
        { label: 'ความดัน',      value: '118/76 mmHg' },
        { label: 'ชีพจร',        value: '74 bpm'     },
      ] },
  ];
  return (
    <Section title='VitalSignTimelineCard' summary='Card used inside HistoryTimeline aside on OPD / Treatment / MR forms. Five states per Figma 133:1031: default (1px neutral) · hover (2px brand-tertiary + brand drop shadow) · selected (2px brand-primary + chevron + drop shadow) · selected-hover (brand-100 surface + 2px brand-primary + chevron + drop shadow) · disabled.'>
      <Variant label='Selectable list (click to select · hover to preview selected-hover)' stack>
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)', maxWidth: 320 }}>
          {cards.map((c) => (
            <VitalSignTimelineCard
              key={c.key}
              time={c.time}
              date={c.date}
              vitals={c.vitals}
              badge={c.badge}
              selected={selectedKey === c.key}
              onClick={() => setSelectedKey(c.key)}
            />
          ))}
        </div>
      </Variant>
      {/* Static side-by-side: default + selected. Hover and selected-
          hover are pure interaction states — the previewer triggers
          them by mousing over the cards in the selectable list above
          (a row that is `selected` and hovered renders in the brand-
          tinted selected-hover variant). */}
      <Variant label='Default vs Selected (static)' stack>
        <div
          className='grid w-full'
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--dim-space-300)' }}
        >
          <VitalSignTimelineCard
            time='Default'
            date='1px neutral border'
            vitals={[
              { label: 'ความดัน', value: '117/75 mmHg' },
              { label: 'อุณหภูมิ', value: '36.5 °C' },
            ]}
          />
          <VitalSignTimelineCard
            time='Selected'
            date='2px brand-primary + chevron + drop shadow'
            vitals={[
              { label: 'ความดัน', value: '128/80 mmHg' },
              { label: 'อุณหภูมิ', value: '36.5 °C' },
            ]}
            selected
          />
        </div>
      </Variant>
      <Variant label='Disabled' stack>
        <div style={{ width: 320 }}>
          <VitalSignTimelineCard
            time='เวลา 08:00:00'
            date='28 เมษายน 2569'
            vitals={[
              { label: 'อุณหภูมิ', value: '—' },
              { label: 'ความดัน',  value: '—' },
            ]}
            disabled
          />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Card holds a timestamp + 2–3 vital-value pairs; selected adds 2 px brand border + chevron + shadow lift.',
          'Disabled grays everything and disables hover — used for placeholder measurements that haven\'t happened yet.',
        ]}
        dos={[
          'Use in a horizontal scroll rail to compare measurement rounds (Treatment Step 3 nurse exam timeline).',
          'Sort newest to oldest; the user typically clicks the newest first.',
        ]}
        donts={[
          "Don't use as a primary vitals input — that's VitalsForm.",
          "Don't render with > 3 vital pairs per card — beyond that, switch to a table.",
        ]}
      />
    </Section>
  );
};

const SummaryCardsBarDemo = () => (
  <Section title='SummaryCardsBar' summary='Single component for both queue-page summary tiles and dashboard overview banner. Switch via `variant` prop — "panel" (default, used on queue pages) renders inside a flush surface-card-100 panel; "banner" (used on /dashboard) renders flat with bordered cards that wrap.'>
    <Variant label='variant="panel" · 4 status tiles' omitPreviewTopBorder>
      <div className='w-full'>
        <SummaryCardsBar
          cards={[
            { key: 'a', label: 'รอตรวจ',    value: 7,  color: 'info',       icon: 'hourglass_top' },
            { key: 'b', label: 'กำลังตรวจ', value: 3,  color: 'info',       icon: 'stethoscope' },
            { key: 'c', label: 'เสร็จแล้ว', value: 6,  color: 'positive',   icon: 'check_circle' },
            { key: 'd', label: 'เร่งด่วน',  value: 3,  color: 'inprogress', icon: 'fast_forward' },
          ]}
        />
      </div>
    </Variant>
    <Variant label='variant="panel" · with title (OPD pattern)' omitPreviewTopBorder>
      <div className='w-full'>
        <SummaryCardsBar
          title='ระบบงานผู้รับบริการนอก (OPD)'
          cards={[
            { key: 'a', label: 'ผู้รับบริการรวมวันนี้', value: 130, color: 'info',     icon: 'directions_walk', indicator: 'เพิ่ม 5 จากเมื่อวาน' },
            { key: 'b', label: 'นัดหมายวันนี้',          value: 83,  color: 'positive', icon: 'calendar_clock',  indicator: 'เหลือรอ 31 ราย' },
          ]}
        />
      </div>
    </Variant>
    <Variant label='variant="banner" · dashboard overview (replaces old OverviewBanner)' stack>
      <div className='w-full'>
        <SummaryCardsBar
          variant='banner'
          cards={[
            { key: 'pop',     icon: 'users',          tone: 'blue',   value: '332,628',   label: 'ประชากรทั้งหมด (คน)',          subIcon: 'users',        sub: 'ชาย 159,483 / หญิง 173,145' },
            { key: 'birth',   icon: 'smile',          tone: 'teal',   value: '10',        label: 'เกิด ปีงบฯ 2569 (คน)',          subIcon: 'history',      sub: 'ปีงบ 2568: 688 คน' },
            { key: 'death',   icon: 'activity',       tone: 'red',    value: '21',        label: 'เสียชีวิต ปีงบฯ 2569 (คน)',     subIcon: 'history',      sub: 'ปีงบ 2568: 1,575 คน' },
            { key: 'visits',  icon: 'clipboard-list', tone: 'brand',  value: '299,445',   label: 'การรับบริการสะสม (ครั้ง)',      subIcon: 'check-circle', sub: 'เฉลี่ย 820.40 ครั้ง/วัน', subTone: 'success' },
            { key: 'fee',     icon: 'baht',           tone: 'purple', value: '1,496,420', label: 'ค่าบริการสะสม (บาท)',           subIcon: 'file-text',    sub: 'รายรับ 0 บาท' },
            { key: 'units',   icon: 'building',       tone: 'orange', value: '69',        label: 'หน่วยบริการที่ส่งข้อมูล (แห่ง)' },
          ]}
        />
      </div>
    </Variant>
    <Guidelines
      behavior={[
        'Single component; `variant="panel"` = queue summary tiles in a flush card; `variant="banner"` = dashboard overview bordered cards that wrap.',
        '`tone` controls icon background; `subTone` (banner only) tints the sub-line text.',
      ]}
      dos={[
        'Use `panel` on queue / list pages above the data table (4–6 KPI tiles).',
        'Use `banner` on the dashboard above the chart grid (6 cards is the comfort max).',
      ]}
      donts={[
        "Don't mix tones randomly — pick semantic colours (info / positive / inprogress) that map to the metric meaning.",
        "Don't render > 8 cards in one row — beyond that, group into sections.",
      ]}
    />
  </Section>
);

/* ── Icon gallery ─────────────────────────────────────────── */

const ICON_NAMES = [
  'apps', 'home', 'map-pin', 'building', 'menu', 'kebab-vertical',
  'chevron-left', 'chevron-right', 'chevron-down', 'arrow-left',
  'calendar', 'history', 'bell', 'pin',
  'users', 'face', 'smile', 'meh', 'frown',
  'stethoscope', 'pill', 'baht', 'activity', 'bar-chart',
  'clipboard', 'clipboard-list', 'file', 'file-text', 'book',
  'plus', 'minus', 'check', 'check-circle', 'edit', 'trash', 'eye',
  'search', 'save', 'fast-forward',
];

const IconDemo = () => (
  <Section title='Icon' summary='Inline SVG icon set rendered with currentColor stroke. Pass `name`, `size`, and an optional `className` for color.'>
    <Variant label='All available icons · 24px' code='<Icon name="..." size={24} />' stack>
      <div
        className='w-full grid'
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 'var(--dim-space-300)',
        }}
      >
        {ICON_NAMES.map((name) => (
          <div
            key={name}
            className='flex flex-col items-center justify-center'
            style={{
              gap: 'var(--dim-space-200)',
              padding: 'var(--dim-space-300)',
              borderRadius: 'var(--dim-radius-300)',
              border: 'var(--dim-stroke-100) solid var(--border-card-default)',
              background: 'var(--surface-card-100)',
              color: 'var(--text-content-default)',
            }}
          >
            <Icon name={name} size={24} />
            <code style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: 'var(--type-size-xs)',
              textAlign: 'center',
              wordBreak: 'break-all',
            }}>{name}</code>
          </div>
        ))}
      </div>
    </Variant>
    <Variant label='Sizes · 16 / 20 / 24 / 32'>
      <Icon name='stethoscope' size={16} />
      <Icon name='stethoscope' size={20} />
      <Icon name='stethoscope' size={24} />
      <Icon name='stethoscope' size={32} />
    </Variant>
    <Variant label='Color via currentColor (className)'>
      <span style={{ color: 'var(--text-brandPrimary-default)' }}>
        <Icon name='check-circle' size={24} />
      </span>
      <span style={{ color: '#C2410C' }}>
        <Icon name='trash' size={24} />
      </span>
      <span style={{ color: '#1D4ED8' }}>
        <Icon name='bell' size={24} />
      </span>
    </Variant>
    <Guidelines
      behavior={[
        'Inline SVG with `stroke="currentColor"` — colour inherits from the parent text color (use `className` / inline style on the parent).',
        'Common sizes: 16 · 20 · 24 · 32. Aria-hidden by default.',
      ]}
      dos={[
        'Use 16 px in dense table cells / chips; 20 px in form fields; 24 px in buttons; 32 px in card icon tiles.',
        'Wrap with an `aria-label` element if the icon conveys meaning beyond decoration.',
      ]}
      donts={[
        "Don't hard-code icon colour with hex — pass via parent text colour or `--text-*` tokens so brand swap retints.",
        "Don't use raster icons (PNG) — use the SVG icon set or Material Symbols.",
      ]}
    />
  </Section>
);

/* ── MR Form Field demos ──────────────────────────────────── */
/* `TextInput (MR)`, `TextArea (MR)`, `SelectInput (MR)`, and `Checkbox (MR)`
   demos were removed — they were redundant with the canonical InputField,
   Textarea, Select, and Checkbox demos (forms/checkbox groups). Every MR
   form now imports those canonical components directly.                  */

const RegistrationLayoutDemo = () => (
  <Section title='SectionTitle · SubCard · FieldGrid · Field · AddRowButton' summary='Layout building blocks for the Registration form. Composed together to lay out a section.'>
    <Variant label='SectionTitle (with leading icon)' stack>
      <SectionTitle icon='person'>ข้อมูลผู้รับบริการ</SectionTitle>
    </Variant>
    <Variant label='SubCard with title pill + delete' stack>
      <SubCard
        title='ที่อยู่ที่ติดต่อได้'
        pillLabel='ที่อยู่ปัจจุบัน'
        onDelete={() => {}}
      >
        <FieldGrid cols={4}>
          <Field label='บ้านเลขที่' required><InputField value='' onChange={() => {}} /></Field>
          <Field label='หมู่บ้าน / อาคาร' span={2}><InputField value='' onChange={() => {}} /></Field>
          <Field label='ตรอก / ซอย'><InputField value='' onChange={() => {}} /></Field>
        </FieldGrid>
      </SubCard>
    </Variant>
    <Variant label='AddRowButton' stack>
      <AddRowButton onClick={() => {}}>เพิ่มผู้ติดต่อฉุกเฉิน</AddRowButton>
    </Variant>
    <Guidelines
      behavior={[
        'Layout primitives that compose a Registration / Treatment form section: `SectionTitle` → `SubCard` (optional) → `FieldGrid` → `Field` rows.',
        '`FieldGrid` `cols` controls column count; `Field span` lets one field span multiple columns.',
      ]}
      dos={[
        'Build forms by composing these primitives rather than hand-rolling layout.',
        'Use `SubCard` to group related fields inside a section (e.g. "ที่อยู่ปัจจุบัน" inside "ที่อยู่").',
        'Mark required fields via `<Field required>` so the asterisk + validator wiring stays in sync.',
      ]}
      donts={[
        "Don't bypass Field for ad-hoc input rendering — labels + asterisks live on Field.",
        "Don't nest SubCard inside SubCard — flatten the structure instead.",
      ]}
    />
  </Section>
);

const FormShellDemo = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState({});
  const samplePatient = { hn: '650001234', name: 'สมชาย ใจดี', isNew: true, isActive: true };
  return (
    <Section title='FormShell' summary='Full-page registration form chrome: SubHeader (ประวัติการแก้ไข popup · บัตรคิว · …) + 6-step Stepper + body + sticky footer.'>
      <Variant label='Interactive · click stepper or footer to navigate' stack>
        <div style={{ height: 700, overflow: 'auto', borderRadius: 'var(--dim-radius-300)', border: 'var(--dim-stroke-100) solid var(--border-card-default)' }}>
          <FormShell
            patient={samplePatient}
            stepIndex={stepIndex}
            onStepChange={setStepIndex}
          >
            <Step1Personal form={form} setForm={setForm} />
          </FormShell>
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Layout-only wrapper; the page owns `form` state and passes step-body via `children`.',
          'StepProgress + sticky Footer (prev / save-draft / next) live inside the shell; pass `completedSteps` from your validator so ✓ matches reality.',
        ]}
        dos={[
          'Use as the routed wrapper for the Registration (เวชระเบียน) flow.',
          'Drive `stepIndex` from page state and pass `getRegistrationCompletedSteps(form)` to make the ✓ truthful.',
        ]}
        donts={[
          "Don't render outside the Registration subsystem — the chrome (SubHeader actions, status bar) is bespoke for MR.",
          "Don't manage form state inside the shell — the page owns it.",
        ]}
      />
    </Section>
  );
};

const RegistrationStepsDemo = () => {
  const [form, setForm] = useState({});
  return (
    <Section title='RegistrationSteps' summary='Per-step form bodies for the Registration (เวชระเบียน) workflow (6 steps · Figma 292:104252 + 2373:119045..). Each step accepts (form, setForm) and is rendered inside FormShell. Demo shows Step 2 (ข้อมูลส่วนตัว).'>
      <Variant label='Step 2 · ข้อมูลส่วนตัว' stack>
        <div style={{ width: '100%', maxHeight: 700, overflow: 'auto', padding: 'var(--dim-space-500)', background: 'var(--surface-page-default)', borderRadius: 'var(--dim-radius-300)' }}>
          <Step1Personal form={form} setForm={setForm} />
        </div>
      </Variant>
      <Variant label='6 steps in the MR flow' stack>
        <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
          แบบฟอร์มยินยอม · ข้อมูลส่วนตัว · ที่อยู่ · ข้อมูลการติดต่อ · สิทธิการรักษา · หมายเหตุและ Flag
        </span>
      </Variant>
      <Guidelines
        behavior={[
          'Each `Step*` component is controlled via `{ form, setForm }` — the page owns the form state, the step is a thin presenter.',
          'Step 2 honors chip-read locking (`form.idCardFromChip`) by disabling card-sourced fields.',
        ]}
        dos={[
          'Use inside FormShell with `STEP_RENDERERS[stepIndex]` switch (see RegistrationFormPage).',
          'Wire `setForm` so each `<Field required>` change updates the form in one place.',
        ]}
        donts={[
          "Don't render steps outside the FormShell — they need the surrounding chrome (Footer / step animation).",
          "Don't fork the form shape per step — keep one shared `form` object across all 6 steps.",
        ]}
      />
    </Section>
  );
};

/* ── Static button demos ─────────────────────────────────── */

/* Reusable state-matrix table for the BrandButton property panel.
   Rows = sizes (lg/md/sm). Columns = 5 states (Default/Hover/Active/Focus/Disabled).
   Renders one table per Style. */
const BUTTON_STATE_COLS = [
  { key: 'default',  label: 'Default',  props: {} },
  { key: 'hover',    label: 'Hover',    props: { hovered: true } },
  { key: 'active',   label: 'Active',   props: { active: true } },
  { key: 'focus',    label: 'Focus',    props: { focused: true } },
  { key: 'disabled', label: 'Disabled', props: { disabled: true } },
];
const BUTTON_SIZE_ROWS = [
  { key: 'xl', label: 'X Large (52 · Mitr 18)' },
  { key: 'lg', label: 'Large (44 · Mitr 16)'  },
  { key: 'md', label: 'Medium (40 · Mitr 16)' },
  { key: 'sm', label: 'Small (36 · Mitr 14)'  },
];

const BrandButtonDemo = () => (
  <Section title='BrandButton' summary='Brand Button per Figma 231:29. Properties: Style (fill · outline · ghost) · State (default · hover · active · focus · disabled) · Size (sm 36 · md 40 · lg 44 · xl 52) · Label typography Mitr 14/16/16/18 · Show Leading icon · Show Trailing icon · Show Label. Tables below mirror the Figma variant matrix — each table is one Style, rows are sizes, columns are states.'>
    <Variant label='Style · Fill' stack>
      <ButtonStateTable Component={BrandButton} variant='fill' />
    </Variant>
    <Variant label='Style · Outline' stack>
      <ButtonStateTable Component={BrandButton} variant='outline' />
    </Variant>
    <Variant label='Style · Ghost' stack>
      <ButtonStateTable Component={BrandButton} variant='ghost' />
    </Variant>
    <Variant label='Show* toggles · Show Leading icon / Show Trailing icon / Show Label'>
      <BrandButton leadingIcon='add' trailingIcon='arrow_forward'>All on</BrandButton>
      <BrandButton leadingIcon='add' trailingIcon='arrow_forward' showTrailingIcon={false}>Trailing off</BrandButton>
      <BrandButton leadingIcon='add' trailingIcon='arrow_forward' showLeadingIcon={false}>Leading off</BrandButton>
      <BrandButton leadingIcon='add' trailingIcon='arrow_forward' showLabel={false} aria-label='Icons only' />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'Hover and focus apply the same hover tint (keyboard parity). Active (press) is one shade darker.',
        'Loading sets aria-busy="true", hides the label, renders a centered spinner; click is suppressed until parent clears `loading`.',
        'Icon-only variants require an aria-label; the icon is aria-hidden so screen readers don\'t announce it twice.',
      ]}
      dos={[
        "Use BrandButton (Fill) for the page's primary action — exactly one per surface.",
        'Use BrandSubdueButton or NeutralSubdueButton for secondary actions that share a row with the primary.',
        'Use DangerButton for destructive commits (Delete, Discard, Sign-out); pair with a confirm dialog.',
        'Use Outline variants on tinted brand surfaces where Fill would over-saturate; Ghost only for tertiary actions.',
      ]}
      donts={[
        "Don't ship two Fill-primary buttons in the same row — pick the most important; demote the rest to Subdue / Outline / Ghost.",
        "Don't put a Danger button next to a Brand button without separation — users mis-click when red sits beside green.",
        "Don't use an icon-only button as the sole trigger for a critical action — pair with a label or a Tooltip.",
        "Don't change a button's text mid-press (\"Save\" → \"Saving…\") without entering `loading` state — the layout jumps.",
      ]}
    />
  </Section>
);

/* Reusable state-matrix table — generic over any button component that
   supports {hovered, active, focused, disabled} props. Renders one table
   per Style (variant). Rows = sizes lg/md/sm, columns = 5 states. */
const ButtonStateTable = ({ Component, variant, leadingIcon = 'add', trailingIcon = 'arrow_forward', label = 'Button' }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th
            style={{
              textAlign: 'left',
              padding: 'var(--dim-space-200) var(--dim-space-300)',
              borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
              fontWeight: 'var(--type-weight-medium)',
              color: 'var(--text-content-default)',
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
            }}
          >
            {variant}
          </th>
          {BUTTON_STATE_COLS.map((c) => (
            <th
              key={c.key}
              style={{
                textAlign: 'left',
                padding: 'var(--dim-space-200) var(--dim-space-300)',
                borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
                fontWeight: 'var(--type-weight-medium)',
                color: 'var(--text-content-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {BUTTON_SIZE_ROWS.map((row, i) => (
          <tr key={row.key}>
            <td
              style={{
                padding: 'var(--dim-space-300)',
                borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)',
                color: 'var(--text-content-tertiary)',
                whiteSpace: 'nowrap',
                verticalAlign: 'middle',
              }}
            >
              {row.label}
            </td>
            {BUTTON_STATE_COLS.map((col) => (
              <td
                key={col.key}
                style={{
                  padding: 'var(--dim-space-300)',
                  borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)',
                  verticalAlign: 'middle',
                }}
              >
                <Component
                  variant={variant}
                  size={row.key}
                  leadingIcon={leadingIcon}
                  trailingIcon={trailingIcon}
                  {...col.props}
                >
                  {label}
                </Component>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* Circle Icon Button state matrix — Figma node 2103:548 swaps "Active" for
   "Selected" so the toggle metaphor reads in the variant name. */
const CIRCLE_ICON_STATE_COLS = [
  { key: 'default',  label: 'Default',  props: {} },
  { key: 'hover',    label: 'Hover',    props: { hovered: true } },
  { key: 'selected', label: 'Selected', props: { selected: true } },
  { key: 'focus',    label: 'Focus',    props: { focused: true } },
  { key: 'disabled', label: 'Disabled', props: { disabled: true } },
];

/* Circle Icon Button sizes — spans XSmall (32) → X Large (52, radius full).
   Shared by Brand (Figma 2103:548) and Danger (Figma 3853:1177). */
const CIRCLE_ICON_SIZE_ROWS = [
  { key: 'xl', label: 'X Large (52)' },
  { key: 'lg', label: 'Large (44)'   },
  { key: 'md', label: 'Medium (40)'  },
  { key: 'sm', label: 'Small (36)'   },
  { key: 'xs', label: 'XSmall (32)'  },
];

/* Circle Subdue spans XSmall (32) → X Large (52) — Figma node 2103:645.
   Order matches Figma's X Large → XSmall ladder. */
const CIRCLE_SUBDUE_SIZE_ROWS = [
  { key: 'xl', label: 'X Large (52)' },
  { key: 'lg', label: 'Large (44)'   },
  { key: 'md', label: 'Medium (40)'  },
  { key: 'sm', label: 'Small (36)'   },
  { key: 'xs', label: 'XSmall (32)' },
];

/* Icon-button variant of ButtonStateTable — no leading/trailing slots, just
   the `icon` prop. Cells are slightly tighter since there's no label.
   `stateCols` / `sizeRows` default to the standard button matrix; pass
   custom arrays (e.g. CIRCLE_ICON_STATE_COLS) for Circle families. */
const ButtonIconStateTable = ({ Component, variant, icon = 'add', stateCols = BUTTON_STATE_COLS, sizeRows = BUTTON_SIZE_ROWS }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th
            style={{
              textAlign: 'left',
              padding: 'var(--dim-space-200) var(--dim-space-300)',
              borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
              fontWeight: 'var(--type-weight-medium)',
              color: 'var(--text-content-default)',
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
            }}
          >
            {variant}
          </th>
          {stateCols.map((c) => (
            <th
              key={c.key}
              style={{
                textAlign: 'left',
                padding: 'var(--dim-space-200) var(--dim-space-300)',
                borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
                fontWeight: 'var(--type-weight-medium)',
                color: 'var(--text-content-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sizeRows.map((row, i) => (
          <tr key={row.key}>
            <td
              style={{
                padding: 'var(--dim-space-300)',
                borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)',
                color: 'var(--text-content-tertiary)',
                whiteSpace: 'nowrap',
                verticalAlign: 'middle',
              }}
            >
              {row.label}
            </td>
            {stateCols.map((col) => (
              <td
                key={col.key}
                style={{
                  padding: 'var(--dim-space-300)',
                  borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)',
                  verticalAlign: 'middle',
                }}
              >
                <Component
                  variant={variant}
                  size={row.key}
                  icon={icon}
                  aria-label={`${variant}-${row.key}-${col.key}`}
                  {...col.props}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const BrandSubdueButtonDemo = () => (
  <Section title='BrandSubdueButton' summary='Figma "Brand Subdue Button" (node 2024:3589). Properties: Style (fill · outline) · State (default · hover · active · focus · disabled) · Size (sm/md/lg) · Show Leading/Trailing icon / Show Label. Tables below mirror the Figma variant matrix — each table is one Style, rows are sizes, columns are states.'>
    <Variant label='Style · Fill' stack>
      <ButtonStateTable Component={BrandSubdueButton} variant='fill' leadingIcon='credit_card' trailingIcon='expand_more' />
    </Variant>
    <Variant label='Style · Outline' stack>
      <ButtonStateTable Component={BrandSubdueButton} variant='outline' leadingIcon='credit_card' trailingIcon='expand_more' />
    </Variant>
    <Variant label='Show* toggles · Show Leading icon / Show Trailing icon / Show Label'>
      <BrandSubdueButton leadingIcon='credit_card' trailingIcon='expand_more'>All on</BrandSubdueButton>
      <BrandSubdueButton leadingIcon='credit_card' trailingIcon='expand_more' showTrailingIcon={false}>Trailing off</BrandSubdueButton>
      <BrandSubdueButton leadingIcon='credit_card' trailingIcon='expand_more' showLeadingIcon={false}>Leading off</BrandSubdueButton>
      <BrandSubdueButton leadingIcon='credit_card' trailingIcon='expand_more' showLabel={false} aria-label='Icons only' />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'Brand-tinted surface tier sits one step below BrandButton (quaternary instead of default), reading as "less prominent" while still brand-coloured.',
      ]}
      dos={[
        'Use as a secondary action in a row that already has a BrandButton primary (e.g. "บันทึก" primary + "บันทึกร่าง" subdue).',
        'Use Outline on already brand-tinted surfaces where Fill would over-saturate.',
        'Use for repeated lightweight brand actions (chips, toolbars, filter clusters).',
      ]}
      donts={[
        "Don't use as the page's only / primary CTA — promote to BrandButton (Fill).",
        "Don't mix Fill and Outline of BrandSubdue in the same row — pick one tier per row for visual consistency.",
        "Don't use for destructive actions — switch to DangerSubdueButton.",
      ]}
    />
  </Section>
);

const NeutralSubdueButtonDemo = () => (
  <Section title='NeutralSubdueButton' summary='Figma "Neutral Subdue Button" (node 2024:2940). Neutral grey for non-brand actions (filters, exports, settings). Properties: Style (fill · outline) · State (5) · Size (sm/md/lg) · Show Leading/Trailing icon / Show Label.'>
    <Variant label='Style · Fill' stack>
      <ButtonStateTable Component={NeutralSubdueButton} variant='fill' leadingIcon='filter_list' trailingIcon='expand_more' />
    </Variant>
    <Variant label='Style · Outline' stack>
      <ButtonStateTable Component={NeutralSubdueButton} variant='outline' leadingIcon='filter_list' trailingIcon='expand_more' />
    </Variant>
    <Variant label='Show* toggles'>
      <NeutralSubdueButton leadingIcon='share' trailingIcon='expand_more'>All on</NeutralSubdueButton>
      <NeutralSubdueButton leadingIcon='share' trailingIcon='expand_more' showLeadingIcon={false}>Leading off</NeutralSubdueButton>
      <NeutralSubdueButton leadingIcon='share' trailingIcon='expand_more' showLabel={false} aria-label='Icons only' />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'Neutral grey — does not pick up brand colour, so safe to repeat in dense areas without drowning the page in brand.',
      ]}
      dos={[
        'Use for non-brand chrome actions: filters, exports, settings, "ดูทั้งหมด", "ปริ้น".',
        'Use as a secondary alongside a brand-aware primary when you want neutrality (e.g. paired with a Brand or Danger primary).',
        'Use Outline on tinted brand surfaces (queue summary bands) where a grey fill would clash.',
      ]}
      donts={[
        "Don't use for brand-anchored actions (chips, brand chrome) — switch to BrandSubdueButton.",
        "Don't use for destructive actions — switch to DangerSubdueButton.",
        "Don't bury a primary action inside a Neutral row — promote it to BrandButton or DangerButton.",
      ]}
    />
  </Section>
);

const BrandIconButtonDemo = () => (
  <Section title='BrandIconButton' summary='Figma "Brand Icon Button" (node 377:11596). Square icon-only button. Properties: Style (fill · outline · ghost · quaternary) · State (default · hover · active · focus · disabled) · Size (sm 36 · md 40 · lg 44). `quaternary` is the brand-p50 surface + brand-p100 border treatment (Figma PHCIS | Medical-examination 339:36817 row-action edit button) — same look as the `active` state but expressed as a variant so callers can opt-in without hijacking active-mode semantics.'>
    <Variant label='Style · Fill' stack>
      <ButtonIconStateTable Component={BrandIconButton} variant='fill' icon='add' />
    </Variant>
    <Variant label='Style · Outline' stack>
      <ButtonIconStateTable Component={BrandIconButton} variant='outline' icon='add' />
    </Variant>
    <Variant label='Style · Ghost' stack>
      <ButtonIconStateTable Component={BrandIconButton} variant='ghost' icon='add' />
    </Variant>
    <Variant label='Style · Quaternary (Figma 339:36817 row-action)' stack>
      <ButtonIconStateTable Component={BrandIconButton} variant='quaternary' icon='edit' />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'Icon-only — REQUIRES `aria-label`; the icon is `aria-hidden` so screen readers don\'t double-announce.',
        '`quaternary` variant ships a "pre-pressed" look (brand-p50 surface + brand-p100 border) for row-action editors without hijacking the live `active` semantics.',
      ]}
      dos={[
        'Use for compact brand actions in toolbars, table rows, card headers where label text would crowd the layout.',
        'Pair with a Tooltip when the icon alone is ambiguous.',
        'Use Fill for a high-emphasis brand action (e.g. ID-card chip read); Ghost for tertiary; quaternary for "edit row" row-action.',
      ]}
      donts={[
        "Don't ship without an `aria-label` — icon-only buttons without a label are invisible to assistive tech.",
        "Don't use for destructive actions — switch to DangerIconButton (red).",
        "Don't line up 3+ icon-only brand buttons side-by-side without tooltips or label clarity.",
      ]}
    />
  </Section>
);

const NeutralIconButtonDemo = () => (
  <Section title='NeutralIconButton' summary='Figma "Neutral Icon Button" (node 2024:4189). Properties: Style (fill · outline · ghost) · State (5) · Size (sm/md/lg).'>
    <Variant label='Style · Fill' stack>
      <ButtonIconStateTable Component={NeutralIconButton} variant='fill' icon='more_vert' />
    </Variant>
    <Variant label='Style · Outline' stack>
      <ButtonIconStateTable Component={NeutralIconButton} variant='outline' icon='more_vert' />
    </Variant>
    <Variant label='Style · Ghost' stack>
      <ButtonIconStateTable Component={NeutralIconButton} variant='ghost' icon='more_vert' />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'Icon-only — REQUIRES `aria-label`; the icon is `aria-hidden`.',
      ]}
      dos={[
        'Use for non-brand chrome actions: kebab menus, close icons, "more" affordances in table rows.',
        'Use Ghost on tinted surfaces where Fill / Outline would clash.',
        'Pair with a Tooltip when the icon alone is ambiguous (more_vert in particular).',
      ]}
      donts={[
        "Don't ship without an `aria-label`.",
        "Don't use for brand-anchored actions — use BrandIconButton instead.",
        "Don't use for destructive single-tap actions without a confirm — pair with AlertDialog.",
      ]}
    />
  </Section>
);

const NeutralSubdueIconButtonDemo = () => (
  <Section title='NeutralSubdueIconButton' summary='Figma "Neutral Subdue Icon Button" (node 2024:4516). Properties: Style (fill · outline) · State (5) · Size (sm/md/lg). Softer than NeutralIconButton.'>
    <Variant label='Style · Fill' stack>
      <ButtonIconStateTable Component={NeutralSubdueIconButton} variant='fill' icon='close' />
    </Variant>
    <Variant label='Style · Outline' stack>
      <ButtonIconStateTable Component={NeutralSubdueIconButton} variant='outline' icon='close' />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'Icon-only — REQUIRES `aria-label`; the icon is `aria-hidden`.',
        'Softer surface tier than NeutralIconButton — sits as a faint chrome control.',
      ]}
      dos={[
        'Use for compact chrome controls inside cards / tables where NeutralIconButton would be too heavy.',
        'Use for "close" buttons in popovers / modal dialogs / chip pills (X icon).',
      ]}
      donts={[
        "Don't ship without an `aria-label`.",
        "Don't use for the page's primary action — barely visible.",
        "Don't use for destructive actions — use DangerSubdueIconButton.",
      ]}
    />
  </Section>
);

/* ── Registry: side-menu groups + slug → demo component ────── */

/* ── design-system extras ─────────────────────────────────── */

/* Sidebar uses `position: fixed; top:'var(--dim-space-0)'; left:'var(--dim-space-0)'; bottom:0` so it normally
   attaches to the viewport. To preview it inside the components panel we
   wrap it in a `transform: translateZ(0)` containing block — that re-anchors
   `fixed` descendants to the wrapper instead of the viewport. */
const SidebarPreviewFrame = ({ activeKey, contentLabel, defaultSubmenuKey = null, height = 600 }) => (
  <ClinicFilterProvider>
    <div
      style={{
        position: 'relative',
        transform: 'translateZ(0)',
        height,
        overflow: 'hidden',
        borderRadius: 'var(--dim-radius-300)',
        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
        display: 'flex',
        background: 'var(--surface-page-default)',
      }}
    >
      <SidebarChrome activeKey={activeKey} defaultSubmenuKey={defaultSubmenuKey} />
      <div
        className='flex-1'
        style={{
          padding: 'var(--dim-space-500)',
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          marginLeft: defaultSubmenuKey ? 384 : 0,
        }}
      >
        {contentLabel}
      </div>
    </div>
  </ClinicFilterProvider>
);

const SidebarDemo = () => (
  <Section title='Sidebar' summary='Single page-level navigation rail used by every page (canonical source: layout/Sidebar.jsx). Each page passes only its `activeKey` to highlight the current menu — no duplicated sidebar files. Primary items: dashboard · consent · mr · opd · treat · radiology · lab · pharmacy · finance · appoint · log · users. Menus with `subItems` (currently only `treat`) open a <SideSubMenu> panel to the right on click; the panel scrolls when items overflow the viewport. The component is `position: fixed` — the previews below use a `transform`-based containing block so the fixed sidebar renders inside the content area instead of overlaying the viewport.'>
    <Variant label={'activeKey="dashboard" · used by /dashboard'} stack>
      <SidebarPreviewFrame activeKey='dashboard' contentLabel='(พื้นที่เนื้อหา · /dashboard)' />
    </Variant>
    <Variant label={'activeKey="registration" · used by /registration/queue + /registration/register'} stack>
      <SidebarPreviewFrame activeKey='registration' contentLabel='(พื้นที่เนื้อหา · ระบบงานเวชระเบียน)' />
    </Variant>
    <Variant label={'activeKey="opd" · used by /opd/queue + /opd/screening'} stack>
      <SidebarPreviewFrame activeKey='opd' contentLabel='(พื้นที่เนื้อหา · ระบบงานผู้รับบริการนอก)' />
    </Variant>
    <Variant label={'activeKey="treat" · click "ระบบบันทึกการรักษา" to open the SideSubMenu (Figma 299:4913)'} stack>
      <SidebarPreviewFrame
        activeKey='treat'
        defaultSubmenuKey='treat'
        contentLabel='(พื้นที่เนื้อหา · ระบบบันทึกการรักษา — เลือกแผนกจากเมนูย่อย)'
        height={700}
      />
    </Variant>
    <Guidelines
      behavior={[
        '`position: fixed` — only ONE Sidebar instance per page; pages pass `activeKey` to highlight the current menu.',
        'Menus with `subItems` open a `<SideSubMenu>` to the right on click (currently only `treat`).',
      ]}
      dos={[
        'Use one Sidebar at the app-shell level; pages should NEVER duplicate the rail.',
        'Drive `activeKey` from the route so the highlight matches what the user is viewing.',
      ]}
      donts={[
        "Don't render multiple Sidebars — they\'ll stack as fixed elements and overlap.",
        "Don't add page-level navigation items inside the Sidebar — use SubHeader for in-page nav.",
      ]}
    />
  </Section>
);

/* ── SideSubMenu state-matrix table — single row × 4 states ── */
const SIDESUBMENU_STATE_COLS = [
  { key: 'default',  label: 'Default',  state: 'default'  },
  { key: 'hover',    label: 'Hover',    state: 'hover'    },
  { key: 'selected', label: 'Selected', state: 'selected' },
  { key: 'disabled', label: 'Disabled', state: 'disabled' },
];

const SideSubMenuStateTable = ({ cellMinWidth = 240 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>Variant</th>
          {SIDESUBMENU_STATE_COLS.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {/* Row 1: Sub-menu item */}
        <tr>
          <td style={{ padding: 'var(--dim-space-300)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>Item</td>
          {SIDESUBMENU_STATE_COLS.map((col) => (
            <td key={col.key} style={{ padding: 'var(--dim-space-300)', verticalAlign: 'middle', minWidth: cellMinWidth, background: 'var(--surface-card-brand-100, #F4FBF8)' }}>
              <SideSubMenuItem state={col.state}>คลินิกตรวจรักษา</SideSubMenuItem>
            </td>
          ))}
        </tr>
        {/* Row 2: Header (only one visual — render in Default column, dim others) */}
        <tr>
          <td style={{ padding: 'var(--dim-space-300)', borderTop: 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>Header</td>
          {SIDESUBMENU_STATE_COLS.map((col, i) => (
            <td key={col.key} style={{ padding: 'var(--dim-space-300)', borderTop: 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', minWidth: cellMinWidth, background: 'var(--surface-card-brand-100, #F4FBF8)' }}>
              {i === 0
                ? <SideSubMenuHeader>ระบบบันทึกการรักษา</SideSubMenuHeader>
                : <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>— (Header has no state)</span>}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  </div>
);

const SIDESUBMENU_TREAT_ITEMS = [
  { key: 'opd',         label: 'คลินิกตรวจรักษา' },
  { key: 'family',      label: 'คลินิกส่งเสริมสุขภาพ (วางแผนครอบครัว)' },
  { key: 'std',         label: 'คลินิกรักปลอดภัย' },
  { key: 'drug',        label: 'คลินิกบำบัดและรักษาผู้ป่วยติดสารเสพติด' },
  { key: 'anc',         label: 'คลินิกฝากครรภ์' },
  { key: 'wellness',    label: 'คลินิกตรวจสุขภาพ' },
  { key: 'vaccine',     label: 'คลินิกสร้างเสริมภูมิคุ้มกันโรค' },
  { key: 'dental',      label: 'คลินิกทันตกรรม' },
  { key: 'tb',          label: 'คลินิกวัณโรค' },
  { key: 'mental',      label: 'คลินิกสุขภาพจิต' },
];

const SideSubMenuDemo = () => {
  const [sel, setSel] = useState('family');
  return (
    <Section
      title='SideSubMenu'
      summary='Companion panel that opens to the right of <Sidebar /> when a primary menu has sub-departments (Figma 299:3610). Tinted brand-p50 (#F4FBF8) shell, 384px wide, with an optional Section header at the top and a list of <SideSubMenuItem> rows. Items have 4 states (default · hover · selected · disabled); selected uses bold heading-content font on a brand-p100 surface. Pass `state` to force the visual state for design-system docs; in real use the row resolves from `selected` + `disabled` + hover.'
    >
      <Variant label='State matrix · Item · 4 states + Header row' stack>
        <SideSubMenuStateTable />
      </Variant>
      <Variant label='Full panel · interactive (click to select)' stack>
        <div style={{ height: 600, display: 'flex', borderRadius: 'var(--dim-radius-300)', overflow: 'hidden', border: 'var(--dim-stroke-100) solid var(--border-card-default)' }}>
          <SideSubMenu
            header='ระบบบันทึกการรักษา'
            items={SIDESUBMENU_TREAT_ITEMS}
            selectedKey={sel}
            onSelect={setSel}
          />
          <div className='flex-1' style={{ padding: 'var(--dim-space-500)', color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', background: 'var(--surface-page-default, #FFFFFF)' }}>
            selected = {sel}
          </div>
        </div>
      </Variant>
      <Variant label='Composed manually · mixed states (disabled + selected)' stack>
        <div style={{ width: 384, borderRadius: 'var(--dim-radius-300)', overflow: 'hidden', border: 'var(--dim-stroke-100) solid var(--border-card-default)' }}>
          <SideSubMenu header='ระบบบันทึกการรักษา' showBottomSpacer={false}>
            <SideSubMenuItem onClick={() => {}}>คลินิกตรวจรักษา</SideSubMenuItem>
            <SideSubMenuItem selected onClick={() => {}}>คลินิกส่งเสริมสุขภาพ (วางแผนครอบครัว)</SideSubMenuItem>
            <SideSubMenuItem disabled>คลินิกบำบัดและรักษาผู้ป่วยติดสารเสพติด (ปิดบริการ)</SideSubMenuItem>
            <SideSubMenuItem onClick={() => {}}>คลินิกฝากครรภ์</SideSubMenuItem>
          </SideSubMenu>
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Sub-menu rows resolve state from `selected` + `disabled` + internal hover. Pass `state` to force the visual for grids.',
          'Selected swaps the font from body/regular to heading-content/bold and tints the row brand-p100; the surface alone differentiates hover from selected.',
          'Each row is keyboard-activatable when onClick is provided (Enter / Space). Disabled rows are non-focusable and non-interactive.',
          'SideSubMenuHeader is static (presentational) — used to label the parent menu the sub-items belong to.',
        ]}
        dos={[
          'Open the SideSubMenu to the right of <Sidebar /> when the active primary menu has its own departments — pair the header label with that primary menu name.',
          'Use onSelect to drive the parent route (e.g. /treat/anc) and reflect the choice with selectedKey.',
          'Group items in Figma order; keep the most-used departments at the top so users scan top-down.',
        ]}
        donts={[
          "Don't nest a SideSubMenu inside a card — it's a full-height panel, not a popover.",
          "Don't apply selected to more than one row at a time — the heading-content font signals a single active page.",
          "Don't show a SideSubMenu for primary menus that have no sub-departments — close the panel instead.",
        ]}
      />
    </Section>
  );
};

const HistoryTimelineDemo = () => (
  <Section title='HistoryTimeline' summary='Aside panel of past-visit rounds + note presets. Used inside OPD / MR / Treatment forms — emits onRoundsChange / onActiveRoundChange.'>
    <Variant label='Default (constrained 320px)' stack>
      <div style={{ width: 320 }}>
        <HistoryTimeline />
      </div>
    </Variant>
    <Guidelines
      behavior={[
        'Renders past rounds + note presets in a vertical timeline; emits `onRoundsChange` / `onActiveRoundChange` for parent state.',
      ]}
      dos={[
        'Use as a side panel inside Treatment / OPD forms where the doctor needs quick recall of prior rounds.',
      ]}
      donts={[
        "Don't widen past 360 px — long round labels wrap; tighten the column if labels are short.",
      ]}
    />
  </Section>
);

const PatientCardDemo = () => (
  <Section title='PatientCard' summary='Patient header card showing HN, name, age, allergies, last visit. In the full layout, avatar, identity, HN/VIP, and clinical fields stay in one horizontal row; the field group scrolls when space is constrained. Default seeded from DEFAULT_PATIENT. Optional `drugAllergies` + `chronicDiseases` (each `{ name, severity }`) render the Figma 150:33649 alert row beneath the gradient card and stay visible across every step of TreatmentFormPage. `compact` pins a static single-row mini variant (Figma 343:5629) — 44 px avatar, 24h HN/VIP pills, four right-aligned summary fields (สิทธิ์ · หมู่เลือด · ประเภท · แพทย์), title row collapsed, alert labels inline with badges. `sticky` (default top 64 px) opts into the parallax behavior: PatientCard owns a 1 px sentinel + IntersectionObserver internally and automatically toggles compact when it scrolls under the app header. Used by [TreatmentFormPage](src/pages/treat/TreatmentFormPage.jsx) and [ScreeningPage](src/pages/opd/ScreeningPage.jsx).'>
    <Variant label='Default patient' stack>
      <PatientCard />
    </Variant>
    <Variant label='Compact · Figma 343:5629 (static — what `sticky` swaps to when stuck)' stack>
      <PatientCard
        compact
        title='บันทึกการรักษา'
        drugAllergies={[
          { name: 'Penicillin',   severity: 'critical' },
          { name: 'Sulfonamides', severity: 'critical' },
          { name: 'Aspirin',      severity: 'high'     },
          { name: 'NSAIDs',       severity: 'high'     },
          { name: 'โรคลมชัก',      severity: 'medium'   },
        ]}
        chronicDiseases={[
          { name: 'หัวใจล้มเหลว',                severity: 'critical' },
          { name: 'โรคไตเรื้อรัง ระยะ 3–4 (CKD)', severity: 'high'     },
          { name: 'ความดันโลหิตสูง (HT)',         severity: 'medium'   },
        ]}
      />
    </Variant>
    <Variant label='With แพ้ยา + โรคประจำตัว row (treatment header)' stack>
      <PatientCard
        drugAllergies={[
          { name: 'Penicillin',   severity: 'critical' },
          { name: 'Sulfonamides', severity: 'critical' },
          { name: 'Aspirin',      severity: 'high'     },
          { name: 'NSAIDs',       severity: 'high'     },
          { name: 'โรคลมชัก',      severity: 'medium'   },
        ]}
        chronicDiseases={[
          { name: 'หัวใจล้มเหลว',                severity: 'critical' },
          { name: 'โรคไตเรื้อรัง ระยะ 3–4 (CKD)', severity: 'high'     },
          { name: 'ความดันโลหิตสูง (HT)',         severity: 'medium'   },
        ]}
      />
    </Variant>
    <Guidelines
      behavior={[
        '`sticky` opts into parallax collapse — PatientCard owns IntersectionObserver internally and toggles `compact` when it tucks under the page Header.',
        'Severity-tagged allergy / chronic rows always show below the gradient card (visible across every step).',
      ]}
      dos={[
        'Use ONE PatientCard per patient-scoped page (Registration, Treatment, OPD Screening).',
        'Pass `sticky` for long pages so the card collapses to the mini variant on scroll.',
        'Order allergy / chronic entries by severity (critical → high → medium) — readers stop after the top 2-3.',
      ]}
      donts={[
        "Don't nest a PatientCard inside another card.",
        "Don't pass empty `drugAllergies` / `chronicDiseases` arrays expecting the row to hide — leave the prop undefined.",
      ]}
    />
  </Section>
);

const VitalCardDemo = () => (
  <Section title='VitalCard · PressureCard · BMICard' summary='Vitals input cards used in VitalsForm. VitalCard takes label/unit/value/onChange; PressureCard wraps systolic/diastolic; BMICard shows BMI on a 5-band gradient — pass weight (kg) + height (cm) for live BMI, or value alone.'>
    <Variant label='Three card variants'>
      <VitalCard label='อุณหภูมิ'  unit='°C'   value='36.5' step={0.1} />
      <VitalCard label='ชีพจร'     unit='bpm' value='78' />
      <PressureCard sys='120' dia='80' />
    </Variant>
    <Variant label='With badge + BMI'>
      <VitalCard label='SpO₂' unit='%' value='98' badge={{ tone: 'orange', label: 'ผิดปกติ' }} />
      <BMICard value='22.5' />
      <BMICard weight='70' height='170' />
    </Variant>
    <Guidelines
      behavior={[
        'VitalCard takes label / unit / value / onChange + optional `badge`. PressureCard wraps Systolic / Diastolic into one card. BMICard auto-computes from weight + height OR takes a bare `value`.',
        'Each card owns Stepper +/- internally — uses canonical Stepper aria contract.',
      ]}
      dos={[
        'Use inside VitalsForm grid — one card per vital sign.',
        'Pass `badge={{ tone, label }}` for out-of-range / critical values (e.g. SpO₂ < 95% → orange "ผิดปกติ").',
      ]}
      donts={[
        "Don't render with no value AND no onChange — that's a read-only display; use VitalSignTimelineCard instead.",
        "Don't bypass PressureCard with two side-by-side VitalCards — the combined card pairs Systolic + Diastolic correctly.",
      ]}
    />
  </Section>
);

/* VitalReadingCard — read-only display variant (Figma 17:1504 borderless,
   17:1458 with-Border). Distinct from interactive VitalCard above which
   embeds an input + ± stepper. The 8-variant matrix below (4 from each
   Figma set) covers horizontal/vertical × reading/BMI × bordered/borderless. */
const VitalReadingCardDemo = () => (
  <Section
    title='VitalReadingCard'
    summary='Read-only vital-sign display card. Figma "MIH Design System · Card" nodes 17:1504 (borderless) and 17:1458 (with Border). 4 variants per set: horizontal × type (reading | BMI). Toggles: showIcon, showBadge. Use for dashboards / summary panels / read-only headers (Treatment Step 2). For data entry, use the interactive <VitalCard> instead.'
  >
    <Variant label='With Border — Figma 17:1458'>
      <div className='flex flex-wrap items-start' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <VitalReadingCard bordered horizontal type='reading' iconName='thermometer'
          label='อุณหภูมิ (°C)' value='36.8' badge={{ tone: 'success', label: 'ปกติ' }} />
        <VitalReadingCard bordered horizontal={false} type='reading' iconName='thermometer'
          label='อุณหภูมิ' value='36.8' badge={{ tone: 'success', label: 'ปกติ' }} />
        <VitalReadingCard bordered horizontal type='bmi' iconName='thermometer'
          label='BMI (°C)' value='36.5' bmiMarkerPercent={50}
          badge={{ tone: 'success', label: 'ปกติ' }} />
        <VitalReadingCard bordered horizontal={false} type='bmi' iconName='thermometer'
          label='BMI' value='36.8' bmiMarkerPercent={50}
          badge={{ tone: 'success', label: 'ปกติ' }} />
      </div>
    </Variant>
    <Variant label='Borderless (embedded in panels) — Figma 17:1504'>
      <div className='flex flex-wrap items-start' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <VitalReadingCard bordered={false} horizontal type='reading' iconName='thermometer'
          label='อุณหภูมิ (°C)' value='36.8' badge={{ tone: 'success', label: 'ปกติ' }} />
        <VitalReadingCard bordered={false} horizontal={false} type='reading' iconName='thermometer'
          label='อุณหภูมิ' value='36.8' badge={{ tone: 'success', label: 'ปกติ' }} />
        <VitalReadingCard bordered={false} horizontal type='bmi' iconName='thermometer'
          label='BMI (°C)' value='36.5' bmiMarkerPercent={50}
          badge={{ tone: 'success', label: 'ปกติ' }} />
        <VitalReadingCard bordered={false} horizontal={false} type='bmi' iconName='thermometer'
          label='BMI' value='36.8' bmiMarkerPercent={50}
          badge={{ tone: 'success', label: 'ปกติ' }} />
      </div>
    </Variant>
    <Variant label='Toggle showIcon / showBadge'>
      <div className='flex flex-wrap items-start' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <VitalReadingCard bordered showIcon={false} label='อุณหภูมิ (°C)' value='36.8'
          badge={{ tone: 'success', label: 'ปกติ' }} />
        <VitalReadingCard bordered showBadge={false} label='อุณหภูมิ (°C)' value='36.8' />
        <VitalReadingCard bordered showIcon={false} showBadge={false}
          label='อุณหภูมิ (°C)' value='36.8' />
      </div>
    </Variant>
    <Guidelines
      behavior={[
        '4-variant matrix from Figma: horizontal (Yes/No) × type (reading | BMI). bordered=true adds 1px border + 12px padding; bordered=false is for embedding inside other panels with their own chrome.',
        'BMI variants render a GradientBar gauge (blue→red clinical scale) with a marker at bmiMarkerPercent.',
        'Width is fixed per Figma: 215px when horizontal, 130px when vertical.',
        'Badge defaults to `{ tone: "success", label: "ปกติ" }`; pass `badge={null}` or `showBadge={false}` to hide.',
      ]}
      dos={[
        'Use for read-only displays (dashboards, summary panels, Treatment Step 2 header).',
        'Reuse the borderless variant when embedding inside cards/panels that already own a chrome.',
        'Wire badge.tone to the value\'s clinical range (success / warning / error) so abnormal readings stand out.',
      ]}
      donts={[
        "Don't use for clinician data entry — use the interactive <VitalCard> with built-in input + ± stepper instead.",
        "Don't hardcode width: 215 / 130 px — the component picks the right value from `horizontal` so vertical lists wrap correctly.",
        "Don't render bmi variants without bmiMarkerPercent — the marker defaults to 50% which can mislead.",
      ]}
    />
  </Section>
);

/* InventoryCard — Figma node 93:2643 (MIH Design System / Card /
   Inventory Card). Generic image-led picker card; the bed demo below
   exercises one common use case (ward bed pick) but the component is
   intended for any inventory-style choice (equipment, vehicles, rooms,
   supplies). Three documented states: default · hover · selected. */
const InventoryCardDemo = () => {
  const [picked, setPicked] = useState('bed-2');
  const beds = [
    { id: 'bed-1', title: 'เตียง 101 / A', subtext: 'ห้องสามัญชาย · ชั้น 2',
      badge: { label: 'Standard', style: 'blue', icon: 'bed' },
      statusBadge: { label: 'ว่าง', style: 'success', icon: 'check_circle' } },
    { id: 'bed-2', title: 'เตียง 101 / B', subtext: 'ห้องสามัญชาย · ชั้น 2',
      badge: { label: 'VIP', style: 'purple', icon: 'star' },
      statusBadge: { label: 'จอง', style: 'warning', icon: 'schedule' } },
    { id: 'bed-3', title: 'เตียง 102 / A', subtext: 'ห้องแยก · ICU',
      badge: { label: 'Isolation', style: 'orange', icon: 'shield' },
      statusBadge: { label: 'ใช้งาน', style: 'error', icon: 'block' } },
  ];
  return (
    <Section
      title='InventoryCard'
      summary='Generic image-led picker card for inventory-style choices (ward beds, equipment, rooms, supplies). Photo (180h) + badge row + bold title + tertiary subtext. Default: 1px neutral border. Hover / selected: same 1px stroke plus a 3px outer ring (reads as 4px Figma stroke) and drop shadow — border width never changes so inner layout stays stable. Hover auto-detected when onClick is supplied.'
    >
      <Variant label='All states (forced via prop)'>
        <InventoryCard state='default'  title='Default'  subtext='1px border, no shadow' />
        <InventoryCard state='hover'    title='Hover'    subtext='1px + 3px ring + drop shadow' />
        <InventoryCard state='selected' title='Selected' subtext='1px + 3px ring + drop shadow' />
      </Variant>
      <Variant label='Interactive (hover + click to pick)'>
        {beds.map((b) => (
          <InventoryCard
            key={b.id}
            title={b.title}
            subtext={b.subtext}
            badge={b.badge}
            statusBadge={b.statusBadge}
            selected={picked === b.id}
            onClick={() => setPicked(b.id)}
          />
        ))}
      </Variant>
      <Variant label='Content toggles (badge / status / title / subtext)'>
        <InventoryCard showStatusBadge={false} title='ซ่อน Status Badge' subtext='เหลือแต่ Colorful Badge' />
        <InventoryCard showBadge={false}       title='ซ่อน Colorful Badge' subtext='เหลือแต่ Status Badge' />
        <InventoryCard showBadge={false} showStatusBadge={false} title='ซ่อน Badge ทั้งสอง' subtext='เหลือแต่ Title + Subtext' />
      </Variant>
      <Guidelines
        behavior={[
          '180h photo + badge row + title + subtext. Border width never changes — Hover / Selected add a 3 px outer ring (reads as 4 px Figma stroke) so layout stays stable.',
          'Hover auto-detects when `onClick` is provided.',
        ]}
        dos={[
          'Use as a selectable card in inventory picker flows (ward bed, equipment, room).',
          'Pair Status Badge (operational state — ว่าง / จอง / ใช้งาน) with Colorful Badge (category — Standard / VIP / Isolation).',
        ]}
        donts={[
          "Don't shrink past ~240 px wide — the badge + status row crowds.",
          "Don't use for data-only rows — use Table.",
        ]}
      />
    </Section>
  );
};

const VitalsSignGraphDemo = () => (
  <Section title='VitalsSignGraph' summary='Time-series chart for vital signs with a TabPill switcher (อุณหภูมิ / ความดัน / ชีพจร / SpO₂). Uses an internal sample dataset.'>
    <Variant label='Default'>
      <div className='w-full'>
        <VitalsSignGraph />
      </div>
    </Variant>
    <Guidelines
      behavior={[
        'Time-series chart with TabPill switcher for each vital. Read-only (no zoom / pan).',
      ]}
      dos={[
        'Use inline inside a card on a patient profile / treatment record; wrap in VitalsGraphPopup for a fullscreen view.',
      ]}
      donts={[
        "Don't use as the only signal for clinical decision — pair with the numeric measurement and reference range.",
      ]}
    />
  </Section>
);

/* ── forms extras ─────────────────────────────────────────── */

const DateFilterPopupDemo = () => {
  const [open, setOpen] = useState(false);
  return (
    <Section title='DateFilterPopup' summary='Quick-options + custom-range date filter popup. Wrapped by FilterDateTag (recommended). Use directly when you need a standalone trigger.'>
      <Variant label='Click to open · pick quick or custom range' stack>
        <BrandButton onClick={() => setOpen(true)}>Open DateFilterPopup</BrandButton>
        <DateFilterPopup
          open={open}
          onClose={() => setOpen(false)}
          initialQuick='today'
          initialTab='single'
          onApply={() => setOpen(false)}
        />
      </Variant>
      <Guidelines
        behavior={[
          'Two-tab popup: Quick (วันนี้ / เมื่อวาน / 7 / 30 วัน) + Custom (single date or range). Emits `onApply(value)`.',
        ]}
        dos={[
          'Wrap with `FilterDateTag` for the canonical "chip → open popup" pattern; reach for this raw component only for custom triggers.',
        ]}
        donts={[
          "Don't duplicate this popup\'s Quick-options inside another picker — `FilterDateTag` already provides them.",
        ]}
      />
    </Section>
  );
};

const ProfilePopoverDemo = () => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  return (
    <Section title='ProfilePopover' summary='Floating profile menu anchored to the Sidebar avatar. Lists profile / language / settings / logout.'>
      <Variant label='Click avatar to toggle' stack>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <NeutralSubdueButton ref={anchorRef} onClick={() => setOpen((o) => !o)}>
            Toggle ProfilePopover
          </NeutralSubdueButton>
          <ProfilePopover
            open={open}
            anchorRef={anchorRef}
            onClose={() => setOpen(false)}
            onSelect={() => setOpen(false)}
          />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Anchor-positioned popover (like Popover) — closes on outside-click and Esc. Items: profile · language · settings · logout.',
        ]}
        dos={[
          'Anchor to the Sidebar avatar — that\'s the only place this popover should appear.',
        ]}
        donts={[
          "Don't re-implement the profile menu elsewhere — reuse this popover so menu items stay in sync.",
        ]}
      />
    </Section>
  );
};

const SettingsModalDemo = () => {
  const [open, setOpen] = useState(false);
  return (
    <Section title='SettingsModal' summary='Modal for switching theme + light/dark mode. Emits onApply({ mode, theme }).'>
      <Variant label='Open the modal' stack>
        <BrandButton onClick={() => setOpen(true)}>Open SettingsModal</BrandButton>
        <SettingsModal
          open={open}
          onClose={() => setOpen(false)}
          onApply={() => setOpen(false)}
        />
      </Variant>
      <Guidelines
        behavior={[
          'Modal for theme + light/dark mode. Emits `onApply({ mode, theme })` on save.',
        ]}
        dos={[
          'Wire `onApply` to the brand-mode + colour-scheme toggle so the whole app retints.',
        ]}
        donts={[
          "Don't add unrelated settings here — bound to theme controls only; complex settings belong in a full settings page.",
        ]}
      />
    </Section>
  );
};

const VitalsGraphPopupDemo = () => {
  const [open, setOpen] = useState(false);
  return (
    <Section title='VitalsGraphPopup' summary='Popup size=extraLarge — fluid width/height up to 1440×1024 (24px viewport inset), same as BodyRecordPopup. Wraps VitalsSignGraph; footer ยกเลิก + ปิด. Prefer VitalsSignGraphDialog for the full trigger + popup pattern.'>
      <Variant label='Open the popup (footer · ยกเลิก / ปิด)' stack>
        <BrandButton onClick={() => setOpen(true)}>Open VitalsGraphPopup</BrandButton>
        <VitalsGraphPopup
          open={open}
          onClose={() => setOpen(false)}
          onSave={() => setOpen(false)}
        >
          <VitalsSignGraph fillHeight />
        </VitalsGraphPopup>
      </Variant>
      <Guidelines
        behavior={[
          'Popup `size=extraLarge` (fluid up to 1440×1024) wrapping VitalsSignGraph + footer.',
        ]}
        dos={[
          'Use when callers need a custom trigger; otherwise prefer VitalsSignGraphDialog (trigger + popup in one).',
        ]}
        donts={[
          "Don't render the graph inline on small surfaces — use the popup for the full-detail view.",
        ]}
      />
    </Section>
  );
};

const VitalsSignGraphDialogDemo = () => (
  <Section
    title='VitalsSignGraphDialog'
    summary='Reusable vitals graph launcher — NeutralSubdueButton "ดูแบบกราฟ" opens VitalsGraphPopup (extraLarge · up to 1440×1024, fluid with viewport) with TabPill + VitalsSignGraph; footer ยกเลิก / ปิด. Used in VitalsForm and treatment VitalsSignPanel.'
  >
    <Variant label='Default trigger' stack>
      <VitalsSignGraphDialog subtitle='การวัดวันที่ 6 พ.ค. 2569, เวลา 09:21' />
    </Variant>
    <Variant label='Disabled (no rounds)' stack>
      <VitalsSignGraphDialog subtitle='ยังไม่มีข้อมูลการวัด' disabled />
    </Variant>
    <Guidelines
      behavior={[
        'NeutralSubdueButton trigger + VitalsGraphPopup in one component — `subtitle` shows the round label below the trigger.',
      ]}
      dos={[
        'Use as the canonical "ดูแบบกราฟ" affordance inside VitalsForm and treatment vitals panels.',
      ]}
      donts={[
        "Don't render the popup separately when this dialog covers the case.",
      ]}
    />
  </Section>
);

const QueuePageShellDemo = () => {
  const [activeTab, setActiveTab] = useState('all');
  return (
    <Section title='QueuePageShell' summary='Shared chrome for queue / list pages: Sidebar + Header + SubHeader + SummaryCardsBar + sticky TabUnderline + body + Footer. Pass title, breadcrumb, summaryCards, tabs, etc. via props; children render in the body.'>
      <Variant label='Default · with summary cards + tabs' stack>
        <div style={{ position: 'relative', transform: 'translateZ(0)', height: 720, overflow: 'auto', borderRadius: 'var(--dim-radius-300)', border: 'var(--dim-stroke-100) solid var(--border-card-default)' }}>
          <QueuePageShell
            breadcrumb={['ระบบงานผู้รับบริการนอก (OPD)']}
            title='ผู้รับบริการนอก (OPD)'
            actions={(
              <>
                <NeutralSubdueButton leadingIcon='filter_list'>การคัดกรอง</NeutralSubdueButton>
                <BrandButton leadingIcon='credit_card'>อ่านบัตร</BrandButton>
              </>
            )}
            summaryCards={[
              { key: 'a', label: 'รอตรวจ',     value: 7, color: 'info',       icon: 'hourglass_top' },
              { key: 'b', label: 'กำลังตรวจ',   value: 3, color: 'info',       icon: 'stethoscope'   },
              { key: 'c', label: 'เสร็จแล้ว',   value: 6, color: 'positive',   icon: 'check_circle'  },
              { key: 'd', label: 'เร่งด่วน',    value: 3, color: 'inprogress', icon: 'fast_forward'  },
            ]}
            tabs={[
              { key: 'all',     label: 'ทั้งหมด',    count: 130 },
              { key: 'waiting', label: 'รอตรวจ',     count: 7   },
              { key: 'progress',label: 'กำลังตรวจ',   count: 3   },
              { key: 'done',    label: 'เสร็จแล้ว',   count: 6   },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          >
            <div style={{ padding: 'var(--dim-space-500)', color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              (พื้นที่เนื้อหา — ใส่ Table หรือ list ของ queue items ที่นี่)
            </div>
          </QueuePageShell>
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Layout shell: Sidebar + Header + SubHeader + SummaryCardsBar + sticky TabUnderline + body + Footer. The page passes title / breadcrumb / summaryCards / tabs and renders the queue table in children.',
        ]}
        dos={[
          'Use as the routed wrapper for OPD / Registration / Treatment queue pages.',
          'Drive `activeTab` from URL or page state so deep-links keep the right tab open.',
        ]}
        donts={[
          "Don't render outside a queue page — the chrome is bespoke for list / queue surfaces.",
          "Don't duplicate Header / Sidebar inside `children` — they\'re already in the shell.",
        ]}
      />
    </Section>
  );
};

const AllergyFormDemo = () => (
  <Section title='AllergyForm' summary='Domain form for drug/material allergies. Thin wrapper around HistoryListForm with an allergy-specific schema.'>
    <Variant label='Default' stack>
      <AllergyForm />
    </Variant>
    <Guidelines
      behavior={[
        'Thin wrapper around `HistoryListForm` with an allergy schema (ชื่อยา / อาการ / ระดับความรุนแรง). Reports validity via `onValidityChange`.',
      ]}
      dos={[
        'Use inside OPD Screening Step 3 and Registration Step 5; wire `onValidityChange` for the step-completion gate.',
      ]}
      donts={[
        "Don't replace with a hand-rolled list — the schema and validators stay in sync with the data layer here.",
      ]}
    />
  </Section>
);

const DiseaseFormDemo = () => (
  <Section title='DiseaseForm' summary='Domain form for past medical conditions. Thin wrapper around HistoryListForm with a disease-specific schema.'>
    <Variant label='Default' stack>
      <DiseaseForm />
    </Variant>
    <Guidelines
      behavior={[
        'Thin wrapper around `HistoryListForm` with a chronic-disease schema. Reports validity via `onValidityChange`.',
      ]}
      dos={[
        'Use inside OPD Screening Step 4; wire `onValidityChange` so the step ✓ updates when entries are valid.',
      ]}
      donts={[
        "Don't use for acute conditions — those belong in the visit Treatment Step 4 diagnosis.",
      ]}
    />
  </Section>
);

const HistoryListFormDemo = () => (
  <Section title='HistoryListForm' summary='Generic schema-driven repeating-history list. Pass a `schema` describing topic, options, defaults, and badges. AllergyForm and DiseaseForm are thin wrappers around this — see those for example schemas.'>
    <Variant label='Shown via AllergyForm wrapper' stack>
      <AllergyForm />
    </Variant>
    <Guidelines
      behavior={[
        'Schema-driven: pass `schema` with topic / options / defaults / badges. Renders a repeating row list with an add-row button.',
      ]}
      dos={[
        'Use via a domain wrapper (AllergyForm / DiseaseForm) so the schema lives next to its data.',
      ]}
      donts={[
        "Don't render HistoryListForm directly in production UI — always wrap with a domain form so the schema travels with its consumer.",
      ]}
    />
  </Section>
);

const VitalsFormDemo = () => (
  <Section title='VitalsForm' summary='Full vitals capture form. Composes VitalCard / PressureCard / BMICard plus HistoryTimeline aside.'>
    <Variant label='Default' stack>
      <VitalsForm />
    </Variant>
    <Guidelines
      behavior={[
        'Composes VitalCard / PressureCard / BMICard in a grid + HistoryTimeline aside; reports validity via `onValidityChange`.',
      ]}
      dos={[
        'Use as Step 1 of OPD Screening; wire `onValidityChange` for the step-completion gate.',
      ]}
      donts={[
        "Don't add non-vital fields here — keep this scoped to BP / HR / RR / Temp / SpO₂ / weight / height.",
      ]}
    />
  </Section>
);

const TreatmentFormShellDemo = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const samplePatient = { hn: '67-00001', name: 'สมชาย ใจดี' };
  const [examForm, setExamForm] = useState({
    examSystem: 'heent',
    examView: 'both',
    bodyMarkers: DEFAULT_BODY_MARKERS,
    nurseExam: DEFAULT_NURSE_EXAM_NOTES,
    doctorExam: DEFAULT_DOCTOR_EXAM_NOTES,
    examAttachments: DEFAULT_EXAM_ATTACHMENTS,
  });
  const stepBodies = [
    <Step1History key='s1' patient={samplePatient} />,
    <Step2Screening key='s2' />,
    <Step3Examination key='s3' form={examForm} setForm={setExamForm} />,
  ];
  return (
    <Section title='TreatmentFormShell' summary='CPOE treatment record shell. Unified card: bilingual StepProgress (framed) + body + sticky footer.'>
      <Variant label='Interactive · click stepper or footer to navigate' stack>
        <div style={{ height: 800, overflow: 'auto', borderRadius: 'var(--dim-radius-300)', border: 'var(--dim-stroke-100) solid var(--border-card-default)' }}>
          <TreatmentFormShell stepIndex={stepIndex} onStepChange={setStepIndex}>
            {stepBodies[stepIndex] ?? stepBodies[0]}
          </TreatmentFormShell>
        </div>
      </Variant>
      <Variant label='Step 3 · ตรวจร่างกาย (Physical Examination)' stack>
        <div style={{ height: 800, overflow: 'auto', borderRadius: 'var(--dim-radius-300)', border: 'var(--dim-stroke-100) solid var(--border-card-default)' }}>
          <TreatmentFormShell stepIndex={2} onStepChange={() => {}}>
            <Step3Examination form={examForm} setForm={setExamForm} />
          </TreatmentFormShell>
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Layout shell for /treat/record: unified card with bilingual StepProgress (framed) + body + sticky footer. Children = active step body.',
        ]}
        dos={[
          'Use as the routed wrapper for the Treatment / CPOE flow. Drive `stepIndex` from page state and pass `getTreatmentCompletedSteps(form, stepIndex)` to make ✓ truthful.',
        ]}
        donts={[
          "Don't render outside CPOE — chrome (bilingual labels, footer copy) is bespoke for the doctor flow.",
        ]}
      />
    </Section>
  );
};

const TreatmentStepsDemo = () => {
  const samplePatient = { hn: '67-00001', name: 'สมชาย ใจดี' };
  const [examForm, setExamForm] = useState({
    examSystem: 'heent',
    examView: 'both',
    bodyMarkers: DEFAULT_BODY_MARKERS,
    nurseExam: DEFAULT_NURSE_EXAM_NOTES,
    doctorExam: DEFAULT_DOCTOR_EXAM_NOTES,
    examAttachments: DEFAULT_EXAM_ATTACHMENTS,
  });
  return (
    <Section title='TreatmentSteps' summary='Per-step form bodies for the treatment record flow (PHCIS-ALL / CPOE).' >
      <Variant label='Step 1 · ประวัติการรักษา (Medical History)' stack>
        <div style={{ width: '100%', maxHeight: 700, overflow: 'auto', borderRadius: 'var(--dim-radius-300)', border: 'var(--dim-stroke-100) solid var(--border-card-default)', background: 'var(--surface-card-100)' }}>
          <Step1History patient={samplePatient} />
        </div>
      </Variant>
      <Variant label='Step 2 · คัดกรองและซักประวัติ (Screening)' stack>
        <div style={{ width: '100%', maxHeight: 700, overflow: 'auto', padding: 'var(--dim-space-600)', borderRadius: 'var(--dim-radius-300)', border: 'var(--dim-stroke-100) solid var(--border-card-default)', background: 'var(--surface-card-100)' }}>
          <Step2Screening />
        </div>
      </Variant>
      <Variant label='Step 3 · ตรวจร่างกาย (Physical Examination)' stack>
        <div style={{ width: '100%', maxHeight: 800, overflow: 'auto', padding: 'var(--dim-space-600)', borderRadius: 'var(--dim-radius-300)', border: 'var(--dim-stroke-100) solid var(--border-card-default)', background: 'var(--surface-card-100)' }}>
          <Step3Examination form={examForm} setForm={setExamForm} />
        </div>
      </Variant>
      <Variant label='7 CPOE steps (bilingual labels)' stack>
        <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
          {TREATMENT_STEPS.map((s) => `${s.title} (${s.subtitle})`).join(' · ')}
        </span>
      </Variant>
      <Guidelines
        behavior={[
          'Each step is controlled via `{ form, setForm }` from TreatmentFormPage; Step 1–2 are read-only, 3–7 are write.',
          'Steps cross-link: Step 4 jumps to Step 3 via `onStepChange`; Step 7 reads diagnosis from Step 4.',
        ]}
        dos={[
          'Use inside TreatmentFormShell with `STEP_RENDERERS[stepIndex]`.',
          'Keep one shared `form` object across all 7 steps; never fork per-step.',
        ]}
        donts={[
          "Don't render steps outside the shell — they need step animation + footer.",
          "Don't manage state inside the step bodies — the page owns `form`.",
        ]}
      />
    </Section>
  );
};

const BodyMarkDemo = () => (
  <Section
    title='BodyMark'
    summary='Figma PHCIS | Medical-examination 217:27084 — pain-marker dot on the body diagram. Six states: Default · Hover · Focus-Empty · Focus-Type (new note, Save when non-empty) · Focus-Re-open (saved note unchanged, Save disabled until edited) · Active (read-only popover 220:27806, max-width 480px).'
  >
    <Variant label='State matrix · 6 states' stack>
      <div
        style={{
          width: '100%',
          padding: 'var(--dim-space-600)',
          borderRadius: 'var(--dim-radius-300)',
          border: 'var(--dim-stroke-100) solid var(--border-card-default)',
          background: 'var(--background-screen-default, #fff)',
          overflowX: 'auto',
        }}
      >
        <BodyMarkStatesPreview />
      </div>
    </Variant>
    <Variant label='Save · re-open saved mark' stack>
      <div
        style={{
          width: '100%',
          maxWidth: 495,
          padding: 'var(--dim-space-600)',
          borderRadius: 'var(--dim-radius-300)',
          border: 'var(--dim-stroke-100) solid var(--border-card-default)',
          background: 'var(--background-screen-default, #fff)',
        }}
      >
        <BodyMarkReeditLogicPreview />
      </div>
    </Variant>
    <Guidelines
      behavior={[
        '6 states: Default · Hover · Focus-Empty · Focus-Type · Focus-Re-open · Active. Save button enables only when note has been edited from its saved value.',
      ]}
      dos={[
        'Use inside BodyDrawingCanvas / BodyDiagramPanel; never render standalone outside an anatomy figure.',
      ]}
      donts={[
        "Don't drop a mark without an associated note flow — empty marks are not persistable.",
      ]}
    />
  </Section>
);

const BodyDiagramPanelDemo = () => {
  const [systemKey, setSystemKey] = useState('heent');
  const [viewKey, setViewKey] = useState('both');
  return (
    <Section title='BodyDiagramPanel' summary='Figma PHCIS-ALL 2431:213971 — system TabCapsule row, view TabBar, dual anatomy figures, pain markers. ปุ่ม "บันทึกบนรูปภาพ" เปิด BodyRecordPopup.'>
      <Variant label='Interactive' stack>
        <div style={{ width: '100%', padding: 'var(--dim-space-400)', borderRadius: 'var(--dim-radius-300)', border: 'var(--dim-stroke-100) solid var(--border-card-default)' }}>
          <BodyDiagramPanel
            systemKey={systemKey}
            viewKey={viewKey}
            markers={DEMO_BODY_MARKERS}
            onSystemChange={setSystemKey}
            onViewChange={setViewKey}
          />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'System TabCapsule + View TabBar + dual anatomy figures + pain markers. ปุ่ม "บันทึกบนรูปภาพ" opens BodyRecordPopup.',
        ]}
        dos={[
          'Use as the anatomy summary card in Treatment Step 3; persist markers via parent state.',
        ]}
        donts={[
          "Don't bypass the popup for editing — read-only diagrams here, editing happens in BodyRecordPopup.",
        ]}
      />
    </Section>
  );
};

const BodyRecordPopupDemo = () => {
  const [open, setOpen] = useState(false);
  const [viewKey, setViewKey] = useState('both');
  const [markers, setMarkers] = useState(DEMO_BODY_MARKERS);
  const [drawings, setDrawings] = useState([]);
  return (
    <Section
      title='BodyRecordPopup'
      summary='Figma PHCIS Medical-examination 75:35675 — Domain wrapper บน DrawingCanvasPopup ที่ resolve title จาก systemKey (HEENT / Heart / Lungs / …). เปิดจาก BodyDiagramPanel หรือขั้นตอนตรวจร่างกายใน /treat/record. onSave callback ส่ง (markers, drawings); drawings tagged ด้วย viewKey เพื่อกัน bleed ข้ามมุมมอง.'
    >
      <Variant label='Open popup (บันทึกร่างกาย)' stack>
        <BrandButton onClick={() => setOpen(true)}>เปิด BodyRecordPopup</BrandButton>
        <BodyRecordPopup
          open={open}
          onClose={() => setOpen(false)}
          onSave={(nextMarkers, nextDrawings) => {
            setMarkers(nextMarkers);
            setDrawings(nextDrawings ?? drawings);
            setOpen(false);
          }}
          systemKey='heent'
          viewKey={viewKey}
          markers={markers}
          onMarkersChange={setMarkers}
          drawings={drawings}
          onDrawingsChange={setDrawings}
          onViewChange={setViewKey}
        />
      </Variant>
      <Guidelines
        behavior={[
          'Domain wrapper around DrawingCanvasPopup — resolves the title from `systemKey` (HEENT / Heart / Lungs / …). Drawings are tagged by `viewKey` so front/back views don\'t bleed.',
          'Save button enables only when canvas reports an edit (mark / draw / note / erase).',
        ]}
        dos={[
          'Use as the canonical editor for body markers + drawings. Open from BodyDiagramPanel\'s "บันทึกบนรูปภาพ" button.',
          'Forward `markers` + `drawings` state from the page so persistence is parent-controlled.',
        ]}
        donts={[
          "Don't use DrawingCanvasPopup directly for examination work — this wrapper is the canonical entry.",
        ]}
      />
    </Section>
  );
};

const DrawingCanvasPopupDemo = () => {
  const [open, setOpen] = useState(false);
  const [viewKey, setViewKey] = useState('both');
  const [markers, setMarkers] = useState(DEMO_BODY_MARKERS);
  const [drawings, setDrawings] = useState([]);
  return (
    <Section
      title='DrawingCanvasPopup'
      summary='Reusable shell — Popup extraLarge (สูงสุด 1440×1024) + BodyDrawingCanvas fillHeight + dirty tracking. ปุ่ม บันทึก enabled เมื่อ canvas รายงาน edit (mark/draw/note/erase) อย่างน้อย 1 รายการ. รองรับ drawings prop (per-tab persistence) นอกเหนือจาก markers; onSave callback ส่ง (markers, drawings). Tools: cursor (เลือก) · markpoint (มาร์คจุด) · pen · eraser · text · circle · square · arrow — คลิกซ้ำที่ tool ที่ active อยู่ = toggle กลับเป็น cursor. Drawings tagged ด้วย viewKey เพื่อแยกตามมุมมอง.'
    >
      <Variant label='Open popup (custom title)' stack>
        <BrandButton onClick={() => setOpen(true)}>เปิด DrawingCanvasPopup</BrandButton>
        <DrawingCanvasPopup
          open={open}
          onClose={() => setOpen(false)}
          onSave={(nextMarkers, nextDrawings) => {
            setMarkers(nextMarkers);
            setDrawings(nextDrawings ?? drawings);
            setOpen(false);
          }}
          title='วาดภาพประกอบ (Generic)'
          subtitle='ตัวอย่าง shell ทั่วไป — domain wrapper ห่อตัวนี้และส่ง title/subtitle ของตัวเอง'
          viewKey={viewKey}
          markers={markers}
          onMarkersChange={setMarkers}
          drawings={drawings}
          onDrawingsChange={setDrawings}
          onViewChange={setViewKey}
        />
      </Variant>
      <Guidelines
        behavior={[
          'Popup extraLarge + BodyDrawingCanvas + dirty tracking. Save enables only after an edit. Tools: cursor · markpoint · pen · eraser · text · circle · square · arrow.',
          'Drawings tagged by `viewKey` to avoid view-bleed (front vs back).',
        ]}
        dos={[
          'Wrap with a domain component (BodyRecordPopup) that supplies title / subtitle from a key.',
          'Wire `onSave(markers, drawings)` to commit changes to parent state.',
        ]}
        donts={[
          "Don't render this generic shell directly in production — domain wrappers carry the correct titles.",
        ]}
      />
    </Section>
  );
};

const ExamSupportListDemo = () => (
  <Section title='ExamSupportList' summary='ข้อมูลประกอบการตรวจร่างกาย sidebar — ActionList + circle icon + success tick.'>
    <Variant label='Default' stack>
      <ExamSupportList />
    </Variant>
    <Guidelines
      behavior={[
        'Sidebar list of exam-support entries (e.g. lab results, prior imaging) with success-tick state.',
      ]}
      dos={[
        'Use as the right rail in Treatment Step 3 / Step 4 to show what supporting data is available.',
      ]}
      donts={[
        "Don't use as a primary nav — that's Sidebar / SideSubMenu.",
      ]}
    />
  </Section>
);

const ExamNotesPanelDemo = () => {
  const [doctorExam, setDoctorExam] = useState(DEFAULT_DOCTOR_EXAM_NOTES);
  const [attachments, setAttachments] = useState(DEFAULT_EXAM_ATTACHMENTS);
  return (
    <Section title='ExamNotesPanel' summary='บันทึกการตรวจ — nurse copy column + physician textareas + DragAndDrop attachments.'>
      <Variant label='Interactive' stack>
        <ExamNotesPanel
          nurseNotes={DEFAULT_NURSE_EXAM_NOTES}
          doctorNotes={doctorExam}
          attachments={attachments}
          onDoctorChange={setDoctorExam}
          onCopyFromNurse={(key) => {
            const v = DEFAULT_NURSE_EXAM_NOTES[key];
            setDoctorExam((d) => ({ ...d, [key]: v === '-' ? '' : v }));
          }}
          onRemoveAttachment={(id) => setAttachments((a) => a.filter((f) => f.id !== id))}
        />
      </Variant>
      <Guidelines
        behavior={[
          'Two-column note panel: read-only nurse column + editable physician textareas + DragAndDrop attachments. `onCopyFromNurse(key)` lifts a nurse note into the doctor column.',
        ]}
        dos={[
          'Use in Treatment Step 3 Examination so the doctor can review nurse pre-screening and add their own observations.',
        ]}
        donts={[
          "Don't allow editing of the nurse column — it's the source-of-truth from upstream OPD Screening.",
        ]}
      />
    </Section>
  );
};

const ServiceDateListDemo = () => {
  const items = useMemo(
    () => findVisitDetailsByHn('67-00001').map((v, i) => ({ id: `${v.date}-${i}`, date: v.date, center: v.center })),
    [],
  );
  const [selected, setSelected] = useState(0);
  return (
    <Section
      title='ServiceDateList'
      summary='Left rail "วันที่รับบริการ" — Figma PHCIS | CPOE 176:38629. ActionList rows, ColorfulBadge (center), chevron reserved on all rows (visible when selected).'
    >
      <Variant label='Interactive · select a visit date' stack>
        <div style={{ display: 'flex', maxWidth: 720, minHeight: 320, borderRadius: 'var(--dim-radius-300)', border: 'var(--dim-stroke-100) solid var(--border-card-default)', overflow: 'hidden' }}>
          <ServiceDateList items={items} selectedIndex={selected} onSelect={setSelected} />
          <div style={{ flex: 1, padding: 'var(--dim-space-600)', color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm)' }}>
            Selected: {items[selected]?.date ?? '—'}
            {items[selected]?.center ? ` · ${items[selected].center}` : ''}
          </div>
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Left-rail ActionList of "วันที่รับบริการ" — selectable rows with date + ColorfulBadge center; chevron reserved on every row (visible when selected).',
        ]}
        dos={[
          'Use as the left rail in Treatment Step 1 history so the doctor can pick a prior visit to inspect.',
        ]}
        donts={[
          "Don't make this rail wider than ~280 px — it's a navigation rail, not the primary content.",
        ]}
      />
    </Section>
  );
};

const FormsLibraryDemo = () => (
  <Section title='FormsLibrary' summary='Grid per Figma FormCard (150:1223) + footer Button Group (162:20070): cover art `public/illustration/form-cover01–05.svg` by category (consent/certificate/request/assessment/document), full-bleed · aspect 227:113 · object-cover. ColorfulBadge (ประเภท); optional ColorfulBadge magenta **version** pill (DS Card `161:920`); StatusBadge “ประเมินแล้ว” เฉพาะแถวที่ประเมินแล้ว — กริดใช้บ่อยไม่มี success badge. Frame default 1px, hover 4px+Brand Drop Bottom/200; pass selected for Figma Selected (4px brand+shadow). Actions: BrandSubdueIcon (visibility) + NeutralSubdue outline+edit (แก้ไข) when open else Brand outline+edit (ประเมิน); section footer NeutralSubdue lg+chevron_right (ดูทั้งหมด) · 32px below grid. Picker for "บันทึกแบบฟอร์มอื่น".'>
    <Variant label='Default' stack>
      <FormsLibrary />
    </Variant>
    <Guidelines
      behavior={[
        'Grid of FormCards keyed by category — cover art from /illustration/form-cover0[1-5].svg. Frame default 1px → Hover 4px + Brand Drop Bottom/200. Selected = 4px brand stroke + shadow.',
      ]}
      dos={[
        'Use as the OPD Screening Step 5 "แบบฟอร์ม" picker; pair with a confirm before attaching a form to the screening.',
      ]}
      donts={[
        "Don't ship a form without cover art — fall back to the category default cover, not a blank slot.",
      ]}
    />
  </Section>
);

/* ── graph: BigCharts + Charts primitives demos ───────────── */

const BigChartsDemo = () => (
  <Section title='BigCharts' summary='Dashboard composite chart cards built on the Charts primitives. Exports: PopulationPyramidCard · OpdTypeLineCard · ResidencePieCard · ServiceCenterMapCard. All four ship with internal sample data and filters.'>
    <Variant label='PopulationPyramidCard' stack><div style={{ width: '100%' }}><PopulationPyramidCard /></div></Variant>
    <Variant label='OpdTypeLineCard' stack><div style={{ width: '100%' }}><OpdTypeLineCard /></div></Variant>
    <Variant label='ResidencePieCard' stack><div style={{ width: '100%' }}><ResidencePieCard /></div></Variant>
    <Variant label='ServiceCenterMapCard' stack><div style={{ width: '100%' }}><ServiceCenterMapCard /></div></Variant>
    <Guidelines
      behavior={[
        'Composite cards that wrap chart primitives with Dashboard chrome (title row + filter + chart). Each card ships internal sample data.',
      ]}
      dos={[
        'Use on the Dashboard layout where bigger insight charts are the primary content.',
        'Pass live data via the underlying primitive props — the card chrome stays the same.',
      ]}
      donts={[
        "Don't embed BigCharts inside narrow card grids — they need ≥ 480 px width to be readable.",
      ]}
    />
  </Section>
);

const ChartsDemo = () => {
  const [activeRow, setActiveRow] = useState(null);
  const [activeMonth, setActiveMonth] = useState(null);
  const [activeSegment, setActiveSegment] = useState(null);
  const [activeSlice, setActiveSlice] = useState(null);
  const PIE_SLICES = DEFAULT_RIGHTS_DONUT.map((s) => ({ ...s, value: s.value }));
  return (
    <Section title='Charts' summary='Chart primitive library — exports: Donut · HBarList · VBars · LineChart · Gauge · Pyramid · PyramidPct · AreaLineChart · Pie · Reveal. All primitives accept data via props and emit click events for interactive highlight.'>
      <Variant label='Donut · centerLabel + segments + click' stack>
        <Donut size={140} thickness={22} centerLabel='117K' centerSub='คน' segments={DEFAULT_VISIT_DONUT} activeIndex={activeSegment} onSegmentClick={(i) => setActiveSegment((c) => c === i ? null : i)} />
      </Variant>
      <Variant label='HBarList · ranked horizontal bars' stack>
        <div style={{ width: '100%', maxWidth: 540 }}>
          <HBarList rows={DEFAULT_TOP10.slice(0, 6)} activeIndex={activeRow} onRowClick={(i) => setActiveRow((c) => c === i ? null : i)} />
        </div>
      </Variant>
      <Variant label='VBars · stacked monthly bars' stack>
        <div style={{ width: '100%' }}>
          <VBars {...DEFAULT_DM_HT_BARS} stacked height={200} activeMonth={activeMonth} onMonthClick={(i) => setActiveMonth((c) => c === i ? null : i)} />
        </div>
      </Variant>
      <Variant label='LineChart · multi-series time series' stack>
        <div style={{ width: '100%' }}>
          <LineChart {...DEFAULT_VISITS_LINE} height={200} activeMonth={activeMonth} onMonthClick={(i) => setActiveMonth((c) => c === i ? null : i)} />
        </div>
      </Variant>
      <Variant label='AreaLineChart · filled multi-series'>
        <div style={{ width: '100%' }}>
          <AreaLineChart {...DEFAULT_VISITS_LINE} height={200} />
        </div>
      </Variant>
      <Variant label='Pyramid · age × gender bar pyramid' stack>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <Pyramid groups={DEFAULT_PYRAMID} maleColor='#6366F1' femaleColor='#EC4899' height={220} />
        </div>
      </Variant>
      <Variant label='PyramidPct · percentage variant' stack>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <PyramidPct groups={DEFAULT_PYRAMID} maleColor='#6366F1' femaleColor='#EC4899' height={220} />
        </div>
      </Variant>
      <Variant label='Pie · clickable slices'>
        <Pie slices={PIE_SLICES} size={200} activeIndex={activeSlice} onSliceClick={(i) => setActiveSlice((c) => c === i ? null : i)} />
      </Variant>
      <Variant label='Gauge · 3 sizes / colours'>
        <Gauge value={59.21} color='#14B8A6' label='ของเป้าหมาย 60%' />
        <Gauge value={71.13} color='#6366F1' label='ของเป้าหมาย 70%' />
        <Gauge value={12.4}  color='#EC4899' label='Diabetic foot' size={130} />
      </Variant>
      <Guidelines
        behavior={[
          'Pure chart primitives — accept `data` props and emit click callbacks (`onRowClick`, `onMonthClick`, `onSegmentClick`). No internal data dependency.',
        ]}
        dos={[
          'Use directly when you need a custom chart card; wrap with BigCharts / DashboardCards for the standard dashboard chrome.',
        ]}
        donts={[
          "Don't hard-code series colours — drive from data + tokens so brand swap retints.",
          "Don't use Pyramid charts for non-symmetric data — they imply a male/female-like split.",
        ]}
      />
    </Section>
  );
};

/* ── extra button demos (added Figma 319:2012 missing variants) ─ */

const DangerButtonDemo = () => (
  <Section title='DangerButton' summary='Figma "Danger Button" (node 2024:3590). Properties: Style (fill · outline · ghost) · State (default · hover · active · focus · disabled) · Size (sm/md/lg) · Show Leading/Trailing icon / Show Label. Tokens alias from `surface/border/text/icon-dangerButton-*` — no hex literals.'>
    <Variant label='Style · Fill' stack>
      <ButtonStateTable Component={DangerButton} variant='fill' leadingIcon='delete' trailingIcon='arrow_forward' />
    </Variant>
    <Variant label='Style · Outline' stack>
      <ButtonStateTable Component={DangerButton} variant='outline' leadingIcon='delete' trailingIcon='arrow_forward' />
    </Variant>
    <Variant label='Style · Ghost' stack>
      <ButtonStateTable Component={DangerButton} variant='ghost' leadingIcon='delete' trailingIcon='arrow_forward' />
    </Variant>
    <Variant label='Show* toggles'>
      <DangerButton leadingIcon='delete' trailingIcon='arrow_forward'>All on</DangerButton>
      <DangerButton leadingIcon='delete' trailingIcon='arrow_forward' showTrailingIcon={false}>Trailing off</DangerButton>
      <DangerButton leadingIcon='delete' trailingIcon='arrow_forward' showLabel={false} aria-label='Icons only' />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'Red palette signals "destructive / irreversible" — pair colour with the verb (Delete / Discard / Sign-out) so colour-blind users still get the warning.',
      ]}
      dos={[
        'Use for destructive commits (delete row, discard draft, sign-out, void order).',
        'ALWAYS pair with a confirm dialog (AlertDialog) before the destructive op actually runs.',
        'Place at the end of the action row (right-most) so users move through safe → destructive direction.',
      ]}
      donts={[
        "Don't use for cancel actions — ยกเลิก is not destructive; use NeutralSubdueButton.",
        "Don't put a Danger button next to a Brand button without separation — users mis-click red / green pairs.",
        "Don't use Fill for repeated bulk delete in tables — use DangerIconButton or DangerSubdueButton (less alarming).",
      ]}
    />
  </Section>
);

const DangerSubdueButtonDemo = () => (
  <Section title='DangerSubdueButton' summary='Figma "Danger Subdue Button" (node 2024:3592). Softer than DangerButton — for less destructive actions. Properties: Style (fill · outline) · State (5) · Size (sm/md/lg) · Show Leading/Trailing icon / Show Label.'>
    <Variant label='Style · Fill' stack>
      <ButtonStateTable Component={DangerSubdueButton} variant='fill' leadingIcon='delete' trailingIcon='arrow_forward' />
    </Variant>
    <Variant label='Style · Outline' stack>
      <ButtonStateTable Component={DangerSubdueButton} variant='outline' leadingIcon='delete' trailingIcon='arrow_forward' />
    </Variant>
    <Variant label='Show* toggles'>
      <DangerSubdueButton leadingIcon='delete' trailingIcon='arrow_forward'>All on</DangerSubdueButton>
      <DangerSubdueButton leadingIcon='delete' trailingIcon='arrow_forward' showLeadingIcon={false}>Leading off</DangerSubdueButton>
      <DangerSubdueButton leadingIcon='delete' showLabel={false} aria-label='Icon only' />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'Softer red palette — reads as "warning / partial-undo" rather than full destructive.',
      ]}
      dos={[
        'Use for reversible destructive actions (remove row from a draft, clear a field, revoke a draft permission).',
        'Use when a destructive row-action repeats often in a table — DangerButton would flood the screen with red.',
        'Pair with a clear confirm only when the action commits to backend.',
      ]}
      donts={[
        "Don't use for irreversible destructive commits — promote to DangerButton (Fill).",
        "Don't pair with another red action in the same row — pick one.",
      ]}
    />
  </Section>
);

const NeutralButtonDemo = () => (
  <Section title='NeutralButton' summary='Figma "Neutral Button" (node 2024:3591). Properties: Style (fill · outline · ghost) · State (5) · Size (sm/md/lg) · Show Leading/Trailing icon / Show Label. neutral/700 fill (dark) with white text — distinct from NeutralSubdueButton.'>
    <Variant label='Style · Fill' stack>
      <ButtonStateTable Component={NeutralButton} variant='fill' leadingIcon='filter_list' trailingIcon='expand_more' />
    </Variant>
    <Variant label='Style · Outline' stack>
      <ButtonStateTable Component={NeutralButton} variant='outline' leadingIcon='filter_list' trailingIcon='expand_more' />
    </Variant>
    <Variant label='Style · Ghost' stack>
      <ButtonStateTable Component={NeutralButton} variant='ghost' leadingIcon='filter_list' trailingIcon='expand_more' />
    </Variant>
    <Variant label='Show* toggles'>
      <NeutralButton leadingIcon='filter_list' trailingIcon='expand_more'>All on</NeutralButton>
      <NeutralButton leadingIcon='filter_list' trailingIcon='expand_more' showTrailingIcon={false}>Trailing off</NeutralButton>
      <NeutralButton leadingIcon='filter_list' showLabel={false} aria-label='Icon only' />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'neutral/700 dark fill reads as a strong but non-brand action — distinct from NeutralSubdueButton (lighter quaternary tier).',
      ]}
      dos={[
        'Use for strong neutral actions where a brand colour would be inappropriate (e.g. system-level controls, export, sign-out from a non-clinical screen).',
        'Use Fill where neutral emphasis is needed; Outline / Ghost on tinted surfaces.',
      ]}
      donts={[
        "Don't use as the clinical primary action — patient-facing flows want brand colour (BrandButton).",
        "Don't mix with BrandButton in the same row as equal-emphasis — pick the dominant tone.",
      ]}
    />
  </Section>
);

const DangerIconButtonDemo = () => (
  <Section title='DangerIconButton' summary='Figma "Danger Icon Button" (node 2024:3701). Properties: Style (fill · outline · ghost) · State (default · hover · active · focus · disabled) · Size (sm/md/lg).'>
    <Variant label='Style · Fill' stack>
      <ButtonIconStateTable Component={DangerIconButton} variant='fill' icon='delete' />
    </Variant>
    <Variant label='Style · Outline' stack>
      <ButtonIconStateTable Component={DangerIconButton} variant='outline' icon='delete' />
    </Variant>
    <Variant label='Style · Ghost' stack>
      <ButtonIconStateTable Component={DangerIconButton} variant='ghost' icon='delete' />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'Icon-only — REQUIRES `aria-label`; the icon is `aria-hidden`.',
        'Red palette reads as destructive — never use as a generic close icon.',
      ]}
      dos={[
        'Use for compact destructive actions in table rows (delete, remove, void).',
        'Pair with a confirm dialog when the row action commits irreversibly.',
        'Use Ghost only when the row already shows the destructive intent (red text label, alert chrome).',
      ]}
      donts={[
        "Don't use for close / dismiss — that's NeutralSubdueIconButton.",
        "Don't ship without an `aria-label`.",
        "Don't put a Danger icon next to a Brand icon in a tight row — separate visually.",
      ]}
    />
  </Section>
);

const DangerSubdueIconButtonDemo = () => (
  <Section title='DangerSubdueIconButton' summary='Figma "Danger Subdue Icon Button" (node 2024:4434). Properties: Style (fill · outline) · State (5) · Size (sm/md/lg). Softer red surface than DangerIconButton.'>
    <Variant label='Style · Fill' stack>
      <ButtonIconStateTable Component={DangerSubdueIconButton} variant='fill' icon='delete' />
    </Variant>
    <Variant label='Style · Outline' stack>
      <ButtonIconStateTable Component={DangerSubdueIconButton} variant='outline' icon='delete' />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'Icon-only — REQUIRES `aria-label`; the icon is `aria-hidden`.',
        'Softer red surface — for reversible row-level destructive actions.',
      ]}
      dos={[
        'Use for "remove from this draft" row actions (clears local state, no backend commit yet).',
        'Use in compact toolbars where DangerIconButton would over-alarm.',
      ]}
      donts={[
        "Don't use for irreversible destructive commits — promote to DangerIconButton.",
        "Don't ship without an `aria-label`.",
      ]}
    />
  </Section>
);

const BrandSubdueIconButtonDemo = () => (
  <Section title='BrandSubdueIconButton' summary='Figma "Brand Subdue Icon Button" (node 2024:4352). Properties: Style (fill · outline) · State (5) · Size (sm/md/lg). Softer brand surface (brand/p100 fill, brand/p200 outline) — distinct from BrandIconButton.'>
    <Variant label='Style · Fill' stack>
      <ButtonIconStateTable Component={BrandSubdueIconButton} variant='fill' icon='add' />
    </Variant>
    <Variant label='Style · Outline' stack>
      <ButtonIconStateTable Component={BrandSubdueIconButton} variant='outline' icon='add' />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'Icon-only — REQUIRES `aria-label`; the icon is `aria-hidden`.',
        'Softer brand surface (p100 fill / p200 outline) — sits below BrandIconButton in visual weight.',
      ]}
      dos={[
        'Use for repeated brand row-actions where BrandIconButton (full brand) would feel too loud.',
        'Use Outline on already brand-tinted surfaces.',
        'Pair with a Tooltip for ambiguous icons.',
      ]}
      donts={[
        "Don't use for destructive actions — use DangerSubdueIconButton.",
        "Don't ship without an `aria-label`.",
        "Don't use as the surface's primary action — promote to BrandIconButton.",
      ]}
    />
  </Section>
);

const BrandCircleIconButtonDemo = () => {
  const [selected, setSelected] = useState(false);
  return (
    <Section title='BrandCircleIconButton' summary='Figma "Brand Circle Icon Button" (node 2103:548). Round (50%) brand icon button. Properties: Style (fill · outline · ghost) · State (default · hover · selected · focus · disabled) · Size (xl 52 · lg 44 · md 40 · sm 36 · xs 32) — X Large is fully round (20px icon); XSmall is 32 with a 14px icon. Tables below mirror the Figma variant matrix — each table is one Style, rows are sizes, columns are states.'>
      <Variant label='Style · Fill' stack>
        <ButtonIconStateTable Component={BrandCircleIconButton} variant='fill' icon='add' stateCols={CIRCLE_ICON_STATE_COLS} sizeRows={CIRCLE_ICON_SIZE_ROWS} />
      </Variant>
      <Variant label='Style · Outline' stack>
        <ButtonIconStateTable Component={BrandCircleIconButton} variant='outline' icon='add' stateCols={CIRCLE_ICON_STATE_COLS} sizeRows={CIRCLE_ICON_SIZE_ROWS} />
      </Variant>
      <Variant label='Style · Ghost' stack>
        <ButtonIconStateTable Component={BrandCircleIconButton} variant='ghost' icon='add' stateCols={CIRCLE_ICON_STATE_COLS} sizeRows={CIRCLE_ICON_SIZE_ROWS} />
      </Variant>
      <Variant label='Interactive · selected toggle' stack>
        <BrandCircleIconButton
          variant='ghost'
          icon='star'
          aria-label='Star'
          selected={selected}
          onClick={() => setSelected((s) => !s)}
        />
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 'var(--type-size-xs)' }}>
          selected = {String(selected)}
        </span>
      </Variant>
      <Guidelines
        behavior={[
          'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
          'Icon-only — REQUIRES `aria-label`; the icon is `aria-hidden`.',
          'Round (50%) shape — reads as a togglable / standalone affordance distinct from square BrandIconButton.',
          'Pass `selected` to lock the highlighted state (toggle filter chip, favorite star, pinned item).',
        ]}
        dos={[
          'Use as a toggle indicator (favorite, pin, filter chip) — the round shape signals "on/off".',
          'Use for prominent single-tap actions in card headers or sticky toolbars.',
          'Pair Selected with a clear off-state colour (Ghost default → Selected) for accessibility.',
        ]}
        donts={[
          "Don't use as a standard primary CTA — use BrandButton (rectangular).",
          "Don't put multiple unrelated round buttons in a row — round shape implies they belong together.",
          "Don't ship without an `aria-label`.",
        ]}
      />
    </Section>
  );
};

const BrandCircleSubdueIconButtonDemo = () => (
  <Section title='BrandCircleSubdueIconButton' summary='Figma "Brand Circle Subdue Icon Button" (node 2103:645). Properties: Style (fill · outline) · State (default · hover · active · focus · disabled) · Size (xl 52 · lg · md · sm · **xs/XSmall 32**) — spans the widest ladder (XSmall → X Large); X Large is fully round. Tables below mirror the Figma variant matrix — each table is one Style, rows are 5 sizes, columns are 5 states.'>
    <Variant label='Style · Fill' stack>
      <ButtonIconStateTable Component={BrandCircleSubdueIconButton} variant='fill' icon='add' sizeRows={CIRCLE_SUBDUE_SIZE_ROWS} />
    </Variant>
    <Variant label='Style · Outline' stack>
      <ButtonIconStateTable Component={BrandCircleSubdueIconButton} variant='outline' icon='add' sizeRows={CIRCLE_SUBDUE_SIZE_ROWS} />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'Icon-only — REQUIRES `aria-label`; the icon is `aria-hidden`.',
        'Unique XSmall (32 px) size — fits in dense list rows / chips.',
        '`active` (with `selected` legacy alias) is the toggle-on state — quaternary surface + 1 px border.',
      ]}
      dos={[
        'Use XSmall for inline row actions (alongside text, in chips, in compact dense lists).',
        'Use as a togglable indicator (active flag, expanded panel).',
        'Pair with a Tooltip for ambiguous icons.',
      ]}
      donts={[
        "Don't use XSmall for the main page action — promote to BrandIconButton lg.",
        "Don't ship without an `aria-label`.",
        "Don't use the `active` chrome to fake a destructive press — `active` is purely a toggle indicator.",
      ]}
    />
  </Section>
);

const DangerCircleIconButtonDemo = () => {
  const [selected, setSelected] = useState(false);
  return (
    <Section title='DangerCircleIconButton' summary='Figma "Danger Circle Icon Button" (node 3853:1177). Round (50%) destructive icon button — the danger (red) sibling of BrandCircleIconButton. Properties: Style (fill · outline · ghost) · State (default · hover · selected · focus · disabled) · Size (xl 52 · lg 44 · md 40 · sm 36 · xs 32) — X Large is fully round (20px icon); XSmall is 32 with a 14px icon. Tables below mirror the Figma variant matrix — each table is one Style, rows are sizes, columns are states.'>
      <Variant label='Style · Fill' stack>
        <ButtonIconStateTable Component={DangerCircleIconButton} variant='fill' icon='delete' stateCols={CIRCLE_ICON_STATE_COLS} sizeRows={CIRCLE_ICON_SIZE_ROWS} />
      </Variant>
      <Variant label='Style · Outline' stack>
        <ButtonIconStateTable Component={DangerCircleIconButton} variant='outline' icon='delete' stateCols={CIRCLE_ICON_STATE_COLS} sizeRows={CIRCLE_ICON_SIZE_ROWS} />
      </Variant>
      <Variant label='Style · Ghost' stack>
        <ButtonIconStateTable Component={DangerCircleIconButton} variant='ghost' icon='delete' stateCols={CIRCLE_ICON_STATE_COLS} sizeRows={CIRCLE_ICON_SIZE_ROWS} />
      </Variant>
      <Variant label='Interactive · selected toggle' stack>
        <DangerCircleIconButton
          variant='ghost'
          icon='delete'
          aria-label='Delete'
          selected={selected}
          onClick={() => setSelected((s) => !s)}
        />
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 'var(--type-size-xs)' }}>
          selected = {String(selected)}
        </span>
      </Variant>
      <Guidelines
        behavior={[
          'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
          'Icon-only — REQUIRES `aria-label`; the icon is `aria-hidden`.',
          'Round (50%) shape + red palette — reads as a standalone destructive affordance.',
          'Selected flips to danger tertiary surface + danger icon regardless of variant.',
        ]}
        dos={[
          'Use for a single destructive tap in a card header or toolbar (delete, remove, discard).',
          'Prefer Ghost / Outline for inline rows; reserve Fill for the primary destructive action.',
          'Always confirm irreversible destructive actions (dialog / undo).',
        ]}
        donts={[
          "Don't use for non-destructive actions — use BrandCircleIconButton.",
          "Don't stack multiple danger buttons in a row.",
          "Don't ship without an `aria-label`.",
        ]}
      />
    </Section>
  );
};

const DangerCircleSubdueIconButtonDemo = () => (
  <Section title='DangerCircleSubdueIconButton' summary='Figma "Danger Circle Subdue Icon Button" (node 3853:1298). Low-emphasis destructive round icon button — the danger (red) sibling of BrandCircleSubdueIconButton. Properties: Style (fill · outline) · State (default · hover · active · focus · disabled) · Size (xl 52 · lg · md · sm · **xs/XSmall 32**) — spans the widest ladder (XSmall → X Large); X Large is fully round. Tables below mirror the Figma variant matrix — each table is one Style, rows are 5 sizes, columns are 5 states.'>
    <Variant label='Style · Fill' stack>
      <ButtonIconStateTable Component={DangerCircleSubdueIconButton} variant='fill' icon='delete' sizeRows={CIRCLE_SUBDUE_SIZE_ROWS} />
    </Variant>
    <Variant label='Style · Outline' stack>
      <ButtonIconStateTable Component={DangerCircleSubdueIconButton} variant='outline' icon='delete' sizeRows={CIRCLE_SUBDUE_SIZE_ROWS} />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'Icon-only — REQUIRES `aria-label`; the icon is `aria-hidden`.',
        'Subdued red-tint surface (Fill) or transparent + red border (Outline) — for lower-emphasis destructive actions.',
        '`active` (with `selected` legacy alias) is the toggle-on state — quaternary surface + 1 px border.',
      ]}
      dos={[
        'Use XSmall for inline destructive row actions (remove attachment, delete list item).',
        'Prefer over DangerCircleIconButton when the destructive action is secondary.',
        'Pair with a Tooltip for ambiguous icons.',
      ]}
      donts={[
        "Don't use XSmall for the main destructive action — promote to DangerCircleIconButton.",
        "Don't ship without an `aria-label`.",
        "Don't use the `active` chrome to fake a press — `active` is a toggle indicator.",
      ]}
    />
  </Section>
);

const BrandRadiusSubdueIconButtonDemo = () => (
  <Section title='BrandRadiusSubdueIconButton' summary='Figma "Brand Radius Subdue Icon Button" (node 3871:4640). Pill-shaped subdue brand button with a leading icon + trailing chevron — a compact icon dropdown trigger (distinct from the circle, icon-only BrandCircleSubdueIconButton). Properties: Style (fill · outline) · State (default · hover · active · focus · disabled) · Size (xl 52 · lg 44 · md 40 · sm 36 · xs 32). Radius is 24 except **xLarge** which is fully round. Tables below mirror the Figma variant matrix — each table is one Style, rows are 5 sizes, columns are 5 states.'>
    <Variant label='Style · Fill' stack>
      <ButtonIconStateTable Component={BrandRadiusSubdueIconButton} variant='fill' icon='image' sizeRows={CIRCLE_SUBDUE_SIZE_ROWS} />
    </Variant>
    <Variant label='Style · Outline' stack>
      <ButtonIconStateTable Component={BrandRadiusSubdueIconButton} variant='outline' icon='image' sizeRows={CIRCLE_SUBDUE_SIZE_ROWS} />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'Icon + chevron — REQUIRES `aria-label`; both glyphs are `aria-hidden`. `aria-haspopup="menu"` is set while the chevron shows.',
        'Pill shape (radius 24, fully round at xLarge) — reads as a compact dropdown / picker trigger.',
        '`active` (with `selected` legacy alias) is the open / pressed state — quaternary surface + 1 px border.',
      ]}
      dos={[
        'Use as a compact icon-value dropdown trigger (e.g. filter, view-mode, layer picker).',
        'Pair `active` with the open state of the menu it controls.',
        'Set `chevron={false}` for a pill icon button without a dropdown affordance.',
      ]}
      donts={[
        "Don't use for a single non-menu action — use BrandButton or a Circle Icon Button.",
        "Don't ship without an `aria-label`.",
        "Don't mix Fill and Outline in the same toolbar row.",
      ]}
    />
  </Section>
);

const PhotoUploadFieldDemo = () => (
  <Section title='PhotoUploadField' summary='Figma "Photo" (node 3420:2565 · Telemed 127:56901). Dashed-border photo / image upload dropzone for the form builder. 2 states: Default (border brand/p200 #C5EDDA) · Hover (border darkens to brand/p600 #08A768, fill holds). Icon (image 20) + centered label. Pass `label` to relabel ("ถ่ายรูป" / "อัปโหลดภาพ"), `onFiles` to wire a hidden file input (add `capture` for direct camera), or `fullWidth` to stretch. Table below mirrors the Figma variant matrix.'>
    <Variant label='State matrix · Default · Hover'>
      <div style={{ display: 'flex', gap: 'var(--dim-space-600, 24px)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)', alignItems: 'center' }}>
          <PhotoUploadField label='ถ่ายรูป' />
          <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>Default</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)', alignItems: 'center' }}>
          <PhotoUploadField label='ถ่ายรูป' hovered />
          <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>Hover</span>
        </div>
      </div>
    </Variant>
    <Variant label='Full-width (Telemed 127:56901 — “อัปโหลดภาพ”)' stack>
      <div style={{ width: 320, maxWidth: '100%' }}>
        <PhotoUploadField label='อัปโหลดภาพ' fullWidth />
      </div>
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'Hover darkens the dashed border to brand green (#08A768); the fill stays #F4FBF8.',
        'Pass `onFiles(files)` to wire a hidden <input type="file"> — the button opens the picker; add `capture="environment"` to open the camera.',
        'Icon + label are `aria-hidden`; the button takes its accessible name from `label` (or `aria-label`).',
      ]}
      dos={[
        'Use inside a form-builder / registration form for a single photo or image upload slot.',
        'Relabel via `label` — "ถ่ายรูป" for camera capture, "อัปโหลดภาพ" for file upload.',
        'Use `fullWidth` when the field should fill a form column; keep the fixed 128×128 for a compact tile.',
      ]}
      donts={[
        "Don't use for multi-file galleries without indicating count — this is a single dropzone tile.",
        "Don't remove the dashed border — it signals an empty upload target.",
        "Don't ship without a meaningful `label` / `aria-label`.",
      ]}
    />
  </Section>
);

/* Float button has no variant axis (single style per Figma) and only 2
   states (default + hover) — so its state matrix is rows = sizes,
   cols = 2 states. Reuses ButtonIconStateTable's table chrome by passing
   a custom sizeRows + stateCols (no variant key needed since the
   component just ignores it via `...rest`). */
const FLOAT_STATE_COLS = [
  { key: 'default', label: 'Default', props: {} },
  { key: 'hover',   label: 'Hover',   props: { hovered: true } },
];
const FLOAT_SIZE_ROWS = [
  { key: 72, label: 'Large (72)'  },
  { key: 56, label: 'Medium (56)' },
  { key: 48, label: 'Small (48)'  },
];

const BrandSubdueFloatButtonDemo = () => (
  <Section title='BrandSubdueFloatButton' summary='Figma "Brand Subdue Float Button" (node 2293:11088). FAB-style circular button with brand-tinted shadow. Single style — default + hover only (no disabled per Figma). Sizes: 48 · 56 · 72. Designed for fixed / floating placement (e.g. bottom-right of a page). Table below mirrors the Figma variant matrix — rows are sizes, columns are 2 states.'>
    <Variant label='3 sizes × 2 states' stack>
      <ButtonIconStateTable
        Component={BrandSubdueFloatButton}
        variant='float'
        icon='add'
        stateCols={FLOAT_STATE_COLS}
        sizeRows={FLOAT_SIZE_ROWS}
      />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation; aria-label REQUIRED (icon-only).',
        'Brand-tinted drop shadow lifts the FAB off the page background — never tweak the shadow per-instance.',
        'Single variant per Figma — only default + hover (no disabled / active state). If you need disabled FAB, hide it from view instead.',
      ]}
      dos={[
        'Use ONE FAB per surface, anchored bottom-right or bottom-center over a scrolling list.',
        'Use for the page\'s single "add" / "create" entry point (e.g. + appointment, + medication on mobile).',
        'Use larger size (72) for touch surfaces; 56 for desktop default; 48 in dense sidebars.',
      ]}
      donts={[
        "Don't ship two FABs on the same surface — pick the most important add action.",
        "Don't use for destructive actions — red on a FAB reads as a wrong-place panic button.",
        "Don't use inline in flow — FAB belongs in a fixed/floating layer.",
      ]}
    />
  </Section>
);

/* DashedAddButton has no size variant (fixed 56px height) and 3 states
   (default · hover · disabled) — but its disabled has two appearances
   (`tokens` and `brandFade`). Render as 2 rows × 3 cols. */
const DASHED_STATE_COLS = [
  { key: 'default',  label: 'Default',  props: {} },
  { key: 'hover',    label: 'Hover',    props: { hovered: true } },
  { key: 'disabled', label: 'Disabled', props: { disabled: true } },
];
const DASHED_APPEARANCE_ROWS = [
  { key: 'tokens',    label: 'disabledAppearance="tokens"',    appearanceProp: 'tokens' },
  { key: 'brandFade', label: 'disabledAppearance="brandFade"', appearanceProp: 'brandFade' },
];

const BrandDashedAddButtonStateTable = () => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th
            style={{
              textAlign: 'left',
              padding: 'var(--dim-space-200) var(--dim-space-300)',
              borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
              fontWeight: 'var(--type-weight-medium)',
              color: 'var(--text-content-default)',
              whiteSpace: 'nowrap',
            }}
          >
            Disabled mode
          </th>
          {DASHED_STATE_COLS.map((c) => (
            <th
              key={c.key}
              style={{
                textAlign: 'left',
                padding: 'var(--dim-space-200) var(--dim-space-300)',
                borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
                fontWeight: 'var(--type-weight-medium)',
                color: 'var(--text-content-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {DASHED_APPEARANCE_ROWS.map((row, i) => (
          <tr key={row.key}>
            <td
              style={{
                padding: 'var(--dim-space-300)',
                borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)',
                color: 'var(--text-content-tertiary)',
                whiteSpace: 'nowrap',
                verticalAlign: 'middle',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              }}
            >
              {row.label}
            </td>
            {DASHED_STATE_COLS.map((col) => (
              <td
                key={col.key}
                style={{
                  padding: 'var(--dim-space-300)',
                  borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)',
                  verticalAlign: 'middle',
                  minWidth: 200,
                }}
              >
                <BrandDashedAddButton
                  type='button'
                  disabledAppearance={row.appearanceProp}
                  {...col.props}
                  onClick={() => {}}
                >
                  เพิ่มรายการ
                </BrandDashedAddButton>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const BrandDashedAddButtonDemo = () => (
  <Section title='BrandDashedAddButton' summary='Figma MIH Design System Foundation node 3360:2711 (HistoryListFormButton). Dashed full-width add control (56px height). Default: brand quaternary surface + dashed tertiary border. Hover: quaternary-hover + tertiary-hover border. Disabled has two appearances — `tokens` (design-system disabledButton.tertiary, used in HistoryListForm / VitalsForm) and `brandFade` (PHCIS Registration 207:16014/16027, brand default colors @ 50% opacity). Table below mirrors the Figma variant matrix — rows are the two disabled appearances, columns are the 3 states.'>
    <Variant label='2 disabled modes × 3 states' stack>
      <BrandDashedAddButtonStateTable />
    </Variant>
    <Guidelines
      behavior={[
        'Real <button> — keyboard focus, Enter / Space activation, aria-disabled honored on programmatic disable.',
        'Fixed 56 px height across all uses — designed to align with HistoryListForm row height.',
        '`disabledAppearance="tokens"` uses disabledButton.tertiary; `"brandFade"` keeps brand colours at 50 % opacity for specific Registration screens.',
      ]}
      dos={[
        'Use as the trailing "add" row inside HistoryListForm-style lists (drug allergy, food allergy, chronic conditions).',
        'Use for "add new row" affordances inside form cards — its full-width dashed border signals the empty insert slot.',
        'Use `borderless` when the row sits inside an already-bordered container that owns the dashed treatment.',
      ]}
      donts={[
        "Don't use as a page primary CTA — its 56 px dashed treatment is for in-list insertion, not page-level commit.",
        "Don't nest in tight grids — the 56 px height needs breathing room.",
        "Don't use disabled to imply pending — wire onClick to a confirm flow instead.",
      ]}
    />
  </Section>
);

/* ── badge ───────────────────────────────────────────────── */

const STATUS_STYLES = ['neutral', 'info', 'success', 'warning', 'error'];
const COLORFUL_STYLES = [
  'grey', 'green', 'blue', 'teal', 'orange', 'yellow', 'red',
  'indigo', 'pink', 'magenta', 'purple',
];

const StatusBadgeDemo = () => (
  <Section title='StatusBadge' summary='Figma 302:73 (Status Badge). 5 styles (neutral · info · success · warning · error) × 2 sizes (small 24h · default 32h) × 2 fills (default filled · outline neutral). Property panel: Style / Size / Fill / Show Icon / Show Dot / Show Text. All visual values come from semantic tokens (`--surface-statusbadge-*`, `--text-statusbadge-*`, `--border-statusbadge-neutral`) — no hex literals.'>
    <Variant label='Size: small (24h) · 5 filled styles'>
      {STATUS_STYLES.map((s) => (
        <StatusBadgeComp key={s} style={s} size='small'>{s.charAt(0).toUpperCase() + s.slice(1)}</StatusBadgeComp>
      ))}
    </Variant>
    <Variant label='Size: default (32h) · 5 filled styles'>
      {STATUS_STYLES.map((s) => (
        <StatusBadgeComp key={s} style={s} size='default'>{s.charAt(0).toUpperCase() + s.slice(1)}</StatusBadgeComp>
      ))}
    </Variant>
    <Variant label='With showDot' stack>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        {STATUS_STYLES.map((s) => (
          <StatusBadgeComp key={s} style={s} size='small' showDot>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </StatusBadgeComp>
        ))}
      </div>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        {STATUS_STYLES.map((s) => (
          <StatusBadgeComp key={s} style={s} size='default' showDot>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </StatusBadgeComp>
        ))}
      </div>
    </Variant>
    <Variant label='With leading icon' stack>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <StatusBadgeComp style='neutral' size='small' icon='label'>Neutral</StatusBadgeComp>
        <StatusBadgeComp style='info'    size='small' icon='info'>Info</StatusBadgeComp>
        <StatusBadgeComp style='success' size='small' icon='check_circle'>Success</StatusBadgeComp>
        <StatusBadgeComp style='warning' size='small' icon='warning'>Warning</StatusBadgeComp>
        <StatusBadgeComp style='error'   size='small' icon='cancel'>Error</StatusBadgeComp>
      </div>
    </Variant>
    <Variant label='Fill: outline (neutral border, no bg)'>
      <StatusBadgeComp size='small'   fill='outline' icon='label'>Outline</StatusBadgeComp>
      <StatusBadgeComp size='default' fill='outline' icon='label'>Outline</StatusBadgeComp>
    </Variant>
    <Variant label='showText=false · dot + icon only'>
      <StatusBadgeComp style='success' size='small'   showDot icon='check_circle' showText={false} />
      <StatusBadgeComp style='warning' size='small'   showDot icon='warning'      showText={false} />
      <StatusBadgeComp style='error'   size='default' showDot icon='cancel'       showText={false}>Hidden</StatusBadgeComp>
    </Variant>
    <Variant label='Combined · dot + icon + text' stack>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <StatusBadgeComp style='success' size='default' showDot icon='task_alt'>เสร็จสิ้น</StatusBadgeComp>
        <StatusBadgeComp style='warning' size='default' showDot icon='schedule'>กำลังดำเนินการ</StatusBadgeComp>
        <StatusBadgeComp style='error'   size='default' showDot icon='error'>ผิดพลาด</StatusBadgeComp>
        <StatusBadgeComp style='info'    size='default' showDot icon='campaign'>ประกาศ</StatusBadgeComp>
      </div>
    </Variant>
    <Guidelines
      behavior={[
        'Visual label only — non-interactive (no aria-button). Convey state, not action.',
        'Colour is decoration — pair semantic colour with text or icon so colour-blind users still get the state.',
      ]}
      dos={[
        'Use to communicate operational status (success / pending / warning / error / info) on cards, rows, header chrome.',
        'Use the small size in dense tables; default size in cards and banner sections.',
        'Pair `showDot` with text for high-glanceability states like "เสร็จสิ้น" / "กำลังดำเนินการ".',
      ]}
      donts={[
        "Don't make it interactive — if the user can click it, use Tag / Button instead.",
        "Don't use to convey time-critical alerts — escalate to Alert / SmallAlert.",
        "Don't stack more than 2 badges per row — readers stop scanning after 2.",
      ]}
    />
  </Section>
);

const HISTORY_BADGE_SAMPLES = [
  { kind: 'severity', value: 'รุนแรง' },
  { kind: 'severity', value: 'ปานกลาง' },
  { kind: 'likelihood', value: 'แน่นอน' },
  { kind: 'likelihood', value: 'น่าจะใช่' },
  { kind: 'treatmentStatus', value: 'อยู่ระหว่างการรักษา' },
  { kind: 'treatmentStatus', value: 'ควบคุมได้' },
];

const ColorfulBadgeDemo = () => (
  <Section title='ColorfulBadge' summary='Figma App 2076:8413. 11 styles × Small(24)/Default(32) × Default/Outline × Primary(*-bold + badge-on)/Secondary(100+700). Outline Grey→border-neutral, Green→border-brand.'>
    <Variant label='Clinical maps (CPOE 245:24395 · 245:24530 · 245:24603)' stack>
      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
        {HISTORY_BADGE_SAMPLES.map(({ kind, value }) => (
          <HistoryPillBadge key={`${kind}-${value}`} kind={kind} value={value} />
        ))}
      </div>
    </Variant>
    <Variant label='Severity dropdown (245:24395)' stack>
      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
        {SEVERITY_SELECT_OPTS_334.map((o) => (
          <ColorfulBadgeComp key={o.value} style={o.colorfulBadgeStyle} size='small' hierarchy='secondary' width='hug' showDot={false} showIcon={false}>
            {o.label}
          </ColorfulBadgeComp>
        ))}
      </div>
    </Variant>
    <Variant label='Likelihood dropdown (245:24530)' stack>
      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
        {LIKELIHOOD_SELECT_OPTS_334.map((o) => (
          <ColorfulBadgeComp key={o.value} style={o.colorfulBadgeStyle} size='small' hierarchy='secondary' width='hug' showDot={false} showIcon={false}>
            {o.label}
          </ColorfulBadgeComp>
        ))}
      </div>
    </Variant>
    <Variant label='Treatment status dropdown (245:24603)' stack>
      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
        {TREATMENT_STATUS_SELECT_OPTS.map((o) => (
          <ColorfulBadgeComp key={o.value} style={o.colorfulBadgeStyle} size='small' hierarchy='secondary' width='hug' showDot={false} showIcon={false}>
            {o.label}
          </ColorfulBadgeComp>
        ))}
      </div>
    </Variant>
    <Variant label='Secondary (light) · small · 11 styles' stack>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        {COLORFUL_STYLES.map((s) => (
          <ColorfulBadgeComp key={s} style={s} size='small' showDot icon='link'>Text</ColorfulBadgeComp>
        ))}
      </div>
    </Variant>
    <Variant label='Primary (bold mid-tone) · small · 11 styles' stack>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        {COLORFUL_STYLES.map((s) => (
          <ColorfulBadgeComp key={s} style={s} size='small' hierarchy='primary' showDot icon='link'>Text</ColorfulBadgeComp>
        ))}
      </div>
    </Variant>
    <Variant label='Primary (bold mid-tone) · default · 11 styles' stack>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        {COLORFUL_STYLES.map((s) => (
          <ColorfulBadgeComp key={s} style={s} size='default' hierarchy='primary' showDot icon='link'>Text</ColorfulBadgeComp>
        ))}
      </div>
    </Variant>
    <Variant label='Outline · small · Grey / Green (Figma) + others' stack>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        {COLORFUL_STYLES.map((s) => (
          <ColorfulBadgeComp key={s} style={s} size='small' fill='outline' showDot icon='link'>Text</ColorfulBadgeComp>
        ))}
      </div>
    </Variant>
    <Variant label='showText=false (dot + icon only)'>
      <ColorfulBadgeComp style='blue'   size='small' showDot icon='link' showText={false} />
      <ColorfulBadgeComp style='green'  size='small' showDot icon='link' showText={false} />
      <ColorfulBadgeComp style='purple' size='small' showDot icon='link' showText={false} />
    </Variant>
    <Variant label='showDot=false (icon + text)'>
      <ColorfulBadgeComp style='teal'   size='small' icon='link'>Linked</ColorfulBadgeComp>
      <ColorfulBadgeComp style='orange' size='small' icon='bolt'>Active</ColorfulBadgeComp>
      <ColorfulBadgeComp style='red'    size='small' icon='priority_high'>Urgent</ColorfulBadgeComp>
    </Variant>
    <Variant label='width="cap" · long label truncates at 224px' stack>
      <ColorfulBadgeComp style='orange' size='small' hierarchy='secondary' width='cap'>
        ชื่อแท็กยาวมากที่ถูกตัดด้วย ellipsis เมื่อเกิน 224px
      </ColorfulBadgeComp>
    </Variant>
    <Guidelines
      behavior={[
        'Visual label — non-interactive. Conveys a domain category (severity / likelihood / treatment status / tag).',
        '11-style palette is for categorical mapping. The semantic meaning of each colour is set by the data dictionary (e.g. magenta = principle DX), not by ColorfulBadge itself.',
        '`width="hug"` for short data-driven labels (severity dropdown); `width="cap"` for free-text labels with ellipsis (treatment history tags).',
      ]}
      dos={[
        'Use to render domain-mapped categories with a stable colour key (e.g. severity, likelihood, ICD type).',
        'Use Secondary hierarchy (light fill) for table cells; Primary (saturated) for emphasis chips.',
        'Use Outline fill on already-tinted card surfaces where Secondary would blend in.',
      ]}
      donts={[
        "Don't use as a status indicator — that's StatusBadge (semantic 5-state).",
        "Don't reassign colour meaning per page — pick one mapping and document it in the data layer.",
        "Don't make it interactive — use FilterTag or SelectableTag for clickable chips.",
      ]}
    />
  </Section>
);

const ColorfulIconBadgeDemo = () => (
  <Section title='ColorfulIconBadge' summary='Figma 2307:11697 (Colorful icon Badge). Circular badge — Figma Feather when name resolves (e.g. calendar · Archive 194:153538), else Material. 11 styles × 3 sizes × 2 badge fills. Material glyph defaults to outline (`iconFill` 0); pass `iconFill={1}` for filled. Reuses ColorfulBadge palette.'>
    <Variant label='Default fill · 3 sizes × 11 styles' stack>
      {['default', 'medium', 'small'].map((sz) => (
        <div key={sz} className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          {COLORFUL_STYLES.map((s) => (
            <ColorfulIconBadgeComp key={`${sz}-${s}`} style={s} size={sz} icon='link' />
          ))}
        </div>
      ))}
    </Variant>
    <Variant label='Outline fill · 3 sizes × 11 styles' stack>
      {['default', 'medium', 'small'].map((sz) => (
        <div key={sz} className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          {COLORFUL_STYLES.map((s) => (
            <ColorfulIconBadgeComp key={`${sz}-${s}`} style={s} size={sz} fill='outline' icon='link' />
          ))}
        </div>
      ))}
    </Variant>
    <Variant label='Real-world icons (sample)'>
      <ColorfulIconBadgeComp style='green'  size='default' icon='check_circle' />
      <ColorfulIconBadgeComp style='blue'   size='default' icon='info' />
      <ColorfulIconBadgeComp style='orange' size='default' icon='warning' />
      <ColorfulIconBadgeComp style='red'    size='default' icon='cancel' />
      <ColorfulIconBadgeComp style='purple' size='default' icon='auto_awesome' />
    </Variant>
    <Guidelines
      behavior={[
        'Visual icon-only label — non-interactive. Pairs with ColorfulBadge\'s palette.',
        'Always supply an `aria-label` if the icon conveys non-decorative meaning (e.g. allergy / VIP flag).',
        '`iconFill={1}` toggles the material symbol from outline to filled — pick once per category and stay consistent.',
      ]}
      dos={[
        'Use for at-a-glance category icons on patient cards (allergy, VIP, chronic).',
        'Pair with the same colour your ColorfulBadge text labels use elsewhere so the colour↔category mapping is consistent.',
      ]}
      donts={[
        "Don't use as a button — switch to BrandIconButton or its family.",
        "Don't combine with text inside the badge — that's ColorfulBadge with `icon` + label.",
      ]}
    />
  </Section>
);

/* ── checkbox ─────────────────────────────────────────────── */

/* Atom state-matrix table — used by CheckboxBox + RadioBox. They share
   the same 6-state matrix: 2 checked-modes (Unchecked / Selected) ×
   3 interaction states (Default / Hover / Disabled). The component is
   stateless so each cell renders the atom with explicit `checked` +
   `hover` + `disabled` flags. */
const ATOM_BOX_STATE_COLS = [
  { key: 'default',  label: 'Default',  props: {} },
  { key: 'hover',    label: 'Hover',    props: { hover: true } },
  { key: 'disabled', label: 'Disabled', props: { disabled: true } },
];
const ATOM_BOX_CHECKED_ROWS = [
  { key: 'unchecked', label: 'Unchecked', checked: false },
  { key: 'checked',   label: 'Selected',  checked: true  },
];

const AtomBoxStateTable = ({ Component, label = 'Box' }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th
            style={{
              textAlign: 'left',
              padding: 'var(--dim-space-200) var(--dim-space-300)',
              borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
              fontWeight: 'var(--type-weight-medium)',
              color: 'var(--text-content-default)',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </th>
          {ATOM_BOX_STATE_COLS.map((c) => (
            <th
              key={c.key}
              style={{
                textAlign: 'left',
                padding: 'var(--dim-space-200) var(--dim-space-300)',
                borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
                fontWeight: 'var(--type-weight-medium)',
                color: 'var(--text-content-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ATOM_BOX_CHECKED_ROWS.map((row, i) => (
          <tr key={row.key}>
            <td
              style={{
                padding: 'var(--dim-space-300)',
                borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)',
                color: 'var(--text-content-tertiary)',
                whiteSpace: 'nowrap',
                verticalAlign: 'middle',
              }}
            >
              {row.label}
            </td>
            {ATOM_BOX_STATE_COLS.map((col) => (
              <td
                key={col.key}
                style={{
                  padding: 'var(--dim-space-300)',
                  borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)',
                  verticalAlign: 'middle',
                }}
              >
                <Component checked={row.checked} {...col.props} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CheckboxBoxDemo = () => (
  <Section title='CheckboxBox' summary='The 16×16 box atom (Figma 306:1099) — 6 states arranged as 2 checked modes (Unchecked / Selected) × 3 interaction states (Default / Hover / Disabled). Stateless building block — parent owns `checked` + `hover`. Used by `Checkbox`, `CheckboxButton`, `CheckboxGroup`.'>
    <Variant label='2 checked modes × 3 states' stack>
      <AtomBoxStateTable Component={CheckboxBox} label='CheckboxBox' />
    </Variant>
    <Guidelines
      behavior={[
        'Pure stateless atom — parent passes `checked`, `hover`, `disabled`. The atom does not own any state.',
        'No `aria-checkbox` semantics here — wrap with `Checkbox` or `CheckboxButton` for interactive use.',
        '16×16 fixed — never re-scale; if you need a different size, compose with the parent control.',
      ]}
      dos={[
        'Use directly when you need a non-form-control visual indicator (e.g. preview chips in design docs).',
        'Compose into custom card patterns where the click target wraps the whole card.',
      ]}
      donts={[
        "Don't render alone in production UI — pair with a label (Checkbox / CheckboxButton).",
        "Don't add state inside — keep it stateless so it composes cleanly inside groups.",
      ]}
    />
  </Section>
);

const CheckboxDemo = () => {
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  return (
    <Section title='Checkbox' summary='Box + Label + optional description. 5 states: default / hover / selected / disabled-unchecked / disabled-checked. Controlled via `checked` + `onChange`, or uncontrolled via `defaultChecked`.'>
      <Variant label='Default + description'>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <CheckboxAtom checked={a} onChange={setA} label='Checkbox label' description='Optional description' />
          <CheckboxAtom checked={b} onChange={setB} label='Checkbox label' description='Optional description' />
        </div>
      </Variant>
      <Variant label='Disabled'>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <CheckboxAtom disabled label='Checkbox label' description='Optional description' />
          <CheckboxAtom disabled checked label='Checkbox label' description='Optional description' />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'role="checkbox" + aria-checked (or aria-checked="mixed" for indeterminate).',
          'Click and Enter / Space toggle; disabled suppresses both.',
          'indeterminate is a visual property — controllers manage the underlying boolean(s) and decide when to flip.',
        ]}
        dos={[
          'Use a parent Checkbox with indeterminate for "select all" + per-row Checkboxes underneath.',
          'Use CheckboxBox for card-style selectable surfaces (filters, addons) — the whole card is the hit target.',
          'Use CheckboxButton when the checkbox sits inline with action text (terms acceptance, dialog confirmations).',
        ]}
        donts={[
          "Don't use a Checkbox group when only one option is valid — use Radio.",
          "Don't use Checkbox for \"applies immediately\" toggles — use Switch.",
          "Don't wire indeterminate to \"partially valid\" form state — it should reflect partial selection, not correctness.",
        ]}
      />
    </Section>
  );
};

const CheckboxButtonDemo = () => {
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  const [c, setC] = useState(false);
  /* Live show/hide controls — let viewers toggle every Figma slot at once. */
  const [showBorder, setShowBorder] = useState(true);
  const [showCircleIcon, setShowCircleIcon] = useState(false);
  const [showIcon, setShowIcon] = useState(false);
  const [showDescription, setShowDescription] = useState(true);
  const [showBadge2, setShowBadge2] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [live, setLive] = useState(false);

  const Toggle = ({ checked, onChange, label }) => (
    <label className='inline-flex items-center cursor-pointer' style={{ gap: 'var(--dim-space-200)' }}>
      <input type='checkbox' checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
        {label}
      </span>
    </label>
  );

  return (
    <Section title='CheckboxButton' summary='Card-like checkbox row (Figma 2254:8344, MIH DS Foundation). Default: 1px neutral border. Hover: 1px brand-tertiary + `--shadow-brand-drop-bottom-200` + checkbox previews `--surface-switch-on-hover`. Selected: 2px brand-default + `--shadow-brand-top-200`. Differs from RadioButton (2860:3497) which uses inset ring + top shadow on both hover and selected. Registration “เหมือนที่อยู่ตามทะเบียนบ้าน” uses `border` + checkbox-only slots.'>
      <Variant label='5 states · click to toggle (notice hover + selected lift)'>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)', maxWidth: 520 }}>
          <CheckboxButtonComp checked={a} onChange={setA} showDescription showBadge={false} showBadge2={false} showCircleIcon={false} showIcon={false} />
          <CheckboxButtonComp checked={b} onChange={setB} showDescription showBadge={false} showBadge2={false} showCircleIcon={false} showIcon={false} />
          <CheckboxButtonComp disabled showDescription showBadge={false} showBadge2={false} showCircleIcon={false} showIcon={false} />
          <CheckboxButtonComp disabled checked showDescription showBadge={false} showBadge2={false} showCircleIcon={false} showIcon={false} />
        </div>
      </Variant>
      <Variant label='5 states · forced (state prop)'>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)', maxWidth: 520 }}>
          <CheckboxButtonComp state='default' label='Default' showCircleIcon={false} showIcon={false} showBadge={false} showBadge2={false} />
          <CheckboxButtonComp state='hover' label='Hover' showCircleIcon={false} showIcon={false} showBadge={false} showBadge2={false} />
          <CheckboxButtonComp state='selected' label='Selected (checked)' showCircleIcon={false} showIcon={false} showBadge={false} showBadge2={false} />
          <CheckboxButtonComp state='disabled-unchecked' label='Disabled' showCircleIcon={false} showIcon={false} showBadge={false} showBadge2={false} />
          <CheckboxButtonComp state='disabled-checked' label='Disabled checked' showCircleIcon={false} showIcon={false} showBadge={false} showBadge2={false} />
        </div>
      </Variant>
      <Variant label='Hover vs Selected — different border weight + shadow direction'>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)', maxWidth: 520 }}>
          <CheckboxButtonComp state='hover' label='Hover' showCircleIcon={false} showIcon={false} showBadge={false} showBadge2={false} />
          <CheckboxButtonComp state='selected' label='Selected' showCircleIcon={false} showIcon={false} showBadge={false} showBadge2={false} />
        </div>
      </Variant>
      <Variant label='Registration address copy — minimal slots'>
        <CheckboxButtonComp
          checked={live}
          onChange={setLive}
          border
          label='เหมือนที่อยู่ตามทะเบียนบ้าน'
          showCircleIcon={false}
          showIcon={false}
          style={{ width: 'fit-content' }}
        />
      </Variant>
      <Variant label='Inline (border=false) · 40-min-h'>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)', maxWidth: 360 }}>
          <CheckboxButtonComp border={false} checked={c} onChange={setC} />
          <CheckboxButtonComp border={false} />
          <CheckboxButtonComp border={false} disabled />
        </div>
      </Variant>
      <Variant label='Per-slot toggles (one row per show* flag)'>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)', maxWidth: 480 }}>
          <CheckboxButtonComp showCircleIcon  showDescription label='showCircleIcon' />
          <CheckboxButtonComp showIcon        showDescription label='showIcon' />
          <CheckboxButtonComp showBadge2      showDescription label='showBadge2' />
          <CheckboxButtonComp showBadge       showDescription label='showBadge' />
          <CheckboxButtonComp showCircleIcon showBadge2 showBadge showDescription label='All slots together' />
        </div>
      </Variant>
      <Variant label='Live composer — toggle each slot independently'>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)', maxWidth: 480 }}>
          <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <Toggle checked={showBorder}      onChange={setShowBorder}      label='border / showBorder' />
            <Toggle checked={showCircleIcon}  onChange={setShowCircleIcon}  label='showCircleIcon' />
            <Toggle checked={showIcon}        onChange={setShowIcon}        label='showIcon' />
            <Toggle checked={showDescription} onChange={setShowDescription} label='showDescription' />
            <Toggle checked={showBadge2}      onChange={setShowBadge2}      label='showBadge2' />
            <Toggle checked={showBadge}       onChange={setShowBadge}       label='showBadge' />
          </div>
          <CheckboxButtonComp
            checked={live}
            onChange={setLive}
            border={showBorder}
            showCircleIcon={showCircleIcon}
            showIcon={showIcon}
            showDescription={showDescription}
            showBadge2={showBadge2}
            showBadge={showBadge}
          />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'role="checkbox" + aria-checked on the inner control; whole card is the click target.',
          'Selected state lifts the card with a 2 px brand border + top shadow — Hover is one shade lighter to differentiate keyboard-focus from confirmed selection.',
          'Slots (border / showIcon / showCircleIcon / showBadge / showBadge2 / showDescription) all default to OFF — opt in only what the design calls for.',
        ]}
        dos={[
          'Use for card-style selectable surfaces (plans, add-ons, "เหมือนที่อยู่ตามทะเบียนบ้าน" mirror).',
          'Use `border` for standalone cards; turn off for inline rows inside an already-bordered container.',
          'Keep the slot set consistent within one group — don\'t show description on one row but hide on the next.',
        ]}
        donts={[
          "Don't use for in-line form rows where Checkbox (atom + label) is enough — CheckboxButton is a heavy card.",
          "Don't combine with RadioButton in the same group — pick multi-select OR single-select, not both.",
          "Don't stretch a CheckboxButton to full content width when it sits next to other selectable rows of different widths.",
        ]}
      />
    </Section>
  );
};

const CheckboxGroupDemo = () => {
  const [val, setVal] = useState(['plan-a']);
  const opts = [
    { value: 'plan-a', label: 'Checkbox label', description: 'Optional description' },
    { value: 'plan-b', label: 'Checkbox label', description: 'Optional description' },
    { value: 'plan-c', label: 'Checkbox label', description: 'Optional description' },
    { value: 'plan-d', label: 'Checkbox label', description: 'Optional description' },
  ];
  return (
    <Section title='CheckboxGroup' summary='Group label (with optional required asterisk) + multiple Checkbox rows + optional error message. 4 states: default / withDescription / error / withDescription-error.'>
      <Variant label='Default'>
        <div style={{ maxWidth: 320 }}>
          <CheckboxGroupComp
            legend='Select an option'
            required
            options={opts.map((o) => ({ value: o.value, label: o.label }))}
            value={val}
            onChange={setVal}
          />
        </div>
      </Variant>
      <Variant label='With description'>
        <div style={{ maxWidth: 320 }}>
          <CheckboxGroupComp
            legend='Subscription plan'
            required
            options={opts}
            value={val}
            onChange={setVal}
            withDescription
          />
        </div>
      </Variant>
      <Variant label='Error'>
        <div style={{ maxWidth: 320 }}>
          <CheckboxGroupComp
            legend='Select an option'
            required
            options={opts.map((o) => ({ value: o.value, label: o.label }))}
            value={[]}
            onChange={() => {}}
            error='Please select a payment method'
          />
        </div>
      </Variant>
      <Variant label='With description + error'>
        <div style={{ maxWidth: 320 }}>
          <CheckboxGroupComp
            legend='Subscription plan'
            required
            options={opts}
            value={[]}
            onChange={() => {}}
            withDescription
            error='Please select a payment method'
          />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Renders a <fieldset> with <legend> — the legend is the group label; required marker (asterisk) attaches to the legend, not each row.',
          'Multi-select; `value` is an array of selected option values. Pass `error` (string) to render the error message below the group.',
        ]}
        dos={[
          'Use when a user can pick zero, one, or many options.',
          'Wire `error` from form-level validation — the message replaces any helper text below the group.',
          'Keep option labels parallel in tone and length so the column reads as a set.',
        ]}
        donts={[
          "Don't use for single-select — use RadioGroup.",
          "Don't omit the legend — assistive tech announces it before each option.",
          "Don't toggle `withDescription` per option — apply at the group level for consistency.",
        ]}
      />
    </Section>
  );
};

/* ── radio (Figma 269:55 + 328:5812 + 2860:3497) ─────────── */

const RadioBoxDemo = () => (
  <Section title='RadioBox' summary='The 16×16 radio atom (Figma 328:5812) — 6 states arranged as 2 checked modes (Unchecked / Selected) × 3 interaction states (Default / Hover / Disabled). Stateless — parent owns `checked` + `hover`. Used by `Radio`, `RadioGroup`, and `RadioButton`. Mirrors the `CheckboxBox` matrix.'>
    <Variant label='2 checked modes × 3 states' stack>
      <AtomBoxStateTable Component={RadioBoxAtom} label='RadioBox' />
    </Variant>
    <Guidelines
      behavior={[
        'Pure stateless atom — parent passes `checked`, `hover`, `disabled`. Mirrors `CheckboxBox` API exactly.',
        '16×16 fixed — never re-scale; if you need a different size, compose with the parent control.',
      ]}
      dos={[
        'Use directly when you need a non-form-control visual indicator.',
        'Compose into custom card patterns where the click target wraps the whole card.',
      ]}
      donts={[
        "Don't render alone in production UI — pair with a label (Radio / RadioButton).",
        "Don't add state inside — keep it stateless so it composes cleanly inside groups.",
      ]}
    />
  </Section>
);

const RadioDemo = () => {
  const [v, setV] = useState('a');
  return (
    <Section title='Radio' summary='Box + label + optional description (Figma 269:55). 5 states: default / hover / selected / disabled-unchecked / disabled-checked. `showDescription` mirrors the Figma property panel.'>
      <Variant label='Default + description'>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <RadioAtom name='radio-demo-1' value='a' checked={v === 'a'} onChange={setV} label='Radio label' description='Optional description' />
          <RadioAtom name='radio-demo-1' value='b' checked={v === 'b'} onChange={setV} label='Radio label' description='Optional description' />
        </div>
      </Variant>
      <Variant label='Without description (showDescription=false)'>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <RadioAtom name='radio-demo-2' label='Radio label' description='Hidden' showDescription={false} />
          <RadioAtom name='radio-demo-2' label='Radio label' description='Hidden' showDescription={false} defaultChecked />
        </div>
      </Variant>
      <Variant label='Disabled'>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <RadioAtom disabled label='Radio label' description='Optional description' />
          <RadioAtom disabled checked label='Radio label' description='Optional description' />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'role="radio" inside a role="radiogroup"; aria-checked on each option.',
          'Arrow keys move between options within a group (Left/Up = previous, Right/Down = next) and immediately select.',
          'Tab enters / leaves the group as a single stop; the selected radio is the tab-stop on re-entry.',
          'Radios in the same group must share the same `name` to coordinate selection.',
        ]}
        dos={[
          'Use Radio when exactly one answer is valid (gender, blood type, payment method).',
          'Always render a default selection unless "none" is semantically meaningful — then use a "ไม่ระบุ" radio.',
          'Use RadioBox for card-style mutually exclusive choices (rights, plan tiers) — same hit-target rules as CheckboxBox.',
        ]}
        donts={[
          "Don't use Radio for boolean toggles — use Switch (immediate) or Checkbox (form-submit).",
          "Don't ship a Radio group with a single option — it's not a choice.",
          "Don't put two unrelated Radio groups inside the same <RadioGroup name> — they will share value state.",
        ]}
      />
    </Section>
  );
};

const RadioGroupDemo = () => {
  const [val, setVal] = useState('plan-a');
  const opts = [
    { value: 'plan-a', label: 'Option A', description: 'Optional description' },
    { value: 'plan-b', label: 'Option B', description: 'Optional description' },
    { value: 'plan-c', label: 'Option C', description: 'Optional description' },
    { value: 'plan-d', label: 'Option D', description: 'Optional description' },
  ];
  return (
    <Section title='RadioGroup' summary='Legend (with optional required asterisk) + multiple Radio rows + optional error message. 4 states from Figma 314:76: default / withDescription / error / withDescription-error. `options` shape: `{ value, label, description?, disabled? }`.'>
      <Variant label='Default'>
        <div style={{ maxWidth: 320 }}>
          <RadioGroupComp
            name='rg-default'
            legend='Select an option'
            required
            options={opts.map((o) => ({ value: o.value, label: o.label }))}
            value={val}
            onChange={setVal}
          />
        </div>
      </Variant>
      <Variant label='WithDescription'>
        <div style={{ maxWidth: 320 }}>
          <RadioGroupComp
            name='rg-desc'
            legend='Subscription plan'
            required
            options={opts}
            value={val}
            onChange={setVal}
            withDescription
          />
        </div>
      </Variant>
      <Variant label='Error'>
        <div style={{ maxWidth: 320 }}>
          <RadioGroupComp
            name='rg-error'
            legend='Select an option'
            required
            options={opts.map((o) => ({ value: o.value, label: o.label }))}
            value={undefined}
            onChange={() => {}}
            error='Please select a payment method'
          />
        </div>
      </Variant>
      <Variant label='WithDescription + Error'>
        <div style={{ maxWidth: 320 }}>
          <RadioGroupComp
            name='rg-desc-error'
            legend='Subscription plan'
            required
            options={opts}
            value={undefined}
            onChange={() => {}}
            withDescription
            error='Please select a payment method'
          />
        </div>
      </Variant>
      <Variant label='Row direction (no legend)'>
        <RadioGroupComp
          name='rg-row'
          options={opts.slice(0, 3).map((o) => ({ value: o.value, label: o.label }))}
          value={val}
          onChange={setVal}
          direction='row'
        />
      </Variant>
      <Guidelines
        behavior={[
          'Renders a <fieldset> with <legend>. Arrow keys move between options and immediately select (radio-group keyboard contract).',
          'Single-select; `value` is the selected option\'s value, not an array.',
          'Pass `error` (string) to render the error message below the group.',
        ]}
        dos={[
          'Use when the user MUST pick exactly one of N options.',
          'Wire `error` from form-level validation; the message replaces helper text below the group.',
          'Use `direction="row"` only for short labels (≤ 3 options) where the labels fit on one line.',
        ]}
        donts={[
          "Don't use for multi-select — use CheckboxGroup.",
          "Don't omit the legend for stacked groups — assistive tech needs it to announce the question.",
          "Don't allow no selection at submit time unless the field is genuinely optional.",
        ]}
      />
    </Section>
  );
};

const RadioButtonDemo = () => {
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  /* Live show/hide controls — mirror the Figma property panel for RadioButton. */
  const [border, setBorder] = useState(true);
  const [showRadio, setShowRadio] = useState(true);
  const [showCircleIcon, setShowCircleIcon] = useState(true);
  const [showIcon, setShowIcon] = useState(true);
  const [showTitle, setShowTitle] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [showBadgeTitle, setShowBadgeTitle] = useState(true);
  const [showPalette, setShowPalette] = useState(false);
  const [live, setLive] = useState(false);

  const Toggle = ({ checked, onChange, label }) => (
    <label className='inline-flex items-center cursor-pointer' style={{ gap: 'var(--dim-space-200)' }}>
      <input type='checkbox' checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
        {label}
      </span>
    </label>
  );

  return (
    <Section title='RadioButton' summary='Card-like radio row (Figma 2860:3497; PHCIS Appointment 4046:18305). Hover + Selected use Brand Drop Shadow Top/200 (`--shadow-brand-top-200`) with a real 2 px brand border (Hover → `--border-brandprimarybutton-tertiary`; Selected → `--border-brandprimarybutton-default`). Selected also shows a trailing `check_circle` (`showTrailingCheck`, default on) and brand-tinted title. Default + disabled use a 1–2 px neutral border with no lift shadow. Every visual slot is independently toggleable via show* props plus `border`.'>
        <Variant label='5 states · default Card layout — click to toggle selected (notice the lift)'>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)', maxWidth: 520 }}>
            <RadioButtonComp checked={a} onChange={() => setA((x) => !x)} showBadgeTitle={false} />
            <RadioButtonComp checked={b} onChange={() => setB((x) => !x)} showBadgeTitle={false} />
            <RadioButtonComp disabled showBadgeTitle={false} />
            <RadioButtonComp disabled checked showBadgeTitle={false} />
          </div>
        </Variant>
        <Variant label='5 states · forced (state prop) — full content. Hover + Selected carry the Brand Drop Shadow Top/200'>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)', maxWidth: 520 }}>
            <RadioButtonComp state='default'             />
            <RadioButtonComp state='hover'               />
            <RadioButtonComp state='selected'            />
            <RadioButtonComp state='disabled-unchecked'  />
            <RadioButtonComp state='disabled-checked'    />
          </div>
        </Variant>
        <Variant label='Hover vs Selected — same lift, different border alias'>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)', maxWidth: 520 }}>
            <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
              <RadioButtonComp state='hover' showBadgeTitle={false} showBadge={false} title='Hover' description='border = brandPrimaryButton/tertiary (#C5EDDA, brand-p200)' />
            </div>
            <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
              <RadioButtonComp state='selected' showBadgeTitle={false} showBadge={false} title='Selected' description='border = brandPrimaryButton/default (#007549, brand-p700)' />
            </div>
          </div>
        </Variant>
        <Variant label='Borderless (border=false) — compact 40-min-h row'>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)', maxWidth: 520 }}>
            <RadioButtonComp border={false} showBadgeTitle={false} showBadge={false} showCircleIcon={false} showIcon={false} />
            <RadioButtonComp border={false} showBadgeTitle={false} showBadge={false} showCircleIcon={false} showIcon={false} defaultChecked state='selected' />
          </div>
        </Variant>
        <Variant label='Live composer — toggle each slot independently'>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)', maxWidth: 560 }}>
            <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <Toggle checked={border}          onChange={setBorder}          label='border' />
              <Toggle checked={showRadio}       onChange={setShowRadio}       label='showRadio' />
              <Toggle checked={showCircleIcon}  onChange={setShowCircleIcon}  label='showCircleIcon' />
              <Toggle checked={showIcon}        onChange={setShowIcon}        label='showIcon' />
              <Toggle checked={showTitle}       onChange={setShowTitle}       label='showTitle' />
              <Toggle checked={showBadge}       onChange={setShowBadge}       label='showBadge' />
              <Toggle checked={showDescription} onChange={setShowDescription} label='showDescription' />
              <Toggle checked={showBadgeTitle}  onChange={setShowBadgeTitle}  label='showBadgeTitle' />
              <Toggle checked={showPalette}     onChange={setShowPalette}     label='showPalette' />
            </div>
            <RadioButtonComp
              checked={live}
              onChange={() => setLive((x) => !x)}
              border={border}
              showRadio={showRadio}
              showCircleIcon={showCircleIcon}
              showIcon={showIcon}
              showTitle={showTitle}
              showBadge={showBadge}
              showDescription={showDescription}
              showBadgeTitle={showBadgeTitle}
              showPalette={showPalette}
            />
          </div>
        </Variant>
        <Guidelines
          behavior={[
            'role="radio" inside a role="radiogroup"; whole card is the click target.',
            'Hover + Selected both lift with `--shadow-brand-top-200`; Selected uses 2 px brand-default border, Hover uses 2 px brand-tertiary — keeps keyboard focus visually distinct from confirmed selection.',
            'Stroke is a real CSS border (not transparent + inset shadow) — prevents the white-seam bug on browsers that anti-alias inset shadows differently.',
          ]}
          dos={[
            'Use for card-style single-select surfaces (appointment mode "นัดหมาย / ไม่นัดหมาย", treatment certificate "รับ / ไม่รับ").',
            'Use `border` for standalone surface cards; turn off when the row sits inside an already-bordered container.',
            'Keep the slot set consistent within one group — all rows show the same combo of icon / title / description / badge.',
          ]}
          donts={[
            "Don't combine with CheckboxButton in the same group — pick single-select OR multi-select.",
            "Don't render RadioButton alone — wrap in a RadioGroup or pair with a controlled `checked` from a single-select parent.",
            "Don't use for in-line form rows — that's `Radio` (atom + label).",
          ]}
        />
    </Section>
  );
};

/* ── forms (Input Fields per Figma 263:7252) ─────────────── */

/* ── Form-field state-matrix table ──────────────────────────
   Matches the BrandButton table layout but adapted for 5-state form
   inputs (default · hover · filled · error · disabled). Each input
   forces its visual state via the `state` prop on the underlying
   _inputBox resolveBox — the cell renders without needing real focus.

   `filledProps` is merged into the Filled column so callers can supply
   the right shape for their input (defaultValue / value tuple / etc).   */
const FIELD_STATE_COLS = [
  { key: 'default',  label: 'Default',  props: {} },
  { key: 'hover',    label: 'Hover',    props: { state: 'hover' } },
  { key: 'filled',   label: 'Filled',   props: { state: 'filled' } },
  { key: 'error',    label: 'Error',    props: { error: 'Please enter a valid value' } },
  { key: 'disabled', label: 'Disabled', props: { disabled: true } },
];

const FieldStateTable = ({
  Component,
  sizes,                                  /* [{ key, label }, ...] or undefined → single "Default size" row */
  label = 'Label',
  helperText = 'Helper text',
  leadingIcon,
  filledProps = { defaultValue: 'Value' },
  cellMinWidth = 240,
  extraProps = {},
}) => {
  const rows = sizes || [{ key: undefined, label: 'Default size' }];
  return (
    <div
      className='w-full overflow-x-auto'
      style={{
        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
        borderRadius: 'var(--dim-radius-200)',
        background: 'var(--surface-card-100, #FFFFFF)',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          color: 'var(--text-content-secondary)',
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: 'left',
                padding: 'var(--dim-space-200) var(--dim-space-300)',
                borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
                fontWeight: 'var(--type-weight-medium)',
                color: 'var(--text-content-default)',
                whiteSpace: 'nowrap',
              }}
            >
              Size
            </th>
            {FIELD_STATE_COLS.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: 'left',
                  padding: 'var(--dim-space-200) var(--dim-space-300)',
                  borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
                  fontWeight: 'var(--type-weight-medium)',
                  color: 'var(--text-content-secondary)',
                  whiteSpace: 'nowrap',
                  minWidth: cellMinWidth,
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row.key)}>
              <td
                style={{
                  padding: 'var(--dim-space-300)',
                  borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)',
                  color: 'var(--text-content-tertiary)',
                  whiteSpace: 'nowrap',
                  verticalAlign: 'top',
                }}
              >
                {row.label}
              </td>
              {FIELD_STATE_COLS.map((col) => {
                const sizeProp = row.key ? { size: row.key } : {};
                const extra = col.key === 'filled' ? filledProps : {};
                return (
                  <td
                    key={col.key}
                    style={{
                      padding: 'var(--dim-space-300)',
                      borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)',
                      verticalAlign: 'top',
                      minWidth: cellMinWidth,
                    }}
                  >
                    <Component
                      label={label}
                      helperText={helperText}
                      leadingIcon={leadingIcon}
                      {...sizeProp}
                      {...extraProps}
                      {...col.props}
                      {...extra}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ── Search state-matrix table ──────────────────────────
   Mirrors FieldStateTable for the two Search variants in the DS:
     SecondarySearch — 5 states (default · hover · focus · typing · filled)
     PrimarySearch   — 5 states (default · hover · focus · typing · filled)
                        per Figma 2056:4246
   Each cell forces its state via the `state` prop on the underlying
   search component, so the same Figma variant matrix is reproduced
   side-by-side in the preview.                                       */
const SECONDARY_SEARCH_STATE_COLS = [
  { key: 'default', label: 'Default', props: {} },
  { key: 'hover',   label: 'Hover',   props: { state: 'hover' } },
  { key: 'focus',   label: 'Focus',   props: { state: 'focus' } },
  { key: 'typing',  label: 'Typing',  props: { state: 'typing' } },
  { key: 'filled',  label: 'Filled',  props: { state: 'filled' } },
];
const PRIMARY_SEARCH_STATE_COLS = [
  { key: 'default', label: 'Default', props: {} },
  { key: 'hover',   label: 'Hover',   props: { state: 'hover' } },
  { key: 'focus',   label: 'Focus',   props: { state: 'focus' } },
  { key: 'typing',  label: 'Typing',  props: { state: 'typing' } },
  { key: 'filled',  label: 'Filled',  props: { state: 'filled' } },
];
/* Back-compat default — callers that don't pass `states` get the
   5-column SecondarySearch matrix (same states as PrimarySearch). */
const SEARCH_STATE_COLS = SECONDARY_SEARCH_STATE_COLS;

const SearchStateTable = ({
  Component,
  sizes,                                  /* [{ key, label }, ...] or undefined → single row */
  states = SEARCH_STATE_COLS,             /* state column set — pass PRIMARY_SEARCH_STATE_COLS for 5-state PrimarySearch */
  filledProps = { defaultValue: 'Search query' },
  cellMinWidth = 340,
  extraProps = {},
}) => {
  const rows = sizes || [{ key: undefined, label: 'Default' }];
  return (
    <div
      className='w-full overflow-x-auto'
      style={{
        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
        borderRadius: 'var(--dim-radius-200)',
        background: 'var(--surface-card-100, #FFFFFF)',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          color: 'var(--text-content-secondary)',
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: 'left',
                padding: 'var(--dim-space-200) var(--dim-space-300)',
                borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
                fontWeight: 'var(--type-weight-medium)',
                color: 'var(--text-content-default)',
                whiteSpace: 'nowrap',
              }}
            >
              Size
            </th>
            {states.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: 'left',
                  padding: 'var(--dim-space-200) var(--dim-space-300)',
                  borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
                  fontWeight: 'var(--type-weight-medium)',
                  color: 'var(--text-content-secondary)',
                  whiteSpace: 'nowrap',
                  minWidth: cellMinWidth,
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row.key)}>
              <td
                style={{
                  padding: 'var(--dim-space-300)',
                  borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)',
                  color: 'var(--text-content-tertiary)',
                  whiteSpace: 'nowrap',
                  verticalAlign: 'top',
                }}
              >
                {row.label}
              </td>
              {states.map((col) => {
                const sizeProp = row.key ? { size: row.key } : {};
                const extra = col.key === 'filled' ? filledProps : {};
                return (
                  <td
                    key={col.key}
                    style={{
                      padding: 'var(--dim-space-300)',
                      borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)',
                      verticalAlign: 'top',
                      minWidth: cellMinWidth,
                    }}
                  >
                    <Component
                      {...sizeProp}
                      {...extraProps}
                      {...col.props}
                      {...extra}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const InputFieldDemo = () => (
  <Section title='InputField' summary='Single-line input (Figma 267:50). Label + box + helper. Sizes lg/md × 5 states (default · hover · filled · error · disabled). State auto-resolves from focus + value + error/disabled, or pass `state` to force. Tokens alias from design.md and retint with [data-brand]. Tables below mirror the Figma variant matrix — rows are sizes, columns are states.'>
    <Variant label='State matrix · 2 sizes × 5 states' stack>
      <FieldStateTable
        Component={InputFieldComp}
        sizes={[
          { key: 'lg', label: 'Large (44)'  },
          { key: 'md', label: 'Medium (36)' },
        ]}
        leadingIcon='calendar_today'
      />
    </Variant>
    <Guidelines
      behavior={[
        'Native <input> wrapped in chrome — state auto-resolves from focus + value + error/disabled; pass `state` to force a visual.',
        'Chrome (border / focus ring / shadow) lives on the wrapper — the inner <input> is intentionally chrome-free (see CLAUDE.md `--mih-*-input` rule).',
        '`aria-invalid` flips on error; `aria-disabled` honored on programmatic disable.',
      ]}
      dos={[
        'Pair with a `Field` label (see Fields demo) — never ship a bare input without a visible / aria label.',
        'Use Large (44) inside cards and form sections; Medium (36) in inline / dense rows.',
        'Wire `error` from form-level validation; the helper text slot doubles as the error message.',
      ]}
      donts={[
        "Don't apply border / outline / box-shadow on the inner <input> — chrome lives on the wrapper.",
        "Don't pre-fill with placeholder text inside the value — that breaks the empty / filled state resolution.",
        "Don't omit the label for narrow inputs — the asterisk + label is the only required-field signal.",
      ]}
    />
  </Section>
);

const VoiceInputFieldDemo = () => (
  <Section title='VoiceInputField' summary='Input with trailing mic button (Figma 3026:23094). Click the mic to dictate — uses native SpeechRecognition where available (Chrome/Edge); otherwise fires onMicClick. 5 states (default · hover · filled · error · disabled). Tables below mirror the Figma variant matrix — rows are sizes, columns are states.'>
    <Variant label='State matrix · 5 states' stack>
      <FieldStateTable
        Component={VoiceInputFieldComp}
        label='Voice input'
        helperText='Click the mic to dictate (Chrome/Edge supports SpeechRecognition).'
      />
    </Variant>
    <Guidelines
      behavior={[
        'Native <input> + trailing mic button. Mic uses Web SpeechRecognition (Chrome/Edge/Safari) — requires a SECURE context (HTTPS or localhost).',
        'Microphone permission is requested via `getUserMedia` before recognition starts so mobile browsers don\'t swallow the SR prompt.',
        'Falls back to `onMicClick` callback if SpeechRecognition is unavailable.',
      ]}
      dos={[
        'Use for short single-line clinician fields where dictation saves time (HN search, ICD lookup query).',
        'Wire `onMicClick` for environments without SpeechRecognition so the mic button still does something.',
        'Test over HTTPS — mic over plain HTTP / LAN silently fails.',
      ]}
      donts={[
        "Don't use over plain HTTP for mobile testing — mic is blocked; use a HTTPS tunnel.",
        "Don't use for long multi-sentence dictation — switch to `VoiceTextarea` (multiline) or `SuggestibleTextarea voice`.",
        "Don't assume SpeechRecognition is available — feature-detect via `isSpeechRecognitionAvailable()`.",
      ]}
    />
  </Section>
);

const InputFieldSlashDemo = () => (
  <Section title='InputFieldSlash' summary='Two inputs separated by a literal `/` (Figma 2496:5327). Used for paired values like numerator/denominator. 5 states (default · hover · filled · error · disabled). Tables below mirror the Figma variant matrix — rows are sizes, columns are states.'>
    <Variant label='State matrix · 2 sizes × 5 states' stack>
      <FieldStateTable
        Component={InputFieldSlashComp}
        sizes={[
          { key: 'lg', label: 'Large (40)' },
          { key: 'sm', label: 'Small (36)' },
        ]}
        label='ความดันโลหิต (Systolic / Diastolic)'
        helperText='หน่วย mmHg'
        leadingIcon='calendar_today'
        filledProps={{ value: ['120', '80'] }}
        cellMinWidth={300}
      />
    </Variant>
    <Guidelines
      behavior={[
        'Two native <input>s separated by a literal `/` glyph — `value` is a tuple `[a, b]`.',
        'Both inputs share one label, helper, error state, and focus chrome — error tints both halves.',
      ]}
      dos={[
        'Use for clinical paired values: BP Systolic / Diastolic, score / max, ratio numerator / denominator.',
        'Validate both halves at the field level; either-half-empty should flag the whole control.',
      ]}
      donts={[
        "Don't use for unrelated values that happen to be next to each other — use two separate `InputField`s.",
        "Don't use the slash to mean alternation (OR) — that's a different domain pattern; use a Select instead.",
      ]}
    />
  </Section>
);

const InputFieldRangeDemo = () => (
  <Section title='InputFieldRange' summary='Two inputs separated by a literal `-` (Figma 2496:5498). Aliases InputFieldSlash with separator="-". 5 states. Tables below mirror the Figma variant matrix — rows are sizes, columns are states.'>
    <Variant label='State matrix · 2 sizes × 5 states' stack>
      <FieldStateTable
        Component={InputFieldRangeComp}
        sizes={[
          { key: 'lg', label: 'Large (40)' },
          { key: 'sm', label: 'Small (36)' },
        ]}
        label='ช่วงน้ำหนัก (kg)'
        helperText='ตัวเลขเท่านั้น'
        leadingIcon='calendar_today'
        filledProps={{ value: ['40', '120'] }}
        cellMinWidth={300}
      />
    </Variant>
    <Guidelines
      behavior={[
        'Two native <input>s separated by a literal `-` glyph — `value` is a tuple `[min, max]`. Aliases InputFieldSlash with separator="-".',
        'Both halves share one label, helper, error state, and focus chrome.',
      ]}
      dos={[
        'Use for filter ranges (age range, weight range, date range numeric halves) and clinical normal-range entry.',
        'Validate that min ≤ max at the field level and surface as `error` text.',
      ]}
      donts={[
        "Don't use for non-numeric ranges (e.g. text ranges) — use two separate InputFields with labels.",
        "Don't omit the unit in the label or helper — the dash separator gives no clue what unit applies.",
      ]}
    />
  </Section>
);

const VoiceTextareaDemo = () => (
  <Section title='VoiceTextarea' summary={`Multiline input with a bottom toolbar holding a language tag + brand mic button (Figma 3280:3970). Default outer height ${VOICE_TEXTAREA_HEIGHT + VOICE_TEXTAREA_HEIGHT_EXTRA}px (--dim-size-2100); tall variant ${VOICE_TEXTAREA_HEIGHT_TALL + VOICE_TEXTAREA_HEIGHT_EXTRA}px (--dim-size-2200) for body-mark editor. Type or click the mic to dictate. 5 states (default · hover · filled · error · disabled) inherited from the shared resolveBox. Tables below mirror the Figma variant matrix.`}>
    <Variant label='State matrix · 5 states' stack>
      <FieldStateTable
        Component={VoiceTextareaComp}
        label='Label'
        helperText='Helper text'
        filledProps={{ defaultValue: 'พิมพ์อะไรไว้แล้ว — ข้อความตัวอย่าง' }}
        cellMinWidth={300}
      />
    </Variant>
    <Guidelines
      behavior={[
        'Low-level multiline + mic primitive. Web SpeechRecognition + mic permission via getUserMedia — requires HTTPS / localhost.',
        `Default box height ${VOICE_TEXTAREA_HEIGHT + VOICE_TEXTAREA_HEIGHT_EXTRA}px (min ${VOICE_TEXTAREA_MIN_HEIGHT + VOICE_TEXTAREA_HEIGHT_EXTRA}px). Pass height={VOICE_TEXTAREA_HEIGHT_TALL} for Figma tall / body-mark variant (effective ${VOICE_TEXTAREA_HEIGHT_TALL + VOICE_TEXTAREA_HEIGHT_EXTRA}px).`,
        'Toolbar at bottom holds the language tag + brand mic button.',
      ]}
      dos={[
        'Use ONLY inside design-system / preview surfaces where you want the bare voice textarea (no suggestion popover).',
      ]}
      donts={[
        "PROJECT RULE: Don't use bare `VoiceTextarea` in clinician fields — wrap in `SuggestibleTextarea voice` with a non-empty `suggestions` array + `minChars`. Previous incident: a clinician field shipped without suggestions and was unusable on a slow connection (memory: feedback_voice_textarea_suggestions).",
        "Don't ship over plain HTTP — mic is blocked.",
      ]}
    />
  </Section>
);

const TextareaDemo = () => (
  <Section title='Textarea' summary='Multiline input (Figma 268:26). 5 states (default · hover · filled · error · disabled); min-height 96px. Vertical resize handle by default. Tables below mirror the Figma variant matrix.'>
    <Variant label='State matrix · 5 states' stack>
      <FieldStateTable
        Component={TextareaComp}
        label='Notes'
        helperText='พิมพ์บันทึกได้ที่นี่'
        filledProps={{ defaultValue: 'Some text already typed in the textarea…' }}
        cellMinWidth={300}
      />
    </Variant>
    <Guidelines
      behavior={[
        'Native <textarea> wrapped in chrome — same state-resolution model as InputField. Min-height 96 px.',
        'Vertical resize handle enabled by default; chrome lives on the wrapper.',
      ]}
      dos={[
        'Use for short free-form notes that don\'t need dictation or suggestions.',
        'Pair with a `Field` label + helper text.',
      ]}
      donts={[
        "Don't use for clinician dictation fields — use `SuggestibleTextarea voice` instead so suggestions are always available.",
        "Don't apply border / outline / box-shadow on the inner <textarea> — chrome lives on the wrapper.",
      ]}
    />
  </Section>
);

const SuggestibleTextareaDemo = () => {
  const [cc, setCC]             = useState('');
  const [pi, setPI]             = useState('');
  const [pe, setPE]             = useState('');
  const [duration, setDuration] = useState('');
  const setVal = (setter) => (e) => setter(e?.target?.value ?? '');
  return (
    <Section
      title='SuggestibleTextarea'
      summary={
        'Multiline input with a portalled autocomplete popover (Figma PHCIS · OPD 162:24221 + PHCIS-ALL 3185:144422). '
        + 'Type ≥ `minChars` characters and the popover surfaces matching phrases ranked by substring match. '
        + 'Position: the popover anchors **4 px below the last typed glyph row** — not the textarea bottom — so it stays close '
        + "to the caret as the textarea grows. The hook subtracts the textarea's bottom padding so the gap is visually tight on "
        + 'every line. Hover a row to highlight the matched substring in brand-p600 and click (or press the row\'s `add_circle` icon) '
        + 'to replace the entire value. `voice` swaps the inner field for VoiceTextarea. Used in: OPD Screening (อาการ / ระยะเวลา / '
        + 'ประวัติปัจจุบัน), TreatmentSteps Step 3 doctor notes (cc / pi / pe / duration), Step 4 doctor record (cc / pi).'
      }
    >
      <Variant label='อาการ (Chief Complaint) · minChars 3 — type 3+ Thai chars (e.g. ปวด, ไข้, ไอ) to see the popover' stack>
        <SuggestibleTextareaComp
          value={cc}
          onChange={setVal(setCC)}
          rows={3}
          suggestions={CHIEF_COMPLAINT_SUGGESTIONS}
          minChars={3}
          popoverAriaLabel='คำแนะนำอาการ'
          placeholder='เช่น ปวดหลังช่วงเอวมา 1 สัปดาห์'
        />
      </Variant>
      <Variant label='ระยะเวลาที่มีอาการ · minChars 1 — durations often lead with a single digit' stack>
        <SuggestibleTextareaComp
          value={duration}
          onChange={setVal(setDuration)}
          rows={2}
          suggestions={DURATION_SUGGESTIONS}
          minChars={1}
          popoverAriaLabel='คำแนะนำระยะเวลา'
          placeholder='เช่น 1 วัน, 2 สัปดาห์, 1 เดือน'
        />
      </Variant>
      <Variant label='ประวัติปัจจุบัน (Present Illness) · minChars 3' stack>
        <SuggestibleTextareaComp
          value={pi}
          onChange={setVal(setPI)}
          rows={4}
          suggestions={PRESENT_ILLNESS_SUGGESTIONS}
          minChars={3}
          popoverAriaLabel='คำแนะนำประวัติปัจจุบัน'
          placeholder='เช่น ผู้ป่วยมีอาการปวดหลังช่วงเอวมาประมาณ 1 สัปดาห์…'
        />
      </Variant>
      <Variant label='ตรวจร่างกาย (Physical Examination) · minChars 3' stack>
        <SuggestibleTextareaComp
          value={pe}
          onChange={setVal(setPE)}
          rows={6}
          suggestions={PHYSICAL_EXAM_SUGGESTIONS}
          minChars={3}
          popoverAriaLabel='คำแนะนำผลตรวจร่างกาย'
          placeholder='เช่น ผู้ป่วยรู้สึกตัวดี ฟังปอด: vesicular breath sound…'
        />
      </Variant>
      <Guidelines
        behavior={[
          'Multiline + portalled suggestions popover anchored 4 px below the last typed glyph row (caret-tracking, not textarea-bottom).',
          '`voice` prop swaps the inner field for VoiceTextarea (mic + language tag). `minChars` controls popover trigger (per Figma data: 1 for short durations, 3 for free-text).',
          'Clicking a suggestion row replaces the ENTIRE value — not appends — so the popover is for full-phrase replacement, not autocomplete.',
        ]}
        dos={[
          'PROJECT RULE: ALWAYS pass a non-empty `suggestions` array + `minChars` for clinician fields — this is the canonical voice-textarea pattern.',
          'Tune `minChars` to the field: short-burst fields (durations) → 1; free-text clinical notes → 3.',
          'Use `voice` for clinician-typed fields where dictation saves time.',
        ]}
        donts={[
          "Don't ship with an empty `suggestions` array — the popover never appears and the mic alone is useless (memory: feedback_voice_textarea_suggestions).",
          "Don't expect partial substring autocomplete — the popover replaces the whole value.",
          "Don't use this for forms that the patient fills (e.g. consent forms) — it's a clinician-typing primitive.",
        ]}
      />
    </Section>
  );
};

/* ── form-builder ────────────────────────────────────────── */

/* ── Generic helper: small state-matrix table for form-builder chips ── */
const FormBuilderMatrixTable = ({ title, cols, rows, render, cellMinWidth = 220 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>{title}</th>
          {cols.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.key}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{row.label}</td>
            {cols.map((col) => (
              <td key={col.key} style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'top', minWidth: cellMinWidth }}>
                {render(col, row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ── Switch state-matrix table — 2 checked × 3 states ── */
const SWITCH_STATE_COLS = [
  { key: 'default',  label: 'Default',  state: 'default' },
  { key: 'hover',    label: 'Hover',    state: 'hover' },
  { key: 'disabled', label: 'Disabled', state: 'disabled' },
];

const SWITCH_CHECKED_ROWS = [
  { key: 'off', label: 'Checked · False', checked: false },
  { key: 'on',  label: 'Checked · True',  checked: true  },
];

const SwitchStateTable = ({ cellMinWidth = 120 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>Checked</th>
          {SWITCH_STATE_COLS.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {SWITCH_CHECKED_ROWS.map((row, i) => (
          <tr key={row.key}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{row.label}</td>
            {SWITCH_STATE_COLS.map((col) => (
              <td key={col.key} style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
                <Switch checked={row.checked} state={col.state} aria-label={`${row.label} ${col.label}`} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SwitchDemo = () => {
  const [on, setOn] = useState(false);
  return (
    <Section title='Switch' summary='Binary toggle (Figma 368:31). 2 checked values (false / true) × 3 states (default · hover · disabled). 32×18 track with a 14×14 white knob that slides on toggle. Pass `state` to force the visual state for design-system docs; in real use it auto-resolves from `disabled` + hover.'>
      <Variant label='State matrix · 2 checked × 3 states' stack>
        <SwitchStateTable />
      </Variant>
      <Variant label='Interactive · controlled' code='<Switch checked={on} onChange={setOn} />'>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-400)' }}>
          <Switch checked={on} onChange={setOn} aria-label='Enable notifications' />
          <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm)' }}>
            on = {String(on)}
          </span>
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'role="switch" + aria-checked — announced as "switch" by screen readers.',
          'Click and Enter / Space both toggle. Controlled (checked + onChange) or uncontrolled (defaultChecked).',
          'Disabled suppresses click, hover, and the focus-driven hover visual.',
        ]}
        dos={[
          'Use for boolean settings that take effect immediately (notifications on/off, brand mode preview).',
          'Pair with a leading label so screen readers can announce the setting name.',
        ]}
        donts={[
          "Don't use Switch when a form submit is required to commit the change — use Checkbox in a form instead. Switch implies \"applies now.\"",
          "Don't toggle Switch programmatically based on remote state without showing a saving indicator — users expect immediate confirmation.",
          "Don't use Switch inside a list of three or more mutually-exclusive options — use Radio.",
        ]}
      />
    </Section>
  );
};

/* ── Timeslot state-matrix table — 4 states ── */
const TIMESLOT_STATE_COLS = [
  { key: 'default',  label: 'Default',  state: 'default'  },
  { key: 'hover',    label: 'Hover',    state: 'hover'    },
  { key: 'selected', label: 'Selected', state: 'selected' },
  { key: 'disabled', label: 'Disabled', state: 'disabled' },
];

const TimeslotStateTable = ({ cellMinWidth = 180 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>Variant</th>
          {TIMESLOT_STATE_COLS.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ padding: 'var(--dim-space-300)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>Default</td>
          {TIMESLOT_STATE_COLS.map((col) => (
            <td key={col.key} style={{ padding: 'var(--dim-space-300)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
              <Timeslot
                value={col.state === 'disabled' ? '08:00-08:30' : '08:30-09:00'}
                state={col.state}
              />
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  </div>
);

const TIMESLOTS = [
  '08:00-08:30', '08:30-09:00', '09:30-10:00', '10:00-10:30',
  '10:30-11:00', '11:00-11:30', '11:30-12:00', '13:00-13:30',
  '13:30-14:00', '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00',
];
const TIMESLOTS_FULL = new Set(['08:00-08:30', '10:00-10:30', '10:30-11:00', '14:00-14:30', '15:30-16:00']);

const TimeslotDemo = () => {
  const [sel, setSel] = useState('08:30-09:00');
  return (
    <Section title='Timeslot' summary='Pill-shaped time-range chip (Figma 2302:11293). 4 states (default · hover · selected · disabled). Disabled chips append "(เต็ม)" to communicate the slot is full. Compose multiple Timeslots in a flex-wrap grid for booking screens (Figma 2302:11272 / 2643:4883). Pass `state` to force the visual state; in real use the chip auto-resolves from `selected` + `disabled` + hover.'>
      <Variant label='State matrix · 4 states' stack>
        <TimeslotStateTable />
      </Variant>
      <Variant label='Booking grid · click to select' stack>
        <div
          style={{
            background: 'var(--surface-timeslot-box, #FAFCFA)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-timeslot-default, #E2F3EB)',
            borderRadius: 'var(--dim-radius-400, 12px)',
            padding: 'var(--dim-space-600, 24px)',
            maxWidth: 745,
          }}
        >
          <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            {TIMESLOTS.map((slot) => (
              <Timeslot
                key={slot}
                value={slot}
                selected={sel === slot}
                disabled={TIMESLOTS_FULL.has(slot)}
                onClick={() => setSel(slot)}
              />
            ))}
          </div>
        </div>
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', marginTop: 'var(--dim-space-200)', display: 'inline-block' }}>
          selected = {sel}
        </span>
      </Variant>
      <Guidelines
        behavior={[
          'A real <button> — receives keyboard focus and fires onClick on Enter / Space.',
          'disabled appends disabledLabel (default "(เต็ม)") and sets aria-disabled="true". The button is also natively disabled.',
          'selected exposes aria-pressed="true" (toggle-button semantics).',
          'Hover is tracked internally unless `state` is passed.',
        ]}
        dos={[
          'Use inside a horizontally-wrapping row for booking grids; group by date with a heading above each row.',
          'Pair with disabledLabel="(เต็ม)" (Thai) or "(Full)" (English) per locale.',
          'Make selection single-choice unless your booking flow explicitly supports multi-select; mirror radio semantics if single.',
        ]}
        donts={[
          "Don't use Timeslot for non-time chips (status filters, departments) — use FilterTag or ColorfulBadge.",
          "Don't render disabled slots invisible — keeping them visible communicates capacity. Just dim them and append the suffix.",
          "Don't force state=\"selected\" on multiple slots in a single-select group.",
        ]}
      />
    </Section>
  );
};

/* ── Topic state-matrix tables ── */
const TOPIC_STATE_COLS = [
  { key: 'default',  label: 'Default',  state: 'default'  },
  { key: 'hover',    label: 'Hover',    state: 'hover'    },
  { key: 'disabled', label: 'Disabled', state: 'disabled' },
];

const TOPIC_HIERARCHY_ROWS = [
  { key: 'secondary',     label: 'Secondary' },
  { key: 'tertiary',      label: 'Tertiary'  },
  { key: 'secondary-on',  label: 'Secondary · On' },
  { key: 'tertiary-on',   label: 'Tertiary · On'  },
];

const TopicPrimaryStateTable = ({ cellMinWidth = 380 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>Hierarchy</th>
          {TOPIC_STATE_COLS.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ padding: 'var(--dim-space-300)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>Primary</td>
          {TOPIC_STATE_COLS.map((col) => (
            <td key={col.key} style={{ padding: 'var(--dim-space-300)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
              <Topic hierarchy='primary' state={col.state} />
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  </div>
);

const TopicHierarchyTable = ({ cellMinWidth = 480 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>Hierarchy</th>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>Default</th>
        </tr>
      </thead>
      <tbody>
        {TOPIC_HIERARCHY_ROWS.map((row, i) => (
          <tr key={row.key}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{row.label}</td>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', minWidth: cellMinWidth, background: row.key.endsWith('-on') ? 'var(--brand-p50, #F4FBF8)' : undefined }}>
              <Topic hierarchy={row.key} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TOPIC_SLOT_VARIANTS = [
  { key: 'all',          label: 'All slots',         flags: { showSubText: true,  showBadge: true,  showChevron: true,  showLeadingIcon: true,  showSuccess: true  } },
  { key: 'no-subtext',   label: 'No Sub Text',       flags: { showSubText: false, showBadge: true,  showChevron: true,  showLeadingIcon: true,  showSuccess: true  } },
  { key: 'no-badge',     label: 'No Badge',          flags: { showSubText: true,  showBadge: false, showChevron: true,  showLeadingIcon: true,  showSuccess: true  } },
  { key: 'no-chevron',   label: 'No Chevron',        flags: { showSubText: true,  showBadge: true,  showChevron: false, showLeadingIcon: true,  showSuccess: true  } },
  { key: 'no-leading',   label: 'No Leading icon',   flags: { showSubText: true,  showBadge: true,  showChevron: true,  showLeadingIcon: false, showSuccess: true  } },
  { key: 'no-success',   label: 'No Success',        flags: { showSubText: true,  showBadge: true,  showChevron: true,  showLeadingIcon: true,  showSuccess: false } },
  { key: 'minimal',      label: 'Title only',        flags: { showSubText: false, showBadge: false, showChevron: false, showLeadingIcon: false, showSuccess: false } },
];

const TopicSlotsTable = ({ cellMinWidth = 480 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>Slot config</th>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>Primary · Default</th>
        </tr>
      </thead>
      <tbody>
        {TOPIC_SLOT_VARIANTS.map((row, i) => (
          <tr key={row.key}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{row.label}</td>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
              <Topic hierarchy='primary' {...row.flags} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ── Tooltip position-matrix table ── */
const TOOLTIP_POSITION_COLS = [
  { key: 'top',    label: 'Top'    },
  { key: 'bottom', label: 'Bottom' },
  { key: 'left',   label: 'Left'   },
  { key: 'right',  label: 'Right'  },
];

const TooltipPositionTable = ({ cellMinWidth = 200 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>Position</th>
          {TOOLTIP_POSITION_COLS.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ padding: 'var(--dim-space-300)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>Default</td>
          {TOOLTIP_POSITION_COLS.map((col) => (
            <td key={col.key} style={{ padding: 'var(--dim-space-500)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
              <TooltipBubble position={col.key} />
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  </div>
);

/* ── Information slot-matrix table ── */
const INFORMATION_VARIANTS = [
  { key: 'default',     label: 'Default',             flags: { showSubText: true,  showText: true,  showBadge: true,  showBadge2: false } },
  { key: 'no-subtext',  label: 'No Sub Text',         flags: { showSubText: false, showText: true,  showBadge: true,  showBadge2: false } },
  { key: 'no-text',     label: 'No Text',             flags: { showSubText: true,  showText: false, showBadge: true,  showBadge2: false } },
  { key: 'no-badge',    label: 'No Badge',            flags: { showSubText: true,  showText: true,  showBadge: false, showBadge2: false } },
  { key: 'with-badge2', label: 'With Badge 2 (red)',  flags: { showSubText: true,  showText: true,  showBadge: true,  showBadge2: true  } },
  { key: 'minimal',     label: 'Text only',           flags: { showSubText: false, showText: true,  showBadge: false, showBadge2: false } },
];

const InformationStateTable = ({ cellMinWidth = 320 }) => (
  <div
    className='w-full overflow-x-auto'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', whiteSpace: 'nowrap' }}>Slot config</th>
          <th style={{ textAlign: 'left', padding: 'var(--dim-space-200) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)', whiteSpace: 'nowrap', minWidth: cellMinWidth }}>Secondary · Default</th>
        </tr>
      </thead>
      <tbody>
        {INFORMATION_VARIANTS.map((row, i) => (
          <tr key={row.key}>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{row.label}</td>
            <td style={{ padding: 'var(--dim-space-300)', borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)', verticalAlign: 'middle', minWidth: cellMinWidth }}>
              <Information {...row.flags} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const InformationDemo = () => (
  <Section title='Information' summary='Compact key/value block (Figma 2550:10442). Hierarchy · Secondary, State · Default. 4 show-flags from the Figma property panel: Sub Text (xs medium tertiary), Text (sm regular default), Badge (trailing green ColorfulBadge), Badge2 (inline red ColorfulBadge below the text). Used for stat readouts inside patient cards and list rows.'>
    <Variant label='Slot matrix · show / hide every slot (matches Figma Properties)' stack>
      <InformationStateTable />
    </Variant>
    <Variant label='Real content examples'>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <Information subText='HN' text='HN-2024-00128'   badge='Active'   />
        <Information subText='วันนัด' text='12 พ.ค. 2569'  badge='ใกล้ถึง'   />
        <Information subText='แผนก' text='กุมารเวช'        badge='ห้อง 312' showBadge2 badge2='ฉุกเฉิน' badge2Icon='warning' />
      </div>
    </Variant>
    <Guidelines
      behavior={[
        'Static. No hover, click, focus, or keyboard handling — renders identically across pointer states.',
        'Each text node uses whiteSpace: nowrap. Wrap the parent with min-w-0 and a fixed width for ellipsis at narrow widths.',
        'Trailing green badge tints with [data-brand]; Badge2 (red) is non-brand and stays red across themes.',
      ]}
      dos={[
        'Stack multiple Information rows with gap: var(--dim-space-300) for a compact stat panel (HN, วันนัด, แผนก).',
        'Use Badge2 sparingly for alert metadata (allergy flag, emergency room) — its red dot draws attention.',
        'Use translated Thai labels for SubText to match the rest of the app.',
      ]}
      donts={[
        "Don't wrap Information in an <a> or <button> — it's not an action. Use Topic (Primary) when you need a clickable row.",
        "Don't put both badges (showBadge + showBadge2) on every row — the red Badge2 loses urgency if every entry uses it.",
        "Don't override `text` color to a brand color — the topic is meant to read neutral-800 against any surface.",
      ]}
    />
  </Section>
);

const TooltipDemo = () => (
  <Section title='Tooltip' summary='Hover-anchored hint bubble (Figma 365:35). Single property: `position` (top · bottom · left · right) controls which edge the caret sits on. Brand-p700 surface, 8px padding, 8px radius, neutral/50 (#F9FBFB) body text. Default export `<Tooltip>` is the interactive wrapper (hover/focus on a child anchor portals the bubble next to it with auto-positioning). Named export `<TooltipBubble>` is the pure visual used in the state-matrix table below.'>
    <Variant label='Position matrix · 4 directions' stack>
      <TooltipPositionTable />
    </Variant>
    <Variant label='Interactive · hover or tab to any button' stack>
      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-500, 20px)', padding: 'var(--dim-space-600) 0' }}>
        <Tooltip content='Tooltip on top' position='top'>
          <NeutralSubdueButton size='sm'>Top</NeutralSubdueButton>
        </Tooltip>
        <Tooltip content='Tooltip on bottom' position='bottom'>
          <NeutralSubdueButton size='sm'>Bottom</NeutralSubdueButton>
        </Tooltip>
        <Tooltip content='Tooltip on left' position='left'>
          <NeutralSubdueButton size='sm'>Left</NeutralSubdueButton>
        </Tooltip>
        <Tooltip content='Tooltip on right' position='right'>
          <NeutralSubdueButton size='sm'>Right</NeutralSubdueButton>
        </Tooltip>
        <Tooltip content='Saves this entry to the patient record.' position='top'>
          <BrandButton size='sm'>Save</BrandButton>
        </Tooltip>
      </div>
    </Variant>
    <Variant label='Light · multi-line detail popover (badge hover)' stack>
      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-300, 12px)', padding: 'var(--dim-space-400) 0' }}>
        <Tooltip
          variant='light'
          position='bottom'
          maxWidth={320}
          content='ผื่น Stevens-Johnson Syndrome (SJS) หรือผื่นแดงทั่วตัว, ไข้, ตุ่มน้ำพอง'
        >
          <span className='inline-flex cursor-default rounded-full px-3 py-1 text-sm font-medium'
            style={{
              background: 'var(--surface-dangerButton-quaternary, #FFF0F0)',
              color: 'var(--text-danger-default, #B91C1C)',
            }}>
            Penicillin
          </span>
        </Tooltip>
      </div>
    </Variant>
    <Guidelines
      behavior={[
        'Opens on mouseenter / focusin after a 200 ms delay (debounce — prevents flashes on rapid cursor passes).',
        'Closes on mouseleave, focusout, or Escape.',
        'Portals into document.body with position: fixed; re-measures on resize and capture-phase scroll. Caret tip sits 8 px from the anchor edge regardless of position.',
        'Anchor span uses display: inline-block; line-height: 0 so getBoundingClientRect() matches the child’s actual edges.',
      ]}
      dos={[
        'Wrap interactive controls (icon buttons, chips) when the label would otherwise be missing or truncated.',
        'Keep brand `content` to one short line; the bubble uses whiteSpace: nowrap and a maxWidth clamp.',
        'Use variant="light" for badge/chip detail — long copy wraps at maxWidth (default 320 px) with left-aligned text.',
        'Prefer position="top" for toolbar icons; position="right" for trailing affordances inside lists.',
      ]}
      donts={[
        "Don't put critical information (errors, required actions) inside a tooltip — hover/focus is not reachable on touch.",
        "Don't wrap a non-focusable element (plain span, div without tabIndex) — keyboard users won't get the tooltip.",
        "Don't disable `delay` for decoration — the 200 ms debounce is what keeps the system from feeling twitchy.",
      ]}
    />
  </Section>
);

const TopicDemo = () => (
  <Section title='Topic' summary='Section header row (Figma 2334:1841). 5 hierarchies (Primary · Secondary · Tertiary · Secondary-on · Tertiary-on) × 3 states (default · hover · disabled — Primary only). Primary is the card-style row with leading icon + bold title + subtext + trailing badge/success/chevron; Secondary/Tertiary are text-only blocks. The *-on variants use a darker subtext for tinted surfaces. Tables below mirror the Figma variant matrix.'>
    <Variant label='Primary · state matrix · 3 states' stack>
      <TopicPrimaryStateTable />
    </Variant>
    <Variant label='Hierarchy variants · Default state' stack>
      <TopicHierarchyTable />
    </Variant>
    <Variant label='Show / hide every slot (matches Figma Properties)' stack>
      <TopicSlotsTable />
    </Variant>
    <Guidelines
      behavior={[
        'Hover and focus both produce the hover visual; internalHover is tracked unless `state` is passed.',
        'onClick makes the row a real button (role="button", tabIndex=0); without onClick the row is presentational.',
        '`state` prop forces a visual for the design-system grid and suppresses internal hover/focus tracking.',
        'disabled short-circuits hover, focus, and click; aria-disabled="true".',
      ]}
      dos={[
        'Use Primary for expandable row headers inside cards (Vitals, Lab Result, Allergies). Pair the chevron with a real disclosure handler.',
        'Use Secondary for in-card section titles where the surface is white.',
        'Use *-on variants when the topic sits on a brand-p50 or tinted surface (the subtext gets darker for contrast).',
        'Provide a meaningful leadingIcon from Material Symbols (face, medication, health_metrics, …) — the icon is the primary visual anchor.',
      ]}
      donts={[
        "Don't apply state=\"hover\" permanently — it's a design-system grid affordance only.",
        "Don't nest a Topic inside a clickable card and add onClick on both — pick one click target.",
        "Don't use Tertiary on a tinted brand surface — the subtext fades into the background. Use tertiary-on instead.",
        "Don't change showChevron based on hover alone; the chevron should reflect expanded state, not pointer position.",
      ]}
    />
  </Section>
);

const FormBuilderContentDemo = () => {
  const [log, setLog] = useState('');
  return (
    <Section title='Content' summary='Form-builder palette chip (Figma 2210:7837). Brand-tinted iconbox + title + subtitle inside a dashed dropzone-style card. 2 states (default · hover); draggable by default. Pass `state` to force the visual state for design-system docs.'>
      <Variant label='State matrix · 2 states' stack>
        <FormBuilderMatrixTable
          title='Variant'
          cols={[
            { key: 'default', label: 'Default', state: 'default' },
            { key: 'hover',   label: 'Hover',   state: 'hover' },
          ]}
          rows={[{ key: 'default', label: 'Default' }]}
          render={(col) => <FormBuilderContent state={col.state} draggable={false} />}
          cellMinWidth={240}
        />
      </Variant>
      <Variant label='Custom palette chips (click to log)'>
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
          <FormBuilderContent icon='title'         label='หัวข้อ'   sublabel='Heading'   onClick={() => setLog('Inserted: Heading')} />
          <FormBuilderContent icon='view_headline' label='ย่อหน้า'  sublabel='Paragraph' onClick={() => setLog('Inserted: Paragraph')} />
          <FormBuilderContent icon='image'         label='รูปภาพ'   sublabel='Image'     onClick={() => setLog('Inserted: Image')} />
          <FormBuilderContent icon='horizontal_rule' label='เส้นคั่น' sublabel='Divider' onClick={() => setLog('Inserted: Divider')} />
        </div>
        {log && <div className='mt-3' style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>{log}</div>}
      </Variant>
      <Guidelines
        behavior={[
          'Dashed palette chip with a drag-handle on the left; clickable to insert into the canvas.',
          'state="hover" exposes the hover visual for docs; in real use the chip resolves hover from the pointer.',
          'draggable is true by default; pass draggable={false} for matrix/static demos.',
        ]}
        dos={[
          'Group chips by purpose (text · media · structure) inside the form-builder palette.',
          'Use Material Symbols outlined icons that match the inserted element (title → "title", paragraph → "view_headline").',
          'Wire onClick to dispatch an "insert" action into your canvas reducer.',
        ]}
        donts={[
          "Don't use Content for real form fields — it's the palette entry, not the field itself.",
          "Don't rename the chip label after insertion; the inserted node is a separate component instance.",
          "Don't disable draggable in the live builder — drag is the primary affordance.",
        ]}
      />
    </Section>
  );
};

const FormBuilderSignatureDemo = () => {
  const [val, setVal] = useState('');
  return (
    <Section title='Signature' summary='Interactive signature pad (Figma 2451:13969). Click the dashed pad to enter signing mode, then draw with mouse or touch. Strokes save to a base64 PNG via onChange. 2 states (default · hover) when empty. Pass `state` to force the visual state for design-system docs.'>
      <Variant label='State matrix · 2 states' stack>
        <FormBuilderMatrixTable
          title='Variant'
          cols={[
            { key: 'default', label: 'Default', state: 'default' },
            { key: 'hover',   label: 'Hover',   state: 'hover' },
          ]}
          rows={[{ key: 'default', label: 'Default' }]}
          render={(col) => (
            <div style={{ maxWidth: 280 }}>
              <FormBuilderSignature state={col.state} showFooter={false} />
            </div>
          )}
          cellMinWidth={300}
        />
      </Variant>
      <Variant label='Interactive · click to start signing'>
        <div style={{ maxWidth: 323 }}>
          <FormBuilderSignature value={val} onChange={setVal} />
        </div>
        {val && (
          <div className='mt-3 flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
            <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>Saved:</span>
            <img src={val} alt='signature preview' style={{ width: 120, height: 40, objectFit: 'contain', border: 'var(--dim-stroke-100) solid var(--border-card-default)', borderRadius: 'var(--dim-radius-100)' }} />
            <button type='button' onClick={() => setVal('')} style={{ color: 'var(--text-brandprimarybutton-default)', fontSize: 'var(--type-size-sm)', textDecoration: 'underline' }}>Clear</button>
          </div>
        )}
      </Variant>
      <Variant label='Disabled'>
        <div style={{ maxWidth: 323 }}>
          <FormBuilderSignature disabled />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Empty pad enters drawing mode on click; strokes captured with mouse or touch.',
          'On stroke-end, the canvas is exported to a base64 PNG and sent via onChange(dataURL).',
          'Clear resets the canvas and fires onChange("").',
          'disabled blocks interaction entirely and dims the pad.',
        ]}
        dos={[
          'Show a saving spinner while Signature commits to the server; base64 strings can be large.',
          'Render a small thumbnail preview after saving so the user can confirm.',
          'Provide an obvious Clear control — users will want to restart.',
        ]}
        donts={[
          "Don't disable Clear on Signature — users will want to retry.",
          "Don't render Signature inside a horizontally-scrolling parent — touch-drawing will fight the scroll.",
          "Don't persist the base64 string in localStorage; round-trip to the server and store an asset URL.",
        ]}
      />
    </Section>
  );
};

/* Mock File object for the Filled cell — File constructor isn't available
   in all SSR contexts, so we hand-roll the shape FileCard reads.          */
const MOCK_DROP_FILE = { name: 'บัตรประกันสังคม_สมชาย.pdf', size: 156 * 1024 };

const FormBuilderDragAndDropDemo = () => {
  const [filesA, setFilesA] = useState([]);
  return (
    <Section title='DragAndDrop' summary='File picker with drag-and-drop + native browser upload (Figma 360:39). 2 sizes (Large 192h vertical / Small 80h horizontal) × 4 states (default · hover · error · filled). Drop or click; files render as Filled cards with a remove X. Supports validation (size / accept), multi-file, and an error state. Pass `state` to force the visual state for design-system docs.'>
      <Variant label='State matrix · 2 sizes × 4 states' stack>
        <FormBuilderMatrixTable
          title='Size'
          cols={[
            { key: 'default', label: 'Default', state: 'default' },
            { key: 'hover',   label: 'Hover',   state: 'hover' },
            { key: 'error',   label: 'Error',   state: 'error' },
            { key: 'filled',  label: 'Filled',  state: 'filled' },
          ]}
          rows={[
            { key: 'lg', label: 'Large (192h)' },
            { key: 'sm', label: 'Small (80h)'  },
          ]}
          render={(col, row) => {
            if (col.state === 'filled') {
              return (
                <div style={{ width: '100%' }}>
                  <FormBuilderFileCard file={MOCK_DROP_FILE} onRemove={() => {}} />
                </div>
              );
            }
            return (
              <FormBuilderDragAndDrop
                size={row.key}
                state={col.state}
                onChange={() => {}}
              />
            );
          }}
          cellMinWidth={260}
        />
      </Variant>
      <Variant label='Interactive · large (drag a file onto the zone)'>
        <div style={{ maxWidth: 480 }}>
          <FormBuilderDragAndDrop
            value={filesA}
            onChange={setFilesA}
            accept='.png,.jpg,.jpeg,.pdf'
          />
        </div>
      </Variant>
      <Guidelines
        behavior={[
          'Drop zone with native file-input fallback (click to open the OS file picker).',
          'Validates via `accept` and `maxSize`; rejected files trigger the error state with a red border + message.',
          'Filled files render as <FileCard> rows with a remove × that calls onChange with the remaining list.',
          'Multi-file when value/onChange are arrays; single-file when scalar.',
        ]}
        dos={[
          'Always set the `accept` prop so the picker filters to expected types (.pdf, .png, .jpg).',
          'Set maxSize per upload-tier (default 10 MB) and surface the limit in the helper copy.',
          'Use Large (192h vertical) for primary uploads; Small (80h horizontal) for secondary attachments in form rows.',
        ]}
        donts={[
          "Don't omit `accept` — without it users upload anything and you'll catch errors server-side.",
          "Don't auto-submit on drop — let the user confirm with the form's primary action.",
          "Don't allow multi-file when the form expects a single document — the second drop overwrites the first.",
        ]}
      />
    </Section>
  );
};

/* ── alert ───────────────────────────────────────────────── */

const AlertDemo = () => {
  /* 10 indicators per Figma 2511:7564, 11 badges per Figma 2491:* — Success
     alert (2488:3878) ships with these full collections. */
  const SAMPLE_INDICATORS = Array.from({ length: 10 }, () => 'ระดับ');
  const SAMPLE_BADGES_INFO    = Array.from({ length: 11 }, () => 'Info');
  const SAMPLE_BADGES_SUCCESS = Array.from({ length: 11 }, () => 'Success');
  const SAMPLE_BADGES_WARNING = Array.from({ length: 11 }, () => 'Warning');
  const SAMPLE_BADGES_ERROR   = Array.from({ length: 11 }, () => 'Error');

  /* Track which dismissable alerts have been closed. Each Alert in the demo
     gets a unique key — when the X is clicked the alert is removed from the
     DOM. "Reset all" brings every alert back so the variants can be retested. */
  const [dismissed, setDismissed] = useState({});
  const dismiss = (key) => setDismissed((d) => ({ ...d, [key]: true }));
  const isOpen  = (key) => !dismissed[key];
  const resetAll = () => setDismissed({});

  return (
    <Section title='Alert' summary='Contextual feedback message per Figma 325:2623 (LargeAlert · MIH Design System Foundation). Four tones — info · success · warning · error — share one layout: leading icon + content stack (title · subtext · optional indicator group · optional badge group · optional detail card) + optional vertical scrollbar + optional X close. All visual values come from `--surface-alert-*`, `--border-alert-*`, `--text-alert-*` and pill tokens — no hex literals. Click the X on any dismissable alert below to close it; use "Reset all" to bring them back.'>
      <Variant label='Reset closed alerts' stack>
        <BrandSubdueButton leadingIcon='refresh' onClick={resetAll}>Reset all</BrandSubdueButton>
      </Variant>
      <Variant label='4 tones · title + subtext only (not dismissable)' stack>
        <Alert type='info'    title='Information' subtext='This is an informational alert message.' />
        <Alert type='success' title='Success'     subtext='This is an informational alert message.' />
        <Alert type='warning' title='Warning'     subtext='This is an informational alert message.' />
        <Alert type='error'   title='Error'       subtext='This is an informational alert message.' />
      </Variant>
      <Variant label='Info · with indicators + badges + detail + scrollbar + close' stack>
        {isOpen('info') && (
          <Alert
            type='info'
            title='Information'
            subtext='This is an informational alert message.'
            indicators={SAMPLE_INDICATORS}
            badges={SAMPLE_BADGES_INFO}
            detail='Explain text'
            showScrollBar
            onClose={() => dismiss('info')}
          />
        )}
      </Variant>
      <Variant label='Success · with indicators + badges + detail + scrollbar + close (Figma 2488:3878)' stack>
        {isOpen('success') && (
          <Alert
            type='success'
            title='Success'
            subtext='This is an informational alert message.'
            indicators={SAMPLE_INDICATORS}
            badges={SAMPLE_BADGES_SUCCESS}
            detail='Explain text'
            showScrollBar
            onClose={() => dismiss('success')}
          />
        )}
      </Variant>
      <Variant label='Warning · with indicators + badges + detail + scrollbar + close' stack>
        {isOpen('warning') && (
          <Alert
            type='warning'
            title='Warning'
            subtext='This is an informational alert message.'
            indicators={SAMPLE_INDICATORS}
            badges={SAMPLE_BADGES_WARNING}
            detail='Explain text'
            showScrollBar
            onClose={() => dismiss('warning')}
          />
        )}
      </Variant>
      <Variant label='Error (alias `destructive`) · full feature set' stack>
        {isOpen('error') && (
          <Alert
            type='error'
            title='Error'
            subtext='This is an informational alert message.'
            indicators={SAMPLE_INDICATORS}
            badges={SAMPLE_BADGES_ERROR}
            detail='Explain text'
            showScrollBar
            onClose={() => dismiss('error')}
          />
        )}
      </Variant>
      <Variant label='Compact · no icon, no subtext' stack>
        <Alert type='info' showIcon={false} showSubtext={false} title='Compact info banner' />
      </Variant>
      <Variant label='Live composer · toggle every Figma property panel flag' stack>
        <AlertComposerDemo
          indicators={SAMPLE_INDICATORS}
          badgesInfo={SAMPLE_BADGES_INFO}
          badgesSuccess={SAMPLE_BADGES_SUCCESS}
          badgesWarning={SAMPLE_BADGES_WARNING}
          badgesError={SAMPLE_BADGES_ERROR}
        />
      </Variant>
      <Guidelines
        behavior={[
          'Renders an icon + title + (optional) subtext, indicators, badges, detail card, and a close × — each slot is controlled by a show* prop.',
          '4 tones: info (blue) · success (green) · warning (amber) · error / destructive (red).',
          'Dismiss is opt-in (onClose); when present, the × button removes the alert and fires the callback.',
          'Use role="alert" for transient urgent notifications; role="status" for non-urgent confirmations.',
        ]}
        dos={[
          'Use error for blocking failures the user must act on; warning for non-blocking risks; success for transient confirmations.',
          'Put primary action(s) in the trailing slot (e.g. "ลองใหม่", "ดูรายละเอียด").',
          'Pair the icon tone with the alert — the icon is the first thing scanned.',
        ]}
        donts={[
          "Don't stack more than 2 alerts on a single surface — they cancel each other's urgency.",
          "Don't use Alert for form-field errors — use the field's built-in error state.",
          "Don't auto-dismiss error alerts; let the user dismiss after reading.",
        ]}
      />
    </Section>
  );
};

/* Live composer mirroring the Figma Property panel for Alert (node 297:59).
   Each toggle maps 1:1 onto a `show*` prop; Type maps to `type`. */
const AlertComposerDemo = ({ indicators, badgesInfo, badgesSuccess, badgesWarning, badgesError }) => {
  const [type, setType]                     = useState('info');
  const [showIcon, setShowIcon]             = useState(true);
  const [showSubtext, setShowSubtext]       = useState(true);
  const [showDetail, setShowDetail]         = useState(true);
  const [showBadge, setShowBadge]           = useState(true);
  const [showScrollBar, setShowScrollBar]   = useState(true);
  const [showIndicator, setShowIndicator]   = useState(true);
  const [showCloseButton, setShowCloseButton] = useState(true);

  const badges = {
    info: badgesInfo, success: badgesSuccess, warning: badgesWarning, error: badgesError,
  }[type === 'destructive' ? 'error' : type];

  const Toggle = ({ checked, onChange, label }) => (
    <label className='inline-flex items-center cursor-pointer' style={{ gap: 'var(--dim-space-200)' }}>
      <input type='checkbox' checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
        {label}
      </span>
    </label>
  );

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-300)' }}>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
          Type:
        </span>
        {['info', 'success', 'warning', 'destructive'].map((t) => (
          <label key={t} className='inline-flex items-center cursor-pointer' style={{ gap: 'var(--dim-space-100)' }}>
            <input type='radio' name='alert-type' checked={type === t} onChange={() => setType(t)} />
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
              {t}
            </span>
          </label>
        ))}
      </div>
      <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
        <Toggle checked={showIcon}        onChange={setShowIcon}        label='showIcon' />
        <Toggle checked={showSubtext}     onChange={setShowSubtext}     label='showSubtext' />
        <Toggle checked={showDetail}      onChange={setShowDetail}      label='showDetail' />
        <Toggle checked={showBadge}       onChange={setShowBadge}       label='showBadge' />
        <Toggle checked={showScrollBar}   onChange={setShowScrollBar}   label='showScrollBar' />
        <Toggle checked={showIndicator}   onChange={setShowIndicator}   label='showIndicator' />
        <Toggle checked={showCloseButton} onChange={setShowCloseButton} label='showCloseButton' />
      </div>
      <Alert
        type={type}
        title={type === 'destructive' ? 'Destructive' : type.charAt(0).toUpperCase() + type.slice(1)}
        subtext='This is an informational alert message.'
        indicators={indicators}
        badges={badges}
        detail='Explain text'
        showIcon={showIcon}
        showSubtext={showSubtext}
        showDetail={showDetail}
        showBadge={showBadge}
        showScrollBar={showScrollBar}
        showIndicator={showIndicator}
        showCloseButton={showCloseButton}
        onClose={() => {}}
      />
    </div>
  );
};

const SmallAlertDemo = () => (
  <Section
    title='SmallAlert'
    summary='Compact pill per Figma 3355:3149 (Small Alert · MIH Design System Foundation). Solid fills `--surface-smallalert-success|error` (teal/500 · red/500), label uses `--text-smallalert-on-*` with body3 typography (Sarabun · `--type-size-base` · `--type-weight-regular` · lh 1.5 · letter-spacing 0). Leading graphic: default `leadingGraphic="material"` (Material Symbols); `leadingGraphic="phcis"` matches PHCIS | OPD toast [323:58923](https://www.figma.com/design/tobdR9prwt00v4X3aSMsxF/PHCIS-%7C-OPD?node-id=323-58923) (TickOnCircle SVG + stroke X). Dim spacing, full-radius pill, `--shadow-smallalert-*`. [DS Figma](https://www.figma.com/design/SBdh4TtY0KAa22s3dnyRNr/MIH-Design-System-Foundation?node-id=3355-3149).'
  >
    <Variant label='Success · default copy' stack>
      <SmallAlert variant='success' />
    </Variant>
    <Variant label='Error · default copy' stack>
      <SmallAlert variant='error' />
    </Variant>
    <Variant label='Figma frame · both states (horizontal)' stack>
      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-300)' }}>
        <SmallAlert variant='success' />
        <SmallAlert variant='error' />
      </div>
    </Variant>
    <Variant label='PHCIS toast · leadingGraphic="phcis" (Figma 323:58923)' stack>
      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-300)' }}>
        <SmallAlert variant='success' leadingGraphic='phcis' />
        <SmallAlert variant='error' leadingGraphic='phcis' />
      </div>
    </Variant>
    <Variant label='Custom label' stack>
      <SmallAlert variant='success'>บันทึกแล้ว</SmallAlert>
      <SmallAlert variant='error'>ไม่สามารถบันทึกได้</SmallAlert>
    </Variant>
    <Guidelines
      behavior={[
        'Solid teal/500 or red/500 pill; leading slot is Material Symbols by default, or `leadingGraphic="phcis"` for PHCIS TickOnCircle / X stroke. Shadow from `--shadow-smallalert-*`.',
        'Typography matches Figma body3 on the label: `--type-family-body` · `--type-size-base` · `--type-weight-regular` · line-height 1.5 · letter-spacing 0 · `whiteSpace: nowrap`.',
        'Default `role="status"` and `aria-live="polite"` (override when needed).',
      ]}
      dos={[
        'Use after lightweight actions (copy, save) where a full Large `<Alert />` would dominate.',
        'Keep to one short phrase; prefer truncation at the call site for long strings.',
        'Pair success with completed actions; use error when the action failed and you need inline confirmation.',
      ]}
      donts={[
        "Don't use for multi-line explanations — use `<Alert />` or a toast with detail.",
        "Don't nest interactive controls inside the pill.",
      ]}
    />
  </Section>
);

/* ── list ────────────────────────────────────────────────── */

const ActionListDemo = () => {
  const [active, setActive] = useState(false);
  const [switchA, setSwitchA] = useState(false);
  const [switchB, setSwitchB] = useState(true);
  const ROW_WIDTH = 360;
  /* Canonical row content used across the state matrix so each variant
     reads as the same item under different states. */
  const sharedRow = {
    label: 'List01',
    subtext: 'List01',
    leadingIcon: 'person',
    badge: { tone: 'info', label: 'TH' },
    switchProps: { checked: false, onChange: () => {} },
  };
  const STATES = ['default', 'hover', 'selected', 'selected-hover'];
  return (
    <Section
      title='ActionList'
      summary='Composable single-row list item — Figma "List" (node 382:14360 / 382:14361). Property panel: state (default · hover · selected · selected-hover) · icon weight (default · darker) + nine visibility toggles (showLeadingIcon · showLeadingBadge · showLeadingBadge2 · showLeadingBadge3 · showSubtext · showSwitch · showBadge · showCheck · showChevronRight). `showLeadingBadge3` is the fixed-64 px badge column from Figma 382:14361 (used by AISearch recent-history dropdown for ICD codes). Other leading-badge slots aim at the queue + HN pills used by PrimarySearch dropdown rows (Figma 3345:2981 / 3346:8231). All visual values come from semantic tokens (`--surface-list-*`, `--text-list-*`, `--text-list-subtext{,-hover}`, colorful-badge tokens, switch tokens) — no hex literals.'
    >
      <Variant label='State matrix · 4 states × icon Default' stack>
        {STATES.map((s) => (
          <div key={s} style={{ width: ROW_WIDTH }}>
            <ActionList {...sharedRow} state={s} />
            <p style={{
              margin: '4px 0 0',
              color: 'var(--text-content-tertiary)',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: 'var(--type-size-xs)',
            }}>state="{s}"</p>
          </div>
        ))}
      </Variant>

      <Variant label='State matrix · 4 states × icon Darker (font-weight 700)' stack>
        {STATES.map((s) => (
          <div key={s} style={{ width: ROW_WIDTH }}>
            <ActionList {...sharedRow} state={s} iconWeight='darker' />
          </div>
        ))}
      </Variant>

      <Variant
        label='Show Subtext = true · brand-aware subtext-hover tone'
        stack
      >
        {STATES.map((s) => (
          <div key={s} style={{ width: ROW_WIDTH }}>
            <ActionList
              {...sharedRow}
              state={s}
              showSubtext
            />
          </div>
        ))}
      </Variant>

      <Variant
        label='Leading badges (Figma 382:14360 · queue + HN slots)'
        stack
      >
        {STATES.map((s) => (
          <div key={s} style={{ width: ROW_WIDTH }}>
            <ActionList
              state={s}
              label='สมชาย มีสุข'
              subtext='พญ.สมหญิง รักษ์ดี'
              showSubtext
              showLeadingIcon={false}
              showLeadingBadge
              leadingBadge={{ tone: 'teal',   label: 'A001'    }}
              showLeadingBadge2
              leadingBadge2={{ tone: 'indigo', label: '67-00001' }}
              showSwitch={false}
              showBadge={false}
              showCheck={false}
            />
          </div>
        ))}
      </Variant>

      <Variant
        label='Leading badge 3 · Figma 382:14361 · fixed 64 px column (ICD codes)'
        stack
      >
        {[
          { code: 'I10',   text: 'Essential (primary) hypertension' },
          { code: 'M54.9', text: 'Dorsalgia, unspecified (ปวดหลังไม่ระบุรายละเอียด)' },
          { code: 'G43.9', text: 'Migraine, unspecified' },
          { code: 'A90',   text: 'Dengue fever (ไข้แดงกี)' },
        ].map((row) => (
          <div key={row.code} style={{ width: ROW_WIDTH }}>
            <ActionList
              label={row.text}
              showLeadingIcon={false}
              showLeadingBadge3
              leadingBadge3={{ tone: 'blue', label: row.code }}
              showSwitch={false}
              showBadge={false}
              showCheck={false}
              showChevronRight={false}
            />
          </div>
        ))}
        <p style={{
          margin: 'var(--dim-space-200) 0 0',
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          lineHeight: 1.5,
        }}>
          The 64 px fixed-width column keeps the label text vertically aligned
          regardless of the code's character count (`I10` vs `M54.9` vs `G43.9`).
          Same pattern as AISearch's recent-history dropdown (Figma 3396:1627).
        </p>
      </Variant>

      <Variant label='All slots populated · drives every show* flag' stack>
        <div style={{ width: ROW_WIDTH }}>
          <ActionList
            label='List'
            subtext='Helper text'
            leadingIcon='person'
            leadingBadge={{ tone: 'teal',   label: 'A001'    }}
            leadingBadge2={{ tone: 'indigo', label: '67-00001' }}
            circleIcon='stethoscope'
            badge={{ tone: 'warning', label: 'Warning' }}
            showSuccess
            switchProps={{ checked: switchA, onChange: setSwitchA }}
            showSubtext
            showLeadingIcon
            showLeadingBadge
            showLeadingBadge2
            showSwitch
            showBadge
            showCheck
            showChevronRight
          />
        </div>
        <div style={{ width: ROW_WIDTH }}>
          <ActionList
            state='hover'
            label='List · state=hover'
            subtext='Helper text'
            leadingIcon='person'
            leadingBadge={{ tone: 'teal',   label: 'A002'    }}
            leadingBadge2={{ tone: 'indigo', label: '67-00002' }}
            circleIcon='stethoscope'
            badge={{ tone: 'warning', label: 'Warning' }}
            showSuccess
            switchProps={{ checked: switchB, onChange: setSwitchB }}
            showSubtext
            showLeadingBadge
            showLeadingBadge2
          />
        </div>
      </Variant>

      <Variant label='Icon weight · default (400) vs darker (700)' stack>
        <div style={{ width: ROW_WIDTH }}>
          <ActionList label='Default weight' leadingIcon='person' />
        </div>
        <div style={{ width: ROW_WIDTH }}>
          <ActionList label='Darker weight'  leadingIcon='person' iconWeight='darker' />
        </div>
      </Variant>

      <Variant label='Common combos used in real pages' stack>
        <div style={{ width: ROW_WIDTH }}>
          <ActionList label='โปรไฟล์' leadingIcon='person' showBadge={false} showCheck={false} showSwitch={false} />
        </div>
        <div style={{ width: ROW_WIDTH }}>
          <ActionList
            label='ภาษา'
            leadingIcon='translate'
            badge={{ tone: 'info', label: 'TH' }}
            showCheck={false}
            showSwitch={false}
          />
        </div>
        <div style={{ width: ROW_WIDTH }}>
          <ActionList
            label='แจ้งเตือน'
            leadingIcon='notifications'
            switchProps={{ checked: switchA, onChange: setSwitchA }}
            showBadge={false}
            showCheck={false}
            showChevronRight={false}
          />
        </div>
        <div style={{ width: ROW_WIDTH }}>
          <ActionList
            label='โหมดมืด'
            leadingIcon='dark_mode'
            showCheck
            showBadge={false}
            showSwitch={false}
            showChevronRight={false}
          />
        </div>
        <div style={{ width: ROW_WIDTH }}>
          <ActionList
            label='ออกจากระบบ'
            leadingIcon='logout'
            showBadge={false}
            showSwitch={false}
            showCheck={false}
          />
        </div>
      </Variant>

      <Variant label='Click to toggle active (legacy `active` prop · maps to state="hover")' stack>
        <div style={{ width: ROW_WIDTH }}>
          <ActionList
            label='Click me'
            leadingIcon='touch_app'
            active={active}
            onClick={() => setActive((a) => !a)}
            showBadge={false}
            showSwitch={false}
            showCheck={false}
          />
        </div>
        <span style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: 'var(--type-size-xs)',
        }}>
          active = {String(active)}
        </span>
      </Variant>

      <Guidelines
        behavior={[
          'Ten Figma properties (state · icon · showLeadingIcon · showLeadingBadge · showLeadingBadge2 · showSubtext · showSwitch · showBadge · showCheck · showChevronRight) map 1:1 to component props.',
          'Each `show*` flag AND-gates with its content prop — `showLeadingBadge` without a `leadingBadge` payload still renders nothing.',
          '`state` is explicit and four-way: `default · hover · selected · selected-hover`. Hover semantics fall back to internal pointer tracking when `state` is omitted (back-compat with the legacy `active` flag).',
          '`showSubtext` defaults to `false`; the subtext line uses `--text-list-subtext` (neutral/500) → `--text-list-subtext-hover` (brand/500). All subtext colors are brand-aware.',
          'Leading-badge slots accept `{ tone, label }` and render the canonical Colorful Badge pill (24 px h, radius 9999, `surface/colorfulBadge/{tone}` + `text/colorfulBadge/{tone}`). The pair is brand-neutral — tones stay constant when `data-brand` flips.',
        ]}
        dos={[
          'Drive `state` from the parent menu/dropdown — never duplicate the selected source-of-truth inside the row.',
          'Pair `showSubtext` with a real `subtext` string. If you have nothing to show, leave it `false` so the row collapses cleanly to a single inline label.',
        ]}
        donts={[
          "Don't mix legacy `showChevron` and new `showChevronRight` in the same call site — pick `showChevronRight` for new code (legacy alias kept only for migration).",
          "Don't override `--text-list-*` per call — flipping `data-brand` should retint everything; per-row overrides break that.",
        ]}
      />
    </Section>
  );
};

/* ── pagination ──────────────────────────────────────────── */

const PaginationDemo = () => {
  const [p1, setP1] = useState(1);
  const [p2, setP2] = useState(3);
  const [p3, setP3] = useState(10);
  return (
    <Section title='Pagination' summary='Page navigator per Figma 328:4734 (MIH Design System Foundation §6.19). Three states per button — default · hover · selected (current). All visual values come from semantic tokens (`--surface-pagination-*`, `--text-pagination-*`, `--text-neutral-tertiary`) — no hardcoded brand colours. API: `currentPage` (1-based) · `pageCount` · `onPageChange(page)` · `siblingCount` (default 1).'>
      <Variant label='5 pages · current page = 1' stack>
        <Pagination currentPage={p1} pageCount={5} onPageChange={setP1} />
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 'var(--type-size-xs)' }}>
          currentPage = {p1}
        </span>
      </Variant>
      <Variant label='10 pages · current page = 3 (no ellipsis yet)' stack>
        <Pagination currentPage={p2} pageCount={10} onPageChange={setP2} />
      </Variant>
      <Variant label='20 pages · current page = 10 (Figma reference: ellipsis on both sides)' stack>
        <Pagination currentPage={p3} pageCount={20} onPageChange={setP3} />
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 'var(--type-size-xs)' }}>
          currentPage = {p3} · click any page to navigate
        </span>
      </Variant>
      <Variant label='siblingCount=2 · wider window' stack>
        <Pagination currentPage={p3} pageCount={20} onPageChange={setP3} siblingCount={2} />
      </Variant>
      <Variant label='Edge: only 1 page (renders just disabled arrows)' stack>
        <Pagination currentPage={1} pageCount={1} onPageChange={() => {}} />
      </Variant>
      <Guidelines
        behavior={[
          '1-based page numbering. Auto-collapses long lists with `…` ellipsis on both sides; `siblingCount` controls the window around current.',
          'Disabled previous / next arrows on boundary edges; single-page mode shows only the disabled arrows.',
        ]}
        dos={[
          'Use under any table / list that grows beyond ~25 rows.',
          'Wire `onPageChange` to the data fetcher; keep selection state in the parent.',
          'Use `siblingCount={2}` on wider tables where users skim across many pages.',
        ]}
        donts={[
          "Don't use for infinite-scroll lists — switch to a Load-more pattern.",
          "Don't reset to page 1 silently on filter change — show a transient hint or scroll to top.",
        ]}
      />
    </Section>
  );
};

/* Side-menu groups mirror the folders under src/components/. Within each
   group, items are listed alphabetically — the same order Cursor shows in
   the file tree. */
const REGISTRY = [
  { group: 'alert', items: [
    { slug: 'alert', name: 'Alert', Demo: AlertDemo },
    { slug: 'small-alert', name: 'SmallAlert', Demo: SmallAlertDemo },
  ]},
  { group: 'badge', items: [
    { slug: 'status-badge',         name: 'StatusBadge',         Demo: StatusBadgeDemo },
    { slug: 'colorful-badge',       name: 'ColorfulBadge',       Demo: ColorfulBadgeDemo },
    { slug: 'colorful-icon-badge',  name: 'ColorfulIconBadge',   Demo: ColorfulIconBadgeDemo },
  ]},
  { group: 'button', items: [
    { slug: 'brand-circle-icon-button',         name: 'BrandCircleIconButton',         Demo: BrandCircleIconButtonDemo },
    { slug: 'brand-circle-subdue-icon-button',  name: 'BrandCircleSubdueIconButton',   Demo: BrandCircleSubdueIconButtonDemo },
    { slug: 'brand-radius-subdue-icon-button',  name: 'BrandRadiusSubdueIconButton',   Demo: BrandRadiusSubdueIconButtonDemo },
    { slug: 'brand-icon-button',                name: 'BrandIconButton',               Demo: BrandIconButtonDemo },
    { slug: 'brand-button',                     name: 'BrandButton',                   Demo: BrandButtonDemo },
    { slug: 'brand-subdue-button',              name: 'BrandSubdueButton',             Demo: BrandSubdueButtonDemo },
    { slug: 'brand-subdue-float-button',        name: 'BrandSubdueFloatButton',        Demo: BrandSubdueFloatButtonDemo },
    { slug: 'brand-dashed-add-button',          name: 'BrandDashedAddButton',          Demo: BrandDashedAddButtonDemo },
    { slug: 'brand-subdue-icon-button',         name: 'BrandSubdueIconButton',         Demo: BrandSubdueIconButtonDemo },
    { slug: 'danger-button',                    name: 'DangerButton',                  Demo: DangerButtonDemo },
    { slug: 'danger-icon-button',               name: 'DangerIconButton',              Demo: DangerIconButtonDemo },
    { slug: 'danger-subdue-button',             name: 'DangerSubdueButton',            Demo: DangerSubdueButtonDemo },
    { slug: 'danger-subdue-icon-button',        name: 'DangerSubdueIconButton',        Demo: DangerSubdueIconButtonDemo },
    { slug: 'danger-circle-icon-button',        name: 'DangerCircleIconButton',        Demo: DangerCircleIconButtonDemo },
    { slug: 'danger-circle-subdue-icon-button', name: 'DangerCircleSubdueIconButton',   Demo: DangerCircleSubdueIconButtonDemo },
    { slug: 'neutral-button',                   name: 'NeutralButton',                 Demo: NeutralButtonDemo },
    { slug: 'neutral-icon-button',              name: 'NeutralIconButton',             Demo: NeutralIconButtonDemo },
    { slug: 'neutral-subdue-button',            name: 'NeutralSubdueButton',           Demo: NeutralSubdueButtonDemo },
    { slug: 'neutral-subdue-icon-button',       name: 'NeutralSubdueIconButton',       Demo: NeutralSubdueIconButtonDemo },
  ]},
  { group: 'checkbox', items: [
    { slug: 'checkbox',                    name: 'Checkbox',                 Demo: CheckboxDemo },
    { slug: 'checkbox-box',                name: 'CheckboxBox',              Demo: CheckboxBoxDemo },
    { slug: 'checkbox-button',             name: 'CheckboxButton',           Demo: CheckboxButtonDemo },
    { slug: 'checkbox-group',              name: 'CheckboxGroup',            Demo: CheckboxGroupDemo },
  ]},
  { group: 'radio', items: [
    { slug: 'radio',                       name: 'Radio',                    Demo: RadioDemo },
    { slug: 'radio-box',                   name: 'RadioBox',                 Demo: RadioBoxDemo },
    { slug: 'radio-button',                name: 'RadioButton',              Demo: RadioButtonDemo },
    { slug: 'radio-group',                 name: 'RadioGroup',               Demo: RadioGroupDemo },
  ]},
  { group: 'switch', items: [
    { slug: 'switch',                      name: 'Switch',                   Demo: SwitchDemo },
  ]},
  { group: 'timeslot', items: [
    { slug: 'timeslot',                    name: 'Timeslot',                 Demo: TimeslotDemo },
  ]},
  { group: 'topic', items: [
    { slug: 'topic',                       name: 'Topic',                    Demo: TopicDemo },
  ]},
  { group: 'tooltip', items: [
    { slug: 'tooltip',                     name: 'Tooltip',                  Demo: TooltipDemo },
  ]},
  { group: 'information', items: [
    { slug: 'information',                 name: 'Information',              Demo: InformationDemo },
  ]},
  { group: 'form-builder', items: [
    { slug: 'form-builder-content',        name: 'Content',                  Demo: FormBuilderContentDemo },
    { slug: 'form-builder-drag-and-drop',  name: 'DragAndDrop',              Demo: FormBuilderDragAndDropDemo },
    { slug: 'form-builder-signature',      name: 'Signature',                Demo: FormBuilderSignatureDemo },
  ]},
  { group: 'card', items: [
    { slug: 'patient-card',                name: 'PatientCard',              Demo: PatientCardDemo },
    { slug: 'vital-card',                  name: 'VitalCard',                Demo: VitalCardDemo },
    { slug: 'vital-reading-card',          name: 'VitalReadingCard',         Demo: VitalReadingCardDemo },
    { slug: 'vital-sign-timeline-card',    name: 'VitalSignTimelineCard',    Demo: VitalSignTimelineCardDemo },
    { slug: 'inventory-card',              name: 'InventoryCard',            Demo: InventoryCardDemo },
  ]},
  { group: 'graph', items: [
    { slug: 'age-service-pyramid-card',    name: 'AgeServicePyramidCard',    Demo: () => (
      <Section title='AgeServicePyramidCard' summary='Population pyramid card showing service usage by age group. Self-contained with default PYRAMID data; pass `groups` to override.'>
        <Variant label='Default' stack><div style={{ maxWidth: 360 }}><AgeServicePyramidCard /></div></Variant>
      </Section>
    ) },
    { slug: 'big-charts',                  name: 'BigCharts',                Demo: BigChartsDemo },
    { slug: 'charts',                      name: 'Charts',                   Demo: ChartsDemo },
    { slug: 'coc-card',                    name: 'CocCard',                  Demo: () => (
      <Section title='CocCard' summary='Continuity-of-care card with 2 PersonStats + 2 BigStats. Pass `people` and `stats` to override.'>
        <Variant label='Default' stack><div style={{ maxWidth: 360 }}><CocCard /></div></Variant>
      </Section>
    ) },
    { slug: 'consent-card',                name: 'ConsentCard',              Demo: () => (
      <Section title='ConsentCard' summary='Single-gauge card for the consent service indicator. Default value=0 (ยังไม่มีข้อมูล); pass `value`, `color`, `label` to override.'>
        <Variant label='Default' stack><div style={{ maxWidth: 360 }}><ConsentCard /></div></Variant>
      </Section>
    ) },
    { slug: 'disease-21-groups-card',      name: 'Disease21GroupsCard',      Demo: () => (
      <Section title='Disease21GroupsCard' summary='ICD-10 21-chapter scrollable HBarList card with summary footer (totals + top group). Pass `groups` to override.'>
        <Variant label='Default' stack><div style={{ maxWidth: 540 }}><Disease21GroupsCard /></div></Variant>
      </Section>
    ) },
    { slug: 'dm-complications-card',       name: 'DmComplicationsCard',      Demo: () => (
      <Section title='DmComplicationsCard' summary='Two side-by-side gauges for diabetes complications (Diabetic foot, CKD). Pass `gauges` to override.'>
        <Variant label='Default' stack><div style={{ maxWidth: 360 }}><DmComplicationsCard /></div></Variant>
      </Section>
    ) },
    { slug: 'dm-control-gauge-card',       name: 'DmControlGaugeCard',       Demo: () => (
      <Section title='DmControlGaugeCard' summary='Gauge card for diabetes glycemic control (DM ผู้ป่วยเบาหวานควบคุมน้ำตาลได้).'>
        <Variant label='Default' stack><div style={{ maxWidth: 360 }}><DmControlGaugeCard /></div></Variant>
      </Section>
    ) },
    { slug: 'dm-ht-new-patients-card',     name: 'DmHtNewPatientsCard',      Demo: () => (
      <Section title='DmHtNewPatientsCard' summary='Stacked VBars + 3 BigStats summary for new DM/HT patients over 12 months. Pass `data` and `summary` to override.'>
        <Variant label='Default' stack><div style={{ maxWidth: 540 }}><DmHtNewPatientsCard /></div></Variant>
      </Section>
    ) },
    { slug: 'ht-control-gauge-card',       name: 'HtControlGaugeCard',       Demo: () => (
      <Section title='HtControlGaugeCard' summary='Gauge card for hypertension blood-pressure control (ผู้ป่วยความดันโลหิตควบคุมได้).'>
        <Variant label='Default' stack><div style={{ maxWidth: 360 }}><HtControlGaugeCard /></div></Variant>
      </Section>
    ) },
    { slug: 'monthly-visits-card',         name: 'MonthlyVisitsCard',        Demo: () => (
      <Section title='MonthlyVisitsCard' summary='LineChart card for monthly visits with active-month highlight. Pass `data` to override (months + series).'>
        <Variant label='Default' stack><div style={{ maxWidth: 540 }}><MonthlyVisitsCard /></div></Variant>
      </Section>
    ) },
    { slug: 'rights-donut-card',           name: 'RightsDonutCard',          Demo: () => (
      <Section title='RightsDonutCard' summary='Donut card for healthcare-rights distribution with clickable legend. Pass `slices` to override.'>
        <Variant label='Default' stack><div style={{ maxWidth: 360 }}><RightsDonutCard /></div></Variant>
      </Section>
    ) },
    { slug: 'top10-diseases-card',         name: 'Top10DiseasesCard',        Demo: () => (
      <Section title='Top10DiseasesCard' summary='HBarList card showing top-10 diseases with click-to-pin highlight + summary tag. Pass `rows` to override.'>
        <Variant label='Default' stack><div style={{ maxWidth: 540 }}><Top10DiseasesCard /></div></Variant>
      </Section>
    ) },
    { slug: 'top10-diseases-short-card',   name: 'Top10DiseasesShortCard',   Demo: () => (
      <Section title='Top10DiseasesShortCard' summary='Compact 8-row variant of Top10DiseasesCard for tighter layouts.'>
        <Variant label='Default' stack><div style={{ maxWidth: 540 }}><Top10DiseasesShortCard /></div></Variant>
      </Section>
    ) },
    { slug: 'visit-total-card',            name: 'VisitTotalCard',           Demo: () => (
      <Section title='VisitTotalCard' summary='Donut + Stat-row card showing total visit population. Pass `segments`, `centerLabel`, `stats` to override.'>
        <Variant label='Default' stack><div style={{ maxWidth: 360 }}><VisitTotalCard /></div></Variant>
      </Section>
    ) },
    { slug: 'vitals-sign-graph',           name: 'VitalsSignGraph',          Demo: VitalsSignGraphDemo },
    { slug: 'working-age-groups-card',     name: 'WorkingAgeGroupsCard',     Demo: () => (
      <Section title='WorkingAgeGroupsCard' summary='Gauge card for working-age groups indicator (กลุ่มวัยทำงาน 8 กลุ่ม).'>
        <Variant label='Default' stack><div style={{ maxWidth: 360 }}><WorkingAgeGroupsCard /></div></Variant>
      </Section>
    ) },
  ]},
  { group: 'forms', items: [
    { slug: 'photo-upload-field',          name: 'PhotoUploadField',                         Demo: PhotoUploadFieldDemo },
    { slug: 'input-field',                 name: 'InputField',                               Demo: InputFieldDemo },
    { slug: 'input-field-range',           name: 'InputFieldRange',                          Demo: InputFieldRangeDemo },
    { slug: 'input-field-slash',           name: 'InputFieldSlash',                          Demo: InputFieldSlashDemo },
    { slug: 'textarea',                    name: 'Textarea',                                 Demo: TextareaDemo },
    { slug: 'suggestible-textarea',        name: 'SuggestibleTextarea',                      Demo: SuggestibleTextareaDemo },
    { slug: 'voice-input-field',           name: 'VoiceInputField',                          Demo: VoiceInputFieldDemo },
    { slug: 'voice-textarea',              name: 'VoiceTextarea',                            Demo: VoiceTextareaDemo },
    { slug: 'allergy-form',                name: 'AllergyForm',                              Demo: AllergyFormDemo },
    { slug: 'body-mark',                   name: 'BodyMark',                                 Demo: BodyMarkDemo },
    { slug: 'body-diagram-panel',          name: 'BodyDiagramPanel',                         Demo: BodyDiagramPanelDemo },
    { slug: 'body-record-popup',           name: 'BodyRecordPopup',                          Demo: BodyRecordPopupDemo },
    { slug: 'drawing-canvas-popup',        name: 'DrawingCanvasPopup',                       Demo: DrawingCanvasPopupDemo },
    { slug: 'calendar',                    name: 'Calendar',                                 Demo: CalendarDemo },
    { slug: 'date-picker',                 name: 'DatePicker',                               Demo: DatePickerDemo },
    { slug: 'disease-form',                name: 'DiseaseForm',                              Demo: DiseaseFormDemo },
    { slug: 'exam-notes-panel',            name: 'ExamNotesPanel',                           Demo: ExamNotesPanelDemo },
    { slug: 'exam-support-list',           name: 'ExamSupportList',                          Demo: ExamSupportListDemo },
    { slug: 'dropdown',                    name: 'Dropdown',                                 Demo: DropdownDemo },
    { slug: 'registration-form-fields-layout', name: 'Fields · Section / SubCard / Field',   Demo: RegistrationLayoutDemo },
    { slug: 'filter-date-tag',             name: 'FilterDateTag',                            Demo: FilterDateTagDemo },
    { slug: 'filter-tag',                  name: 'FilterTag',                                Demo: FilterTagDemo },
    { slug: 'forms-library',               name: 'FormsLibrary',                             Demo: FormsLibraryDemo },
    { slug: 'history-list-form',           name: 'HistoryListForm',                          Demo: HistoryListFormDemo },
    { slug: 'registration-steps',          name: 'RegistrationSteps',                        Demo: RegistrationStepsDemo },
    { slug: 'select',                      name: 'Select',                                   Demo: SelectDemo },
    { slug: 'selectable-tag',              name: 'SelectableTag',                            Demo: SelectableTagDemo },
    { slug: 'treatment-steps',             name: 'TreatmentSteps',                           Demo: TreatmentStepsDemo },
    { slug: 'vitals-form',                 name: 'VitalsForm',                               Demo: VitalsFormDemo },
  ]},
  { group: 'icons', items: [
    { slug: 'icon', name: 'Icon', Demo: IconDemo },
  ]},
  { group: 'layout', items: [
    { slug: 'footer',                   name: 'Footer',                  Demo: FooterDemo },
    { slug: 'header',                   name: 'Header',                  Demo: HeaderDemo },
    { slug: 'sidebar',                  name: 'Sidebar',                 Demo: SidebarDemo },
    { slug: 'side-submenu',             name: 'SideSubMenu',             Demo: SideSubMenuDemo },
    { slug: 'sub-header',               name: 'SubHeader',               Demo: SubHeaderDemo },
    { slug: 'summary-cards-bar',        name: 'SummaryCardsBar',         Demo: SummaryCardsBarDemo },
  ]},
  { group: 'templates', items: [
    { slug: 'queue-page-shell',         name: 'QueuePageShell',          Demo: QueuePageShellDemo },
    { slug: 'form-shell',               name: 'FormShell',               Demo: FormShellDemo },
    { slug: 'treatment-form-shell',     name: 'TreatmentFormShell',      Demo: TreatmentFormShellDemo },
  ]},
  { group: 'popup', items: [
    { slug: 'alert-dialog',                name: 'AlertDialog',             Demo: AlertDialogDemo },
    { slug: 'date-filter-popup',           name: 'DateFilterPopup',         Demo: DateFilterPopupDemo },
    { slug: 'popover',                     name: 'Popover',                 Demo: PopoverDemo },
    { slug: 'popup',                       name: 'Popup',                   Demo: PopupDemo },
    { slug: 'profile-popover',             name: 'ProfilePopover',          Demo: ProfilePopoverDemo },
    { slug: 'settings-modal',              name: 'SettingsModal',           Demo: SettingsModalDemo },
    { slug: 'vitals-graph-popup',          name: 'VitalsGraphPopup',        Demo: VitalsGraphPopupDemo },
    { slug: 'vitals-sign-graph-dialog',    name: 'VitalsSignGraphDialog',   Demo: VitalsSignGraphDialogDemo },
  ]},
  { group: 'list', items: [
    { slug: 'action-list', name: 'ActionList', Demo: ActionListDemo },
    { slug: 'service-date-list', name: 'ServiceDateList', Demo: ServiceDateListDemo },
  ]},
  { group: 'pagination', items: [
    { slug: 'pagination', name: 'Pagination', Demo: PaginationDemo },
  ]},
  { group: 'search', items: [
    { slug: 'primary-search',              name: 'PrimarySearch',           Demo: PrimarySearchDemo },
    { slug: 'ai-search',                   name: 'AISearch',                Demo: AISearchDemo },
    { slug: 'secondary-search',            name: 'SecondarySearch',         Demo: SecondarySearchDemo },
  ]},
  { group: 'step', items: [
    { slug: 'step',                        name: 'Step',                    Demo: StepDemo },
    { slug: 'stepper',                     name: 'Stepper',                 Demo: StepperDemo },
    { slug: 'step-progress',               name: 'StepProgress',             Demo: StepProgressDemo },
  ]},
  { group: 'tab', items: [
    { slug: 'tab-pill',                    name: 'TabPill',                 Demo: TabPillDemo },
    { slug: 'tab-underline',               name: 'TabUnderline',            Demo: TabUnderlineDemo },
    { slug: 'tab-capsule',                 name: 'TabCapsule',              Demo: TabCapsuleDemo },
  ]},
  { group: 'timeline', items: [
    { slug: 'history-timeline',            name: 'HistoryTimeline',         Demo: HistoryTimelineDemo },
  ]},
  { group: 'table', items: [
    { slug: 'table',                       name: 'Table',                   Demo: TableDemo },
  ]},
];

const linkStyle = {
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  textDecoration: 'none',
};

const ALL_ITEMS = REGISTRY.flatMap((g) => g.items);

/* ── Layout ─────────────────────────────────────────────── */

/* 10 brand modes (per design.md §6.27.2). Each swatch shows the
   representative brand-p600 hex pulled from src/index.css. Clicking a
   swatch flips <html data-brand="..."> so every component aliased
   through --brand-p* retints instantly. Persisted in localStorage so
   the choice survives reload + carries over to /dashboard (Sidebar's
   SettingsModal uses the same key). */
const BRAND_MODES = [
  { key: 'default',        label: 'Default (Emerald)', color: '#08A768' },
  { key: 'soft-sky',       label: 'Soft Sky',          color: '#8EC4E5' },
  { key: 'soft-peach',     label: 'Soft Peach',        color: '#E88A66' },
  { key: 'rose-mist',      label: 'Rose Mist',         color: '#D49A99' },
  { key: 'sakura',         label: 'Sakura',            color: '#E89DBA' },
  { key: 'soft-lavender',  label: 'Soft Lavender',     color: '#9D87D8' },
  { key: 'blue-serenity',  label: 'Blue Serenity',     color: '#7A8CF0' },
  { key: 'muted-teal',     label: 'Muted Teal',        color: '#5A7D7A' },
  { key: 'warm-gray',      label: 'Warm Gray',         color: '#726760' },
  { key: 'dusty-mauve',    label: 'Dusty Mauve',       color: '#7E5A60' },
];

const readBrandPref = () => {
  if (typeof window === 'undefined') return 'default';
  try { return window.localStorage.getItem('phcis.theme') || 'default'; }
  catch { return 'default'; }
};

const applyBrandToDocument = (key) => {
  if (typeof document === 'undefined') return;
  if (key && key !== 'default') {
    document.documentElement.setAttribute('data-brand', key);
  } else {
    document.documentElement.removeAttribute('data-brand');
  }
};

const BrandThemeSwitcher = () => {
  const [active, setActive] = useState(readBrandPref);
  /* Apply on mount + whenever the choice flips. */
  useEffect(() => { applyBrandToDocument(active); }, [active]);
  const select = (key) => {
    setActive(key);
    try { window.localStorage.setItem('phcis.theme', key); } catch (_e) { /* ignore */ }
  };
  return (
    <div
      role='radiogroup'
      aria-label='Brand color mode'
      className='inline-flex items-center'
      style={{
        gap: 'var(--dim-space-150, 6px)',
        padding: 'var(--dim-space-100, 4px) var(--dim-space-200, 8px)',
        borderRadius: 'var(--dim-radius-600, 24px)',
        background: 'var(--surface-card-200, #F4F5F5)',
        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      }}
    >
      {BRAND_MODES.map((m) => {
        const isActive = m.key === active;
        return (
          <button
            key={m.key}
            type='button'
            role='radio'
            aria-checked={isActive}
            aria-label={m.label}
            title={m.label}
            onClick={() => select(m.key)}
            style={{
              width: 20, height: 20,
              borderRadius: '50%',
              background: m.color,
              border: isActive
                ? '2px solid var(--text-content-default, #363B3F)'
                : '2px solid transparent',
              padding: 'var(--dim-space-0)', cursor: 'pointer', position: 'relative',
              boxShadow: isActive ? '0 0 0 1px #FFFFFF inset' : 'none',
              transition: 'transform 160ms cubic-bezier(0.32, 0.72, 0, 1), border-color 160ms ease',
              transform: isActive ? 'scale(1.0)' : 'scale(0.9)',
              outline: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = isActive ? 'scale(1.0)' : 'scale(0.9)'; }}
          />
        );
      })}
    </div>
  );
};

const TopBar = () => (
  <header
    className='flex items-center w-full shrink-0'
    style={{
      height: 56,
      paddingLeft: 'var(--dim-space-500)',
      paddingRight: 'var(--dim-space-500)',
      background: 'var(--surface-card-100)',
      borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
      gap: 'var(--dim-space-400)',
    }}
  >
    <Link to='/components' style={{ textDecoration: 'none' }}>
      <span style={{
        color: 'var(--text-brandPrimary-default)',
        fontFamily: 'var(--type-family-heading-content)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        fontSize: 'var(--type-size-base)',
      }}>MIH · Components Library</span>
    </Link>
    <span style={{
      color: 'var(--text-content-tertiary)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs)',
    }}>Standalone — separate from PHCIS</span>
    <div className='flex-1' />
    <BrandThemeSwitcher />
    <Link to='/dashboard' style={{
      ...linkStyle,
      color: 'var(--text-content-secondary)',
    }}>← กลับเข้าระบบ PHCIS</Link>
  </header>
);

/* Side-menu link with hover state — useState because we need to swap
   background, text colour, and the 3px brand-tinted left border in concert,
   which is awkward with Tailwind arbitrary `hover:` modifiers on CSS vars. */
const SideMenuLink = ({ item, isActive }) => {
  const [hover, setHover] = useState(false);
  const tinted = isActive || hover;
  return (
    <Link
      to={`/components/${item.slug}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className='block'
      style={{
        padding: 'var(--dim-space-200) var(--dim-space-500)',
        color: tinted ? 'var(--text-brandPrimary-default)' : 'var(--text-content-default)',
        background: isActive
          ? 'var(--surface-brandPrimary-tertiary)'
          : hover
            ? 'var(--surface-brandPrimary-quaternary)'
            : 'transparent',
        borderLeft: `3px solid ${
          isActive
            ? 'var(--text-brandPrimary-default)'
            : hover
              ? 'var(--border-brandPrimary-tertiary)'
              : 'transparent'
        }`,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: isActive ? 'var(--type-weight-medium)' : 'var(--type-weight-regular)',
        textDecoration: 'none',
        transition: 'background-color 150ms ease, color 150ms ease, border-color 150ms ease',
      }}
    >
      {item.name}
    </Link>
  );
};

/* Collapsible group section — header acts as toggle button. The group
   containing the active slug is force-expanded so the user can always see
   their current selection highlighted. */
const SideMenuGroup = ({ group, activeSlug }) => {
  const containsActive = group.items.some((it) => it.slug === activeSlug);
  const [collapsed, setCollapsed] = useState(false);
  const [headerHover, setHeaderHover] = useState(false);
  const isOpen = !collapsed || containsActive;
  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
      <button
        type='button'
        onClick={() => setCollapsed((c) => !c)}
        onMouseEnter={() => setHeaderHover(true)}
        onMouseLeave={() => setHeaderHover(false)}
        aria-expanded={isOpen}
        className='flex items-center w-full'
        style={{
          gap: 'var(--dim-space-200)',
          padding: 'var(--dim-space-100) var(--dim-space-500)',
          color: headerHover ? 'var(--text-brandPrimary-default)' : 'var(--text-content-tertiary)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          fontWeight: 'var(--type-weight-medium)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          transition: 'color 150ms ease',
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            transition: 'transform 150ms ease',
            transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        >
          <Icon name='chevron-down' size={12} />
        </span>
        <span className='flex-1 text-left'>{group.group}</span>
        <span
          style={{
            color: 'var(--text-content-tertiary)',
            fontWeight: 'var(--type-weight-regular)',
            letterSpacing: 0,
            textTransform: 'none',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {group.items.length}
        </span>
      </button>
      {isOpen && group.items.map((item) => (
        <SideMenuLink key={item.slug} item={item} isActive={item.slug === activeSlug} />
      ))}
    </div>
  );
};

const SideMenu = ({ activeSlug }) => (
  <nav
    className='flex flex-col shrink-0'
    style={{
      width: 260,
      background: 'var(--surface-card-100)',
      borderRight: 'var(--dim-stroke-100) solid var(--border-card-default)',
      padding: 'var(--dim-space-400) 0',
      gap: 'var(--dim-space-400)',
      overflowY: 'auto',
    }}
  >
    {REGISTRY.map((group) => (
      <SideMenuGroup key={group.group} group={group} activeSlug={activeSlug} />
    ))}
  </nav>
);

const LandingDemo = () => (
  <Section title='Welcome' summary='Pick a component from the left to inspect its variants. This library is intentionally separate from the PHCIS app — none of the chrome here ships in production.'>
    <Variant label='Components in this library'>
      <span style={{
        color: 'var(--text-content-secondary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
      }}>
        {ALL_ITEMS.length} components across {REGISTRY.length} groups.
      </span>
    </Variant>
  </Section>
);

const WIDE_PREVIEW_SLUGS = new Set([
  'treatment-steps',
  'treatment-form-shell',
  'body-diagram-panel',
  'body-record-popup',
  'exam-notes-panel',
  'exam-support-list',
]);

const ComponentsLibraryPage = () => {
  const { slug } = useParams();
  const history = useHistory();
  const location = useLocation();
  const item = slug ? ALL_ITEMS.find((i) => i.slug === slug) : null;

  if (slug && !item) {
    /* Unknown slug → bounce to landing. */
    history.replace('/components');
    return null;
  }

  /* Embedded mode — `?embed=1` hides this page's own side rail so the
     outer design-system.html doesn't duplicate component navigation.
     The TopBar (brand switcher) stays because picking a brand is still
     useful inside the iframe preview. */
  const embedded = new URLSearchParams(location.search).get('embed') === '1';

  const Demo = item ? item.Demo : LandingDemo;
  const contentMaxWidth = slug && WIDE_PREVIEW_SLUGS.has(slug) ? 1280 : 960;

  return (
    <div className='flex flex-col w-full h-screen' style={{ background: '#F4F5F5' }}>
      <TopBar />
      <div className='flex flex-1 min-h-0'>
        {!embedded && <SideMenu activeSlug={slug} />}
        <main
          className='flex-1 min-w-0'
          style={{
            padding: 'var(--dim-space-600)',
            overflowY: 'auto',
          }}
        >
          <div className='mx-auto' style={{ maxWidth: contentMaxWidth }}>
            <Demo />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ComponentsLibraryPage;
