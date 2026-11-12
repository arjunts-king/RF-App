import type { Purchase, Supplier, PaymentStatus } from '../types/index.ts';

/**
 * Calculates the Indian Financial Year string (e.g. "FY 2026-27") for any given date string.
 * Indian FY starts on April 1st and ends on March 31st.
 */
export function getIndianFinancialYear(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-indexed (1 to 12)

  if (month >= 4) {
    const nextYearShort = String((year + 1) % 100).padStart(2, '0');
    return `FY ${year}-${nextYearShort}`;
  } else {
    const currentYearShort = String(year % 100).padStart(2, '0');
    return `FY ${year - 1}-${currentYearShort}`;
  }
}

/**
 * Calculate due date given a purchase date and supplier's credit days.
 */
export function calculateDueDate(purchaseDate: string, creditDays: number): string {
  if (!purchaseDate) return '';
  const d = new Date(purchaseDate);
  d.setDate(d.getDate() + (creditDays || 0));
  return d.toISOString().split('T')[0];
}

/**
 * Derive payment status from totalCost and amountPaid.
 */
export function derivePaymentStatus(totalCost: number, amountPaid: number): PaymentStatus {
  const roundedCost = Math.round(totalCost * 100) / 100;
  const roundedPaid = Math.round((amountPaid || 0) * 100) / 100;

  if (roundedPaid <= 0) return 'Unpaid';
  if (roundedPaid >= roundedCost) return 'Fully Paid';
  return 'Partially Paid';
}

/**
 * Compute all derived fields for a single purchase entry.
 */
export function computePurchaseFields(
  params: {
    weightKg: number;
    ratePerKg: number;
    damageWeightKg?: number;
    damageRatePerKg?: number;
    expenseBreakdown?: Record<string, number>;
    amountPaid?: number;
    purchaseDate: string;
    supplier?: Supplier;
    yieldWeightKg?: number;
  }
) {
  const weightKg = Number(params.weightKg) || 0;
  const ratePerKg = Number(params.ratePerKg) || 0;
  const damageWeightKg = Number(params.damageWeightKg) || 0;
  const damageRatePerKg = Number(params.damageRatePerKg) || 0;
  const expenseBreakdown = params.expenseBreakdown || {};
  const amountPaid = Number(params.amountPaid) || 0;

  // 1. Purchase Value
  const purchaseValue = Number((weightKg * ratePerKg).toFixed(2));

  // 2. Damage calculation
  const damageAmount = Number((damageWeightKg * damageRatePerKg).toFixed(2));

  // 3. Gross Purchase Value
  const grossPurchaseValue = Number((purchaseValue - damageAmount).toFixed(2));

  // 4. Sum of dynamic expense fields
  const totalExpenses = Number(
    Object.values(expenseBreakdown).reduce((sum, val) => sum + (Number(val) || 0), 0).toFixed(2)
  );

  // 5. Total Cost
  const totalCost = Number((grossPurchaseValue + totalExpenses).toFixed(2));

  // 6. Effective Rate per Kg
  const effectiveRatePerKg = weightKg > 0 ? Number((totalCost / weightKg).toFixed(2)) : 0;

  // 7. Payment derivations
  const balancePayable = Number(Math.max(0, totalCost - amountPaid).toFixed(2));
  const paymentStatus = derivePaymentStatus(totalCost, amountPaid);
  const creditDays = params.supplier?.creditDays || 0;
  const dueDate = calculateDueDate(params.purchaseDate, creditDays);
  const financialYear = getIndianFinancialYear(params.purchaseDate);

  // 8. Processing Yield derivation
  const yieldWeightKg = params.yieldWeightKg !== undefined && params.yieldWeightKg !== null && !isNaN(Number(params.yieldWeightKg)) && Number(params.yieldWeightKg) > 0
    ? Number(params.yieldWeightKg)
    : undefined;
  const yieldPct = yieldWeightKg !== undefined && weightKg > 0
    ? Number(((yieldWeightKg / weightKg) * 100).toFixed(2))
    : undefined;

  return {
    purchaseValue,
    damageAmount,
    grossPurchaseValue,
    totalExpenses,
    totalCost,
    effectiveRatePerKg,
    balancePayable,
    paymentStatus,
    dueDate,
    financialYear,
    yieldWeightKg,
    yieldPct
  };
}

