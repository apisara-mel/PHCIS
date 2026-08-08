/* Mock Thai Medicines Terminology (TMT) national catalog — ToR §1.9.1 /
   §1.9.10 / §5.1.2 (TMT · GPU · TPU · GPO).

   Prototype stand-in for THIS TMT Release / TMT Browser. Used when adding
   a drug to the facility registry: staff search by code or name first,
   then pick a row to seed the local registry form. */

import { DRUG_REGISTRY } from '@/data/pharmacyRegistry';
import { resolveMedicationImage } from '@/data/medicationCatalog';

export const TMT_CATALOG = [
  /* ── Already seeded in facility DRUG_REGISTRY (demo “already added”) ── */
  {
    gpuCode: '202475', tpuCode: '301001', gpoCode: 'GPO-PCM-500',
    name: 'Paracetamol 500 mg', genericName: 'Paracetamol', tradeName: 'Sara',
    strength: '500 mg', unit: 'tablet', packSize: 100, classification: 'nlem',
    highAlert: false, manufacturer: 'องค์การเภสัชกรรม (GPO)', distributor: 'องค์การเภสัชกรรม (GPO)',
  },
  {
    gpuCode: '202480', tpuCode: '301002', gpoCode: 'GPO-AMX-500',
    name: 'Amoxicillin 500 mg', genericName: 'Amoxicillin', tradeName: '',
    strength: '500 mg', unit: 'capsule', packSize: 100, classification: 'nlem',
    highAlert: false, manufacturer: 'องค์การเภสัชกรรม (GPO)', distributor: 'องค์การเภสัชกรรม (GPO)',
  },
  {
    gpuCode: '202490', tpuCode: '301003', gpoCode: 'GPO-MET-500',
    name: 'Metformin 500 mg', genericName: 'Metformin', tradeName: '',
    strength: '500 mg', unit: 'tablet', packSize: 100, classification: 'nlem',
    highAlert: false, manufacturer: 'องค์การเภสัชกรรม (GPO)', distributor: 'บริษัท ดีเคเอสเอช (ประเทศไทย) จำกัด',
  },
  {
    gpuCode: '202500', tpuCode: '301004', gpoCode: '',
    name: 'Omeprazole 20 mg', genericName: 'Omeprazole', tradeName: '',
    strength: '20 mg', unit: 'capsule', packSize: 28, classification: 'nlem',
    highAlert: false, manufacturer: 'Siam Pharmaceutical', distributor: 'บริษัท ดีเคเอสเอช (ประเทศไทย) จำกัด',
  },
  {
    gpuCode: '202510', tpuCode: '301005', gpoCode: '',
    name: 'Amlodipine 5 mg', genericName: 'Amlodipine', tradeName: '',
    strength: '5 mg', unit: 'tablet', packSize: 30, classification: 'nlem',
    highAlert: false, manufacturer: 'Berlin Pharmaceutical', distributor: 'บริษัท ซิลลิค ฟาร์มา จำกัด',
  },
  {
    gpuCode: '202520', tpuCode: '301006', gpoCode: '',
    name: 'Losartan 50 mg', genericName: 'Losartan', tradeName: '',
    strength: '50 mg', unit: 'tablet', packSize: 30, classification: 'nlem',
    highAlert: false, manufacturer: 'Siam Pharmaceutical', distributor: 'บริษัท ดีเคเอสเอช (ประเทศไทย) จำกัด',
  },
  {
    gpuCode: '209900', tpuCode: '309901', gpoCode: '',
    name: 'Codeine Phosphate 30 mg', genericName: 'Codeine Phosphate', tradeName: '',
    strength: '30 mg', unit: 'tablet', packSize: 20, classification: 'narcotic',
    highAlert: true, manufacturer: 'องค์การเภสัชกรรม (GPO)', distributor: 'องค์การเภสัชกรรม (GPO)',
  },
  {
    gpuCode: '209910', tpuCode: '309902', gpoCode: '',
    name: 'Diazepam 5 mg', genericName: 'Diazepam', tradeName: '',
    strength: '5 mg', unit: 'tablet', packSize: 50, classification: 'psychotropic',
    highAlert: true, manufacturer: 'องค์การเภสัชกรรม (GPO)', distributor: 'องค์การเภสัชกรรม (GPO)',
  },

  /* ── National catalog rows NOT yet in facility registry (addable) ── */
  {
    gpuCode: '202530', tpuCode: '301020', gpoCode: 'GPO-LOS-100',
    name: 'Losartan 100 mg', genericName: 'Losartan', tradeName: '',
    strength: '100 mg', unit: 'tablet', packSize: 30, classification: 'nlem',
    highAlert: false, manufacturer: 'องค์การเภสัชกรรม (GPO)', distributor: 'องค์การเภสัชกรรม (GPO)',
  },
  {
    gpuCode: '202540', tpuCode: '301021', gpoCode: 'GPO-AMX-250',
    name: 'Amoxicillin 250 mg', genericName: 'Amoxicillin', tradeName: '',
    strength: '250 mg', unit: 'capsule', packSize: 100, classification: 'nlem',
    highAlert: false, manufacturer: 'องค์การเภสัชกรรม (GPO)', distributor: 'องค์การเภสัชกรรม (GPO)',
  },
  {
    gpuCode: '202550', tpuCode: '301022', gpoCode: '',
    name: 'Prednisolone 5 mg', genericName: 'Prednisolone', tradeName: '',
    strength: '5 mg', unit: 'tablet', packSize: 100, classification: 'nlem',
    highAlert: true, manufacturer: 'Berlin Pharmaceutical', distributor: 'บริษัท ซิลลิค ฟาร์มา จำกัด',
  },
  {
    gpuCode: '202560', tpuCode: '301023', gpoCode: '',
    name: 'Salbutamol 2 mg', genericName: 'Salbutamol', tradeName: 'Ventolin',
    strength: '2 mg', unit: 'tablet', packSize: 100, classification: 'nlem',
    highAlert: false, manufacturer: 'GlaxoSmithKline', distributor: 'บริษัท ดีเคเอสเอช (ประเทศไทย) จำกัด',
  },
  {
    gpuCode: '202570', tpuCode: '301024', gpoCode: 'GPO-PCM-650',
    name: 'Paracetamol 650 mg', genericName: 'Paracetamol', tradeName: '',
    strength: '650 mg', unit: 'tablet', packSize: 100, classification: 'nlem',
    highAlert: false, manufacturer: 'องค์การเภสัชกรรม (GPO)', distributor: 'องค์การเภสัชกรรม (GPO)',
  },
  {
    gpuCode: '202580', tpuCode: '301025', gpoCode: '',
    name: 'Cetirizine 5 mg', genericName: 'Cetirizine', tradeName: '',
    strength: '5 mg', unit: 'tablet', packSize: 50, classification: 'non-nlem',
    highAlert: false, manufacturer: 'Siam Pharmaceutical', distributor: 'บริษัท ดีเคเอสเอช (ประเทศไทย) จำกัด',
  },
  {
    gpuCode: '202590', tpuCode: '301026', gpoCode: '',
    name: 'Omeprazole 40 mg', genericName: 'Omeprazole', tradeName: '',
    strength: '40 mg', unit: 'capsule', packSize: 28, classification: 'nlem',
    highAlert: false, manufacturer: 'Siam Pharmaceutical', distributor: 'บริษัท ดีเคเอสเอช (ประเทศไทย) จำกัด',
  },
  {
    gpuCode: '202600', tpuCode: '301027', gpoCode: '',
    name: 'Warfarin 5 mg', genericName: 'Warfarin', tradeName: '',
    strength: '5 mg', unit: 'tablet', packSize: 100, classification: 'nlem',
    highAlert: true, manufacturer: 'Berlin Pharmaceutical', distributor: 'บริษัท ซิลลิค ฟาร์มา จำกัด',
  },
  {
    gpuCode: '202610', tpuCode: '301028', gpoCode: 'GPO-ASA-300',
    name: 'Aspirin 300 mg', genericName: 'Aspirin', tradeName: '',
    strength: '300 mg', unit: 'tablet', packSize: 100, classification: 'nlem',
    highAlert: false, manufacturer: 'องค์การเภสัชกรรม (GPO)', distributor: 'องค์การเภสัชกรรม (GPO)',
  },
  {
    gpuCode: '202620', tpuCode: '301029', gpoCode: '',
    name: 'Gabapentin 300 mg', genericName: 'Gabapentin', tradeName: '',
    strength: '300 mg', unit: 'capsule', packSize: 30, classification: 'non-nlem',
    highAlert: false, manufacturer: 'Siam Pharmaceutical', distributor: 'บริษัท ดีเคเอสเอช (ประเทศไทย) จำกัด',
  },
  {
    gpuCode: '202630', tpuCode: '301030', gpoCode: '',
    name: 'Insulin Glargine 100 IU/mL', genericName: 'Insulin Glargine', tradeName: 'Lantus',
    strength: '100 IU/mL', unit: 'ml', packSize: 1, classification: 'nlem',
    highAlert: true, manufacturer: 'Sanofi', distributor: 'บริษัท ซิลลิค ฟาร์มา จำกัด',
  },
  {
    gpuCode: '202640', tpuCode: '301031', gpoCode: '',
    name: 'Clopidogrel 75 mg', genericName: 'Clopidogrel', tradeName: 'Plavix',
    strength: '75 mg', unit: 'tablet', packSize: 28, classification: 'nlem',
    highAlert: false, manufacturer: 'Sanofi', distributor: 'บริษัท ดีเคเอสเอช (ประเทศไทย) จำกัด',
  },
].map((row) => ({
  ...row,
  id: `tmt-${row.tpuCode}`,
  image: resolveMedicationImage(row.name, null),
}));

