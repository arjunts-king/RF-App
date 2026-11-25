/**
 * Pure string and date formatting helpers extracted from excelImport.
 * Decoupled from SheetJS (xlsx) to prevent dragging heavy libraries into core application context.
 */

/**
 * Normalizes string keys for flexible column matching (e.g. "Rate/Kg" -> "ratekg", "Supplier Name" -> "suppliername")
 */
export function normalizeKey(key: string): string {
  return String(key || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Finds the first value in an object whose key matches one of the candidate normalized keys.
 * Supports exact normalized matching as well as fuzzy substring matching (e.g. "Supplier Name *" -> matches "suppliername").
 * Accepts optional targetCurrency ('USD' | 'INR') to prevent cross-currency key matching collisions (e.g. FOB RS matching a USD FOB key).
 */
export function getFlexibleValue(row: Record<string, any>, candidateKeys: string[], targetCurrency?: 'USD' | 'INR'): any {
  if (!row || typeof row !== 'object') return undefined;
  const normalizedCandidateKeys = candidateKeys.map(normalizeKey);

  const isInrKey = (norm: string) => norm.includes('inr') || norm.includes('rs') || norm.includes('rupee');
  const isUsdKey = (norm: string) => norm.includes('usd') || norm.includes('dollar') || norm.includes('currency') || norm.includes('curr');

  // 1. Exact match on normalized key
  for (const [key, val] of Object.entries(row)) {
    const norm = normalizeKey(key);
    if (targetCurrency === 'USD' && isInrKey(norm)) continue;
    if (targetCurrency === 'INR' && isUsdKey(norm)) continue;

    if (normalizedCandidateKeys.includes(norm) && val !== undefined && val !== null && String(val).trim() !== '') {
      return typeof val === 'string' ? val.trim() : val;
    }
  }

  // 2. Substring / Prefix match (e.g. "Supplier Name (Required)" matches "suppliername")
  for (const [key, val] of Object.entries(row)) {
    const norm = normalizeKey(key);
    if (targetCurrency === 'USD' && isInrKey(norm)) continue;
    if (targetCurrency === 'INR' && isUsdKey(norm)) continue;

    for (const cand of normalizedCandidateKeys) {
      if (cand.length >= 3 && norm.includes(cand)) {
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return typeof val === 'string' ? val.trim() : val;
        }
      }
    }
  }

  return undefined;
}

/**
 * Formats JS Date or Excel serial date into YYYY-MM-DD
 */
export function formatExcelDate(rawDate: any): string {
  if (!rawDate) return new Date().toISOString().split('T')[0];

  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    const y = rawDate.getFullYear();
    const m = String(rawDate.getMonth() + 1).padStart(2, '0');
    const d = String(rawDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(rawDate).trim();

  // Check DD-MM-YYYY, DD/MM/YYYY, or DD.MM.YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Check standard YYYY-MM-DD or YYYY/MM/DD
  const yyyymmdd = str.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Fallback to Date parser
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Intelligently extracts the number of boxes from an imported row or object.
 * Supports:
 * - Direct column headers: "No of Boxes", "No. of Boxes", "Boxes", "Box", "Deepsea Boxes", "Deep Sea Boxes", "Deepsea", "Deep Sea", "Crates", "Tubs", "Cartons", etc.
 * - Fuzzy normalized matching across keys containing "box", "deepsea", "crate", "tub"
 * - Inline embedded box mentions in text fields (e.g. remarks, species, notes): "Deepsea 50 boxes", "40 boxes", "Box: 30", "Deepsea purchase 45 boxes"
 */
export function extractBoxesCountFromRow(row: Record<string, any>): number {
  if (!row || typeof row !== 'object') return 0;

  // 1. Direct explicit column aliases matching via getFlexibleValue
  const directVal = getFlexibleValue(row, [
    'deepseaboxes',
    'deepseabox',
    'deepseanoofboxes',
    'deepseaboxcount',
    'deepseaqty',
    'deepseacount',
    'deepsea',
    'deepseapcs',
    'deepseabags',
    'noofboxes',
    'boxes',
    'box',
    'noofbox',
    'boxcount',
    'boxescount',
    'totalboxes',
    'totalbox',
    'boxqty',
    'boxesqty',
    'crates',
    'noofcrates',
    'tubs',
    'nooftubs',
    'cartons',
    'noofcartons',
    'baskets',
    'noofbaskets',
    'bags',
    'noofbags'
  ]);

  if (directVal !== undefined && directVal !== null && directVal !== '') {
    if (typeof directVal === 'number' && !isNaN(directVal) && directVal > 0) {
      return Math.round(directVal);
    }
    const str = String(directVal).trim();
    const m = str.match(/(\d+)/);
    if (m) {
      const parsed = parseInt(m[1], 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }

  // 2. Scan all object keys for any key containing "deepsea", "deep", "box", "crate", "tub"
  for (const [key, val] of Object.entries(row)) {
    if (val === undefined || val === null || val === '') continue;
    const norm = normalizeKey(key);
    if (
      norm.includes('box') ||
      norm.includes('crate') ||
      norm.includes('tub') ||
      norm.includes('deepsea') ||
      norm.includes('deep')
    ) {
      if (typeof val === 'number' && !isNaN(val) && val > 0) {
        return Math.round(val);
      }
      const str = String(val).trim();
      const m = str.match(/(\d+)/);
      if (m) {
        const parsed = parseInt(m[1], 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
  }

  // 3. Scan text fields for patterns mentioning box quantities
  const textCandidates = [
    row.remarks,
    row.Remarks,
    row.notes,
    row.Notes,
    row.comments,
    row.Comments,
    row.species,
    row.Species,
    row.speciesname,
    row['Species Name'],
    row.item,
    row.Item,
    row.variety,
    row.Variety,
    row.grade,
    row.Grade,
    row.size,
    row.Size,
    row.count,
    row.Count,
    row.batchno,
    row['Batch No'],
    row.lotno,
    row['Lot No'],
    row.supplierboxid,
    row['Supplier Box ID']
  ];

  for (const text of textCandidates) {
    if (!text) continue;
    const s = String(text);
    // e.g. "50 boxes", "50 box", "50 bxs", "50 bx", "50 crates", "50 tubs"
    const m1 = s.match(/(\d+)\s*(?:deep\s*sea\s*)?(?:box(?:es)?|bxs|bx|crates?|tubs?|cartons?|baskets?|bags?)\b/i);
    if (m1) {
      const p = parseInt(m1[1], 10);
      if (!isNaN(p) && p > 0) return p;
    }
    // e.g. "boxes: 50", "box = 50", "box - 50", "boxes-50"
    const m2 = s.match(/(?:box(?:es)?|crates?|tubs?|cartons?)\s*[:=-]\s*(\d+)/i);
    if (m2) {
      const p = parseInt(m2[1], 10);
      if (!isNaN(p) && p > 0) return p;
    }
    // e.g. "Deepsea 50", "Deep sea 50", "Deepsea - 50", "Deep sea purchase 50"
    const m3 = s.match(/deep\s*sea(?:\s*purchase)?\s*[:=-]?\s*(\d+)/i);
    if (m3) {
      const p = parseInt(m3[1], 10);
      if (!isNaN(p) && p > 0) return p;
    }
  }

  return 0;
}