/**
 * Batch / Shared Expense Allocation algorithm (Section 6)
 *
 * Rows sharing the same Batch No. form one cost pool.
 * Staff enters the full shared amount on one of the batched rows.
 * This function calculates total pooled expense per expense type,
 * distributes it proportional to each row's weight, and recalculates
 * Total Expenses, Total Cost, Effective Rate, and Balance Payable.
 */
export function allocateBatchExpenses(purchasesInBatch: Purchase[]): {
  updatedPurchases: Purchase[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const activeRows = purchasesInBatch.filter((p) => !p.isVoided);

  if (activeRows.length <= 1) {
    return { updatedPurchases: purchasesInBatch, warnings: [] };
  }

  // Calculate total batch weight
  const totalBatchWeight = activeRows.reduce((sum, p) => sum + (p.weightKg || 0), 0);
  if (totalBatchWeight <= 0) {
    return { updatedPurchases: purchasesInBatch, warnings: ['Total batch weight is zero; cannot allocate expenses proportionally.'] };
  }

  // Find all distinct expense type IDs used across the batch
  const allExpenseKeys = new Set<string>();
  activeRows.forEach((p) => {
    Object.keys(p.expenseBreakdown || {}).forEach((k) => allExpenseKeys.add(k));
  });

  // Calculate pooled sum per expense type and check for duplicate entry warnings
  const pooledExpenses: Record<string, number> = {};

  allExpenseKeys.forEach((key) => {
    let rowsWithKeyCount = 0;
    let sumForKey = 0;

    activeRows.forEach((p) => {
      const val = Number(p.expenseBreakdown?.[key]) || 0;
      if (val > 0) {
        rowsWithKeyCount++;
        sumForKey += val;
      }
    });

    pooledExpenses[key] = sumForKey;

    // Only warn about duplicate entry if the batch is not yet allocated
    const isAlreadyAllocated = activeRows.length > 0 && activeRows.every((p) => p.isBatchAllocated);
    if (!isAlreadyAllocated && rowsWithKeyCount > 1) {
      const batchIdent = activeRows[0].expenseBatchNo || 'batch';
      warnings.push(
        `Data Quality Warning: Expense head "${key}" was entered on ${rowsWithKeyCount} separate rows in expense batch "${batchIdent}". Check if it was entered twice by mistake.`
      );
    }
  });

  // Allocate proportionally by weight
  const updatedPurchases = purchasesInBatch.map((p) => {
    if (p.isVoided) return p;

    const weightShare = p.weightKg / totalBatchWeight;
    const allocatedBreakdown: Record<string, number> = {};
    let rowTotalExpenses = 0;

    allExpenseKeys.forEach((key) => {
      const share = Number((pooledExpenses[key] * weightShare).toFixed(2));
      allocatedBreakdown[key] = share;
      rowTotalExpenses += share;
    });

    rowTotalExpenses = Number(rowTotalExpenses.toFixed(2));
    const grossPurchaseValue = p.grossPurchaseValue || (p.purchaseValue - (p.damageAmount || 0));
    const totalCost = Number((grossPurchaseValue + rowTotalExpenses).toFixed(2));
    const effectiveRatePerKg = p.weightKg > 0 ? Number((totalCost / p.weightKg).toFixed(2)) : 0;
    const amountPaid = p.amountPaid || 0;
    const balancePayable = Number(Math.max(0, totalCost - amountPaid).toFixed(2));
    const paymentStatus = derivePaymentStatus(totalCost, amountPaid);

    return {
      ...p,
      expenseBreakdown: allocatedBreakdown,
      totalExpenses: rowTotalExpenses,
      isBatchAllocated: true,
      totalCost,
      effectiveRatePerKg,
      balancePayable,
      paymentStatus
    };
  });

  return { updatedPurchases, warnings };
}

/**
 * Proportionally allocates total batch yield weight (or batch yield %) across all active items in a batch.
 */
export function allocateBatchYield(
  purchasesInBatch: Purchase[],
  explicitBatchYieldWeightKg?: number,
  explicitBatchYieldPct?: number
): { updatedPurchases: Purchase[]; warnings: string[] } {
  const warnings: string[] = [];
  const activeRows = purchasesInBatch.filter((p) => !p.isVoided);

  if (activeRows.length === 0) {
    return { updatedPurchases: purchasesInBatch, warnings: ['No active lots found in batch to allocate yield.'] };
  }

  const totalBatchWeight = activeRows.reduce((sum, p) => sum + (p.weightKg || 0), 0);
  if (totalBatchWeight <= 0) {
    return { updatedPurchases: purchasesInBatch, warnings: ['Total batch raw weight is zero; cannot allocate batch yield.'] };
  }

  // Determine the batch yield weight and percentage
  let resolvedBatchYieldKg: number | undefined =
    explicitBatchYieldWeightKg !== undefined && !isNaN(Number(explicitBatchYieldWeightKg)) && Number(explicitBatchYieldWeightKg) > 0
      ? Number(explicitBatchYieldWeightKg)
      : undefined;

  let resolvedBatchYieldPct: number | undefined =
    explicitBatchYieldPct !== undefined && !isNaN(Number(explicitBatchYieldPct)) && Number(explicitBatchYieldPct) > 0
      ? Number(explicitBatchYieldPct)
      : undefined;

  // If batch yield was not passed explicitly, check if any lot in the batch has batchYieldWeightKg, batchYieldPct, or pooled yield
  if (resolvedBatchYieldKg === undefined && resolvedBatchYieldPct === undefined) {
    const existingWithBatchYieldKg = activeRows.find((p) => p.batchYieldWeightKg && p.batchYieldWeightKg > 0);
    const existingWithBatchYieldPct = activeRows.find((p) => p.batchYieldPct && p.batchYieldPct > 0);
    if (existingWithBatchYieldKg?.batchYieldWeightKg) {
      resolvedBatchYieldKg = existingWithBatchYieldKg.batchYieldWeightKg;
    } else if (existingWithBatchYieldPct?.batchYieldPct) {
      resolvedBatchYieldPct = existingWithBatchYieldPct.batchYieldPct;
    } else {
      // Check if yield was recorded on rows
      const rowsWithYield = activeRows.filter((p) => p.yieldWeightKg && p.yieldWeightKg > 0);
      if (rowsWithYield.length === 1 && activeRows.length > 1) {
        // If single row had yield entered on multi-item batch, treat as entire batch total
        resolvedBatchYieldKg = rowsWithYield[0].yieldWeightKg;
      } else if (rowsWithYield.length > 1) {
        const allSame = rowsWithYield.every((p) => p.yieldWeightKg === rowsWithYield[0].yieldWeightKg);
        if (allSame && rowsWithYield[0].yieldWeightKg && rowsWithYield[0].yieldWeightKg <= totalBatchWeight) {
          // User entered the batch total yield on each row
          resolvedBatchYieldKg = rowsWithYield[0].yieldWeightKg;
        } else {
          // Individual yields were entered on rows, pool them together as batch total
          resolvedBatchYieldKg = rowsWithYield.reduce((sum, p) => sum + (p.yieldWeightKg || 0), 0);
        }
      } else {
        // Check if any row has yieldPct
        const rowWithPct = activeRows.find((p) => p.yieldPct && p.yieldPct > 0);
        if (rowWithPct?.yieldPct) {
          resolvedBatchYieldPct = rowWithPct.yieldPct;
        }
      }
    }
  }

  if (resolvedBatchYieldKg !== undefined && (resolvedBatchYieldPct === undefined || resolvedBatchYieldPct <= 0)) {
    resolvedBatchYieldPct = Number(((resolvedBatchYieldKg / totalBatchWeight) * 100).toFixed(2));
  } else if (resolvedBatchYieldPct !== undefined && (resolvedBatchYieldKg === undefined || resolvedBatchYieldKg <= 0)) {
    resolvedBatchYieldKg = Number(((totalBatchWeight * resolvedBatchYieldPct) / 100).toFixed(2));
  }

  if (resolvedBatchYieldKg === undefined || resolvedBatchYieldKg <= 0) {
    return {
      updatedPurchases: purchasesInBatch,
      warnings: ['No valid batch yield weight or percentage provided to allocate.']
    };
  }

  if (resolvedBatchYieldKg > totalBatchWeight) {
    warnings.push(
      `Notice: Batch finished yield (${resolvedBatchYieldKg.toFixed(2)} Kg) exceeds total raw batch weight (${totalBatchWeight.toFixed(2)} Kg). Verify if glazing or water uptake was included.`
    );
  }

  // Allocate proportionally to each row's weight
  let allocatedYieldSoFar = 0;
  const updatedPurchases = purchasesInBatch.map((p) => {
    if (p.isVoided) return p;

    let itemYieldKg = 0;
    // For the last active item, assign remainder to prevent rounding drift
    const isLastActive = p === activeRows[activeRows.length - 1];
    if (isLastActive && activeRows.length > 1) {
      itemYieldKg = Number(Math.max(0, resolvedBatchYieldKg! - allocatedYieldSoFar).toFixed(2));
    } else {
      const share = p.weightKg / totalBatchWeight;
      itemYieldKg = Number((resolvedBatchYieldKg! * share).toFixed(2));
      allocatedYieldSoFar += itemYieldKg;
    }

    const itemYieldPct = p.weightKg > 0 ? Number(((itemYieldKg / p.weightKg) * 100).toFixed(2)) : 0;

    return {
      ...p,
      yieldWeightKg: itemYieldKg,
      yieldPct: itemYieldPct,
      batchYieldWeightKg: resolvedBatchYieldKg,
      batchYieldPct: resolvedBatchYieldPct,
      isBatchYieldAllocated: true
    };
  });

  return { updatedPurchases, warnings };
}

/**
 * Unified batch apportionment for BOTH landing expenses AND finished meat yield based on raw weight (Kg).
 * When items share the same Batch No, both expenses and yield are pooled and apportioned by Kg.
 */
export function allocateBatchCombined(
  purchasesInBatch: Purchase[],
  explicitBatchYieldWeightKg?: number,
  explicitBatchYieldPct?: number
): { updatedPurchases: Purchase[]; warnings: string[] } {
  const activeRows = purchasesInBatch.filter((p) => !p.isVoided);
  if (activeRows.length === 0) {
    return { updatedPurchases: purchasesInBatch, warnings: [] };
  }

  // 1. Apportion expenses proportionally by Kg
  const { updatedPurchases: expenseUpdated, warnings: expWarnings } = allocateBatchExpenses(purchasesInBatch);

  // 2. Determine if yield is entered for this batch
  const hasYield =
    (explicitBatchYieldWeightKg !== undefined && explicitBatchYieldWeightKg > 0) ||
    (explicitBatchYieldPct !== undefined && explicitBatchYieldPct > 0) ||
    expenseUpdated.some(
      (p) =>
        (p.batchYieldWeightKg && p.batchYieldWeightKg > 0) ||
        (p.batchYieldPct && p.batchYieldPct > 0) ||
        (p.yieldWeightKg && p.yieldWeightKg > 0) ||
        (p.yieldPct && p.yieldPct > 0)
    );

  let finalPurchases = expenseUpdated;
  const yieldWarnings: string[] = [];

  if (hasYield) {
    const yieldResult = allocateBatchYield(expenseUpdated, explicitBatchYieldWeightKg, explicitBatchYieldPct);
    if (yieldResult.updatedPurchases) {
      finalPurchases = yieldResult.updatedPurchases;
    }
    yieldWarnings.push(...yieldResult.warnings);
  }

  return {
    updatedPurchases: finalPurchases,
    warnings: [...expWarnings, ...yieldWarnings]
  };
}

/**
 * Explicit standalone aliases for decoupled Expense Batch and Yield Batch processing
 */
export const allocateExpenseBatch = allocateBatchExpenses;
export const allocateYieldBatch = allocateBatchYield;

/**
 * Format Indian Currency (INR ₹)
 */
export function formatINR(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(val);
}

/**
 * Format Indian Currency with intelligent Crore (Cr) and Lakh (L) compaction for dashboard boxes
 * e.g. 100,00,00,000 -> "₹100.00 Cr", 5,40,00,000 -> "₹5.40 Cr", 45,00,000 -> "₹45.00 L"
 */
export function formatCroreINR(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0.00';
  const num = Number(val);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs >= 10000000) {
    // 1 Crore and above (up to 100+ Crores)
    const cr = abs / 10000000;
    return `${sign}₹${cr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
  }
  if (abs >= 100000) {
    // 1 Lakh and above
    const lk = abs / 100000;
    return `${sign}₹${lk.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
  }
  return formatINR(val);
}

/**
 * Returns both the formatted string and its short smart representation for high-value dashboard metrics
 */
export function formatDashboardINR(val: number | undefined | null): { full: string; compact: string; isCrore: boolean } {
  const full = formatINR(val);
  const compact = formatCroreINR(val);
  const isCrore = Boolean(val && Math.abs(val) >= 10000000);
  return { full, compact, isCrore };
}

/**
 * Format numeric weight in kilograms
 */
export function formatKg(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0.00 Kg';
  return `${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kg`;
}

/**
 * Format Bank Forward Exchange Rate (supports up to 7 decimal places)
 * e.g. 84.5 -> "84.50", 84.5123456 -> "84.5123456"
 */
export function formatForwardRate(rate: number | undefined | null): string {
  if (rate === undefined || rate === null || isNaN(rate)) return '0.00';
  return rate.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7
  });
}