/** Case-insensitive search by GPU / TPU / GPO / name / generic / trade. */
export const searchTmtCatalog = (query, { limit = 20 } = {}) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  return TMT_CATALOG
    .filter((d) => (
      d.gpuCode.toLowerCase().includes(q)
      || d.tpuCode.toLowerCase().includes(q)
      || (d.gpoCode || '').toLowerCase().includes(q)
      || d.name.toLowerCase().includes(q)
      || d.genericName.toLowerCase().includes(q)
      || (d.tradeName || '').toLowerCase().includes(q)
    ))
    .slice(0, limit);
};

/** Match a TMT row to an existing facility registry drug (by name / TPU as code). */
export const findFacilityRegistryMatch = (tmtRow) => {
  if (!tmtRow) return null;
  const nameKey = (tmtRow.name || '').replace(/\s+/g, ' ').toLowerCase();
  return DRUG_REGISTRY.find((d) => {
    const dName = (d.name || '').replace(/\s+/g, ' ').toLowerCase();
    return dName === nameKey
      || d.code === tmtRow.tpuCode
      || d.code === tmtRow.gpuCode
      || d.code === tmtRow.gpoCode;
  }) || null;
};

/** Map a TMT catalog row into PharmacyRegistryEditor form fields. */
export const tmtRowToRegistryForm = (tmtRow) => {
  const unit = tmtRow.unit || 'tablet';
  /* Liquid forms (ขวด/หลอด) use UNIT_CONVERSIONS defaults in the editor;
     other forms keep packSize as “ต่อกล่อง”. */
  return {
    code: tmtRow.tpuCode || tmtRow.gpuCode || '',
    name: tmtRow.name || '',
    genericName: tmtRow.genericName || '',
    tradeName: tmtRow.tradeName || '',
    unit,
    packSize: tmtRow.packSize || 100,
    convertToUnit: unit === 'ml' ? 'ml' : unit,
    classification: tmtRow.classification || 'nlem',
    highAlert: !!tmtRow.highAlert,
    manufacturer: tmtRow.manufacturer || '',
    distributor: tmtRow.distributor || '',
    /* Carry catalog blister pack into the form; staff can replace via upload. */
    image: tmtRow.image || resolveMedicationImage(tmtRow.name, null) || '',
    tmtGpu: tmtRow.gpuCode || '',
    tmtTpu: tmtRow.tpuCode || '',
    tmtGpo: tmtRow.gpoCode || '',
  };
};

