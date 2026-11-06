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
