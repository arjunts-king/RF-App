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