/**
 * Determine ageing bucket based on due date.
 */
export type AgeingBucket = 'Not Due' | '0-30 Days' | '31-60 Days' | '61-90 Days' | '91-180 Days' | '180+ Days';

export function getAgeingBucket(dueDateStr: string, asOfDate: Date = new Date()): AgeingBucket {
  if (!dueDateStr) return 'Not Due';
  const due = new Date(dueDateStr);
  const diffTime = asOfDate.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Not Due';
  if (diffDays <= 30) return '0-30 Days';
  if (diffDays <= 60) return '31-60 Days';
  if (diffDays <= 90) return '61-90 Days';
  if (diffDays <= 180) return '91-180 Days';
  return '180+ Days';
}

export interface LineItemForCommodity {
  speciesId?: string;
  productDescription?: string;
  cartonsCount?: number | string;
  gradeSize?: string;
}

/**
 * Derives the COMMODITY description (Row 10) for export invoices.
 * If 1 product item:
 *   e.g. "2600 CARTONS FROZEN INDIAN MACKEREL" (or "<cartons> CARTONS <PRODUCT>")
 * If 2 or more product items:
 *   e.g. "481 CARTONS FROZEN SQUID SEMI NEEDLE WHOLE-A GRADE & 1519 CARTONS FROZEN LOLIGO SQUID WHOLE-A GRADE"
 * Based on sample invoice structure and commercial export invoice standards.
 */
