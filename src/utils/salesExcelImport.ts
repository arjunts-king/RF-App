import { formatExcelDate, normalizeKey, parseNumeric } from './excelFormatters.ts';

export interface PrioritizedMatchOptions {
  targetCurrency?: 'USD' | 'INR';
  excludeSubstrings?: string[];
}

/**
 * Matches an object value by checking candidate keys in strict priority order.
 * Pass 1 performs exact normalized key matching; Pass 2 performs substring matching.
 * Unlike column-order scanning, this ensures primary identifiers (e.g. Commercial Invoice No)
 * or line-level fields (e.g. Net Weight (Kg), Rate/Kg) always beat secondary columns
 * (e.g. Order No, Exchange Rate, Invoice Total Net Weight).
 */
export function getPrioritizedFlexibleValue(
  row: Record<string, any>,
  candidateKeys: string[],
  options?: PrioritizedMatchOptions
): any {
  if (!row || typeof row !== 'object') return undefined;

  const isInrKey = (norm: string) => norm.includes('inr') || norm.includes('rs') || norm.includes('rupee');
  const isUsdKey = (norm: string) =>
    norm.includes('usd') || norm.includes('dollar') || norm.includes('currency') || norm.includes('curr');

  const entries = Object.entries(row)
    .filter(([, val]) => val !== undefined && val !== null && String(val).trim() !== '')
    .map(([key, val]) => ({
      norm: normalizeKey(key),
      val: typeof val === 'string' ? val.trim() : val
    }))
    .filter(({ norm }) => {
      if (options?.targetCurrency === 'USD' && isInrKey(norm)) return false;
      if (options?.targetCurrency === 'INR' && isUsdKey(norm)) return false;
      return true;
    });

  const isExcluded = (norm: string) =>
    Boolean(options?.excludeSubstrings?.some((ex) => norm.includes(normalizeKey(ex))));

  const normalizedCandidates = candidateKeys.map(normalizeKey).filter(Boolean);

  // Pass 1: Exact normalized match in candidate priority order
  for (const cand of normalizedCandidates) {
    for (const entry of entries) {
      if (entry.norm === cand) {
        return entry.val;
      }
    }
  }

  // Pass 2: Substring match in candidate priority order (respecting exclusions)
  for (const cand of normalizedCandidates) {
    if (cand.length < 3) continue;
    for (const entry of entries) {
      if (isExcluded(entry.norm)) continue;
      if (entry.norm.includes(cand)) {
        return entry.val;
      }
    }
  }

  return undefined;
}

export const INVOICE_NO_CANDIDATE_KEYS = [
  'commercialinvoiceno',
  'invoiceno',
  'invoicenumber',
  'invno',
  'invnumber',
  'exportinvoiceno',
  'taxinvoiceno',
  'invoiceref',
  'invoice',
  'salesordernumber',
  'salesorderno',
  'salesorder',
  'salesorderid',
  'billno',
  'ordernumber',
  'orderno',
  'referenceno',
  'reference'
];

export const INVOICE_NO_EXCLUDE_SUBSTRINGS = [
  'date',
  'amount',
  'value',
  'total',
  'status',
  'currency',
  'rate',
  'fob',
  'shippingbill',
  'billoflading',
  'internal'
];

export const INVOICE_DATE_CANDIDATE_KEYS = [
  'invoicedate',
  'date',
  'orderdate',
  'salesorderdate',
  'billdate',
  'shippingdate',
  'expectedshipmentdate'
];

export const INVOICE_CUSTOMER_CANDIDATE_KEYS = [
  'consigneename',
  'customerconsignee',
  'customername',
  'consignee',
  'customer',
  'buyername',
  'buyer',
  'client',
  'shippingpartytradername',
  'shippingpartylegalname',
  'company'
];

export const INVOICE_CUSTOMER_EXCLUDE_SUBSTRINGS = [
  'address',
  'country',
  'phone',
  'mobile',
  'email',
  'code',
  'tax',
  'gst',
  'vat',
  'fein',
  'bank'
];

export const LINE_PRODUCT_CANDIDATE_KEYS = [
  'productnameexportreadyname',
  'productname',
  'productspecies',
  'product',
  'speciesname',
  'species',
  'itemname',
  'productdescription',
  'descriptionofgoods',
  'goodsdescription',
  'exportproduct',
  'commodity',
  'item',
  'particulars',
  'itemdesc',
  'description',
  'desc'
];

