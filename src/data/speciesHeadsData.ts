import type { SpeciesHead } from '../types/index.ts';

export const INITIAL_SPECIES_HEADS: SpeciesHead[] = [
  {
    id: "sh-001",
    code: "SH-001",
    name: "Ribbonfish",
    scientificName: "Lepturacanthus Savala",
    category: "Fish",
    description: "Ribbonfish / Hairtail marine fish varieties, whole round, IWP and value-added grades.",
    active: true
  },
  {
    id: "sh-002",
    code: "SH-002",
    name: "Indian Mackerel",
    scientificName: "Rastrelliger kanagurta",
    category: "Fish",
    description: "Indian Mackerel whole round, boat-landed and blast frozen grades.",
    active: true
  },
  {
    id: "sh-003",
    code: "SH-003",
    name: "Vannamei Shrimp",
    scientificName: "Litopenaeus vannamei",
    category: "Shrimp / Prawns",
    description: "Cultured Whiteleg Vannamei Shrimps (HLSO, PUD, PVPD, Cooked).",
    active: true
  },
  {
    id: "sh-004",
    code: "SH-004",
    name: "Squid",
    scientificName: "Uroteuthis duvaucelii",
    category: "Cephalopods (Squid / Cuttlefish / Octopus)",
    description: "Squid whole round, needle, tubes and loligo varieties.",
    active: true
  },
  {
    id: "sh-005",
    code: "SH-005",
    name: "Octopus",
    scientificName: "Octopus vulgaris",
    category: "Cephalopods (Squid / Cuttlefish / Octopus)",
    description: "Short-leg and standard marine octopus whole round.",
    active: true
  },
  {
    id: "sh-006",
    code: "SH-006",
    name: "Poovalan Shrimp",
    scientificName: "Metapenaeus dobsoni",
    category: "Shrimp / Prawns",
    description: "Wild-caught marine Poovalan shrimps, monsoon and standard PUD.",
    active: true
  },
  {
    id: "sh-007",
    code: "SH-007",
    name: "Leather Jacket",
    scientificName: "Aluterus monoceros",
    category: "Fish",
    description: "Marine Leather Jacket fish whole and processed.",
    active: true
  },
  {
    id: "sh-008",
    code: "SH-008",
    name: "Deepsea Shrimp",
    scientificName: "Aristeus alcocki",
    category: "Shrimp / Prawns",
    description: "Wild-caught deep sea marine shrimps.",
    active: true
  },
  {
    id: "sh-009",
    code: "SH-009",
    name: "Cuttlefish",
    scientificName: "Sepia pharaonis",
    category: "Cephalopods (Squid / Cuttlefish / Octopus)",
    description: "Pharaoh cuttlefish whole round and fillets.",
    active: true
  },
  {
    id: "sh-010",
    code: "SH-010",
    name: "Yellowfin Tuna",
    scientificName: "Thunnus albacares",
    category: "Fish",
    description: "Yellowfin Tuna loins, chunks and steaks.",
    active: true
  }
];