/* localStorage key for PrimarySearch recent history on add-registry. */
export const TMT_SEARCH_HISTORY_KEY = 'mih:primarysearch-history:pharmacy-registry-tmt';

/** AISearch / Doctor AI row shape — same contract as `icdToRow`
    (badge + label + highlight + add_circle). */
export const tmtToAiSearchRow = (tmtRow) => {
  if (!tmtRow) return null;
  const trade = (tmtRow.tradeName || '').trim();
  const label = trade
    ? `${tmtRow.name} (${trade})`
    : tmtRow.genericName && tmtRow.genericName !== tmtRow.name
      ? `${tmtRow.name} (${tmtRow.genericName})`
      : tmtRow.name;
  return {
    id: tmtRow.id,
    label,
    badge: tmtRow.tpuCode,
    badgeStyle: 'blue',
    value: tmtRow.name,
    avatarSrc: tmtRow.image || resolveMedicationImage(tmtRow.name, null) || undefined,
    /* Stash ids so the confirm popup / form seed can resolve the full row. */
    tmtId: tmtRow.id,
    gpuCode: tmtRow.gpuCode,
    tpuCode: tmtRow.tpuCode,
    gpoCode: tmtRow.gpoCode || '',
  };
};

/** Rich "ค้นหาล่าสุด" row for AISearch (code badge + name). */
export const buildTmtSearchHistoryItem = (tmtRow, { id } = {}) => {
  const row = tmtToAiSearchRow(tmtRow);
  if (!row) return null;
  return { ...row, id: id || `tmt-hist-${tmtRow.tpuCode}` };
};