export const LINE_WEIGHT_CANDIDATE_KEYS = [
  'netweightkg',
  'weightkg',
  'netwtkg',
  'qtykg',
  'quantitykgs',
  'quantitykg',
  'netweight',
  'netwt',
  'weight',
  'quantityordered',
  'quantityinvoiced',
  'quantity',
  'qty',
  'kgs'
];

export const LINE_WEIGHT_EXCLUDE_SUBSTRINGS = ['invoicetotal', 'invoicenetweight', 'grossweight'];

export const LINE_RATE_CANDIDATE_KEYS = [
  'productwiseratekg',
  'rateperkgusd',
  'ratekgusd',
  'rateperkgcurrency',
  'rateperkg',
  'ratekg',
  'unitprice',
  'itemprice',
  'priceperkgusd',
  'priceperkg',
  'pricekg',
  'price',
  'rate',
  'fobrate'
];

export const LINE_RATE_EXCLUDE_SUBSTRINGS = ['exchange', 'bank', 'forward', 'forex', 'usdrate', 'predetermined', 'inr', 'rs', 'rupee'];

export const LINE_AMOUNT_CANDIDATE_KEYS = [
  'linesalesvalueforeigncurrency',
  'linesalesvalueusd',
  'lineamountcurrency',
  'lineamountusd',
  'itemtotal',
  'totalitemamount',
  'linetotal',
  'lineamount',
  'amountcurrency',
  'amountusd',
  'linevalue',
  'amount'
];

export const LINE_AMOUNT_EXCLUDE_SUBSTRINGS = ['invoicetotal', 'inr', 'rs', 'rupee'];

export interface SalesInvoiceRowGroup {
  groupKey: string;
  displayInvoiceNo: string;
  headerRow: Record<string, any>;
  rows: { row: Record<string, any>; rowNum: number }[];
}

function isSummaryFooterLabel(val: string): boolean {
  const norm = normalizeKey(val);
  return norm === 'total' || norm === 'subtotal' || norm === 'grandtotal' || norm === 'totals';
}

/**
 * Checks whether a row carries at least one product-line signal (product/description, weight, cartons, rate, or line amount).
 */
export function rowHasProductDetails(row: Record<string, any>): boolean {
  const prod = String(getPrioritizedFlexibleValue(row, LINE_PRODUCT_CANDIDATE_KEYS) || '').trim();
  const weight = parseNumeric(
    getPrioritizedFlexibleValue(row, LINE_WEIGHT_CANDIDATE_KEYS, {
      excludeSubstrings: LINE_WEIGHT_EXCLUDE_SUBSTRINGS
    }),
    0
  );
  const cartons = parseNumeric(
    getPrioritizedFlexibleValue(row, ['noofcartons', 'cartonscount', 'cartons', 'ctns', 'ctn', 'boxes', 'cases']),
    0
  );
  const rate = parseNumeric(
    getPrioritizedFlexibleValue(row, LINE_RATE_CANDIDATE_KEYS, {
      excludeSubstrings: LINE_RATE_EXCLUDE_SUBSTRINGS
    }),
    0
  );
  return Boolean(prod) || weight > 0 || cartons > 0 || rate > 0;
}

/**
 * Groups flat Excel rows into invoice groups, preserving all product-wise rows per invoice.
 * Supports:
 * - Repeated Invoice No on every product row
 * - Grouped/merged cells where Invoice No, Date, and Customer appear only on the first row of an invoice
 * - Blank-invoice-number grouping by Date + Customer
 */
