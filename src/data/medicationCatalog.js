/* Medication name → blister-pack image catalog.
   Single source of truth for AddMedicationPopup, Step-5 table
   (MedImageTile), FrequentOrdersCard chips, Re-Medicine rows,
   and pharmacy registry / dispense tiles.

   Each catalog drug maps to its own `med-{slug}.png` under
   public/images/medications/ — name on the tablet must match the drug. */

export const MED_IMG_DIR = '/images/medications';
export const FALLBACK_MED_IMG = `${MED_IMG_DIR}/med-ibuprofen.png`;

export const medImg = (slug) => `${MED_IMG_DIR}/med-${slug}.png`;

/* Slug inferred from the leading token of a drug name (case-insensitive).
   Longest / most-specific needles first where needed. */
const SLUG_FROM_NAME = [
  ['hydrochlorothiazide', 'hydrochlorothiazide'],
  ['spironolactone', 'spironolactone'],
  ['methocarbamol', 'methocarbamol'],
  ['ciprofloxacin', 'ciprofloxacin'],
  ['orphenadrine', 'orphenadrine'],
  ['esomeprazole', 'esomeprazole'],
  ['atorvastatin', 'atorvastatin'],
  ['simvastatin', 'simvastatin'],
  ['amoxicillin', 'amoxicillin'],
  ['paracetamol', 'paracetamol'],
  ['omeprazole', 'omeprazole'],
  ['metoprolol', 'metoprolol'],
  ['indapamide', 'indapamide'],
  ['bisoprolol', 'bisoprolol'],
  ['furosemide', 'furosemide'],
  ['loratadine', 'loratadine'],
  ['loperamide', 'loperamide'],
  ['cetirizine', 'cetirizine'],
  ['amlodipine', 'amlodipine'],
  ['metformin', 'metformin'],
  ['enalapril', 'enalapril'],
  ['aciclovir', 'aciclovir'],
  ['acyclovir', 'aciclovir'],
  ['ibuprofen', 'ibuprofen'],
  ['naproxen', 'naproxen'],
  ['losartan', 'losartan'],
  ['atenolol', 'atenolol'],
  ['diazepam', 'diazepam'],
  ['folic acid', 'folic-acid'],
  ['folicacid', 'folic-acid'],
  ['vitamin b', 'vitamin-b'],
  ['vitaminb', 'vitamin-b'],
  ['aspirin', 'aspirin'],
  ['codeine', 'codeine'],
  ['vilerm', 'aciclovir'],
];

const normKey = (name) => (
  (name || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\w\u0E00-\u0E7F()]/g, '')
);

export const MEDICATION_NAME_OPTIONS = [
  { value: 'Paracetamol 500 mg',         image: medImg('paracetamol')         },
  { value: 'Ibuprofen 400 mg',            image: medImg('ibuprofen')           },
  { value: 'Methocarbamol 750 mg',        image: medImg('methocarbamol')       },
  { value: 'Orphenadrine 35 mg',          image: medImg('orphenadrine')        },
  { value: 'Omeprazole 20 mg',            image: medImg('omeprazole')          },
  { value: 'Esomeprazole 40 mg',          image: medImg('esomeprazole')        },
  { value: 'Amoxicillin 500 mg',          image: medImg('amoxicillin')         },
  { value: 'Ciprofloxacin 500 mg',        image: medImg('ciprofloxacin')       },
  { value: 'Cetirizine 10 mg',            image: medImg('cetirizine')          },
  { value: 'Loratadine 10 mg',            image: medImg('loratadine')          },
  { value: 'Loperamide 2 mg',             image: medImg('loperamide')          },
  { value: 'Naproxen 250 mg',             image: medImg('naproxen')            },
  { value: 'Metformin 500 mg',            image: medImg('metformin')           },
  { value: 'Amlodipine 5 mg',             image: medImg('amlodipine')          },
  { value: 'Enalapril 5 mg',              image: medImg('enalapril')           },
  { value: 'VILERM (Aciclovir 400 mg)',   image: medImg('aciclovir')           },
  { value: 'Losartan 50 mg',              image: medImg('losartan')            },
  { value: 'Hydrochlorothiazide 25 mg',   image: medImg('hydrochlorothiazide') },
  { value: 'Metoprolol 50 mg',            image: medImg('metoprolol')          },
  { value: 'Atorvastatin 20 mg',          image: medImg('atorvastatin')        },
  { value: 'Atorvastatin 10 mg',          image: medImg('atorvastatin')        },
  { value: 'Aspirin 81 mg',               image: medImg('aspirin')             },
  { value: 'Furosemide 40 mg',            image: medImg('furosemide')          },
  { value: 'Bisoprolol 5 mg',             image: medImg('bisoprolol')          },
  { value: 'Spironolactone 25 mg',        image: medImg('spironolactone')      },
  { value: 'Simvastatin 20 mg',           image: medImg('simvastatin')         },
  { value: 'Atenolol 50 mg',              image: medImg('atenolol')            },
  { value: 'Indapamide 1.5 mg',           image: medImg('indapamide')          },
  { value: 'Vitamin B Complex',           image: medImg('vitamin-b')           },
  { value: 'Folic Acid 5 mg',             image: medImg('folic-acid')          },
  /* Controlled / psychotropic seeds for pharmacyRegistry classifications. */
  { value: 'Codeine Phosphate 30 mg',     image: medImg('codeine')             },
  { value: 'Diazepam 5 mg',               image: medImg('diazepam')            },
  /* Aliases for mock rows that omit the space before "mg". */
  { value: 'Paracetamol 500mg',           image: medImg('paracetamol')         },
  { value: 'Ibuprofen 400mg',             image: medImg('ibuprofen')           },
  { value: 'Methocarbamol 750mg',         image: medImg('methocarbamol')       },
  { value: 'Amoxicillin 500mg',           image: medImg('amoxicillin')         },
  { value: 'Omeprazole 20mg',             image: medImg('omeprazole')          },
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

/** Resolve a displayable medication image URL for table tiles / popups.
   Prefer name→slug match over a stale explicitSrc that points at the
   generic fallback, so registry seeds stay correct after catalog updates. */
export const resolveMedicationImage = (name, explicitSrc) => {
  if (!name) {
    if (explicitSrc && String(explicitSrc).trim()) return explicitSrc;
    return '';
  }
  const keyed = IMAGE_BY_KEY.get(normKey(name));
  if (keyed) return keyed;
  const slug = slugFromName(name);
  if (slug) return medImg(slug);
  if (explicitSrc && String(explicitSrc).trim() && explicitSrc !== FALLBACK_MED_IMG) {
    return explicitSrc;
  }
  return FALLBACK_MED_IMG;
};