export const getTmtById = (id) => TMT_CATALOG.find((r) => r.id === id) || null;
export const getTmtByTpu = (tpu) => TMT_CATALOG.find((r) => r.tpuCode === String(tpu || '')) || null;

/** Seed recent searches so the empty-focus dropdown shows mock history
    on first visit (before the pharmacist has searched anything). Prefers
    addable catalog rows so clicking a recent item is useful. */
export const buildTmtSearchHistorySeed = (count = 5) => {
  const addable = TMT_CATALOG.filter((r) => !findFacilityRegistryMatch(r));
  const pool = addable.length >= count
    ? addable
    : [...addable, ...TMT_CATALOG.filter((r) => findFacilityRegistryMatch(r))];
  return pool.slice(0, count).map((row, i) => buildTmtSearchHistoryItem(row, { id: `tmt-seed-${i + 1}` })).filter(Boolean);
};

/** Build a history entry from a free-text submit (or a picked rich item). */
export const createTmtRecentSearchEntry = (query, item) => {
  if (item && (item.label || item.value)) {
    return {
      id: item.id || `tmt-q-${Date.now()}`,
      label: item.label || item.value || query,
      sublabel: item.sublabel,
      value: item.value || item.label || query,
      avatarSrc: item.avatarSrc,
      badges: item.badges,
      badge: item.badge,
      badgeStyle: item.badgeStyle,
      icon: item.icon,
    };
  }
  const q = String(query || '').trim();
  if (!q) return null;
  const match = searchTmtCatalog(q, { limit: 1 })[0];
  if (match) return buildTmtSearchHistoryItem(match, { id: `tmt-q-${match.tpuCode}` });
  return { id: `tmt-q-${q.toLowerCase()}`, label: q, value: q, icon: 'schedule' };
};