export function groupSalesInvoiceRows(
  rawRows: Record<string, any>[],
  existingInvoicesCount = 0
): SalesInvoiceRowGroup[] {
  const groupsMap = new Map<string, SalesInvoiceRowGroup>();
  let currentGroupKey = '';
  let lastDate = '';
  let lastCustomer = '';

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const hasData = Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
    if (!hasData) return;

    const rawInvNo = String(
      getPrioritizedFlexibleValue(row, INVOICE_NO_CANDIDATE_KEYS, {
        excludeSubstrings: INVOICE_NO_EXCLUDE_SUBSTRINGS
      }) || ''
    ).trim();

    const rawProd = String(getPrioritizedFlexibleValue(row, LINE_PRODUCT_CANDIDATE_KEYS) || '').trim();

    // Ignore summary / footer rows such as "Total" or "Grand Total"
    if (isSummaryFooterLabel(rawInvNo) || (!rawInvNo && isSummaryFooterLabel(rawProd))) {
      return;
    }

    const rawDateVal = getPrioritizedFlexibleValue(row, INVOICE_DATE_CANDIDATE_KEYS, {
      excludeSubstrings: ['advance', 'balance', 'realization', 'order']
    }) ?? getPrioritizedFlexibleValue(row, INVOICE_DATE_CANDIDATE_KEYS);

    // Crucial: Only parse date when a non-empty date cell is present; blank continuation cells must stay ''
    const rawDate =
      rawDateVal !== undefined && rawDateVal !== null && String(rawDateVal).trim() !== ''
        ? formatExcelDate(rawDateVal)
        : '';

    const rawCust = String(
      getPrioritizedFlexibleValue(row, INVOICE_CUSTOMER_CANDIDATE_KEYS, {
        excludeSubstrings: INVOICE_CUSTOMER_EXCLUDE_SUBSTRINGS
      }) || ''
    ).trim();

    let groupKey = '';
    let displayInvoiceNo = '';

    if (rawInvNo) {
      groupKey = rawInvNo.toUpperCase();
      displayInvoiceNo = rawInvNo;
    } else {
      const isContinuation =
        Boolean(currentGroupKey) &&
        (!rawDate || rawDate === lastDate) &&
        (!rawCust || !lastCustomer || rawCust.toLowerCase() === lastCustomer.toLowerCase());

      if (isContinuation) {
        groupKey = currentGroupKey;
        displayInvoiceNo = groupsMap.get(groupKey)?.displayInvoiceNo || groupKey;
      } else {
        const autoInvNo = `EXP-${new Date().getFullYear()}-${String(
          existingInvoicesCount + groupsMap.size + 1
        ).padStart(4, '0')}`;
        groupKey = autoInvNo.toUpperCase();
        displayInvoiceNo = autoInvNo;
      }
    }

    currentGroupKey = groupKey;
    if (rawDate) lastDate = rawDate;
    if (rawCust) lastCustomer = rawCust;

    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, {
        groupKey,
        displayInvoiceNo,
        headerRow: row,
        rows: []
      });
    }
    groupsMap.get(groupKey)!.rows.push({ row, rowNum });
  });

  return Array.from(groupsMap.values());
}

/**
 * Classifies a sheet name in a Sales & Export workbook so multi-sheet imports
 * never overwrite detailed product-wise lines with an Invoice Summary sheet,
 * and properly merge separate SalesInvoices + LineItems sheets.
 */
export function classifySalesSheetName(sheetName: string):
  | 'detailed-invoices'
  | 'summary-invoices'
  | 'line-items'
  | 'customers'
  | 'ports'
  | 'products'
  | 'realizations'
  | 'ignore' {
  const norm = normalizeKey(sheetName);
  if (!norm) return 'ignore';

  if (norm.includes('productbreakdown') || norm.includes('breakdownsummary') || norm === 'summary') {
    return 'ignore';
  }
  if (norm.includes('invoicessummary') || norm.includes('invoicesummary')) {
    return 'summary-invoices';
  }
  if (
    norm.includes('lineitem') ||
    norm.includes('invoiceitem') ||
    norm.includes('itemdetail') ||
    norm.includes('productdetail') ||
    norm.includes('productwise') ||
    norm === 'items' ||
    norm === 'lines'
  ) {
    return 'line-items';
  }
  if (norm.includes('realiz') || norm.includes('settle')) {
    return 'realizations';
  }
  if (norm.includes('customer') || norm.includes('consignee') || norm.includes('buyer')) {
    return 'customers';
  }
  if (norm.includes('port')) {
    return 'ports';
  }
  if (norm.includes('product') || norm.includes('specie')) {
    return 'products';
  }
  if (norm.includes('invoice') || norm.includes('export') || norm.includes('sales')) {
    return 'detailed-invoices';
  }

  return 'ignore';
}

/**
 * Combines multi-sheet sales invoice data into unified product-wise rows for bulkImportSalesInvoices.
 * Handles:
 * 1. Detailed single sheet (`Sales Invoices (Detailed)` + optional `Invoices Summary` fallback)
 * 2. Normalized 2-sheet export (`SalesInvoices` header sheet + `LineItems` product-wise sheet)
 */