export function deriveCommodityTitle(
  lines: LineItemForCommodity[],
  speciesList: Array<{ id: string; name?: string; scientificName?: string }>
): string {
  if (!lines || lines.length === 0) return '';
  const validLines = lines.filter((l) => (l.speciesId && l.speciesId.trim()) || (l.productDescription && l.productDescription.trim()));
  if (validLines.length === 0) return '';

  // Group lines by product (speciesId or normalized productDescription)
  const groupMap = new Map<string, { productName: string; totalCartons: number }>();

  for (const l of validLines) {
    const sp = speciesList.find((s) => s.id === l.speciesId);
    let displayName = '';
    if (sp?.name) {
      if (l.productDescription && l.productDescription.trim() && l.productDescription.trim().toUpperCase() !== sp.name.toUpperCase()) {
        displayName = l.productDescription.trim().toUpperCase();
      } else {
        displayName = sp.name.toUpperCase();
      }
    } else {
      displayName = (l.productDescription || '').trim().toUpperCase();
    }

    if (!displayName) continue;

    const key = sp?.id ? `sp-${sp.id}` : `name-${displayName}`;
    const rawCartons = typeof l.cartonsCount === 'string'
      ? parseFloat(l.cartonsCount.replace(/,/g, '')) || 0
      : Number(l.cartonsCount) || 0;

    const existing = groupMap.get(key);
    if (existing) {
      existing.totalCartons += rawCartons;
    } else {
      groupMap.set(key, { productName: displayName, totalCartons: rawCartons });
    }
  }

  const parts: string[] = [];
  for (const [, group] of groupMap.entries()) {
    if (group.totalCartons > 0) {
      const cartonWord = group.totalCartons === 1 ? 'CARTON' : 'CARTONS';
      parts.push(`${group.totalCartons} ${cartonWord} ${group.productName}`);
    } else {
      parts.push(group.productName);
    }
  }

  return parts.join(' & ');
}

