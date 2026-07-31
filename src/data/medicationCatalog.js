/* Medication name → blister-pack image catalog.
   Single source of truth for AddMedicationPopup, Step-5 table
   (MedImageTile), FrequentOrdersCard chips, and Re-Medicine rows.

   Only six dedicated PNGs exist under public/images/medications/;
   everything else aliases to the closest match or the ibuprofen
   placeholder tile until more assets land. */

export const MED_IMG_DIR = '/images/medications';
export const FALLBACK_MED_IMG = `${MED_IMG_DIR}/med-ibuprofen.png`;

export const medImg = (slug) => `${MED_IMG_DIR}/med-${slug}.png`;

/* Slug inferred from the leading token of a drug name (case-insensitive). */
const SLUG_FROM_NAME = [
  ['paracetamol', 'paracetamol'],
  ['ibuprofen', 'ibuprofen'],
  ['methocarbamol', 'methocarbamol'],
  ['amoxicillin', 'amoxicillin'],
  ['omeprazole', 'omeprazole'],
  ['esomeprazole', 'omeprazole'],
  ['cetirizine', 'cetirizine'],
  ['loratadine', 'cetirizine'],
  ['orphenadrine', 'ibuprofen'],
];

const normKey = (name) => (
  (name || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\w\u0E00-\u0E7F()]/g, '')
);

export const MEDICATION_NAME_OPTIONS = [
  { value: 'Paracetamol 500 mg',         image: medImg('paracetamol')   },
  { value: 'Ibuprofen 400 mg',            image: medImg('ibuprofen')     },
  { value: 'Methocarbamol 750 mg',        image: medImg('methocarbamol') },
  { value: 'Orphenadrine 35 mg',          image: FALLBACK_MED_IMG        },
  { value: 'Omeprazole 20 mg',            image: medImg('omeprazole')    },
  { value: 'Esomeprazole 40 mg',          image: medImg('omeprazole')    },
  { value: 'Amoxicillin 500 mg',          image: medImg('amoxicillin')   },
  { value: 'Ciprofloxacin 500 mg',        image: FALLBACK_MED_IMG        },
  { value: 'Cetirizine 10 mg',            image: medImg('cetirizine')    },
  { value: 'Loratadine 10 mg',            image: medImg('cetirizine')    },
  { value: 'Loperamide 2 mg',             image: FALLBACK_MED_IMG        },
  { value: 'Naproxen 250 mg',             image: FALLBACK_MED_IMG        },
  { value: 'Metformin 500 mg',            image: FALLBACK_MED_IMG        },
  { value: 'Amlodipine 5 mg',             image: FALLBACK_MED_IMG        },
  { value: 'Enalapril 5 mg',              image: FALLBACK_MED_IMG        },
  { value: 'VILERM (Aciclovir 400 mg)',   image: FALLBACK_MED_IMG        },
  { value: 'Losartan 50 mg',              image: FALLBACK_MED_IMG        },
  { value: 'Hydrochlorothiazide 25 mg',   image: FALLBACK_MED_IMG        },
  { value: 'Metoprolol 50 mg',            image: FALLBACK_MED_IMG        },
  { value: 'Atorvastatin 20 mg',          image: FALLBACK_MED_IMG        },
  { value: 'Atorvastatin 10 mg',          image: FALLBACK_MED_IMG        },
  { value: 'Aspirin 81 mg',               image: FALLBACK_MED_IMG        },
  { value: 'Furosemide 40 mg',            image: FALLBACK_MED_IMG        },
  { value: 'Bisoprolol 5 mg',             image: FALLBACK_MED_IMG        },
  { value: 'Spironolactone 25 mg',        image: FALLBACK_MED_IMG        },
  { value: 'Simvastatin 20 mg',           image: FALLBACK_MED_IMG        },
  { value: 'Atenolol 50 mg',              image: FALLBACK_MED_IMG        },
  { value: 'Indapamide 1.5 mg',           image: FALLBACK_MED_IMG        },
  { value: 'Vitamin B Complex',           image: FALLBACK_MED_IMG        },
  { value: 'Folic Acid 5 mg',             image: FALLBACK_MED_IMG        },
  /* Two genuinely controlled drugs (real Thai Narcotics/Psychotropic Substances
     Act schedules, not fabricated) so pharmacyRegistry.js's "ยาเสพติดให้โทษ" /
     "วัตถุออกฤทธิ์ต่อจิตและประสาท" classifications have a real seed row each
     instead of sitting unused as selectable-but-empty categories. */
  { value: 'Codeine Phosphate 30 mg',     image: FALLBACK_MED_IMG        },
  { value: 'Diazepam 5 mg',               image: FALLBACK_MED_IMG        },
  /* Aliases for mock rows that omit the space before "mg". */
  { value: 'Paracetamol 500mg',           image: medImg('paracetamol')   },
  { value: 'Ibuprofen 400mg',             image: medImg('ibuprofen')     },
  { value: 'Methocarbamol 750mg',         image: medImg('methocarbamol') },
  { value: 'Amoxicillin 500mg',           image: medImg('amoxicillin')   },
  { value: 'Omeprazole 20mg',             image: medImg('omeprazole')    },
].map((opt) => ({ ...opt, label: opt.value }));

const IMAGE_BY_KEY = new Map(
  MEDICATION_NAME_OPTIONS.map((o) => [normKey(o.value), o.image]),
);

const slugFromName = (name) => {
  const lower = (name || '').toLowerCase();
  for (const [needle, slug] of SLUG_FROM_NAME) {
    if (lower.includes(needle)) return slug;
  }
  return null;
};

/** Resolve a displayable medication image URL for table tiles / popups. */
export const resolveMedicationImage = (name, explicitSrc) => {
  if (explicitSrc && String(explicitSrc).trim()) return explicitSrc;
  if (!name) return '';
  const keyed = IMAGE_BY_KEY.get(normKey(name));
  if (keyed) return keyed;
  const slug = slugFromName(name);
  if (slug) return medImg(slug);
  return FALLBACK_MED_IMG;
};