export const DEFAULT_PRODUCT_HEAD_MAP: Record<string, { speciesHeadId: string; speciesHeadName: string }> = {
  // Ribbonfish Products (e.g. Ribbonfish A grade, B grade, C grade, whole round, IWP/IF)
  'prd-001': { speciesHeadId: 'sh-001', speciesHeadName: 'Ribbonfish' },
  'prd-002': { speciesHeadId: 'sh-001', speciesHeadName: 'Ribbonfish' },
  'prd-006': { speciesHeadId: 'sh-001', speciesHeadName: 'Ribbonfish' },
  'prd-007': { speciesHeadId: 'sh-001', speciesHeadName: 'Ribbonfish' },
  'prd-008': { speciesHeadId: 'sh-001', speciesHeadName: 'Ribbonfish' },
  'prd-025': { speciesHeadId: 'sh-001', speciesHeadName: 'Ribbonfish' },
  'prd-026': { speciesHeadId: 'sh-001', speciesHeadName: 'Ribbonfish' },
  'prd-028': { speciesHeadId: 'sh-001', speciesHeadName: 'Ribbonfish' },

  // Indian Mackerel
  'prd-003': { speciesHeadId: 'sh-002', speciesHeadName: 'Indian Mackerel' },
  'prd-004': { speciesHeadId: 'sh-002', speciesHeadName: 'Indian Mackerel' },
  'prd-011': { speciesHeadId: 'sh-002', speciesHeadName: 'Indian Mackerel' },
  'prd-014': { speciesHeadId: 'sh-002', speciesHeadName: 'Indian Mackerel' },
  'prd-017': { speciesHeadId: 'sh-002', speciesHeadName: 'Indian Mackerel' },
  'prd-018': { speciesHeadId: 'sh-002', speciesHeadName: 'Indian Mackerel' },

  // Vannamei Shrimp
  'prd-009': { speciesHeadId: 'sh-003', speciesHeadName: 'Vannamei Shrimp' },
  'prd-010': { speciesHeadId: 'sh-003', speciesHeadName: 'Vannamei Shrimp' },
  'prd-019': { speciesHeadId: 'sh-003', speciesHeadName: 'Vannamei Shrimp' },
  'prd-022': { speciesHeadId: 'sh-003', speciesHeadName: 'Vannamei Shrimp' },

  // Squid
  'prd-015': { speciesHeadId: 'sh-004', speciesHeadName: 'Squid' },
  'prd-023': { speciesHeadId: 'sh-004', speciesHeadName: 'Squid' },
  'prd-024': { speciesHeadId: 'sh-004', speciesHeadName: 'Squid' },
  'prd-027': { speciesHeadId: 'sh-004', speciesHeadName: 'Squid' },
  'prd-029': { speciesHeadId: 'sh-004', speciesHeadName: 'Squid' },
  'prd-030': { speciesHeadId: 'sh-004', speciesHeadName: 'Squid' },
  'prd-031': { speciesHeadId: 'sh-004', speciesHeadName: 'Squid' },
  'prd-032': { speciesHeadId: 'sh-004', speciesHeadName: 'Squid' },

  // Octopus
  'prd-005': { speciesHeadId: 'sh-005', speciesHeadName: 'Octopus' },
  'prd-016': { speciesHeadId: 'sh-005', speciesHeadName: 'Octopus' },

  // Poovalan Shrimp
  'prd-012': { speciesHeadId: 'sh-006', speciesHeadName: 'Poovalan Shrimp' },
  'prd-013': { speciesHeadId: 'sh-006', speciesHeadName: 'Poovalan Shrimp' },

  // Leather Jacket
  'prd-020': { speciesHeadId: 'sh-007', speciesHeadName: 'Leather Jacket' },

  // Deepsea Shrimp
  'prd-021': { speciesHeadId: 'sh-008', speciesHeadName: 'Deepsea Shrimp' }
};

/**
 * Infer a species head from product name
 */
export function inferSpeciesHeadFromName(productName: string): { speciesHeadId: string; speciesHeadName: string } | null {
  const norm = (productName || '').trim().toLowerCase();
  if (!norm) return null;
  if (norm.includes('ribbonfish') || norm.includes('ribbon fish') || norm.includes('savala') || norm.includes('hairtail')) {
    return { speciesHeadId: 'sh-001', speciesHeadName: 'Ribbonfish' };
  }
  if (norm.includes('mackerel') || norm.includes('kanagurta')) {
    return { speciesHeadId: 'sh-002', speciesHeadName: 'Indian Mackerel' };
  }
  if (norm.includes('vannamei') || norm.includes('vanamei') || norm.includes('white shrimp')) {
    return { speciesHeadId: 'sh-003', speciesHeadName: 'Vannamei Shrimp' };
  }
  if (norm.includes('squid') || norm.includes('loligo') || norm.includes('calamari')) {
    return { speciesHeadId: 'sh-004', speciesHeadName: 'Squid' };
  }
  if (norm.includes('octopus')) {
    return { speciesHeadId: 'sh-005', speciesHeadName: 'Octopus' };
  }
  if (norm.includes('poovalan')) {
    return { speciesHeadId: 'sh-006', speciesHeadName: 'Poovalan Shrimp' };
  }
  if (norm.includes('leather jacket') || norm.includes('leatherjacket')) {
    return { speciesHeadId: 'sh-007', speciesHeadName: 'Leather Jacket' };
  }
  if (norm.includes('deepsea') || norm.includes('deep sea')) {
    return { speciesHeadId: 'sh-008', speciesHeadName: 'Deepsea Shrimp' };
  }
  if (norm.includes('cuttlefish') || norm.includes('cuttle fish')) {
    return { speciesHeadId: 'sh-009', speciesHeadName: 'Cuttlefish' };
  }
  if (norm.includes('tuna') || norm.includes('yellowfin')) {
    return { speciesHeadId: 'sh-010', speciesHeadName: 'Yellowfin Tuna' };
  }
  return null;
}