/**
 * Derives the SCIENTIFIC NAME (Row 10) for export invoices.
 * Fetches from the Product Master (Species).
 * Deduplicates identical scientific names across items (e.g. UROTEUTHIS DUVAUCELII).
 * Joins distinct scientific names with ' & ' (e.g. UROTEUTHIS DUVAUCELII & LITOPENAEUS VANNAMEI).
 */
export function deriveScientificName(
  lines: LineItemForCommodity[],
  speciesList: Array<{ id: string; name?: string; scientificName?: string }>
): string {
  if (!lines || lines.length === 0) return '';
  const validLines = lines.filter((l) => (l.speciesId && l.speciesId.trim()) || (l.productDescription && l.productDescription.trim()));
  if (validLines.length === 0) return '';

  const names: string[] = [];
  for (const l of validLines) {
    const sp = speciesList.find((s) => s.id === l.speciesId);
    let sci = sp?.scientificName;
    if (!sci && l.productDescription) {
      const match = speciesList.find((s) => (s.name || '').toLowerCase() === (l.productDescription || '').trim().toLowerCase());
      if (match?.scientificName) sci = match.scientificName;
    }
    if (sci && sci.trim()) {
      names.push(sci.trim().toUpperCase());
    }
  }

  const unique = Array.from(new Set(names));
  return unique.join(' & ');
}

