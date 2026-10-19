import { Purchase, Supplier, PaymentStatus } from '../types';

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
    financialYear
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
      warnings.push(
        `Data Quality Warning: Expense head "${key}" was entered on ${rowsWithKeyCount} separate rows in batch "${activeRows[0].batchNo}". Check if it was entered twice by mistake.`
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
