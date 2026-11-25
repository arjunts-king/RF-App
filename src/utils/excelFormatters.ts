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
 * Safely parses any numeric value from an imported Excel or CSV cell.
 * Handles numbers, strings with commas (e.g. "48,32,88,093.10", "45,54,67,239.92", "1,500.50"),
 * currency symbols (₹, Rs, INR, $, USD, €, EUR, £, GBP), whitespace, quotes, parentheses for
 * negative numbers e.g. "(1,200.00)", and percentage signs.
 * Returns fallback (default 0) if parsing fails.
 */
export function parseNumeric(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const str = String(val).trim();
  if (!str) return fallback;

  // Check parenthetical negative e.g. (1,500.50)
  const isParenthetical = /^\s*\((.*)\)\s*$/.test(str);
  const core = isParenthetical ? str.replace(/^\s*\((.*)\)\s*$/, '$1') : str;

  // Strip currency symbols, spaces, commas, quotes, and units
  const cleaned = core
    .replace(/[₹$€£\s,`'"]/g, '')
    .replace(/\b(?:INR|Rs\.?|USD|EUR|GBP|Kg|Kgs|Nos?)\b/gi, '')
    .replace(/%$/, '')
    .trim();

  if (!cleaned) return fallback;
  const num = parseFloat(cleaned);
  if (isNaN(num)) return fallback;
  return isParenthetical ? -Math.abs(num) : num;
}

/**
 * Intelligently extracts the number of boxes from an imported row or object.
 * Supports:
 * - Direct column headers: "No of Boxes Purchased of Deepsea", "No. of Boxes Purchased", "Boxes Purchased",
 *   "Deepsea Boxes", "Deep Sea Boxes", "Deepsea", "Deep Sea", "No of Boxes", "No. of Boxes", "Boxes", "Crates", "Tubs", "Cartons", etc.
 * - Comma-formatted box quantities (e.g. "1,500", "1,200 boxes")
 * - Sanitized fuzzy scanning that strictly ignores monetary and weight columns
 * - Inline embedded box mentions in text fields (e.g. remarks, species, notes): "Deepsea 50 boxes", "40 boxes", "Box: 30", "Deepsea purchase 45 boxes"
 */
export function extractBoxesCountFromRow(row: Record<string, any>): number {
  if (!row || typeof row !== 'object') return 0;

  // 1. Check exact "Deepsea", "Deep Sea", or "DS" column if present and not a monetary header
  const exactDeepseaVal =
    row['Deepsea'] ??
    row['Deep Sea'] ??
    row['Deepsea '] ??
    row['Deep Sea '] ??
    row['deepsea'] ??
    row['deep_sea'] ??
    row['Deep-Sea'] ??
    row['DS'] ??
    row['D.S.'] ??
    row['D.S'];

  if (exactDeepseaVal !== undefined && exactDeepseaVal !== null && exactDeepseaVal !== '') {
    const num = typeof exactDeepseaVal === 'number' ? exactDeepseaVal : parseInt(String(exactDeepseaVal).replace(/[,\s]/g, ''), 10);
    if (!isNaN(num) && num > 0 && num < 100000) return Math.round(num);
  }

  // 2. Direct explicit column aliases matching via getFlexibleValue
  const directVal = getFlexibleValue(row, [
    'noofboxespurchasedofdeepsea',
    'noofboxespurchaseddeepsea',
    'boxespurchasedofdeepsea',
    'boxespurchaseddeepsea',
    'noofboxespurchased',
    'boxespurchased',
    'deepseaboxespurchased',
    'deepseapurchaseboxes',
    'deepseapurchasenoofboxes',
    'deepseanoofboxes',
    'deepseaboxes',
    'deepseabox',
    'deepseaboxcount',
    'deepseaqty',
    'deepseacount',
    'deepseapcs',
    'deepseabags',
    'deepseacrates',
    'deepseatubs',
    'deepseacartons',
    'deepsealandingboxes',
    'deepseatrawlerboxes',
    'trawlerboxes',
    'boatboxes',
    'noofdeepseaboxes',
    'noofboxesdeepsea',
    'boxesdeepsea',
    'noofboxesds',
    'boxesds',
    'dsboxes',
    'dsnoofboxes',
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
    const cleanStr = String(directVal).replace(/[,\s]/g, '').trim();
    const m = cleanStr.match(/(\d+)/);
    if (m) {
      const parsed = parseInt(m[1], 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 100000) return parsed;
    }
  }

  // 2. Scan all object keys for any key containing "box", "crate", "tub", "carton", or deepsea box descriptors
  // STRICT SAFETY: Skip any keys that represent monetary amounts, valuations, rates, prices, costs, or weights.
  for (const [key, val] of Object.entries(row)) {
    if (val === undefined || val === null || val === '') continue;
    const norm = normalizeKey(key);

    if (
      norm.includes('amount') ||
      norm.includes('value') ||
      norm.includes('val') ||
      norm.includes('rate') ||
      norm.includes('price') ||
      norm.includes('cost') ||
      norm.includes('inr') ||
      norm.includes('rs') ||
      norm.includes('rupee') ||
      norm.includes('currency') ||
      norm.includes('weight') ||
      norm.includes('kg') ||
      norm.includes('date') ||
      norm.includes('supplier') ||
      norm.includes('location') ||
      norm.includes('centre') ||
      norm.includes('batch') ||
      norm.includes('invoice') ||
      norm.includes('bill')
    ) {
      continue;
    }

    const isBoxKey =
      norm.includes('box') ||
      norm.includes('crate') ||
      norm.includes('tub') ||
      norm.includes('carton') ||
      norm.includes('basket') ||
      norm.includes('bag') ||
      ((norm.includes('deepsea') || norm.includes('deep')) &&
        (norm.includes('qty') || norm.includes('count') || norm.includes('nos') || norm.includes('pcs')));

    if (isBoxKey) {
      if (typeof val === 'number' && !isNaN(val) && val > 0 && val < 100000) {
        return Math.round(val);
      }
      const cleanStr = String(val).replace(/[,\s]/g, '').trim();
      const m = cleanStr.match(/(\d+)/);
      if (m) {
        const parsed = parseInt(m[1], 10);
        if (!isNaN(parsed) && parsed > 0 && parsed < 100000) return parsed;
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
    row['Lot No']
  ];

  for (const text of textCandidates) {
    if (!text) continue;
    const s = String(text);
    // e.g. "50 boxes", "1,500 boxes", "50 box", "50 bxs", "50 bx", "50 crates", "50 tubs"
    const m1 = s.match(/(\d+(?:,\d+)?)\s*(?:deep\s*sea\s*)?(?:box(?:es)?|bxs|bx|crates?|tubs?|cartons?|baskets?|bags?|nos?)\b/i);
    if (m1) {
      const p = parseInt(m1[1].replace(/,/g, ''), 10);
      if (!isNaN(p) && p > 0 && p < 100000) return p;
    }
    // e.g. "boxes: 50", "box = 50", "box - 50", "boxes-50", "boxes: 1,500"
    const m2 = s.match(/(?:box(?:es)?|crates?|tubs?|cartons?)\s*[:=-]\s*(\d+(?:,\d+)?)/i);
    if (m2) {
      const p = parseInt(m2[1].replace(/,/g, ''), 10);
      if (!isNaN(p) && p > 0 && p < 100000) return p;
    }
    // e.g. "Deepsea 50", "Deep sea 50", "Deepsea - 50", "Deep sea purchase 50"
    const m3 = s.match(/deep\s*sea(?:\s*purchase)?\s*[:=-]?\s*(\d+(?:,\d+)?)/i);
    if (m3) {
      const p = parseInt(m3[1].replace(/,/g, ''), 10);
      if (!isNaN(p) && p > 0 && p < 100000) return p;
    }
  }

  return 0;
}