/**
 * Derives the HSN / ITC (HS) Code for export invoices.
 * Fetches from individual line items or Product Master (Species).
 * Deduplicates identical HSN codes across items (e.g. 03074310).
 * Joins distinct HSN codes with ' & ' (e.g. 03074310 & 03061790).
 */
export function deriveHsnCode(
  lines: Array<{ hsCode?: string; speciesId?: string; productDescription?: string }>,
  speciesList: Array<{ id: string; name?: string; hsCode?: string }>
): string {
  if (!lines || lines.length === 0) return '';
  const codes: string[] = [];
  for (const l of lines) {
    let code = l.hsCode ? l.hsCode.trim() : '';
    if (!code && l.speciesId) {
      const sp = speciesList.find((s) => s.id === l.speciesId);
      if (sp?.hsCode) code = sp.hsCode.trim();
    }
    if (!code && l.productDescription) {
      const match = speciesList.find((s) => (s.name || '').toLowerCase() === (l.productDescription || '').trim().toLowerCase());
      if (match?.hsCode) code = match.hsCode.trim();
    }
    if (code) {
      codes.push(code.toUpperCase());
    }
  }

  const unique = Array.from(new Set(codes));
  return unique.join(' & ');
}

/**
 * Extracts the primary numeric sequence value from a commercial invoice number.
 * Examples:
 * - "RF/EXP/01/26-27" -> 1
 * - "RF/EXP/72/26-27" -> 72
 * - "EXP-2026-0072"   -> 72
 * - "INV-105"         -> 105
 * - "72"              -> 72
 * Returns Number.MAX_SAFE_INTEGER if no numeric tokens exist so unnumbered
 * entries sort at the end.
 */