export function extractSalesInvoiceRowsFromSheets(
  sheets: { name: string; rows: Record<string, any>[] }[]
): Record<string, any>[] {
  const detailedSheets = sheets.filter((s) => classifySalesSheetName(s.name) === 'detailed-invoices');
  const summarySheets = sheets.filter((s) => classifySalesSheetName(s.name) === 'summary-invoices');
  const lineItemSheets = sheets.filter((s) => classifySalesSheetName(s.name) === 'line-items');

  const headerRows = [...detailedSheets, ...summarySheets].flatMap((s) => s.rows);
  const lineRows = lineItemSheets.flatMap((s) => s.rows);

  // Case A: Separate LineItems sheet exists alongside header/invoice sheet(s)
  if (lineRows.length > 0) {
    const headerByInvNo = new Map<string, Record<string, any>>();
    const seenOrder: string[] = [];

    let lastHeaderInv = '';
    for (const hRow of headerRows) {
      const invNo = String(
        getPrioritizedFlexibleValue(hRow, INVOICE_NO_CANDIDATE_KEYS, {
          excludeSubstrings: INVOICE_NO_EXCLUDE_SUBSTRINGS
        }) || ''
      ).trim();
      const key = (invNo || lastHeaderInv).toUpperCase();
      if (!key) continue;
      lastHeaderInv = invNo || lastHeaderInv;
      if (!headerByInvNo.has(key)) {
        headerByInvNo.set(key, hRow);
        seenOrder.push(key);
      }
    }

    const joinedRows: Record<string, any>[] = [];
    const matchedInvoices = new Set<string>();
    const seenFirstLineInvoices = new Set<string>();
    let lastLineInv = '';

    for (const lRow of lineRows) {
      const hasData = Object.values(lRow).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
      if (!hasData) continue;

      const invNo = String(
        getPrioritizedFlexibleValue(lRow, INVOICE_NO_CANDIDATE_KEYS, {
          excludeSubstrings: INVOICE_NO_EXCLUDE_SUBSTRINGS
        }) || ''
      ).trim();
      const effectiveInv = invNo || lastLineInv;
      if (invNo) lastLineInv = invNo;

      const key = effectiveInv.toUpperCase();
      const header = key ? headerByInvNo.get(key) : undefined;
      if (key) matchedInvoices.add(key);

      if (header) {
        const isFirstLineForInv = key ? !seenFirstLineInvoices.has(key) : false;
        if (key) seenFirstLineInvoices.add(key);

        const merged: Record<string, any> = {};
        for (const [k, v] of Object.entries(header)) {
          const nk = normalizeKey(k);
          const isLineCol =
            nk.includes('weight') ||
            nk.includes('carton') ||
            nk.includes('rateperkg') ||
            nk.includes('product') ||
            nk.includes('species') ||
            nk.includes('size') ||
            nk.includes('count') ||
            nk.includes('line');
          if (!isLineCol && (isFirstLineForInv || (!nk.includes('totalamount') && !nk.includes('totalfob') && !nk.includes('advance') && !nk.includes('balance')))) {
            merged[k] = v;
          }
        }
        // Line item fields always take precedence
        for (const [k, v] of Object.entries(lRow)) {
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            merged[k] = v;
          }
        }
        if (effectiveInv && !getPrioritizedFlexibleValue(merged, INVOICE_NO_CANDIDATE_KEYS, { excludeSubstrings: INVOICE_NO_EXCLUDE_SUBSTRINGS })) {
          merged['Invoice No'] = effectiveInv;
        }
        joinedRows.push(merged);
      } else {
        joinedRows.push(lRow);
      }
    }

    // Preserve any header-only invoices that didn't have rows in LineItems
    for (const key of seenOrder) {
      if (!matchedInvoices.has(key)) {
        const h = headerByInvNo.get(key);
        if (h) joinedRows.push(h);
      }
    }

    return joinedRows;
  }

  // Case B: Detailed invoice sheet(s) exist (e.g. 'Sales Invoices (Detailed)') + optional 'Invoices Summary'
  if (detailedSheets.length > 0) {
    return detailedSheets.flatMap((s) => s.rows);
  }

  // Case C: Only summary sheet(s) exist
  return summarySheets.flatMap((s) => s.rows);
}