export function extractInvoiceNumericValue(invoiceNo?: string): number {
  const raw = (invoiceNo || '').trim().toUpperCase();
  if (!raw) return Number.MAX_SAFE_INTEGER;

  // Strip trailing financial-year suffix such as "/26-27", "-26-27", "/2026-27", or "/2026-2027"
  const withoutTrailingFy = raw.replace(/[\/-](?:\d{2,4}-\d{2,4})$/, '');
  const tokens = withoutTrailingFy.match(/\d+/g);
  if (!tokens || tokens.length === 0) {
    const rawTokens = raw.match(/\d+/g);
    if (!rawTokens || rawTokens.length === 0) return Number.MAX_SAFE_INTEGER;
    return parseInt(rawTokens[rawTokens.length - 1], 10);
  }

  // If the final token is a trailing 4-digit year (e.g. "RF/EXP/72/2026")
  // while a non-year sequence token precedes it, prefer the preceding sequence number.
  const lastToken = tokens[tokens.length - 1];
  const lastVal = parseInt(lastToken, 10);
  if (tokens.length > 1 && /^(?:19|20)\d{2}$/.test(lastToken)) {
    for (let i = tokens.length - 2; i >= 0; i--) {
      if (!/^(?:19|20)\d{2}$/.test(tokens[i])) {
        return parseInt(tokens[i], 10);
      }
    }
  }

  return lastVal;
}

/**
 * Arranges commercial sales invoices in ascending numerical order based on each
 * invoice number's primary numeric value (e.g. 72 directly after 71),
 * sending unnumbered invoices to the end.
 */
export function sortSalesInvoicesByNumber<
  T extends { invoiceNo?: string; createdAt?: string }
>(invoices: T[]): T[] {
  return [...invoices].sort((a, b) => {
    const numA = extractInvoiceNumericValue(a.invoiceNo);
    const numB = extractInvoiceNumericValue(b.invoiceNo);
    if (numA !== numB) {
      return numA - numB;
    }

    const createdCompare = (a.createdAt || '').localeCompare(b.createdAt || '');
    if (createdCompare !== 0) {
      return createdCompare;
    }

    return (a.invoiceNo || '').localeCompare(b.invoiceNo || '', undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  });
}

/**
 * Computes the next sequential commercial invoice number integer across existing invoices.
 */
export function getNextInvoiceSequenceNumber(
  invoices: Array<{ invoiceNo?: string }>
): number {
  let maxNum = 0;
  for (const inv of invoices) {
    const val = extractInvoiceNumericValue(inv.invoiceNo);
    if (val < Number.MAX_SAFE_INTEGER && val > maxNum) {
      maxNum = val;
    }
  }
  return Math.max(maxNum + 1, invoices.length + 1);
}

