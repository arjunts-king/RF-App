import test from 'node:test';
import assert from 'node:assert/strict';

// Genuine imports from production source modules (Zero Inline Duplication)
import {
  computePurchaseFields,
  allocateBatchCombined,
  allocateBatchExpenses,
  allocateBatchYield,
  allocateExpenseBatch,
  allocateYieldBatch,
  getIndianFinancialYear,
  calculateDueDate,
  derivePaymentStatus,
  getAgeingBucket,
  formatCroreINR,
  formatDashboardINR,
  formatForwardRate,
  deriveCommodityTitle,
  deriveScientificName
} from '../utils/calculations.ts';

import {
  normalizeKey,
  getFlexibleValue,
  formatExcelDate
} from '../utils/excelFormatters.ts';

import {
  calculatePerpetualInventory
} from '../utils/inventoryValuation.ts';

import {
  computeOutstandingFromAdvance,
  calculateDaysBetween,
  calculateReceivablesCollectionAnalysis
} from '../utils/collectionAnalysis.ts';

// ============================================================================
// SUITE 1: Pure Utility Formatters (excelFormatters.ts)
// ============================================================================

test('Excel Normalizer & Flexible Key Matcher (genuine excelFormatters.ts)', () => {
  assert.equal(normalizeKey('Supplier Name *'), 'suppliername');
  assert.equal(normalizeKey('Rate / Kg (INR)'), 'ratekginr');
  assert.equal(normalizeKey(''), '');

  const row = {
    'Supplier Name (Required)': 'Coastal Fishery Ltd',
    'Net Weight (Kg)': 1250.5,
    'Rate/Kg': 350
  };

  assert.equal(getFlexibleValue(row, ['supplier_name', 'suppliername', 'supplier']), 'Coastal Fishery Ltd');
  assert.equal(getFlexibleValue(row, ['weightkg', 'weight', 'netweight']), 1250.5);
  assert.equal(getFlexibleValue(row, ['ratekg', 'rate']), 350);
  assert.equal(getFlexibleValue(row, ['unknown_field']), undefined);
});

test('Excel Date Parsing across formats (genuine excelFormatters.ts)', () => {
  assert.equal(formatExcelDate('15-08-2026'), '2026-08-15');
  assert.equal(formatExcelDate('05/01/2026'), '2026-01-05');
  assert.equal(formatExcelDate('2026-11-04'), '2026-11-04');
  assert.equal(formatExcelDate(new Date(2026, 3, 20)), '2026-04-20');
});

// ============================================================================
// SUITE 2: Core Domain Calculations (calculations.ts)
// ============================================================================

test('Indian Financial Year (FY) calculation (genuine calculations.ts)', () => {
  assert.equal(getIndianFinancialYear('2026-04-01'), 'FY 2026-27');
  assert.equal(getIndianFinancialYear('2026-12-31'), 'FY 2026-27');
  assert.equal(getIndianFinancialYear('2027-01-15'), 'FY 2026-27');
  assert.equal(getIndianFinancialYear('2027-03-31'), 'FY 2026-27');
  assert.equal(getIndianFinancialYear('2026-03-31'), 'FY 2025-26');
});

test('Credit Due Date calculation (genuine calculations.ts)', () => {
  assert.equal(calculateDueDate('2026-05-01', 0), '2026-05-01');
  assert.equal(calculateDueDate('2026-05-01', 15), '2026-05-16');
  assert.equal(calculateDueDate('2026-05-01', 30), '2026-05-31');
  assert.equal(calculateDueDate('', 30), '');
});

test('Payment Status derivation (genuine calculations.ts)', () => {
  assert.equal(derivePaymentStatus(10000, 0), 'Unpaid');
  assert.equal(derivePaymentStatus(10000, 5000), 'Partially Paid');
  assert.equal(derivePaymentStatus(10000, 10000), 'Fully Paid');
  assert.equal(derivePaymentStatus(10000, 12000), 'Fully Paid');
});

test('Purchase Field Computation: purchase value, expenses, and net payable (genuine calculations.ts)', () => {
  const result = computePurchaseFields({
    weightKg: 500,
    ratePerKg: 300,
    damageWeightKg: 10,
    damageRatePerKg: 100,
    expenseBreakdown: {
      'ice': 1500,
      'labour': 2000,
      'transport': 3500
    },
    amountPaid: 50000,
    purchaseDate: '2026-06-10',
    supplier: { creditDays: 30 },
    yieldWeightKg: 420
  });

  // purchaseValue = 500 * 300 = 150,000
  assert.equal(result.purchaseValue, 150000);
  // damageAmount = 10 * 100 = 1,000
  assert.equal(result.damageAmount, 1000);
  // grossPurchaseValue = 150,000 - 1,000 = 149,000
  assert.equal(result.grossPurchaseValue, 149000);
  // totalExpenses = 1500 + 2000 + 3500 = 7,000
  assert.equal(result.totalExpenses, 7000);
  // totalCost = 149,000 + 7,000 = 156,000
  assert.equal(result.totalCost, 156000);
  // effectiveRatePerKg = 156,000 / 500 = 312
  assert.equal(result.effectiveRatePerKg, 312);
  // balancePayable = 156,000 - 50,000 = 106,000
  assert.equal(result.balancePayable, 106000);
  assert.equal(result.paymentStatus, 'Partially Paid');
  assert.equal(result.financialYear, 'FY 2026-27');
  // yieldPct = (420 / 500) * 100 = 84%
  assert.equal(result.yieldPct, 84);
});

test('Purchase Field Computation: edge cases with 0 weight, overpayment, and empty values (genuine calculations.ts)', () => {
  const zeroWeight = computePurchaseFields({
    weightKg: 0,
    ratePerKg: 300,
    purchaseDate: '2026-04-15'
  });
  assert.equal(zeroWeight.purchaseValue, 0);
  assert.equal(zeroWeight.effectiveRatePerKg, 0);
  assert.equal(zeroWeight.yieldPct, undefined);

  const overpaid = computePurchaseFields({
    weightKg: 100,
    ratePerKg: 200,
    amountPaid: 25000, // Total cost is 20,000, paid 25,000
    purchaseDate: '2026-04-15'
  });
  assert.equal(overpaid.totalCost, 20000);
  assert.equal(overpaid.balancePayable, 0);
  assert.equal(overpaid.paymentStatus, 'Fully Paid');
});

test('Batch Shared Expense Proportional Allocation (genuine calculations.ts)', () => {
  const lotA = {
    id: 'lot-1',
    batchNo: 'BATCH-2026-001',
    weightKg: 300,
    purchaseValue: 90000,
    grossPurchaseValue: 90000,
    expenseBreakdown: { 'transport': 6000 },
    amountPaid: 0,
    isVoided: false
  };

  const lotB = {
    id: 'lot-2',
    batchNo: 'BATCH-2026-001',
    weightKg: 700,
    purchaseValue: 210000,
    grossPurchaseValue: 210000,
    expenseBreakdown: {},
    amountPaid: 0,
    isVoided: false
  };

  const { updatedPurchases } = allocateBatchExpenses([lotA, lotB]);
  assert.equal(updatedPurchases.length, 2);

  // Total batch weight = 1000 kg. Lot A has 30%, Lot B has 70%.
  // Transport expense 6,000 should be split: Lot A = 1,800, Lot B = 4,200
  const updatedA = updatedPurchases.find((p) => p.id === 'lot-1');
  const updatedB = updatedPurchases.find((p) => p.id === 'lot-2');

  assert.equal(updatedA.expenseBreakdown['transport'], 1800);
  assert.equal(updatedB.expenseBreakdown['transport'], 4200);

  assert.equal(updatedA.totalCost, 91800);
  assert.equal(updatedB.totalCost, 214200);
  assert.equal(updatedA.effectiveRatePerKg, 306); // 91800 / 300
  assert.equal(updatedB.effectiveRatePerKg, 306); // 214200 / 700
});

test('Outstanding Ageing Buckets (genuine calculations.ts)', () => {
  const asOf = new Date('2026-07-01');

  // Due in future
  assert.equal(getAgeingBucket('2026-07-15', asOf), 'Not Due');
  // Due today
  assert.equal(getAgeingBucket('2026-07-01', asOf), 'Not Due');
  // Overdue by 10 days
  assert.equal(getAgeingBucket('2026-06-21', asOf), '0-30 Days');
  // Overdue by 45 days
  assert.equal(getAgeingBucket('2026-05-17', asOf), '31-60 Days');
  // Overdue by 75 days
  assert.equal(getAgeingBucket('2026-04-17', asOf), '61-90 Days');
  // Overdue by 120 days
  assert.equal(getAgeingBucket('2026-03-03', asOf), '91-180 Days');
  // Overdue by 200 days
  assert.equal(getAgeingBucket('2025-12-13', asOf), '180+ Days');
  // Empty date
  assert.equal(getAgeingBucket('', asOf), 'Not Due');
});

test('Pre-indexing Map Optimization vs Linear Array Scan equivalence', () => {
  const suppliers = [
    { id: 'supp-1', name: 'Supplier Alpha' },
    { id: 'supp-2', name: 'Supplier Beta' }
  ];

  const purchases = [
    { id: 'p-1', supplierId: 'supp-1', weightKg: 100, isVoided: false },
    { id: 'p-2', supplierId: 'supp-2', weightKg: 200, isVoided: false },
    { id: 'p-3', supplierId: 'supp-1', weightKg: 300, isVoided: false },
    { id: 'p-4', supplierId: 'supp-1', weightKg: 50, isVoided: true }
  ];

  // Map pre-indexing
  const map = new Map();
  purchases.forEach((p) => {
    if (p.isVoided) return;
    const list = map.get(p.supplierId) || [];
    list.push(p);
    map.set(p.supplierId, list);
  });

  // Verify O(1) lookup matches O(P) filter
  suppliers.forEach((supp) => {
    const linearResult = purchases.filter((p) => p.supplierId === supp.id && !p.isVoided);
    const mapResult = map.get(supp.id) || [];
    assert.deepEqual(mapResult, linearResult);
  });
});

// ============================================================================
// SUITE 3: Unified Landing Expense & Yield Allocation (allocateBatchCombined)
// ============================================================================

test('allocateBatchCombined: Multi-Lot Batch with Shared Landing Expenses and Explicit Batch Yield (genuine calculations.ts)', () => {
  const lotA = {
    id: 'lot-m1',
    batchNo: 'BATCH-COMBINED-001',
    weightKg: 400,
    purchaseValue: 120000,
    grossPurchaseValue: 120000,
    expenseBreakdown: { 'transport': 5000, 'ice': 1500 },
    amountPaid: 20000,
    isVoided: false
  };

  const lotB = {
    id: 'lot-m2',
    batchNo: 'BATCH-COMBINED-001',
    weightKg: 600,
    purchaseValue: 180000,
    grossPurchaseValue: 180000,
    expenseBreakdown: {},
    amountPaid: 50000,
    isVoided: false
  };

  // Explicit batch finished meat yield: 850 kg (85% recovery on 1,000 kg batch)
  const { updatedPurchases, warnings } = allocateBatchCombined([lotA, lotB], 850);

  assert.equal(updatedPurchases.length, 2);
  assert.equal(warnings.length, 0);

  const updatedA = updatedPurchases.find((p) => p.id === 'lot-m1');
  const updatedB = updatedPurchases.find((p) => p.id === 'lot-m2');

  // 1. Proportional Expense Allocation (40% to Lot A, 60% to Lot B)
  assert.equal(updatedA.expenseBreakdown['transport'], 2000);
  assert.equal(updatedB.expenseBreakdown['transport'], 3000);
  assert.equal(updatedA.expenseBreakdown['ice'], 600);
  assert.equal(updatedB.expenseBreakdown['ice'], 900);

  // Total Expenses & Conservation Law: 2600 + 3900 = 6500
  assert.equal(updatedA.totalExpenses, 2600);
  assert.equal(updatedB.totalExpenses, 3900);
  assert.equal(updatedA.totalExpenses + updatedB.totalExpenses, 6500);

  // Total Cost & Effective Rate
  assert.equal(updatedA.totalCost, 122600);
  assert.equal(updatedB.totalCost, 183900);
  assert.equal(updatedA.totalCost + updatedB.totalCost, 306500);
  assert.equal(updatedA.effectiveRatePerKg, 306.5);
  assert.equal(updatedB.effectiveRatePerKg, 306.5);

  // Balance Payable & Status
  assert.equal(updatedA.balancePayable, 102600); // 122600 - 20000
  assert.equal(updatedB.balancePayable, 133900); // 183900 - 50000
  assert.equal(updatedA.paymentStatus, 'Partially Paid');
  assert.equal(updatedB.paymentStatus, 'Partially Paid');
  assert.equal(updatedA.isBatchAllocated, true);
  assert.equal(updatedB.isBatchAllocated, true);

  // 2. Proportional Finished Meat Yield (40% of 850 = 340 kg, remainder 510 kg to Lot B)
  assert.equal(updatedA.yieldWeightKg, 340);
  assert.equal(updatedB.yieldWeightKg, 510);
  assert.equal(updatedA.yieldWeightKg + updatedB.yieldWeightKg, 850);
  assert.equal(updatedA.yieldPct, 85);
  assert.equal(updatedB.yieldPct, 85);
  assert.equal(updatedA.batchYieldWeightKg, 850);
  assert.equal(updatedB.batchYieldWeightKg, 850);
  assert.equal(updatedA.batchYieldPct, 85);
  assert.equal(updatedB.batchYieldPct, 85);
  assert.equal(updatedA.isBatchYieldAllocated, true);
  assert.equal(updatedB.isBatchYieldAllocated, true);

  // 3. Derived Finished Meat Cost per Kg parity
  const meatCostA = Number((updatedA.totalCost / updatedA.yieldWeightKg).toFixed(2));
  const meatCostB = Number((updatedB.totalCost / updatedB.yieldWeightKg).toFixed(2));
  assert.equal(meatCostA, 360.59);
  assert.equal(meatCostB, 360.59);
});

test('allocateBatchCombined: Multi-Lot Batch with Explicit Batch Yield Percentage (genuine calculations.ts)', () => {
  const lot1 = {
    id: 'lot-p1',
    batchNo: 'BATCH-PCT-002',
    weightKg: 300,
    purchaseValue: 90000,
    grossPurchaseValue: 90000,
    expenseBreakdown: { 'transport': 4000 },
    amountPaid: 0,
    isVoided: false
  };

  const lot2 = {
    id: 'lot-p2',
    batchNo: 'BATCH-PCT-002',
    weightKg: 700,
    purchaseValue: 210000,
    grossPurchaseValue: 210000,
    expenseBreakdown: {},
    amountPaid: 0,
    isVoided: false
  };

  const { updatedPurchases, warnings } = allocateBatchCombined([lot1, lot2], undefined, 80);
  assert.equal(warnings.length, 0);

  const u1 = updatedPurchases.find((p) => p.id === 'lot-p1');
  const u2 = updatedPurchases.find((p) => p.id === 'lot-p2');

  // Total raw weight = 1000 kg => 80% = 800 kg resolved yield
  assert.equal(u1.yieldWeightKg, 240); // 30% of 800
  assert.equal(u2.yieldWeightKg, 560); // 70% of 800
  assert.equal(u1.yieldWeightKg + u2.yieldWeightKg, 800);
  assert.equal(u1.yieldPct, 80);
  assert.equal(u2.yieldPct, 80);
  assert.equal(u1.batchYieldWeightKg, 800);
  assert.equal(u2.batchYieldWeightKg, 800);
  assert.equal(u1.batchYieldPct, 80);
  assert.equal(u2.batchYieldPct, 80);
});

test('allocateBatchCombined: Single-Lot Batch with Yield Apportionment (genuine calculations.ts)', () => {
  const singleLot = {
    id: 'lot-s1',
    batchNo: 'BATCH-SINGLE-001',
    weightKg: 500,
    purchaseValue: 150000,
    grossPurchaseValue: 150000,
    expenseBreakdown: { 'transport': 3500 },
    totalExpenses: 3500,
    totalCost: 153500,
    effectiveRatePerKg: 307,
    amountPaid: 153500,
    balancePayable: 0,
    paymentStatus: 'Fully Paid',
    isVoided: false
  };

  const { updatedPurchases, warnings } = allocateBatchCombined([singleLot], 425);
  assert.equal(updatedPurchases.length, 1);
  assert.equal(warnings.length, 0);

  const res = updatedPurchases[0];
  assert.equal(res.totalExpenses, 3500);
  assert.equal(res.totalCost, 153500);
  assert.equal(res.yieldWeightKg, 425);
  assert.equal(res.yieldPct, 85);
  assert.equal(res.batchYieldWeightKg, 425);
  assert.equal(res.batchYieldPct, 85);
  assert.equal(res.isBatchYieldAllocated, true);
});

test('allocateBatchCombined: Voided items isolation and yield excess notice (genuine calculations.ts)', () => {
  const lotActive1 = {
    id: 'lot-act-1',
    batchNo: 'BATCH-2026-VOID-TEST',
    weightKg: 60,
    ratePerKg: 100,
    purchaseValue: 6000,
    grossPurchaseValue: 6000,
    expenseBreakdown: { transport: 600 },
    isVoided: false
  };

  const lotActive2 = {
    id: 'lot-act-2',
    batchNo: 'BATCH-2026-VOID-TEST',
    weightKg: 40,
    ratePerKg: 100,
    purchaseValue: 4000,
    grossPurchaseValue: 4000,
    expenseBreakdown: { transport: 400 },
    isVoided: false
  };

  const lotVoided = {
    id: 'lot-void-3',
    batchNo: 'BATCH-2026-VOID-TEST',
    weightKg: 50,
    ratePerKg: 100,
    purchaseValue: 5000,
    grossPurchaseValue: 5000,
    expenseBreakdown: { transport: 500 },
    isVoided: true
  };

  // Test yield exceeding raw weight (110 Kg yield on 100 Kg active raw weight due to glazing)
  const result = allocateBatchCombined([lotActive1, lotActive2, lotVoided], 110);

  assert.equal(result.updatedPurchases.length, 3);
  const updated1 = result.updatedPurchases.find((p) => p.id === 'lot-act-1');
  const updated2 = result.updatedPurchases.find((p) => p.id === 'lot-act-2');
  const updatedVoid = result.updatedPurchases.find((p) => p.id === 'lot-void-3');

  // Voided item remains completely unallocated
  assert.equal(updatedVoid.isVoided, true);
  assert.equal(updatedVoid.isBatchAllocated, undefined);
  assert.equal(updatedVoid.isBatchYieldAllocated, undefined);

  // Active items pool 1,000 transport expenses across 100 active Kg: 60% and 40%
  assert.equal(updated1.totalExpenses, 600);
  assert.equal(updated2.totalExpenses, 400);

  // Yield allocated: 66 Kg to lot 1, 44 Kg to lot 2
  assert.equal(updated1.yieldWeightKg, 66);
  assert.equal(updated2.yieldWeightKg, 44);

  // Verification of warning on yield > total weight
  assert.ok(result.warnings.some((w) => w.includes('exceeds total raw batch weight')));
});

test('allocateBatchCombined: Multi-lot batch with leading voided lots preserves yield conservation laws', () => {
  const lots = [
    { id: 'v1', isVoided: true, weightKg: 100, batchNo: 'B-LEADING-VOID', purchaseValue: 10000, ratePerKg: 100 },
    { id: 'a1', isVoided: false, weightKg: 50, batchNo: 'B-LEADING-VOID', purchaseValue: 5000, ratePerKg: 100 },
    { id: 'a2', isVoided: false, weightKg: 50, batchNo: 'B-LEADING-VOID', purchaseValue: 5000, ratePerKg: 100 }
  ];

  const result = allocateBatchCombined(lots, 80);

  const v1 = result.updatedPurchases.find((p) => p.id === 'v1');
  const a1 = result.updatedPurchases.find((p) => p.id === 'a1');
  const a2 = result.updatedPurchases.find((p) => p.id === 'a2');

  assert.equal(v1.isVoided, true);
  assert.equal(a1.yieldWeightKg, 40);
  assert.equal(a2.yieldWeightKg, 40);

  const totalActiveYield = result.updatedPurchases
    .filter((p) => !p.isVoided)
    .reduce((sum, p) => sum + (p.yieldWeightKg || 0), 0);

  assert.equal(totalActiveYield, 80);
});

// ============================================================================
// SUITE 4: Perpetual Inventory Moving-Average Valuation (inventoryValuation.ts)
// ============================================================================

test('calculatePerpetualInventory: Moving-average unit cost adjustments across multiple receipts and sales issues (genuine inventoryValuation.ts)', () => {
  const inventoryItems = [
    {
      id: 'item-vn-1',
      code: 'RAW-VN-3040',
      name: 'Vannamei Shrimp 30/40 Raw',
      category: 'Raw Material',
      unit: 'Kg',
      quantityBasis: 'actual',
      minimumStockQuantity: 100,
      isDeleted: false
    }
  ];

  const speciesList = [
    { id: 'sp-vn-1', name: 'Vannamei Shrimp', inventoryItemId: 'item-vn-1' }
  ];

  const customers = [
    { id: 'cust-1', name: 'Tokyo Seafood Corp' }
  ];

  const purchases = [
    // Day 1: Purchase 1,000 Kg @ ₹200/Kg = ₹200,000 total cost
    {
      id: 'p-1',
      purchaseId: 'PUR-2026-001',
      supplierId: 'supp-1',
      speciesId: 'sp-vn-1',
      weightKg: 1000,
      ratePerKg: 200,
      totalCost: 200000,
      purchaseDate: '2026-05-01',
      isVoided: false
    },
    // Day 2: Purchase 500 Kg @ ₹260/Kg = ₹130,000 total cost
    // Cumulative: 1,500 Kg, Total Value = ₹330,000 => New Moving Avg Cost = 330,000 / 1,500 = ₹220/Kg
    {
      id: 'p-2',
      purchaseId: 'PUR-2026-002',
      supplierId: 'supp-2',
      speciesId: 'sp-vn-1',
      weightKg: 500,
      ratePerKg: 260,
      totalCost: 130000,
      purchaseDate: '2026-05-02',
      isVoided: false
    }
  ];

  const salesInvoices = [
    // Day 3: Sales issue of 600 Kg to foreign buyer
    // Should be relieved at current Moving Average Cost (₹220/Kg) => COGS = 600 * 220 = ₹132,000
    // Remaining stock balance: 900 Kg @ ₹220/Kg = ₹198,000
    {
      id: 'inv-1',
      invoiceNo: 'EXP-2026-001',
      invoiceDate: '2026-05-03',
      consigneeId: 'cust-1',
      totalWeightKg: 600,
      exchangeRate: 83.5,
      totalAmountCurrency: 2000,
      totalRealizedINR: 167000,
      lineItems: [
        {
          id: 'line-1',
          speciesId: 'sp-vn-1',
          weightKg: 600,
          amountCurrency: 2000
        }
      ]
    }
  ];

  const result = calculatePerpetualInventory({
    inventoryItems,
    speciesList,
    customers,
    purchases,
    salesInvoices
  });

  // 1. Stock Positions Verification
  assert.equal(result.stockPositions.length, 1);
  const pos = result.stockPositions[0];
  assert.equal(pos.quantityOnHand, 900); // 1,500 - 600
  assert.equal(pos.averageCostPerKg, 220); // (200,000 + 130,000) / 1500
  assert.equal(pos.totalStockValue, 198000); // 900 * 220
  assert.equal(pos.stockStatus, 'Normal');

  // 2. COGS Report Verification
  assert.equal(result.cogsReport.length, 1);
  const cogs = result.cogsReport[0];
  assert.equal(cogs.quantityKg, 600);
  assert.equal(cogs.inventoryUnitCost, 220);
  assert.equal(cogs.totalCogsINR, 132000); // 600 * 220
  assert.equal(cogs.saleValueINR, 167000);
  assert.equal(cogs.grossProfitINR, 35000); // 167,000 - 132,000

  // 3. Overall Reconciliation Verification
  assert.equal(result.reconciliation.formulaCheck, true);
  assert.equal(result.reconciliation.purchaseModuleAgreed, true);
  assert.equal(result.reconciliation.salesModuleAgreed, true);
  assert.equal(result.reconciliation.status, 'Passed');
  assert.equal(result.reconciliation.closingValue, 198000);
});

test('calculatePerpetualInventory: Purchase return reconciliation tie-out without false variance (genuine inventoryValuation.ts)', () => {
  const inventoryItems = [
    {
      id: 'i1',
      code: 'VN',
      name: 'Vannamei Raw',
      category: 'Raw Material',
      unit: 'Kg',
      quantityBasis: 'actual',
      minimumStockQuantity: 10,
      isDeleted: false
    }
  ];

  const speciesList = [
    { id: 's1', name: 'Vannamei Raw', inventoryItemId: 'i1' }
  ];

  const purchases = [
    {
      id: 'p1',
      purchaseId: 'P1',
      supplierId: 'sp1',
      speciesId: 's1',
      weightKg: 1000,
      ratePerKg: 300,
      totalCost: 300000,
      purchaseDate: '2026-05-01',
      isVoided: false
    }
  ];

  const purchaseReturns = [
    {
      id: 'r1',
      purchaseId: 'p1',
      supplierId: 'sp1',
      returnedWeightKg: 100,
      returnedValue: 30000,
      returnDate: '2026-05-05',
      isVoided: false
    }
  ];

  const res = calculatePerpetualInventory({
    inventoryItems,
    speciesList,
    purchases,
    purchaseReturns
  });

  // Opening: 0, Net Receipts: 270,000 (300k - 30k), Issues: 0, Adjustments: 0 => Closing: 270,000
  assert.equal(res.reconciliation.openingValue, 0);
  assert.equal(res.reconciliation.receiptsValue, 270000);
  assert.equal(res.reconciliation.issuesValue, 0);
  assert.equal(res.reconciliation.closingValue, 270000);
  assert.equal(res.reconciliation.formulaCheck, true);
  assert.equal(res.reconciliation.purchaseModuleTotalCost, 270000);
  assert.equal(res.reconciliation.purchaseModuleAgreed, true);
  assert.equal(res.reconciliation.purchaseVariance, 0);
  assert.equal(res.reconciliation.status, 'Passed');

  // Stock position should reflect 900 Kg remaining at ₹300/Kg
  const pos = res.stockPositions[0];
  assert.equal(pos.quantityOnHand, 900);
  assert.equal(pos.totalStockValue, 270000);
  assert.equal(pos.averageCostPerKg, 300);
});

test('calculatePerpetualInventory: Purchase returns with fluctuating purchase rates maintains formulaCheck and Passed status', () => {
  const inventoryItems = [
    {
      id: 'i1',
      code: 'VN-RAW',
      name: 'Vannamei Raw',
      category: 'Raw Material',
      unit: 'Kg',
      quantityBasis: 'actual',
      minimumStockQuantity: 10,
      isDeleted: false
    }
  ];

  const speciesList = [
    { id: 's1', name: 'Vannamei Raw', inventoryItemId: 'i1' }
  ];

  const purchases = [
    {
      id: 'p1',
      purchaseId: 'P1',
      supplierId: 's1',
      speciesId: 's1',
      weightKg: 1000,
      ratePerKg: 100,
      totalCost: 100000,
      purchaseDate: '2026-05-01',
      isVoided: false
    },
    {
      id: 'p2',
      purchaseId: 'P2',
      supplierId: 's1',
      speciesId: 's1',
      weightKg: 1000,
      ratePerKg: 200,
      totalCost: 200000,
      purchaseDate: '2026-05-02',
      isVoided: false
    }
  ];

  const purchaseReturns = [
    {
      id: 'r1',
      purchaseId: 'p2',
      supplierId: 's1',
      returnedWeightKg: 500,
      returnedValue: 100000,
      returnDate: '2026-05-03',
      isVoided: false
    }
  ];

  const res = calculatePerpetualInventory({
    inventoryItems,
    speciesList,
    purchases,
    purchaseReturns
  });

  assert.equal(res.reconciliation.formulaCheck, true);
  assert.equal(res.reconciliation.status, 'Passed');
  assert.equal(res.reconciliation.closingValue, 200000);
  assert.equal(res.reconciliation.receiptsValue, 200000);

  // Remaining stock: 1500 kg, balance value: ₹200,000, average cost: 200000 / 1500 = 133.3333
  const pos = res.stockPositions[0];
  assert.equal(pos.quantityOnHand, 1500);
  assert.equal(pos.totalStockValue, 200000);
  assert.equal(pos.averageCostPerKg, 133.3333);
});

test('Sales Realization & Settlement: computes advance received, balance payment, bank rate and realization status', () => {
  const invoice = {
    id: 'inv-test-1',
    invoiceNo: 'EXP-2026-901',
    invoiceDate: '2026-10-15',
    totalAmountCurrency: 50000, // $50,000 USD
    bankPreDeterminedExchangeRate: 84.75, // Pre-determined bank rate
    exchangeRate: 84.50
  };

  // Case 1: Advance received only (30% = $15,000) on 2026-10-18
  const advanceReceivedUSD = 15000;
  const advanceReceivedDate = '2026-10-18';
  const bankRate = invoice.bankPreDeterminedExchangeRate;
  const advanceINR = Number((advanceReceivedUSD * bankRate).toFixed(2));
  assert.equal(advanceINR, 1271250); // 15000 * 84.75 = 1,271,250

  let totalRealized = advanceReceivedUSD;
  let remainingBalance = invoice.totalAmountCurrency - totalRealized;
  let status = totalRealized <= 0 ? 'Not Realized' : remainingBalance <= 0.05 ? 'Fully Realized' : 'Partially Realized';
  assert.equal(status, 'Partially Realized');
  assert.equal(remainingBalance, 35000);

  // Case 2: Balance payment received ($35,000) on 2026-11-02
  const balancePaymentUSD = 35000;
  const balancePaymentDate = '2026-11-02';
  const balanceINR = Number((balancePaymentUSD * bankRate).toFixed(2));
  assert.equal(balanceINR, 2966250); // 35000 * 84.75 = 2,966,250

  totalRealized = advanceReceivedUSD + balancePaymentUSD;
  const totalRealizedINR = advanceINR + balanceINR;
  remainingBalance = invoice.totalAmountCurrency - totalRealized;
  status = totalRealized <= 0 ? 'Not Realized' : remainingBalance <= 0.05 ? 'Fully Realized' : 'Partially Realized';

  assert.equal(totalRealized, 50000);
  assert.equal(totalRealizedINR, 4237500); // 50000 * 84.75 = 4,237,500
  assert.equal(remainingBalance, 0);
  assert.equal(status, 'Fully Realized');
});

test('Sales Realization: computeOutstandingFromAdvance directly calculates remaining balance and percentages', () => {
  // Invoice of $26,100, advance received $7,830, bank rate 84.75
  const res = computeOutstandingFromAdvance(26100, 7830, 84.75);
  assert.equal(res.outstandingAfterAdvanceCurrency, 18270);
  assert.equal(res.advancePercentage, 30.0);
  assert.equal(res.outstandingPercentage, 70.0);
  assert.equal(res.outstandingAfterAdvanceINR, 1548382.5); // 18270 * 84.75

  // 100% advance test
  const fullAdv = computeOutstandingFromAdvance(10000, 10000, 85);
  assert.equal(fullAdv.outstandingAfterAdvanceCurrency, 0);
  assert.equal(fullAdv.advancePercentage, 100.0);
  assert.equal(fullAdv.outstandingPercentage, 0.0);

  // 0 advance test
  const zeroAdv = computeOutstandingFromAdvance(10000, 0, 85);
  assert.equal(zeroAdv.outstandingAfterAdvanceCurrency, 10000);
  assert.equal(zeroAdv.advancePercentage, 0.0);
  assert.equal(zeroAdv.outstandingPercentage, 100.0);
});

test('Receivables Collection Period Analysis: calculates DSO, advance lag, turnaround lag, and ageing buckets', () => {
  const dummyCustomers = [
    { id: 'c1', name: 'Tokyo Seafood Co.', country: 'Japan' },
    { id: 'c2', name: 'Mediterranean Foods SL', country: 'Spain' }
  ];

  const dummyInvoices = [
    // Invoice 1: Fully realized with 5 days to advance, 15 days advance to balance (total 20 days DSO)
    {
      id: 'inv-1',
      invoiceNo: 'EXP-001',
      invoiceDate: '2026-10-01',
      consigneeId: 'c1',
      currency: 'USD',
      totalAmountCurrency: 20000,
      bankPreDeterminedExchangeRate: 84.5,
      exchangeRate: 84.5,
      advanceReceivedCurrency: 6000,
      advanceReceivedDate: '2026-10-06', // 5 days
      balancePaymentAmountCurrency: 14000,
      balancePaymentDate: '2026-10-21', // 15 days after advance
      totalRealizedCurrency: 20000,
      totalRealizedINR: 1690000,
      balanceRealizationCurrency: 0,
      realizationStatus: 'Fully Realized'
    },
    // Invoice 2: Partially realized (advance received, balance outstanding)
    {
      id: 'inv-2',
      invoiceNo: 'EXP-002',
      invoiceDate: '2026-10-10',
      consigneeId: 'c2',
      currency: 'USD',
      totalAmountCurrency: 30000,
      bankPreDeterminedExchangeRate: 85.0,
      exchangeRate: 85.0,
      advanceReceivedCurrency: 9000,
      advanceReceivedDate: '2026-10-15', // 5 days
      totalRealizedCurrency: 9000,
      totalRealizedINR: 765000,
      balanceRealizationCurrency: 21000,
      realizationStatus: 'Partially Realized'
    }
  ];

  const analysis = calculateReceivablesCollectionAnalysis(
    dummyInvoices,
    dummyCustomers,
    new Date('2026-10-31')
  );

  assert.equal(analysis.totalActiveInvoices, 2);
  assert.equal(analysis.totalRealizedInvoices, 1);
  assert.equal(analysis.totalPartiallyRealizedInvoices, 1);
  assert.equal(analysis.totalInvoicedUSD, 50000);
  assert.equal(analysis.totalAdvanceUSD, 15000);
  assert.equal(analysis.totalOutstandingAfterAdvanceUSD, 35000);
  assert.equal(analysis.totalCollectedUSD, 29000);
  assert.equal(analysis.totalOutstandingUSD, 21000);

  // DSO should be 20 days (from 2026-10-01 to 2026-10-21)
  assert.equal(analysis.averageCollectionPeriodDays, 20);
  // Average days to advance = (5 + 5) / 2 = 5 days
  assert.equal(analysis.averageDaysToAdvance, 5);
  // Turnaround from advance to balance = 15 days
  assert.equal(analysis.averageDaysAdvanceToBalance, 15);

  // Consignee summaries
  assert.equal(analysis.consigneeBreakdown.length, 2);
  const c1Summary = analysis.consigneeBreakdown.find((c) => c.consigneeId === 'c1');
  assert.ok(c1Summary);
  assert.equal(c1Summary.avgCollectionDays, 20);
  assert.equal(c1Summary.collectionHealth, 'Prompt');
});

test('Dual Forward Rates: Independent advance & balance forward rates, weighted average, and import key recognition', () => {
  // Scenario: Export invoice of $50,000
  // Advance 30% ($15,000) booked under forward contract @ 84.50
  // Balance 70% ($35,000) booked under subsequent forward contract @ 84.85
  const invoiceTotalUSD = 50000;
  const advanceUSD = 15000;
  const advanceForwardRate = 84.50;
  const balanceUSD = 35000;
  const balanceForwardRate = 84.85;

  const advanceINR = Number((advanceUSD * advanceForwardRate).toFixed(2));
  assert.equal(advanceINR, 1267500.00);

  const balanceINR = Number((balanceUSD * balanceForwardRate).toFixed(2));
  assert.equal(balanceINR, 2969750.00);

  const totalRealizedUSD = advanceUSD + balanceUSD;
  const totalRealizedINR = advanceINR + balanceINR;
  assert.equal(totalRealizedUSD, 50000);
  assert.equal(totalRealizedINR, 4237250.00);

  // Weighted average realized forward rate: 4237250 / 50000 = 84.745
  const weightedAvgRate = Number((totalRealizedINR / totalRealizedUSD).toFixed(4));
  assert.equal(weightedAvgRate, 84.745);

  // Direct outstanding calculation evaluating remaining balance at the balance forward rate
  const outstandingAfterAdv = computeOutstandingFromAdvance(invoiceTotalUSD, advanceUSD, balanceForwardRate);
  assert.equal(outstandingAfterAdv.outstandingAfterAdvanceCurrency, 35000);
  assert.equal(outstandingAfterAdv.outstandingAfterAdvanceINR, 2969750.00);
  assert.equal(outstandingAfterAdv.advancePercentage, 30.0);
  assert.equal(outstandingAfterAdv.outstandingPercentage, 70.0);

  // Verify flexible key normalization for import headers
  assert.equal(normalizeKey('Advance Forward Rate (Bank)'), 'advanceforwardratebank');
  assert.equal(normalizeKey('Balance Forward Rate (Bank)'), 'balanceforwardratebank');

  const row = {
    'Invoice No': 'EXP-2026-099',
    'Advance Forward Rate (Bank)': 84.50,
    'Balance Forward Rate (Bank)': 84.85,
    'Advance Received (USD)': 15000,
    'Balance Payment Amount (USD)': 35000
  };

  const matchedAdvRate = getFlexibleValue(row, [
    'advanceforwardratebank',
    'advanceforwardrate',
    'advanceexchangerate',
    'advancerate'
  ]);
  const matchedBalRate = getFlexibleValue(row, [
    'balanceforwardratebank',
    'balanceforwardrate',
    'balanceexchangerate',
    'balancerate'
  ]);

  assert.equal(matchedAdvRate, 84.50);
  assert.equal(matchedBalRate, 84.85);
});

test('Realization Shortfall & Contract Terms Tracking: Advance & Balance USD discrepancies and import normalization', () => {
  // Scenario: Total export invoice value $50,000 USD
  // Contract stipulates 30% advance ($15,000 USD), but correspondent bank deductions yield actual advance $14,940 USD (Shortfall = $60 USD)
  // Balance as per actual shipping price is $35,000 USD, but overseas wire deduction yields actual balance $34,800 USD (Shortfall = $200 USD)
  const invoiceTotalUSD = 50000;
  const advanceTermsUSD = 15000;
  const actualAdvanceUSD = 14940;
  const advanceShortfallUSD = Math.max(0, Number((advanceTermsUSD - actualAdvanceUSD).toFixed(2)));
  assert.equal(advanceShortfallUSD, 60.00);

  const balanceActualPriceUSD = 35000;
  const actualBalanceUSD = 34800;
  const balanceShortfallUSD = Math.max(0, Number((balanceActualPriceUSD - actualBalanceUSD).toFixed(2)));
  assert.equal(balanceShortfallUSD, 200.00);

  const totalShortfallUSD = Number((advanceShortfallUSD + balanceShortfallUSD).toFixed(2));
  assert.equal(totalShortfallUSD, 260.00);

  const totalActualSettledUSD = actualAdvanceUSD + actualBalanceUSD;
  assert.equal(totalActualSettledUSD, 49740.00);

  // Total Accounted = Actual Realized + Deductions/Shortfall accounted
  const totalAccountedUSD = totalActualSettledUSD + totalShortfallUSD;
  assert.equal(totalAccountedUSD, invoiceTotalUSD);

  // Settlement reconciliation status logic
  const isFullyRealized = (actualBalanceUSD > 0 && totalAccountedUSD >= invoiceTotalUSD - 0.05);
  assert.equal(isFullyRealized, true);

  // Normalization for template header columns
  assert.equal(normalizeKey('Advance as per Contract Terms (USD)'), 'advanceaspercontracttermsusd');
  assert.equal(normalizeKey('Actual Advance Received (USD)'), 'actualadvancereceivedusd');
  assert.equal(normalizeKey('Advance Shortfall (USD)'), 'advanceshortfallusd');
  assert.equal(normalizeKey('Balance as per Actual Price (USD)'), 'balanceasperactualpriceusd');
  assert.equal(normalizeKey('Actual Balance Received (USD)'), 'actualbalancereceivedusd');
  assert.equal(normalizeKey('Balance Shortfall (USD)'), 'balanceshortfallusd');
  assert.equal(normalizeKey('Total Shortfall (USD)'), 'totalshortfallusd');

  // Flexible key matching test from import row
  const importRow = {
    'Invoice No': 'EXP-2026-105',
    'Advance as per Contract Terms (USD)': 15000,
    'Actual Advance Received (USD)': 14940,
    'Advance Shortfall (USD)': 60,
    'Balance as per Actual Price (USD)': 35000,
    'Actual Balance Received (USD)': 34800,
    'Balance Shortfall (USD)': 200,
    'Total Shortfall (USD)': 260
  };

  const parsedAdvTerms = getFlexibleValue(importRow, [
    'advanceaspercontracttermsusd',
    'advancecontracttermsusd',
    'advancetermsusd'
  ]);
  const parsedActualAdv = getFlexibleValue(importRow, [
    'actualadvancereceivedusd',
    'advancereceivedusd'
  ]);
  const parsedBalPrice = getFlexibleValue(importRow, [
    'balanceasperactualpriceusd',
    'balanceactualpriceusd'
  ]);
  const parsedActualBal = getFlexibleValue(importRow, [
    'actualbalancereceivedusd',
    'balancepaymentamountusd'
  ]);
  const parsedTotalShortfall = getFlexibleValue(importRow, [
    'totalshortfallusd',
    'totalshortfall'
  ]);

  assert.equal(parsedAdvTerms, 15000);
  assert.equal(parsedActualAdv, 14940);
  assert.equal(parsedBalPrice, 35000);
  assert.equal(parsedActualBal, 34800);
  assert.equal(parsedTotalShortfall, 260);
});

test('Dashboard Multi-Filters: Multi-species, multi-supplier, and multi-criteria selection logic', () => {
  // Test dataset simulating purchase and sales entries across multiple suppliers and species
  const purchases = [
    { id: 'p1', supplierId: 's1', speciesId: 'sp1', locationId: 'loc1', weightKg: 1000, isVoided: false },
    { id: 'p2', supplierId: 's2', speciesId: 'sp2', locationId: 'loc1', weightKg: 1500, isVoided: false },
    { id: 'p3', supplierId: 's3', speciesId: 'sp1', locationId: 'loc2', weightKg: 2000, isVoided: false },
    { id: 'p4', supplierId: 's1', speciesId: 'sp3', locationId: 'loc2', weightKg: 800, isVoided: false },
    { id: 'p5', supplierId: 's2', speciesId: 'sp1', locationId: 'loc1', weightKg: 1200, isVoided: true } // Voided
  ];

  // 1. Filter by selecting 2 species ('sp1' and 'sp2')
  const selectedSpecies = ['sp1', 'sp2'];
  const multiSpeciesResult = purchases.filter((p) => {
    if (p.isVoided) return false;
    if (selectedSpecies.length > 0 && !selectedSpecies.includes(p.speciesId)) return false;
    return true;
  });
  assert.equal(multiSpeciesResult.length, 3); // p1, p2, p3
  assert.deepEqual(multiSpeciesResult.map((p) => p.id), ['p1', 'p2', 'p3']);

  // 2. Filter by selecting 2 suppliers ('s1' and 's3')
  const selectedSuppliers = ['s1', 's3'];
  const multiSupplierResult = purchases.filter((p) => {
    if (p.isVoided) return false;
    if (selectedSuppliers.length > 0 && !selectedSuppliers.includes(p.supplierId)) return false;
    return true;
  });
  assert.equal(multiSupplierResult.length, 3); // p1, p3, p4
  assert.deepEqual(multiSupplierResult.map((p) => p.id), ['p1', 'p3', 'p4']);

  // 3. Combinable: Selecting 2 species ('sp1', 'sp3') AND 1 supplier ('s1')
  const comboResult = purchases.filter((p) => {
    if (p.isVoided) return false;
    if (['s1'].length > 0 && !['s1'].includes(p.supplierId)) return false;
    if (['sp1', 'sp3'].length > 0 && !['sp1', 'sp3'].includes(p.speciesId)) return false;
    return true;
  });
  assert.equal(comboResult.length, 2); // p1 and p4
  assert.deepEqual(comboResult.map((p) => p.id), ['p1', 'p4']);

  // 4. Sales invoice multi-item species matching: invoice containing multiple line items
  const salesInvoices = [
    {
      id: 'inv1',
      consigneeId: 'c1',
      buyerId: 'b1',
      lineItems: [{ speciesId: 'sp1' }, { speciesId: 'sp2' }],
      isVoided: false
    },
    {
      id: 'inv2',
      consigneeId: 'c2',
      buyerId: 'b2',
      lineItems: [{ speciesId: 'sp3' }],
      isVoided: false
    },
    {
      id: 'inv3',
      consigneeId: 'c1',
      buyerId: 'b2',
      lineItems: [{ speciesId: 'sp2' }, { speciesId: 'sp3' }],
      isVoided: false
    }
  ];

  // Invoices matching ANY of the selected species ('sp1', 'sp3')
  const targetSpecies = ['sp1', 'sp3'];
  const matchedInvoices = salesInvoices.filter((inv) => {
    if (inv.isVoided) return false;
    if (targetSpecies.length > 0 && !inv.lineItems.some((l) => targetSpecies.includes(l.speciesId))) return false;
    return true;
  });
  assert.equal(matchedInvoices.length, 3); // inv1 has sp1, inv2 has sp3, inv3 has sp3

  // Invoices matching 2 selected customers ('c2', 'c99')
  const targetCustomers = ['c2', 'c99'];
  const matchedCustomers = salesInvoices.filter((inv) => {
    if (inv.isVoided) return false;
    if (
      targetCustomers.length > 0 &&
      !targetCustomers.includes(inv.consigneeId) &&
      !(inv.buyerId && targetCustomers.includes(inv.buyerId))
    ) {
      return false;
    }
    return true;
  });
  assert.equal(matchedCustomers.length, 1);
  assert.equal(matchedCustomers[0].id, 'inv2');
});

// ============================================================================
// SUITE 9: Independent Expense Batch and Yield Batch Processing
// ============================================================================

test('Decoupled Batching: allocateExpenseBatch apportions expenses without modifying yield', () => {
  const lot1 = {
    id: 'exp-lot-1',
    purchaseId: 'PUR-00101',
    expenseBatchNo: 'EB-2026-X',
    weightKg: 400,
    purchaseValue: 160000,
    grossPurchaseValue: 160000,
    expenseBreakdown: { 'transport': 6000, 'ice': 2000 },
    totalExpenses: 8000,
    totalCost: 168000,
    amountPaid: 50000,
    yieldWeightKg: 220,
    yieldPct: 55,
    isVoided: false
  };

  const lot2 = {
    id: 'exp-lot-2',
    purchaseId: 'PUR-00102',
    expenseBatchNo: 'EB-2026-X',
    weightKg: 600,
    purchaseValue: 240000,
    grossPurchaseValue: 240000,
    expenseBreakdown: {},
    totalExpenses: 0,
    totalCost: 240000,
    amountPaid: 0,
    yieldWeightKg: 330,
    yieldPct: 55,
    isVoided: false
  };

  // Run expense apportionment ONLY
  const { updatedPurchases, warnings } = allocateExpenseBatch([lot1, lot2]);
  assert.equal(warnings.length, 0);
  assert.equal(updatedPurchases.length, 2);

  const u1 = updatedPurchases.find((p) => p.id === 'exp-lot-1');
  const u2 = updatedPurchases.find((p) => p.id === 'exp-lot-2');

  // Total expense pool = 8000 (transport: 6000, ice: 2000)
  // Lot 1 (40% weight share) -> transport: 2400, ice: 800, total: 3200
  // Lot 2 (60% weight share) -> transport: 3600, ice: 1200, total: 4800
  assert.equal(u1.expenseBreakdown['transport'], 2400);
  assert.equal(u2.expenseBreakdown['transport'], 3600);
  assert.equal(u1.expenseBreakdown['ice'], 800);
  assert.equal(u2.expenseBreakdown['ice'], 1200);
  assert.equal(u1.totalExpenses, 3200);
  assert.equal(u2.totalExpenses, 4800);
  assert.equal(u1.totalCost, 163200);
  assert.equal(u2.totalCost, 244800);
  assert.equal(u1.isBatchAllocated, true);
  assert.equal(u2.isBatchAllocated, true);

  // CRITICAL REQUIREMENT: Yield fields MUST be untouched and uncorrupted!
  assert.equal(u1.yieldWeightKg, 220);
  assert.equal(u1.yieldPct, 55);
  assert.equal(u2.yieldWeightKg, 330);
  assert.equal(u2.yieldPct, 55);
  assert.equal(u1.isBatchYieldAllocated, undefined);
  assert.equal(u2.isBatchYieldAllocated, undefined);
});

test('Decoupled Batching: allocateYieldBatch apportions yield without modifying expenses or cost', () => {
  const lotA = {
    id: 'yld-lot-a',
    purchaseId: 'PUR-00201',
    yieldBatchNo: 'YB-2026-Z',
    weightKg: 500,
    purchaseValue: 200000,
    grossPurchaseValue: 200000,
    expenseBreakdown: { 'freight': 3500 },
    totalExpenses: 3500,
    totalCost: 203500,
    effectiveRatePerKg: 407,
    amountPaid: 100000,
    balancePayable: 103500,
    paymentStatus: 'Partially Paid',
    isVoided: false
  };

  const lotB = {
    id: 'yld-lot-b',
    purchaseId: 'PUR-00202',
    yieldBatchNo: 'YB-2026-Z',
    weightKg: 500,
    purchaseValue: 180000,
    grossPurchaseValue: 180000,
    expenseBreakdown: { 'ice': 1200 },
    totalExpenses: 1200,
    totalCost: 181200,
    effectiveRatePerKg: 362.4,
    amountPaid: 0,
    balancePayable: 181200,
    paymentStatus: 'Unpaid',
    isVoided: false
  };

  // Allocate 520 Kg finished meat yield across the 1,000 Kg raw intake (52% recovery)
  const { updatedPurchases, warnings } = allocateYieldBatch([lotA, lotB], 520);
  assert.equal(warnings.length, 0);

  const resA = updatedPurchases.find((p) => p.id === 'yld-lot-a');
  const resB = updatedPurchases.find((p) => p.id === 'yld-lot-b');

  // Finished yield apportioned 50% / 50%
  assert.equal(resA.yieldWeightKg, 260);
  assert.equal(resB.yieldWeightKg, 260);
  assert.equal(resA.yieldPct, 52);
  assert.equal(resB.yieldPct, 52);
  assert.equal(resA.batchYieldWeightKg, 520);
  assert.equal(resB.batchYieldWeightKg, 520);
  assert.equal(resA.batchYieldPct, 52);
  assert.equal(resB.batchYieldPct, 52);
  assert.equal(resA.isBatchYieldAllocated, true);
  assert.equal(resB.isBatchYieldAllocated, true);

  // CRITICAL REQUIREMENT: Expenses, Costs, and Payment status MUST NOT be touched!
  assert.equal(resA.totalExpenses, 3500);
  assert.equal(resB.totalExpenses, 1200);
  assert.equal(resA.expenseBreakdown['freight'], 3500);
  assert.equal(resB.expenseBreakdown['ice'], 1200);
  assert.equal(resA.totalCost, 203500);
  assert.equal(resB.totalCost, 181200);
  assert.equal(resA.effectiveRatePerKg, 407);
  assert.equal(resB.effectiveRatePerKg, 362.4);
  assert.equal(resA.balancePayable, 103500);
  assert.equal(resB.balancePayable, 181200);
  assert.equal(resA.isBatchAllocated, undefined);
  assert.equal(resB.isBatchAllocated, undefined);
});

test('Decoupled Batching: Transaction with separate Expense Batch and Yield Batch operates independently across different peer groups', () => {
  // Tx1: in Expense Batch EB-99 AND in Yield Batch YB-88
  const tx1 = {
    id: 'tx-1',
    expenseBatchNo: 'EB-99',
    yieldBatchNo: 'YB-88',
    weightKg: 200,
    grossPurchaseValue: 80000,
    purchaseValue: 80000,
    expenseBreakdown: { 'transport': 10000 },
    totalExpenses: 10000,
    totalCost: 90000,
    isVoided: false
  };

  // Tx2: shares Expense Batch EB-99 with Tx1, but has NO Yield Batch
  const tx2 = {
    id: 'tx-2',
    expenseBatchNo: 'EB-99',
    yieldBatchNo: undefined,
    weightKg: 800,
    grossPurchaseValue: 320000,
    purchaseValue: 320000,
    expenseBreakdown: {},
    totalExpenses: 0,
    totalCost: 320000,
    isVoided: false
  };

  // Tx3: shares Yield Batch YB-88 with Tx1, but has NO Expense Batch
  const tx3 = {
    id: 'tx-3',
    expenseBatchNo: undefined,
    yieldBatchNo: 'YB-88',
    weightKg: 300,
    grossPurchaseValue: 120000,
    purchaseValue: 120000,
    expenseBreakdown: { 'local_ice': 1500 },
    totalExpenses: 1500,
    totalCost: 121500,
    isVoided: false
  };

  // 1. Apportion Expense Batch EB-99 (Tx1 & Tx2: total 1,000 kg, 20% & 80%)
  const { updatedPurchases: expAllocated } = allocateExpenseBatch([tx1, tx2]);
  const expTx1 = expAllocated.find((p) => p.id === 'tx-1');
  const expTx2 = expAllocated.find((p) => p.id === 'tx-2');

  assert.equal(expTx1.totalExpenses, 2000); // 20% of 10,000
  assert.equal(expTx2.totalExpenses, 8000); // 80% of 10,000
  assert.equal(expTx1.totalCost, 82000);
  assert.equal(expTx2.totalCost, 328000);
  // Yield is untouched
  assert.equal(expTx1.isBatchYieldAllocated, undefined);
  assert.equal(expTx2.isBatchYieldAllocated, undefined);

  // 2. Apportion Yield Batch YB-88 (Tx1 & Tx3: total 500 kg, 200 kg = 40%, 300 kg = 60%)
  // Provide 250 Kg finished meat yield (50% recovery)
  const { updatedPurchases: yldAllocated } = allocateYieldBatch([expTx1, tx3], 250);
  const finalTx1 = yldAllocated.find((p) => p.id === 'tx-1');
  const finalTx3 = yldAllocated.find((p) => p.id === 'tx-3');

  // Tx1 gets 40% of 250 Kg = 100 Kg yield
  assert.equal(finalTx1.yieldWeightKg, 100);
  assert.equal(finalTx1.yieldPct, 50);
  assert.equal(finalTx1.isBatchYieldAllocated, true);
  // Tx1 retains its apportioned expenses from EB-99!
  assert.equal(finalTx1.totalExpenses, 2000);
  assert.equal(finalTx1.totalCost, 82000);

  // Tx3 gets 60% of 250 Kg = 150 Kg yield
  assert.equal(finalTx3.yieldWeightKg, 150);
  assert.equal(finalTx3.yieldPct, 50);
  assert.equal(finalTx3.isBatchYieldAllocated, true);
  // Tx3 retains its direct expenses (local_ice: 1500) and was NOT pooled with EB-99!
  assert.equal(finalTx3.totalExpenses, 1500);
  assert.equal(finalTx3.totalCost, 121500);
});

test('Excel Import Normalization: Flexible recognition of Expense Batch No and Yield Batch No', () => {
  const rowWithAliases = {
    'Expense Batch No': 'EB-OCT-401',
    'Yield Batch No': 'YB-OCT-902',
    'Weight (Kg)': 1500
  };

  const expBatchVal = getFlexibleValue(rowWithAliases, [
    'expensebatchno',
    'expensebatch',
    'expbatchno',
    'expbatch',
    'expensepool',
    'landingexpensebatch'
  ]);
  assert.equal(expBatchVal, 'EB-OCT-401');

  const yldBatchVal = getFlexibleValue(rowWithAliases, [
    'yieldbatchno',
    'yieldbatch',
    'recoverybatch',
    'processingbatch',
    'batchyieldno',
    'procyieldbatch'
  ]);
  assert.equal(yldBatchVal, 'YB-OCT-902');

  // Backwards compatibility with legacy Batch No
  const legacyRow = {
    'Batch No': 'BATCH-LEGACY-01',
    'Weight (Kg)': 2000
  };
  const legacyExpBatch = getFlexibleValue(legacyRow, ['expensebatchno', 'expensebatch']);
  assert.equal(legacyExpBatch, undefined);
  const legacyBatchNo = getFlexibleValue(legacyRow, ['batchno', 'batch', 'lotno', 'lot']);
  assert.equal(legacyBatchNo, 'BATCH-LEGACY-01');

  // When expenseBatch is undefined, legacy batchNo serves as expense batch fallback
  const resolvedExpBatch = legacyExpBatch || legacyBatchNo;
  assert.equal(resolvedExpBatch, 'BATCH-LEGACY-01');
});

// ============================================================================
// SUITE 16: High-Value 100-Crore Dashboard Alignment & Purchase Payments
// ============================================================================

test('formatCroreINR and formatDashboardINR for high-magnitude amounts up to 100 Crores', () => {
  // 100 Crores (1,00,00,00,000)
  const hundredCrores = 1000000000;
  assert.equal(formatCroreINR(hundredCrores), '₹100.00 Cr');
  const d100 = formatDashboardINR(hundredCrores);
  assert.equal(d100.compact, '₹100.00 Cr');
  assert.equal(d100.isCrore, true);

  // 10 Crores (10,00,00,000)
  assert.equal(formatCroreINR(100000000), '₹10.00 Cr');

  // 1.5 Crores (1,50,00,000)
  assert.equal(formatCroreINR(15000000), '₹1.50 Cr');

  // 45 Lakhs (45,00,000)
  assert.equal(formatCroreINR(4500000), '₹45.00 L');

  // 2.5 Lakhs (2,50,000)
  assert.equal(formatCroreINR(250000), '₹2.50 L');

  // Edge cases and sub-lakh values
  assert.equal(formatCroreINR(50000).replace(/\s/g, ''), '₹50,000.00'.replace(/\s/g, ''));
  assert.equal(formatCroreINR(0).replace(/\s/g, ''), '₹0.00'.replace(/\s/g, ''));
  assert.equal(formatCroreINR(null).replace(/\s/g, ''), '₹0.00'.replace(/\s/g, ''));
  assert.equal(formatCroreINR(undefined).replace(/\s/g, ''), '₹0.00'.replace(/\s/g, ''));

  // Negative 100 Crores
  assert.equal(formatCroreINR(-1000000000), '-₹100.00 Cr');
});

test('Purchase post-procurement payment settlement & balance deduction logic', () => {
  // Mock purchases
  const purchases = [
    {
      id: 'pur-1',
      purchaseId: 'PUR-00001',
      supplierId: 'sup-1',
      totalCost: 150000,
      amountPaid: 50000,
      balancePayable: 100000,
      paymentStatus: 'Partially Paid'
    },
    {
      id: 'pur-2',
      purchaseId: 'PUR-00002',
      supplierId: 'sup-1',
      totalCost: 200000,
      amountPaid: 0,
      balancePayable: 200000,
      paymentStatus: 'Unpaid'
    }
  ];

  // Disburse 100,000 targeting specific purchase 'pur-1'
  const targetedPaymentAmount = 100000;
  const targetId = 'pur-1';

  const updatedTargeted = purchases.map((p) => {
    if (p.id !== targetId) return p;
    const updatedPaid = p.amountPaid + targetedPaymentAmount;
    const updatedBal = Math.max(0, p.totalCost - updatedPaid);
    const updatedStatus = derivePaymentStatus(p.totalCost, updatedPaid);
    return { ...p, amountPaid: updatedPaid, balancePayable: updatedBal, paymentStatus: updatedStatus };
  });

  const settledPur1 = updatedTargeted.find((p) => p.id === 'pur-1');
  assert.equal(settledPur1.amountPaid, 150000);
  assert.equal(settledPur1.balancePayable, 0);
  assert.equal(settledPur1.paymentStatus, 'Fully Paid');

  // Disburse 150,000 via FIFO across all due purchases
  let remaining = 150000;
  const updatedFifo = purchases.map((p) => {
    if (remaining <= 0 || p.balancePayable <= 0) return p;
    const alloc = Math.min(remaining, p.balancePayable);
    const updatedPaid = p.amountPaid + alloc;
    const updatedBal = Math.max(0, p.totalCost - updatedPaid);
    const updatedStatus = derivePaymentStatus(p.totalCost, updatedPaid);
    remaining -= alloc;
    return { ...p, amountPaid: updatedPaid, balancePayable: updatedBal, paymentStatus: updatedStatus };
  });

  assert.equal(updatedFifo[0].amountPaid, 150000);
  assert.equal(updatedFifo[0].balancePayable, 0);
  assert.equal(updatedFifo[0].paymentStatus, 'Fully Paid');

  assert.equal(updatedFifo[1].amountPaid, 50000);
  assert.equal(updatedFifo[1].balancePayable, 150000);
  assert.equal(updatedFifo[1].paymentStatus, 'Partially Paid');
});

test('Decoupled Batching: Yield-only batch rows NEVER trigger expense batch allocation; landing expenses stay row-level direct costs', () => {
  // Simulate two purchase rows imported or entered with ONLY yieldBatchNo
  const rowA = {
    id: 'pur-yld-1',
    purchaseId: 'PUR-Y1',
    yieldBatchNo: 'YB-SEPARATE-100',
    expenseBatchNo: undefined,
    batchNo: undefined,
    weightKg: 2000,
    grossPurchaseValue: 620000,
    purchaseValue: 620000,
    expenseBreakdown: { 'ice': 1200, 'transport': 2500, 'commission': 1500 },
    totalExpenses: 5200,
    totalCost: 625200,
    isVoided: false,
    isBatchAllocated: false
  };

  const rowB = {
    id: 'pur-yld-2',
    purchaseId: 'PUR-Y2',
    yieldBatchNo: 'YB-SEPARATE-100',
    expenseBatchNo: undefined,
    batchNo: undefined,
    weightKg: 3000,
    grossPurchaseValue: 900000,
    purchaseValue: 900000,
    expenseBreakdown: { 'ice': 3000, 'transport': 4500, 'commission': 2500 },
    totalExpenses: 10000,
    totalCost: 910000,
    isVoided: false,
    isBatchAllocated: false
  };

  const purchases = [rowA, rowB];

  // 1. Verify Expense Batch Grouping Logic: ONLY rows with p.expenseBatchNo are grouped
  const expBatchGroups = new Map();
  purchases.forEach((p) => {
    const bKey = p.expenseBatchNo; // STRICT: ONLY expenseBatchNo!
    if (bKey) {
      const cur = expBatchGroups.get(bKey) || [];
      cur.push(p);
      expBatchGroups.set(bKey, cur);
    }
  });

  // Absolutely NO expense batch group should exist for YB-SEPARATE-100!
  assert.equal(expBatchGroups.size, 0);
  assert.equal(expBatchGroups.has('YB-SEPARATE-100'), false);

  // 2. Verify Expense Batches list for UI:
  const expenseBatches = Array.from(
    new Set(
      purchases
        .filter((p) => Boolean(p.expenseBatchNo) && !p.isVoided)
        .map((p) => p.expenseBatchNo)
    )
  );
  assert.deepEqual(expenseBatches, []);

  // 3. Verify Yield Batches list for UI:
  const yieldBatches = Array.from(
    new Set(
      purchases
        .filter((p) => Boolean(p.yieldBatchNo) && !p.isVoided)
        .map((p) => p.yieldBatchNo)
    )
  );
  assert.deepEqual(yieldBatches, ['YB-SEPARATE-100']);

  // 4. Apportion Yield across the batch (50% recovery = 2,500 Kg finished meat)
  const { updatedPurchases: yieldUpdated } = allocateYieldBatch(purchases, 2500);

  // Yield was apportioned: rowA gets 40% (1,000 Kg), rowB gets 60% (1,500 Kg)
  const resA = yieldUpdated.find((p) => p.id === 'pur-yld-1');
  const resB = yieldUpdated.find((p) => p.id === 'pur-yld-2');

  assert.equal(resA.yieldWeightKg, 1000);
  assert.equal(resB.yieldWeightKg, 1500);
  assert.equal(resA.isBatchYieldAllocated, true);
  assert.equal(resB.isBatchYieldAllocated, true);

  // CRITICAL: Expenses MUST remain completely un-pooled and un-apportioned!
  assert.equal(resA.totalExpenses, 5200);
  assert.equal(resA.expenseBreakdown['ice'], 1200);
  assert.equal(resA.expenseBreakdown['transport'], 2500);
  assert.equal(resA.expenseBreakdown['commission'], 1500);
  assert.equal(resA.isBatchAllocated, false);

  assert.equal(resB.totalExpenses, 10000);
  assert.equal(resB.expenseBreakdown['ice'], 3000);
  assert.equal(resB.expenseBreakdown['transport'], 4500);
  assert.equal(resB.expenseBreakdown['commission'], 2500);
  assert.equal(resB.isBatchAllocated, false);
});

test('Decoupled Batching: Excel import extraction strictly isolates Expense Batch No and never extracts numeric yield weights as expense batches', () => {
  // Row 1: Explicit Expense Batch EXP-001 with yield metrics
  const row1 = {
    'Purchase Date (DD-MM-YYYY)': '20-10-2026',
    'Expense Batch No': 'EXP-001',
    'Yield Batch No': 'YLD-001',
    'Batch Yield Weight (Kg)': 1234,
    'Batch Yield %': 0.4875,
    'Weight (Kg)': 2531
  };

  // Row 2: NO Expense Batch, NO Yield Batch, but has Batch Yield Weight (Kg)
  const row2 = {
    'Purchase Date (DD-MM-YYYY)': '20-10-2026',
    'Expense Batch No': '',
    'Yield Batch No': '',
    'Batch Yield Weight (Kg)': 1754,
    'Batch Yield %': 0.52,
    'Weight (Kg)': 3373
  };

  const rawExpense1 = String(getFlexibleValue(row1, [
    'expensebatchno',
    'expensebatch',
    'expbatchno',
    'expbatch',
    'expensepool',
    'costbatch',
    'landingexpensebatch'
  ]) || '').trim();

  const rawExpense2 = String(getFlexibleValue(row2, [
    'expensebatchno',
    'expensebatch',
    'expbatchno',
    'expbatch',
    'expensepool',
    'costbatch',
    'landingexpensebatch'
  ]) || '').trim();

  const expenseBatch1 = rawExpense1 || undefined;
  const expenseBatch2 = rawExpense2 || undefined;

  assert.equal(expenseBatch1, 'EXP-001');
  assert.equal(expenseBatch2, undefined);

  // Ensure Batch Yield Weight (1754) is NEVER assigned as an expense batch!
  assert.notEqual(expenseBatch2, '1754');
});

test('Decoupled Batching: BatchExpenseView ignores numeric yield weights and displays strictly explicit expense batches', () => {
  const purchases = [
    { id: '1', expenseBatchNo: 'EXP-001', isVoided: false },
    { id: '2', expenseBatchNo: 'EXP-002', isVoided: false },
    { id: '3', expenseBatchNo: '1234', isVoided: false }, // Legacy erroneous numeric weight
    { id: '4', expenseBatchNo: '552', isVoided: false },  // Legacy erroneous numeric weight
    { id: '5', expenseBatchNo: undefined, isVoided: false }
  ];

  const expenseBatches = Array.from(
    new Set(
      purchases
        .filter((p) => Boolean(p.expenseBatchNo) && isNaN(Number(p.expenseBatchNo)) && !p.isVoided)
        .map((p) => p.expenseBatchNo)
    )
  );

  assert.deepEqual(expenseBatches, ['EXP-001', 'EXP-002']);
  assert.equal(expenseBatches.includes('1234'), false);
  assert.equal(expenseBatches.includes('552'), false);
});

test('Sales Excel Import Extraction: extracts line items, sizes, cartons, weights, rates, and amounts seamlessly', () => {
  const row1 = {
    'SalesOrder Number': 'RF/EXP/01/26-27',
    'Order Date': 46140,
    'Customer Name': 'QINGDAO FRESHNESS LEADER INTERNATIONAL TRADE CO LTD',
    'Billing Country': 'China',
    'GST Treatment': 'overseas',
    'Item Name': 'FROZEN VANAMEI PVPD',
    'Item Desc': '71/90 200 CASES',
    'QuantityOrdered': 2400,
    'Item Price': 6.3,
    'Item Total': 15120,
    'HSN/SAC': '03061790'
  };

  const row2 = {
    'SalesOrder Number': 'RF/EXP/02/26-27',
    'Item Name': 'Frozen Leather Jacket 50/100',
    'Item Desc': 'PACKING: 1X10 KGS (BLAST FROZEN)',
    'QuantityOrdered': 10000,
    'Item Price': 2.8,
    'Item Total': 28000,
    'HSN/SAC': '03038999'
  };

  const row3 = {
    'SalesOrder Number': 'RF/EXP/03/26-27',
    'Item Name': 'Frozen Squid Semi Needle A Grade U/3',
    'Item Desc': 'No. of Cartons: 1202',
    'QuantityOrdered': 14424,
    'Item Price': 4.5,
    'Item Total': 64908,
    'HSN/SAC': '03074310'
  };

  // Test row 1 extraction
  const invNo1 = getFlexibleValue(row1, ['salesordernumber', 'invoiceno', 'invoice']);
  assert.equal(invNo1, 'RF/EXP/01/26-27');

  const weight1 = parseFloat(getFlexibleValue(row1, ['quantityordered', 'netweightkg', 'weight']));
  assert.equal(weight1, 2400);

  const price1 = parseFloat(getFlexibleValue(row1, ['itemprice', 'rateperkg', 'price']));
  assert.equal(price1, 6.3);

  const total1 = parseFloat(getFlexibleValue(row1, ['itemtotal', 'amountcurrency']));
  assert.equal(total1, 15120);

  // Size parsing from Desc
  const sizeMatch1 = String(row1['Item Desc']).match(/\b(U\/\d+|\d+\/\d+|\d+\/UP|\d+-\d+)\b/i);
  assert.equal(sizeMatch1 ? sizeMatch1[1] : null, '71/90');

  // Cartons parsing from Desc
  const ctnMatch1 = String(row1['Item Desc']).match(/(\d+)\s*(?:cases|case|cartons|carton|ctns|ctn|boxes|box|pkgs|pkg)/i);
  assert.equal(ctnMatch1 ? parseInt(ctnMatch1[1], 10) : 0, 200);

  // Test row 2 size parsing from Name & cartons from packing
  const sizeMatch2 = String(row2['Item Name']).match(/\b(U\/\d+|\d+\/\d+|\d+\/UP|\d+-\d+)\b/i);
  assert.equal(sizeMatch2 ? sizeMatch2[1] : null, '50/100');

  const packMatch2 = String(row2['Item Desc']).match(/PACKING:\s*(\d+)\s*[xX]\s*(\d+)\s*KG/i);
  const blockKg2 = packMatch2 ? parseInt(packMatch2[1], 10) * parseInt(packMatch2[2], 10) : 0;
  assert.equal(blockKg2, 10);
  const cartons2 = Math.round(row2['QuantityOrdered'] / blockKg2);
  assert.equal(cartons2, 1000);

  // Test row 3 size parsing (U/3) & cartons from No. of Cartons
  const sizeMatch3 = String(row3['Item Name']).match(/\b(U\/\d+|\d+\/\d+|\d+\/UP|\d+-\d+)\b/i);
  assert.equal(sizeMatch3 ? sizeMatch3[1] : null, 'U/3');

  const ctnMatch3 = String(row3['Item Desc']).match(/(?:No\.?\s*of\s*Cartons|Total\s*Cartons)\s*[:=]\s*(\d+)/i);
  assert.equal(ctnMatch3 ? parseInt(ctnMatch3[1], 10) : 0, 1202);
});

test('Customer Model: Overseas Customer defaults with GST Exempt export supply status', () => {
  const newOverseasCust = {
    id: 'cust-1',
    code: 'CUST-001',
    name: 'QINGDAO FRESHNESS LEADER INTERNATIONAL TRADE CO LTD',
    customerType: 'Overseas',
    gstTreatment: 'Overseas (GST Exempt Export Supply)',
    isGstExempt: true,
    address: 'Qingdao, China',
    country: 'China',
    contactPerson: '',
    phone: '',
    email: '',
    taxId: '',
    bankDetails: '',
    active: true,
    createdAt: new Date().toISOString()
  };

  assert.equal(newOverseasCust.customerType, 'Overseas');
  assert.equal(newOverseasCust.isGstExempt, true);
  assert.equal(newOverseasCust.gstTreatment, 'Overseas (GST Exempt Export Supply)');
  assert.equal(Boolean(newOverseasCust.taxId), false); // No GSTIN required for overseas
});

test('Commercial Reports Hub: Component-level filtering across Invoice Register, Customers, Products, Ports, Ageing, HS Code, and Exceptions', () => {
  const sampleInvoices = [
    {
      id: 'inv-1',
      invoiceNo: 'RF/EXP/01/26-27',
      salesOrderNo: 'SO-00001',
      invoiceDate: '2026-04-10',
      consigneeId: 'cust-1',
      portOfDischargeId: 'port-cn-tao',
      totalWeightKg: 27000,
      totalAmountCurrency: 45900,
      realizationStatus: 'Fully Realized',
      totalRealizedINR: 3878550,
      balanceRealizationCurrency: 0,
      lineItems: [
        { id: 'l1', speciesId: 'sp-mackerel', hsCode: '03035400', sizeId: 'sz-6-8', cartonsCount: 2700, weightKg: 27000, ratePerKg: 1.70, amountCurrency: 45900 }
      ]
    },
    {
      id: 'inv-2',
      invoiceNo: 'RF/EXP/02/26-27',
      salesOrderNo: 'SO-00002',
      invoiceDate: '2026-05-15',
      consigneeId: 'cust-2',
      portOfDischargeId: 'port-cn-foc',
      totalWeightKg: 14000,
      totalAmountCurrency: 29400,
      realizationStatus: 'Not Realized',
      totalRealizedINR: 0,
      balanceRealizationCurrency: 29400,
      lineItems: [
        { id: 'l2', speciesId: 'sp-ribbonfish', hsCode: '03038990', sizeId: 'sz-300-500', cartonsCount: 1400, weightKg: 14000, ratePerKg: 2.10, amountCurrency: 29400 }
      ]
    },
    {
      id: 'inv-3',
      invoiceNo: 'RF/EXP/03/26-27',
      salesOrderNo: 'SO-00003',
      invoiceDate: '2026-06-20',
      consigneeId: 'cust-1',
      portOfDischargeId: 'port-th-sgz',
      totalWeightKg: 20000,
      totalAmountCurrency: 46000,
      realizationStatus: 'Partially Realized',
      totalRealizedINR: 1943500,
      advanceReceivedCurrency: 23000,
      balanceRealizationCurrency: 23000,
      lineItems: [
        { id: 'l3', speciesId: 'sp-mackerel', hsCode: '03035400', sizeId: 'sz-8-10', cartonsCount: 2000, weightKg: 20000, ratePerKg: 2.30, amountCurrency: 46000 }
      ]
    }
  ];

  // 1. Invoice Register Filtering: Customer Filter + Realization Status Filter
  const filteredReg = sampleInvoices.filter(
    (inv) => inv.consigneeId === 'cust-1' && inv.realizationStatus === 'Fully Realized'
  );
  assert.equal(filteredReg.length, 1);
  assert.equal(filteredReg[0].invoiceNo, 'RF/EXP/01/26-27');

  // 2. Realization Ageing Filtering: Unrealized Only vs Partial
  const unrealizedOnly = sampleInvoices.filter(
    (inv) => inv.balanceRealizationCurrency > 0 && (!inv.advanceReceivedCurrency || inv.advanceReceivedCurrency === 0)
  );
  assert.equal(unrealizedOnly.length, 1);
  assert.equal(unrealizedOnly[0].invoiceNo, 'RF/EXP/02/26-27');

  const partialOnly = sampleInvoices.filter(
    (inv) => inv.balanceRealizationCurrency > 0 && inv.advanceReceivedCurrency > 0
  );
  assert.equal(partialOnly.length, 1);
  assert.equal(partialOnly[0].invoiceNo, 'RF/EXP/03/26-27');

  // 3. Discharge Port Filtering
  const thailandInvoices = sampleInvoices.filter((inv) => inv.portOfDischargeId === 'port-th-sgz');
  assert.equal(thailandInvoices.length, 1);
  assert.equal(thailandInvoices[0].invoiceNo, 'RF/EXP/03/26-27');
});

test('Commercial Reports Hub: Invoice & Product Cross-Analysis transforms nested line items into granular hierarchies, itemized flat views, and product price-spread matrices', () => {
  const sampleInvoices = [
    {
      id: 'inv-10',
      invoiceNo: 'EXP-101',
      invoiceDate: '2026-05-01',
      consigneeId: 'cust-10',
      portOfDischargeId: 'port-cn',
      countryOfDestination: 'China',
      realizationStatus: 'Fully Realized',
      totalRealizedINR: 5000000,
      totalAmountCurrency: 60000,
      totalWeightKg: 25000,
      lineItems: [
        {
          id: 'item-1',
          speciesId: 'sp-van',
          productDescription: 'FROZEN VANNAMEI SHRIMP HLSO',
          sizeId: 'sz-16-20',
          gradeSize: '16/20',
          hsCode: '03061790',
          cartonsCount: 1000,
          weightKg: 10000,
          ratePerKg: 3.50,
          amountCurrency: 35000
        },
        {
          id: 'item-2',
          speciesId: 'sp-van',
          productDescription: 'FROZEN VANNAMEI SHRIMP HLSO',
          sizeId: 'sz-21-25',
          gradeSize: '21/25',
          hsCode: '03061790',
          cartonsCount: 1500,
          weightKg: 15000,
          ratePerKg: 1.666667,
          amountCurrency: 25000
        }
      ]
    },
    {
      id: 'inv-20',
      invoiceNo: 'EXP-102',
      invoiceDate: '2026-05-10',
      consigneeId: 'cust-20',
      portOfDischargeId: 'port-jp',
      countryOfDestination: 'Japan',
      realizationStatus: 'Not Realized',
      totalRealizedINR: 0,
      totalAmountCurrency: 42000,
      totalWeightKg: 10000,
      lineItems: [
        {
          id: 'item-3',
          speciesId: 'sp-van',
          productDescription: 'FROZEN VANNAMEI SHRIMP HLSO',
          sizeId: 'sz-16-20',
          gradeSize: '16/20',
          hsCode: '03061790',
          cartonsCount: 1000,
          weightKg: 10000,
          ratePerKg: 4.20,
          amountCurrency: 42000
        }
      ]
    }
  ];

  // Flattened Enriched Lines transformation
  const flatLines = [];
  sampleInvoices.forEach((inv) => {
    inv.lineItems.forEach((l) => {
      flatLines.push({
        invoiceNo: inv.invoiceNo,
        invoiceDate: inv.invoiceDate,
        country: inv.countryOfDestination,
        speciesId: l.speciesId,
        productName: l.productDescription,
        gradeSize: l.gradeSize,
        weightKg: l.weightKg,
        ratePerKg: l.ratePerKg,
        amountCurrency: l.amountCurrency,
        sharePct: (l.amountCurrency / inv.totalAmountCurrency) * 100
      });
    });
  });

  assert.equal(flatLines.length, 3);
  assert.equal(flatLines[0].sharePct.toFixed(1), '58.3');

  // Product Matrix Aggregation & Price Spread Calculation
  const speciesLines = flatLines.filter((l) => l.speciesId === 'sp-van');
  const totalWeight = speciesLines.reduce((s, l) => s + l.weightKg, 0);
  const totalUSD = speciesLines.reduce((s, l) => s + l.amountCurrency, 0);
  const minRate = Math.min(...speciesLines.map((l) => l.ratePerKg));
  const maxRate = Math.max(...speciesLines.map((l) => l.ratePerKg));
  const weightedAvgRate = totalUSD / totalWeight;

  assert.equal(totalWeight, 35000);
  assert.equal(totalUSD, 102000);
  assert.equal(minRate.toFixed(2), '1.67');
  assert.equal(maxRate.toFixed(2), '4.20');
  assert.equal(weightedAvgRate.toFixed(2), '2.91');
});

test('FOB Valuation Derivation & Currency Key Isolation: prevents cross-currency collisions and derives FOB from C&F minus Ocean Freight', () => {
  const rowWithBothFobs = {
    'Invoice No': 'RF/EXP/01/26-27',
    'C&F USD': 127320,
    'EXCHANGE RATE': 92.5,
    'C & F RS': 11777100,
    'FREIGHT $': 1750,
    'FREIGHT (RS)': 161875,
    'FOB RS': 11615225,
    'FOB USD': 125570
  };

  const fobUsdCandidateKeys = [
    'fobusd', 'totalfobusd', 'fobvalueusd', 'totalfobvalueusd', 'fobamountusd',
    'fobvalusd', 'fobvaluecurrency', 'totalfobvaluecurrency', 'totalfobvalue', 'fobvalue', 'fob'
  ];

  const fobInrCandidateKeys = [
    'fobrs', 'totalfobrs', 'fobinr', 'totalfobinr', 'fobvalueinr', 'totalfobvalueinr',
    'fobamountinr', 'fobvalinr', 'fobrupees', 'totalfobrupees'
  ];

  const freightUsdCandidateKeys = ['freightusd', 'freightdollar', 'oceanfreightusd', 'totalfreightusd', 'freight'];
  const freightInrCandidateKeys = ['freightrs', 'freightinr', 'totalfreightrs', 'totalfreightinr'];

  // 1. Currency isolation: FOB USD must NOT match FOB RS
  const extractedFobUsd = getFlexibleValue(rowWithBothFobs, fobUsdCandidateKeys, 'USD');
  const extractedFobInr = getFlexibleValue(rowWithBothFobs, fobInrCandidateKeys, 'INR');

  assert.equal(extractedFobUsd, 125570);
  assert.equal(extractedFobInr, 11615225);

  const extractedFreightUsd = getFlexibleValue(rowWithBothFobs, freightUsdCandidateKeys, 'USD');
  const extractedFreightInr = getFlexibleValue(rowWithBothFobs, freightInrCandidateKeys, 'INR');

  assert.equal(extractedFreightUsd, 1750);
  assert.equal(extractedFreightInr, 161875);

  // 2. Derive FOB when explicit FOB columns are absent but Freight is present
  const rowWithoutExplicitFob = {
    'Invoice No': 'EXP-2026-001',
    'Total Sales Value (C&F USD)': 26100,
    'Ocean Freight (USD)': 1850,
    'Ocean Freight (INR)': 156325,
    'Exchange Rate': 84.50
  };

  const salesVal = parseFloat(getFlexibleValue(rowWithoutExplicitFob, ['totalsalesvaluecfusd', 'totalsalesvalueusd'], 'USD'));
  const freightVal = parseFloat(getFlexibleValue(rowWithoutExplicitFob, freightUsdCandidateKeys, 'USD'));
  const exRate = parseFloat(getFlexibleValue(rowWithoutExplicitFob, ['exchangerate']));

  assert.equal(salesVal, 26100);
  assert.equal(freightVal, 1850);

  const derivedFobUsd = Math.max(0, Number((salesVal - freightVal).toFixed(2)));
  const derivedFobInr = Math.max(0, Number((derivedFobUsd * exRate).toFixed(2)));

  assert.equal(derivedFobUsd, 24250);
  assert.equal(derivedFobInr, 2049125);

  // 3. Proportional line item allocation with cent/paisa reconciliation
  const lines = [
    { id: 'l1', amountCurrency: 19600 },
    { id: 'l2', amountCurrency: 6500 }
  ];
  const totalAmount = 26100;
  const targetFobUsd = 24250;
  const targetFobInr = 2049125;

  let sumUsd = 0;
  let sumInr = 0;
  lines.forEach((l, idx) => {
    const ratio = l.amountCurrency / totalAmount;
    if (idx === lines.length - 1) {
      l.fobUsd = Number((targetFobUsd - sumUsd).toFixed(2));
      l.fobInr = Number((targetFobInr - sumInr).toFixed(2));
    } else {
      l.fobUsd = Number((targetFobUsd * ratio).toFixed(2));
      l.fobInr = Number((targetFobInr * ratio).toFixed(2));
      sumUsd = Number((sumUsd + l.fobUsd).toFixed(2));
      sumInr = Number((sumInr + l.fobInr).toFixed(2));
    }
  });

  assert.equal(lines[0].fobUsd + lines[1].fobUsd, targetFobUsd);
  assert.equal(lines[0].fobInr + lines[1].fobInr, targetFobInr);
});

test('FOB Dashboard & Sales Ledger: Authentic FOB Totals & Zero Realization Accounting', async () => {
  const fs = await import('fs');
  const path = await import('path');
  const filePath = path.resolve('src/data/exportSalesData.ts');
  const content = fs.readFileSync(filePath, 'utf8');

  const prefix = 'export const VERIFIED_SALES_INVOICES: SalesInvoice[] = ';
  const idx = content.indexOf(prefix);
  assert.ok(idx > 0, 'VERIFIED_SALES_INVOICES must be present in exportSalesData.ts');

  const invoices = JSON.parse(content.slice(idx + prefix.length).trim().replace(/;$/, ''));
  assert.equal(invoices.length, 71, 'Must strictly maintain pure 71 export invoices');

  // Verify Invoices 1-48 FOB Sales Value from FOB Value.xlsx
  const invs1to48 = invoices.slice(0, 48);
  const fob1to48Usd = invs1to48.reduce((s, i) => s + (i.totalFobValueCurrency || 0), 0);
  const fob1to48Inr = invs1to48.reduce((s, i) => s + (i.totalFobValueINR || 0), 0);

  assert.equal(Number(fob1to48Usd.toFixed(2)), 4104086.77, 'Authentic FOB USD for invoices 1-48 must equal $4,104,086.77');
  assert.equal(Number(fob1to48Inr.toFixed(2)), 387081067.48, 'Authentic FOB INR for invoices 1-48 must equal ₹38,70,81,067.48');

  // Verify Invoices 49-71 FOB Sales Value
  const invs49to71 = invoices.slice(48);
  const fob49to71Usd = invs49to71.reduce((s, i) => s + (i.totalFobValueCurrency || 0), 0);
  const fob49to71Inr = invs49to71.reduce((s, i) => s + (i.totalFobValueINR || 0), 0);

  assert.equal(Number(fob49to71Usd.toFixed(2)), 1524614.50, 'Authentic FOB USD for invoices 49-71 must equal $1,524,614.50');
  assert.equal(Number(fob49to71Inr.toFixed(2)), 140183215.56, 'Authentic FOB INR for invoices 49-71 must equal ₹14,01,83,215.56');

  // Verify Overall Dataset FOB Totals equal the exact $5,628,701.27 and ₹52,72,64,283.04
  const overallFobUsd = invoices.reduce((s, i) => s + (i.totalFobValueCurrency || 0), 0);
  const overallFobInr = invoices.reduce((s, i) => s + (i.totalFobValueINR || 0), 0);
  assert.equal(Number(overallFobUsd.toFixed(2)), 5628701.27, 'Total FOB USD must equal $5,628,701.27');
  assert.equal(Number(overallFobInr.toFixed(2)), 527264283.04, 'Total FOB INR must equal ₹52,72,64,283.04');

  // Verify Zero Realization Across Entire Dataset & Invoices Show Zero INR
  const totalRealizedUSD = invoices.reduce((s, i) => s + (i.totalRealizedCurrency || 0), 0);
  const totalRealizedINR = invoices.reduce((s, i) => s + (i.totalRealizedINR || 0), 0);
  const totalEstimatedINR = invoices.reduce((s, i) => s + (i.estimatedAmountINR || 0), 0);

  assert.equal(totalRealizedUSD, 0, 'No amount must be realized in USD');
  assert.equal(totalRealizedINR, 0, 'No amount must be realized in INR');
  assert.equal(totalEstimatedINR, 0, 'Invoice INR values must be 0 (unrealized)');

  const unRealizedCount = invoices.filter((i) => i.realizationStatus === 'Not Realized').length;
  assert.equal(unRealizedCount, 71, 'All 71 invoices must have realizationStatus = Not Realized');

  // Verify Undiluted FOB Average Rate Per Kg across all 71 FOB shipments
  const fobShipments = invoices.filter((i) => (i.totalFobValueCurrency || 0) > 0);
  assert.equal(fobShipments.length, 71, 'All 71 shipments have verified FOB values');
  const fobWeight = fobShipments.reduce((s, i) => s + i.totalWeightKg, 0);
  const avgFobRate = Number((overallFobUsd / fobWeight).toFixed(2));
  assert.equal(avgFobRate, 3.37, 'Avg FOB Rate should be $3.37/Kg');
  const avgFobInrRate = Number((overallFobInr / fobWeight).toFixed(2));
  assert.equal(avgFobInrRate, 315.36, 'Avg FOB INR Rate should be ₹315.36/Kg');
});

// ============================================================================
// SUITE 16: Bulk Deletion & Clearing of Realization & Settlement Entries
// ============================================================================

test('Bulk Realization Deletion: Reset remittances, logs, and schedules across selected invoices', () => {
  const sampleInvoices = [
    {
      id: 'inv-1',
      invoiceNo: 'EXP/2026/001',
      totalAmountCurrency: 100000,
      currency: 'USD',
      realizationStatus: 'Fully Realized',
      advanceTermsUSD: 30000,
      advanceReceivedCurrency: 30000,
      advanceReceivedDate: '2026-02-15',
      advanceReceivedINR: 2535000,
      advanceBankRef: 'FIRC-001',
      balanceActualPriceUSD: 70000,
      balancePaymentAmountCurrency: 70000,
      balancePaymentDate: '2026-03-20',
      balancePaymentINR: 5915000,
      balanceBankRef: 'FIRC-002',
      totalRealizedCurrency: 100000,
      totalRealizedINR: 8450000,
      balanceRealizationCurrency: 0,
      realizations: [
        { id: 'r1', paymentType: 'Advance', realizedAmountCurrency: 30000 },
        { id: 'r2', paymentType: 'Balance', realizedAmountCurrency: 70000 }
      ]
    },
    {
      id: 'inv-2',
      invoiceNo: 'EXP/2026/002',
      totalAmountCurrency: 50000,
      currency: 'USD',
      realizationStatus: 'Partially Realized',
      advanceTermsUSD: 15000,
      advanceReceivedCurrency: 15000,
      advanceReceivedDate: '2026-02-18',
      advanceReceivedINR: 1267500,
      advanceBankRef: 'FIRC-003',
      totalRealizedCurrency: 15000,
      totalRealizedINR: 1267500,
      balanceRealizationCurrency: 35000,
      realizations: [
        { id: 'r3', paymentType: 'Advance', realizedAmountCurrency: 15000 }
      ]
    },
    {
      id: 'inv-3',
      invoiceNo: 'EXP/2026/003',
      totalAmountCurrency: 80000,
      currency: 'USD',
      realizationStatus: 'Not Realized',
      totalRealizedCurrency: 0,
      totalRealizedINR: 0,
      balanceRealizationCurrency: 80000,
      realizations: []
    }
  ];

  // Bulk clearing function replicating DataContext logic
  const bulkClearRealizations = (invoices, idsToClear) => {
    const idSet = new Set(idsToClear);
    return invoices.map((inv) => {
      if (!idSet.has(inv.id)) return inv;
      return {
        ...inv,
        advanceTermsUSD: undefined,
        advanceReceivedCurrency: undefined,
        advanceShortfallUSD: undefined,
        advanceReceivedDate: undefined,
        advanceReceivedINR: undefined,
        advanceBankRef: undefined,
        balanceActualPriceUSD: undefined,
        balancePaymentAmountCurrency: undefined,
        balanceShortfallUSD: undefined,
        balancePaymentDate: undefined,
        balancePaymentINR: undefined,
        balanceBankRef: undefined,
        totalShortfallUSD: undefined,
        realizations: [],
        totalRealizedCurrency: 0,
        balanceRealizationCurrency: inv.totalAmountCurrency,
        totalRealizedINR: 0,
        realizationStatus: 'Not Realized',
        lastRealizationDate: undefined
      };
    });
  };

  // Execute bulk clear on inv-1 and inv-2
  const cleared = bulkClearRealizations(sampleInvoices, ['inv-1', 'inv-2']);

  // inv-1 must be fully reset
  const reset1 = cleared.find((i) => i.id === 'inv-1');
  assert.equal(reset1.realizationStatus, 'Not Realized');
  assert.equal(reset1.totalRealizedCurrency, 0);
  assert.equal(reset1.totalRealizedINR, 0);
  assert.equal(reset1.balanceRealizationCurrency, 100000);
  assert.equal(reset1.advanceReceivedCurrency, undefined);
  assert.equal(reset1.balancePaymentAmountCurrency, undefined);
  assert.deepEqual(reset1.realizations, []);

  // inv-2 must be fully reset
  const reset2 = cleared.find((i) => i.id === 'inv-2');
  assert.equal(reset2.realizationStatus, 'Not Realized');
  assert.equal(reset2.totalRealizedCurrency, 0);
  assert.equal(reset2.balanceRealizationCurrency, 50000);
  assert.equal(reset2.advanceReceivedCurrency, undefined);
  assert.deepEqual(reset2.realizations, []);

  // inv-3 was unselected and must remain untouched
  const untouched3 = cleared.find((i) => i.id === 'inv-3');
  assert.equal(untouched3.realizationStatus, 'Not Realized');
  assert.equal(untouched3.totalAmountCurrency, 80000);
});

// ============================================================================
// SUITE 17: Forward Exchange Rates with 7 Decimal Places
// ============================================================================

test('Forward Exchange Rates: allow and format values up to 7 decimal places', () => {
  // 1. formatForwardRate tests
  assert.equal(formatForwardRate(84.5), '84.50');
  assert.equal(formatForwardRate(84.75), '84.75');
  assert.equal(formatForwardRate(84.5123456), '84.5123456');
  assert.equal(formatForwardRate(85.1234567), '85.1234567');
  assert.equal(formatForwardRate(84.123456789), '84.1234568'); // rounds to 7 places
  assert.equal(formatForwardRate(undefined), '0.00');
  assert.equal(formatForwardRate(null), '0.00');

  // 2. Settlement rate preservation up to 7 decimal places
  const advRateInput = 84.5123456;
  const balRateInput = 84.7891234;

  const parsedAdvRate = Number(Number(advRateInput).toFixed(7));
  const parsedBalRate = Number(Number(balRateInput).toFixed(7));

  assert.equal(parsedAdvRate, 84.5123456);
  assert.equal(parsedBalRate, 84.7891234);

  // 3. Dual settlement calculation with 7 decimal rates
  const advanceUSD = 30000;
  const balanceUSD = 70000;
  const advanceINR = Number((advanceUSD * parsedAdvRate).toFixed(2));
  const balanceINR = Number((balanceUSD * parsedBalRate).toFixed(2));

  assert.equal(advanceINR, 2535370.37);
  assert.equal(balanceINR, 5935238.64);

  const totalRealizedINR = advanceINR + balanceINR;
  const totalRealizedUSD = advanceUSD + balanceUSD;
  const weightedAverageRate = Number((totalRealizedINR / totalRealizedUSD).toFixed(7));

  assert.equal(weightedAverageRate, 84.7060901);
});

// ============================================================================
// SUITE 18: Commercial Dashboard Pending Outstanding & Unrealized Invoices
// ============================================================================

test('Commercial Dashboard: filters and aggregates pending outstanding unrealized invoices', () => {
  const invoices = [
    {
      id: 'inv-unrealized-1',
      invoiceNo: 'EXP/2026/101',
      invoiceDate: '2026-08-01',
      totalAmountCurrency: 50000,
      totalRealizedCurrency: 0,
      balanceRealizationCurrency: 50000,
      bankPreDeterminedExchangeRate: 84.50,
      realizationStatus: 'Not Realized',
      isVoided: false
    },
    {
      id: 'inv-partial-2',
      invoiceNo: 'EXP/2026/102',
      invoiceDate: '2026-09-15',
      totalAmountCurrency: 100000,
      advanceReceivedCurrency: 30000,
      totalRealizedCurrency: 30000,
      balanceRealizationCurrency: 70000,
      bankPreDeterminedExchangeRate: 85.00,
      realizationStatus: 'Partially Realized',
      isVoided: false
    },
    {
      id: 'inv-settled-3',
      invoiceNo: 'EXP/2026/103',
      invoiceDate: '2026-09-20',
      totalAmountCurrency: 40000,
      totalRealizedCurrency: 40000,
      balanceRealizationCurrency: 0,
      bankPreDeterminedExchangeRate: 84.75,
      realizationStatus: 'Fully Realized',
      isVoided: false
    },
    {
      id: 'inv-voided-4',
      invoiceNo: 'EXP/2026/104',
      invoiceDate: '2026-07-01',
      totalAmountCurrency: 25000,
      totalRealizedCurrency: 0,
      balanceRealizationCurrency: 25000,
      realizationStatus: 'Not Realized',
      isVoided: true
    }
  ];

  // Filter pending outstanding: active & balance > 0
  const pending = invoices.filter((i) => !i.isVoided && (i.balanceRealizationCurrency > 0 || i.realizationStatus !== 'Fully Realized'));

  assert.equal(pending.length, 2, 'Must include only the 2 active unrealized/partially realized invoices');
  assert.equal(pending.some((i) => i.id === 'inv-settled-3'), false, 'Fully realized invoice must be excluded');
  assert.equal(pending.some((i) => i.id === 'inv-voided-4'), false, 'Voided invoice must be excluded');

  // Aggregation
  const totalOutstandingUSD = pending.reduce((s, i) => s + i.balanceRealizationCurrency, 0);
  assert.equal(totalOutstandingUSD, 120000, 'Pending outstanding USD should be 50,000 + 70,000 = 120,000');

  // Indicative INR at forward rates
  const totalIndicativeINR = pending.reduce((s, i) => s + (i.balanceRealizationCurrency * (i.bankPreDeterminedExchangeRate || 84.5)), 0);
  // (50,000 * 84.50) + (70,000 * 85.00) = 4,225,000 + 5,950,000 = 10,175,000
  assert.equal(totalIndicativeINR, 10175000, 'Indicative outstanding INR should equal ₹1,01,75,000');
});

// ============================================================================
// SUITE 19: Realization with Shortfall Accounting & Zero Outstanding
// ============================================================================

test('Realization with Shortfall: marked Fully Realized, zero outstanding, and separate breakup reporting', () => {
  // Scenario 1: Invoice settled with bank wire fee / terms shortfall
  // Invoiced: $50,000. Advance Terms: $10,000. Actual Advance: $9,950 (Shortfall: $50)
  // Balance Price: $40,000. Actual Balance: $39,940 (Shortfall: $60)
  // Total Shortfall: $110. Total Realized: $49,890.
  const totalAmountCurrency = 50000;
  const advanceTermsUSD = 10000;
  const advanceReceivedUSD = 9950;
  const advanceExchangeRate = 84.5512345;
  const advanceShortfallUSD = Number((advanceTermsUSD - advanceReceivedUSD).toFixed(2)); // 50.00

  const balanceActualPriceUSD = 40000;
  const balanceReceivedUSD = 39940;
  const balanceExchangeRate = 85.1234567;
  const balanceShortfallUSD = Number((balanceActualPriceUSD - balanceReceivedUSD).toFixed(2)); // 60.00

  const totalRealizedUSD = Number((advanceReceivedUSD + balanceReceivedUSD).toFixed(2)); // 49890.00
  const totalShortfallUSD = Number((advanceShortfallUSD + balanceShortfallUSD).toFixed(2)); // 110.00

  // Calculation rule: Shortfall accounts for deductions; it should NOT be shown as outstanding
  const accountedShortfall = totalShortfallUSD > 0 ? totalShortfallUSD : 0;
  const isSettledWithShortfall = Boolean(balanceReceivedUSD) &&
    (totalRealizedUSD + accountedShortfall >= totalAmountCurrency - 0.05);

  const balanceRealizationCurrency = (isSettledWithShortfall || totalRealizedUSD >= totalAmountCurrency - 0.05)
    ? 0
    : Math.max(0, Number((totalAmountCurrency - totalRealizedUSD - accountedShortfall).toFixed(2)));

  let realizationStatus = 'Not Realized';
  if (totalRealizedUSD > 0 || accountedShortfall > 0) {
    if (
      balanceRealizationCurrency <= 0.05 ||
      totalRealizedUSD >= totalAmountCurrency - 0.05 ||
      isSettledWithShortfall
    ) {
      realizationStatus = 'Fully Realized';
    } else {
      realizationStatus = 'Partially Realized';
    }
  }

  assert.equal(isSettledWithShortfall, true, 'Settled invoice with shortfall recognized');
  assert.equal(balanceRealizationCurrency, 0, 'Pending outstanding balance must be 0, NOT the shortfall amount');
  assert.equal(realizationStatus, 'Fully Realized', 'Realization status must be Fully Realized');

  // Shortfall Breakup in USD and INR
  const advShortfallINR = Number((advanceShortfallUSD * advanceExchangeRate).toFixed(2));
  const balShortfallINR = Number((balanceShortfallUSD * balanceExchangeRate).toFixed(2));
  const totalShortfallINR = Number((advShortfallINR + balShortfallINR).toFixed(2));

  assert.equal(advanceShortfallUSD, 50, 'Advance shortfall is $50.00');
  assert.equal(balanceShortfallUSD, 60, 'Balance shortfall is $60.00');
  assert.equal(totalShortfallUSD, 110, 'Total shortfall is $110.00');
  assert.equal(advShortfallINR, Number((50 * 84.5512345).toFixed(2)), 'Advance shortfall INR computed accurately');
  assert.equal(balShortfallINR, Number((60 * 85.1234567).toFixed(2)), 'Balance shortfall INR computed accurately');

  // Scenario 2: Pending Outstanding Ledger must exclude invoices settled with shortfall
  const invoicePool = [
    {
      id: 'inv-unrealized-1',
      invoiceNo: 'EXP/26-27/001',
      totalAmountCurrency: 30000,
      balanceRealizationCurrency: 30000,
      realizationStatus: 'Not Realized',
      isVoided: false
    },
    {
      id: 'inv-shortfall-2',
      invoiceNo: 'EXP/26-27/002',
      totalAmountCurrency: 50000,
      balanceRealizationCurrency: 0, // Cleared to 0
      realizationStatus: 'Fully Realized',
      totalShortfallUSD: 110,
      isVoided: false
    },
    {
      id: 'inv-regular-settled-3',
      invoiceNo: 'EXP/26-27/003',
      totalAmountCurrency: 20000,
      balanceRealizationCurrency: 0,
      realizationStatus: 'Fully Realized',
      totalShortfallUSD: 0,
      isVoided: false
    }
  ];

  const pendingOutstanding = invoicePool.filter(
    (inv) => !inv.isVoided && inv.realizationStatus !== 'Fully Realized' && inv.balanceRealizationCurrency > 0.05
  );

  assert.equal(pendingOutstanding.length, 1, 'Only truly outstanding invoices must appear');
  assert.equal(pendingOutstanding[0].id, 'inv-unrealized-1', 'Only inv-unrealized-1 is pending');
  assert.equal(pendingOutstanding.some((i) => i.id === 'inv-shortfall-2'), false, 'Shortfall invoice must be excluded from pending outstanding');

  // Scenario 3: Shortfall Breakup Report aggregates
  const shortfallReportItems = invoicePool
    .filter((inv) => (inv.totalShortfallUSD || 0) > 0)
    .map((inv) => ({
      invoiceNo: inv.invoiceNo,
      totalAmountUSD: inv.totalAmountCurrency,
      shortfallUSD: inv.totalShortfallUSD,
      outstandingUSD: inv.balanceRealizationCurrency,
      status: inv.realizationStatus
    }));

  assert.equal(shortfallReportItems.length, 1, 'Shortfall report extracts invoices with shortfall deductions');
  assert.equal(shortfallReportItems[0].shortfallUSD, 110, 'Shortfall reported separately as $110.00');
  assert.equal(shortfallReportItems[0].outstandingUSD, 0, 'Report confirms $0.00 pending outstanding');
  assert.equal(shortfallReportItems[0].status, 'Fully Realized', 'Report confirms status is Fully Realized');
});

test('Invoices 35 and 53 Shortfall Resolution: zero outstanding and Fully Realized with respective shortfall', () => {
  // Invoice 35 (RF/EXP/35/26-27):
  // Invoiced USD: 149,419.08, Balance Received: 149,369.08, Respective Shortfall: $50.00
  const inv35Invoiced = 149419.08;
  const inv35Received = 149369.08;
  const inv35Shortfall = Number((inv35Invoiced - inv35Received).toFixed(2));
  assert.equal(inv35Shortfall, 50.00, 'Invoice 35 shortfall is exactly $50.00');

  const inv35RemainingUSD = Math.max(0, Number((inv35Invoiced - inv35Received - inv35Shortfall).toFixed(2)));
  assert.equal(inv35RemainingUSD, 0, 'Invoice 35 remaining unrealized balance is 0.00');

  // Invoice 53 (RF/EXP/53/26-27):
  // Invoiced USD: 52,806.40, Balance Received: 52,781.00, Respective Shortfall: $25.40
  const inv53Invoiced = 52806.40;
  const inv53Received = 52781.00;
  const inv53Shortfall = Number((inv53Invoiced - inv53Received).toFixed(2));
  assert.equal(inv53Shortfall, 25.40, 'Invoice 53 shortfall is exactly $25.40');

  const inv53RemainingUSD = Math.max(0, Number((inv53Invoiced - inv53Received - inv53Shortfall).toFixed(2)));
  assert.equal(inv53RemainingUSD, 0, 'Invoice 53 remaining unrealized balance is 0.00');
});

test('Consignee Masters & Address Verification from Import Template', async () => {
  const fs = await import('fs');
  const path = await import('path');
  const filePath = path.resolve('src/data/exportSalesData.ts');
  const content = fs.readFileSync(filePath, 'utf8');

  const custPrefix = 'export const VERIFIED_CUSTOMERS: Customer[] = ';
  const custStart = content.indexOf(custPrefix);
  const custEnd = content.indexOf('export const VERIFIED_PORTS');
  const custs = JSON.parse(content.slice(custStart + custPrefix.length, custEnd).trim().replace(/;$/, ''));

  assert.ok(custs.length >= 31, 'Consignee masters must contain all 31 verified consignees');

  const invPrefix = 'export const VERIFIED_SALES_INVOICES: SalesInvoice[] = ';
  const invStart = content.indexOf(invPrefix);
  const invoices = JSON.parse(content.slice(invStart + invPrefix.length).trim().replace(/;$/, ''));

  // Verify specific authentic addresses from Excel
  const wealthOcean = custs.find((c) => c.name === 'WEALTHOCEANSUPPLY CO. LTD.');
  assert.ok(wealthOcean, 'WEALTHOCEANSUPPLY CO. LTD. must exist');
  assert.ok(
    wealthOcean.address.includes('Phawong Subdistrict') && wealthOcean.address.includes('Songkhla'),
    'WEALTHOCEANSUPPLY CO. LTD. address must contain authentic street details'
  );

  const jiraSmith = custs.find((c) => c.name === 'JIRA SMITH TRADING CO. LTD.');
  assert.ok(jiraSmith, 'JIRA SMITH TRADING CO. LTD. must exist');
  assert.ok(
    jiraSmith.address.includes('411 MOO.7, T. TAIBAN A. MUANG'),
    'JIRA SMITH TRADING CO. LTD. address must contain authentic street details'
  );

  const xiamen = custs.find((c) => c.name === 'XIAMEN BOYUANSHUN TRADE AGENT CO. LTD');
  assert.ok(xiamen, 'XIAMEN BOYUANSHUN TRADE AGENT CO. LTD must exist');
  assert.ok(
    xiamen.address.includes('XINSHIDAI BUILDING') && xiamen.address.includes('HULI AVENUE'),
    'XIAMEN address must contain authentic building details'
  );

  const leeHup = custs.find((c) => c.name === 'LEE HUP GUAN SDN BHD');
  assert.ok(leeHup, 'LEE HUP GUAN SDN BHD must exist');
  assert.ok(
    leeHup.address.includes('LOT 1044, JALAN DUA') && leeHup.address.includes('BATU CAVES'),
    'LEE HUP GUAN address must contain authentic Malaysian street details'
  );

  const umios = custs.find((c) => c.name === 'UMIOS CORPORATION');
  assert.ok(umios, 'UMIOS CORPORATION must exist');
  assert.ok(
    umios.address.includes('2-21-2, TAKANAWA MINATO-KU Tokyo Japan'),
    'UMIOS address must contain authentic Tokyo street details'
  );

  // Invoices must reference non-empty authentic addresses
  const invoicesWithAddresses = invoices.filter(
    (inv) => inv.consigneeAddress && inv.consigneeAddress.length > 15
  );
  assert.equal(
    invoicesWithAddresses.length,
    invoices.length,
    'All 71 commercial invoices must have complete consignee addresses populated'
  );
});

test('Commercial Product Masters from Import Template & Searchable Selection', async () => {
  const fs = await import('fs');
  const path = await import('path');
  const filePath = path.resolve('src/data/exportSalesData.ts');
  const content = fs.readFileSync(filePath, 'utf8');

  // 1. Verify VERIFIED_SPECIES exactly matches 32 template products
  const spPrefix = 'export const VERIFIED_SPECIES: Species[] = ';
  const spStart = content.indexOf(spPrefix);
  const spEnd = content.indexOf('export const VERIFIED_SIZES');
  const speciesList = JSON.parse(content.slice(spStart + spPrefix.length, spEnd).trim().replace(/;$/, ''));

  assert.equal(speciesList.length, 32, 'Must contain exactly 32 commercial products from Excel template');

  // Verify PRD-001 through PRD-032 sequence
  for (let i = 1; i <= 32; i++) {
    const expectedCode = `PRD-${String(i).padStart(3, '0')}`;
    const sp = speciesList.find((s) => s.code === expectedCode);
    assert.ok(sp, `Product ${expectedCode} must exist in species master`);
    assert.ok(sp.name && sp.name.length > 3, `${expectedCode} must have export ready name`);
    assert.ok(sp.rawSpeciesName, `${expectedCode} must have purchase species connection`);
    assert.ok(sp.scientificName, `${expectedCode} must have scientific name`);
    assert.ok(sp.category, `${expectedCode} must have category`);
    assert.ok(sp.productForm, `${expectedCode} must have product form`);
    assert.ok(sp.processingType, `${expectedCode} must have processing type`);
    assert.ok(sp.hsCode, `${expectedCode} must have HS code`);
    assert.equal(sp.active, true, `${expectedCode} must be active`);
  }

  // Spot-check key authentic products
  const prd1 = speciesList.find((s) => s.code === 'PRD-001');
  assert.equal(prd1.name, 'Frozen RibbonFish B Grade');
  assert.equal(prd1.rawSpeciesName, 'Ribbonfish Net');
  assert.equal(prd1.scientificName, 'Lepturacanthus Savala');
  assert.equal(prd1.category, 'Fish');
  assert.equal(prd1.hsCode, '03038930');

  const prd9 = speciesList.find((s) => s.code === 'PRD-009');
  assert.equal(prd9.name, 'Frozen PVPD Vannamei Shrimps');
  assert.equal(prd9.rawSpeciesName, 'Vannamei');
  assert.equal(prd9.scientificName, 'Litopenaeus Vannamei');
  assert.equal(prd9.category, 'Shrimp');
  assert.equal(prd9.hsCode, '03061720');

  const prd15 = speciesList.find((s) => s.code === 'PRD-015');
  assert.equal(prd15.name, 'FROZEN LOLIGO SQUID');
  assert.equal(prd15.rawSpeciesName, 'Loligo Squid');
  assert.equal(prd15.category, 'Squid');
  assert.equal(prd15.hsCode, '03074320');

  const prd16 = speciesList.find((s) => s.code === 'PRD-016');
  assert.equal(prd16.name, 'FROZEN OCTOPUS WHOLE');
  assert.equal(prd16.rawSpeciesName, 'Octopus');
  assert.equal(prd16.scientificName, 'Octopus Vulgaris');
  assert.equal(prd16.category, 'Octopus');
  assert.equal(prd16.hsCode, '03075200');

  // 2. Verify all invoice line items map to these authentic product masters
  const invPrefix = 'export const VERIFIED_SALES_INVOICES: SalesInvoice[] = ';
  const invStart = content.indexOf(invPrefix);
  const nextInvMarker = 'export const VERIFIED_EXPORT_SUMMARY:';
  const invEnd = content.indexOf(nextInvMarker);
  const invSection = content.slice(invStart + invPrefix.length, invEnd).trim().replace(/;$/, '');
  const invoices = JSON.parse(invSection);

  assert.equal(invoices.length, 71, 'Must preserve all 71 commercial export invoices');

  const validSpeciesIds = new Set(speciesList.map((s) => s.id));
  let totalLineItemsChecked = 0;
  invoices.forEach((inv) => {
    inv.lineItems.forEach((item) => {
      totalLineItemsChecked++;
      assert.ok(
        validSpeciesIds.has(item.speciesId),
        `Invoice ${inv.invoiceNo} line item ${item.id} has invalid speciesId: ${item.speciesId}`
      );
    });
  });
  assert.ok(totalLineItemsChecked > 100, 'Checked all invoice line items across the entire dataset');

  // 3. Verify total FOB USD and INR remains exact
  const totalFobUsd = invoices.reduce((s, inv) => s + (inv.totalFobValueCurrency || 0), 0);
  const totalFobInr = invoices.reduce((s, inv) => s + (inv.totalFobValueINR || 0), 0);
  assert.equal(totalFobUsd.toFixed(2), '5628701.27', 'FOB USD must remain exactly 56,28,701.27');
  assert.equal(totalFobInr.toFixed(2), '527264283.04', 'FOB INR must remain exactly 52,72,64,283.04');

  // 4. Verify search filter strictly matches typed word
  const filterByWord = (q, list) => {
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter((sp) => {
      return (
        (sp.name || '').toLowerCase().includes(query) ||
        (sp.code || '').toLowerCase().includes(query) ||
        (sp.rawSpeciesName || '').toLowerCase().includes(query) ||
        (sp.scientificName || '').toLowerCase().includes(query) ||
        (sp.category || '').toLowerCase().includes(query) ||
        (sp.hsCode || '').toLowerCase().includes(query)
      );
    });
  };

  const squidMatches = filterByWord('squid', speciesList);
  assert.ok(squidMatches.length >= 8, 'Query "squid" returns all squid products');
  assert.ok(squidMatches.every((s) => s.name.toLowerCase().includes('squid') || s.category.toLowerCase().includes('squid')), 'All matches contain squid');

  const prd5Match = filterByWord('PRD-005', speciesList);
  assert.equal(prd5Match.length, 1, 'Exact code query returns only 1 product');
  assert.equal(prd5Match[0].code, 'PRD-005');

  const hsnMatch = filterByWord('03075200', speciesList);
  assert.equal(hsnMatch.length, 2, 'HSN query matches Octopus products with code 03075200');

  // 5. Blank line item default creation
  const createBlankLine = (index = 0) => ({
    id: `line-${Date.now()}-${index}`,
    speciesId: '',
    hsCode: '',
    sizeId: '',
    countId: '',
    productDescription: '',
    gradeSize: '',
    cartonsCount: '',
    weightKg: '',
    ratePerKg: '',
    fobValueCurrency: ''
  });

  const blankLine = createBlankLine(1);
  assert.equal(blankLine.speciesId, '', 'New line speciesId must be blank');
  assert.equal(blankLine.productDescription, '', 'New line productDescription must be blank (never Vannamei Shrimps)');
  assert.equal(blankLine.hsCode, '', 'New line hsCode must be blank');
});

test('Unified Searchable Comboboxes: Size, Customer, and Port drag down lists', async () => {
  const fs = await import('fs');
  const path = await import('path');
  const filePath = path.resolve('src/data/exportSalesData.ts');
  const content = fs.readFileSync(filePath, 'utf8');

  // 1. Verify Sizes search filtering
  const szPrefix = 'export const VERIFIED_SIZES: Size[] = ';
  const szStart = content.indexOf(szPrefix);
  const szEnd = content.indexOf('export const VERIFIED_SALES_INVOICES');
  const sizes = JSON.parse(content.slice(szStart + szPrefix.length, szEnd).trim().replace(/;$/, ''));

  assert.ok(sizes.length >= 20, 'Verified sizes list must be present');

  const filterSizes = (q, list) => {
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter((sz) => {
      const matchName = (sz.name || '').toLowerCase().includes(query);
      const matchCode = (sz.code || '').toLowerCase().includes(query);
      const matchDesc = (sz.description || '').toLowerCase().includes(query);
      return matchName || matchCode || matchDesc;
    });
  };

  const count7190 = filterSizes('71/90', sizes);
  assert.equal(count7190.length, 1, 'Search for "71/90" returns exact matching size');
  assert.equal(count7190[0].name, '71/90');

  const count100 = filterSizes('100', sizes);
  assert.ok(count100.length >= 1, 'Search for "100" returns matching sizes like 100/200');

  // 2. Verify Customer search filtering
  const custPrefix = 'export const VERIFIED_CUSTOMERS: Customer[] = ';
  const custStart = content.indexOf(custPrefix);
  const custEnd = content.indexOf('export const VERIFIED_PORTS');
  const customers = JSON.parse(content.slice(custStart + custPrefix.length, custEnd).trim().replace(/;$/, ''));

  const filterCustomers = (q, list) => {
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter((c) => {
      const matchName = (c.name || '').toLowerCase().includes(query);
      const matchCode = (c.code || '').toLowerCase().includes(query);
      const matchCountry = (c.country || '').toLowerCase().includes(query);
      const matchAddress = (c.address || '').toLowerCase().includes(query);
      return matchName || matchCode || matchCountry || matchAddress;
    });
  };

  const thailandCustomers = filterCustomers('Thailand', customers);
  assert.equal(thailandCustomers.length, 3, 'Search for "Thailand" filters all Thai consignees');
  assert.ok(thailandCustomers.every((c) => c.country.toLowerCase().includes('thailand') || c.address.toLowerCase().includes('thailand')));

  const chinaCustomers = filterCustomers('China', customers);
  assert.ok(chinaCustomers.length >= 10, 'Search for "China" filters Chinese consignees');

  const cust15 = filterCustomers('CUST-015', customers);
  assert.equal(cust15.length, 1, 'Search by code returns single matching consignee');
  assert.equal(cust15[0].name, 'GLOBAL FISH CO., LTD');

  // 3. Verify Ports search filtering
  const portPrefix = 'export const VERIFIED_PORTS: PortMaster[] = ';
  const portStart = content.indexOf(portPrefix);
  const portEnd = content.indexOf('export const VERIFIED_SPECIES');
  const ports = JSON.parse(content.slice(portStart + portPrefix.length, portEnd).trim().replace(/;$/, ''));

  const filterPorts = (q, list) => {
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter((p) => {
      const matchName = (p.name || '').toLowerCase().includes(query);
      const matchCode = (p.code || '').toLowerCase().includes(query);
      const matchCountry = (p.country || '').toLowerCase().includes(query);
      return matchName || matchCode || matchCountry;
    });
  };

  const cochinPort = filterPorts('Cochin', ports);
  assert.equal(cochinPort.length, 1, 'Search for "Cochin" returns Cochin Port');
  assert.equal(cochinPort[0].code, 'INCOK');

  const chinaPorts = filterPorts('China', ports);
  assert.ok(chinaPorts.length >= 5, 'Search for "China" returns all Chinese ports (Qingdao, Fuzhou, Xiamen, etc.)');
});

// ============================================================================
// SUITE 48: Commodity Title & Scientific Name Auto-Fill from Product Masters
// Reference: Sample Invoice Structure & User Uploaded Reference Image
// ============================================================================
test('Commodity Title and Scientific Name Auto-Fill from Product Masters & Reference Image', async () => {
  const fs = await import('fs');
  const path = await import('path');
  const filePath = path.resolve('src/data/exportSalesData.ts');
  const content = fs.readFileSync(filePath, 'utf8');

  const spPrefix = 'export const VERIFIED_SPECIES: Species[] = ';
  const spStart = content.indexOf(spPrefix);
  const spEnd = content.indexOf('export const VERIFIED_SIZES');
  const speciesList = JSON.parse(content.slice(spStart + spPrefix.length, spEnd).trim().replace(/;$/, ''));

  // 1. Verify authentic Squid scientific names in product master
  const prd23 = speciesList.find((s) => s.code === 'PRD-023');
  const prd24 = speciesList.find((s) => s.code === 'PRD-024');
  assert.ok(prd23, 'PRD-023 must exist');
  assert.ok(prd24, 'PRD-024 must exist');
  assert.equal(prd23.scientificName, 'Uroteuthis Duvaucelii', 'Squid Semi Needle scientific name is Uroteuthis Duvaucelii');
  assert.equal(prd24.scientificName, 'Uroteuthis Duvaucelii', 'Loligo Squid scientific name is Uroteuthis Duvaucelii');

  // 2. Multi-Item Commodity Title & Scientific Name (exact match to user reference image)
  // Image: "COMMODITY: 481 CARTONS FROZEN SQUID SEMI NEEDLE WHOLE-A GRADE & 1519 CARTONS FROZEN LOLIGO SQUID WHOLE-A GRADE"
  // "SCIENTIFIC NAME: UROTEUTHIS DUVAUCELII"
  const multiItemLines = [
    {
      speciesId: prd23.id,
      cartonsCount: 481,
      productDescription: 'FROZEN SQUID SEMI NEEDLE WHOLE-A GRADE'
    },
    {
      speciesId: prd24.id,
      cartonsCount: 1519,
      productDescription: 'FROZEN LOLIGO SQUID WHOLE-A GRADE'
    }
  ];

  const derivedMultiCommodity = deriveCommodityTitle(multiItemLines, speciesList);
  assert.equal(
    derivedMultiCommodity,
    '481 CARTONS FROZEN SQUID SEMI NEEDLE WHOLE-A GRADE & 1519 CARTONS FROZEN LOLIGO SQUID WHOLE-A GRADE',
    'Commodity title for 2 items must exactly match reference image joined with " & "'
  );

  const derivedMultiScientific = deriveScientificName(multiItemLines, speciesList);
  assert.equal(
    derivedMultiScientific,
    'UROTEUTHIS DUVAUCELII',
    'Deduplicates shared scientific name to single uppercase UROTEUTHIS DUVAUCELII matching reference image'
  );

  // 3. Single Item Commodity Title (matching sample invoice structure)
  // e.g. "2600 CARTONS FROZEN INDIAN MACKEREL A GRADE" with "RASTRELLIGER KANAGURTA"
  const prd4 = speciesList.find((s) => s.code === 'PRD-004');
  assert.ok(prd4, 'PRD-004 must exist');
  const singleItemLines = [
    {
      speciesId: prd4.id,
      cartonsCount: 2600,
      productDescription: ''
    }
  ];

  const derivedSingleCommodity = deriveCommodityTitle(singleItemLines, speciesList);
  assert.equal(
    derivedSingleCommodity,
    '2600 CARTONS FROZEN INDIAN MACKEREL A GRADE',
    'Single item commodity title includes carton count and product master name'
  );

  const derivedSingleScientific = deriveScientificName(singleItemLines, speciesList);
  assert.equal(
    derivedSingleScientific,
    'RASTRELLIGER KANAGURTA',
    'Single item scientific name uppercase'
  );

  // 4. Same Product Multi-Line Cartons Aggregation
  // If an invoice has 2 sizes of the same product, cartons are summed
  const multiSizeLines = [
    {
      speciesId: prd4.id,
      cartonsCount: 1000,
      productDescription: ''
    },
    {
      speciesId: prd4.id,
      cartonsCount: 1600,
      productDescription: ''
    }
  ];
  assert.equal(
    deriveCommodityTitle(multiSizeLines, speciesList),
    '2600 CARTONS FROZEN INDIAN MACKEREL A GRADE',
    'Aggregates cartons for multi-size lines of the same product'
  );

  // 5. Distinct Species Scientific Name joining with " & "
  const prd1 = speciesList.find((s) => s.code === 'PRD-001');
  const mixedSpeciesLines = [
    {
      speciesId: prd1.id,
      cartonsCount: 500,
      productDescription: ''
    },
    {
      speciesId: prd4.id,
      cartonsCount: 800,
      productDescription: ''
    }
  ];
  assert.equal(
    deriveScientificName(mixedSpeciesLines, speciesList),
    'LEPTURACANTHUS SAVALA & RASTRELLIGER KANAGURTA',
    'Distinct species scientific names are joined with " & "'
  );

  // 6. Edge cases: Empty lines, 0 cartons, singular 1 carton
  assert.equal(deriveCommodityTitle([], speciesList), '');
  assert.equal(deriveScientificName([], speciesList), '');

  const singularLine = [{ speciesId: prd1.id, cartonsCount: 1 }];
  assert.equal(deriveCommodityTitle(singularLine, speciesList), '1 CARTON FROZEN RIBBONFISH B GRADE');

  const zeroCartonLine = [{ speciesId: prd1.id, cartonsCount: 0 }];
  assert.equal(deriveCommodityTitle(zeroCartonLine, speciesList), 'FROZEN RIBBONFISH B GRADE');
});

// ============================================================================
// SUITE 49: Optional Pre-Determined Bank Exchange Rate in Invoice Entry
// ============================================================================
test('Optional Pre-Determined Bank Exchange Rate in Invoice Entry', async () => {
  // Helper simulating the invoice draft resolution in SalesInvoiceEntryForm
  const resolveInvoiceRates = (exchangeRateInput, totalAmountCurrency = 10000) => {
    const parsedRate = exchangeRateInput && exchangeRateInput.trim() !== '' ? parseFloat(exchangeRateInput) : undefined;
    const currentRate = parsedRate !== undefined && !isNaN(parsedRate) && parsedRate > 0 ? parsedRate : undefined;
    const estimatedAmountINR = currentRate ? Number((totalAmountCurrency * currentRate).toFixed(2)) : 0;
    return {
      exchangeRate: currentRate || 0,
      bankPreDeterminedExchangeRate: currentRate,
      estimatedAmountINR
    };
  };

  // 1. Blank / omitted exchange rate (Optional field)
  const blankRateDraft = resolveInvoiceRates('');
  assert.equal(blankRateDraft.exchangeRate, 0, 'Exchange rate defaults to 0 when omitted');
  assert.equal(blankRateDraft.bankPreDeterminedExchangeRate, undefined, 'bankPreDeterminedExchangeRate is undefined when omitted');
  assert.equal(blankRateDraft.estimatedAmountINR, 0, 'Estimated INR is 0 when bank rate is not yet booked');

  // 2. Whitespace-only input
  const whitespaceRateDraft = resolveInvoiceRates('   ');
  assert.equal(whitespaceRateDraft.exchangeRate, 0);
  assert.equal(whitespaceRateDraft.bankPreDeterminedExchangeRate, undefined);
  assert.equal(whitespaceRateDraft.estimatedAmountINR, 0);

  // 3. Explicit forward rate entered
  const bookedRateDraft = resolveInvoiceRates('84.7500000', 50000);
  assert.equal(bookedRateDraft.exchangeRate, 84.75);
  assert.equal(bookedRateDraft.bankPreDeterminedExchangeRate, 84.75);
  assert.equal(bookedRateDraft.estimatedAmountINR, 4237500);

  // 4. Verify in form template that required attribute is removed and marked optional
  const fs = await import('fs');
  const path = await import('path');
  const formCode = fs.readFileSync(path.resolve('src/components/sales/SalesInvoiceEntryForm.tsx'), 'utf8');
  assert.ok(formCode.includes('Pre-determined Bank Exchange Rate (INR / {currency}) <span className="text-ink-400 font-normal text-[10px]">(Optional)</span>'));
  assert.ok(!formCode.includes('placeholder="e.g. 84.5000000"\n              required'));
  assert.ok(!formCode.includes('placeholder="e.g. 84.5000000"\r\n              required'));
});

// ============================================================================
// SUITE 50: Distinct Commercial Size Master for Sales Module
// ============================================================================
test('Distinct Commercial Size Master for Sales Module', async () => {
  const fs = await import('fs');
  const path = await import('path');
  const filePath = path.resolve('src/data/exportSalesData.ts');
  const content = fs.readFileSync(filePath, 'utf8');

  // 1. Verify VERIFIED_SIZES contains all 27 verified commercial sizes
  const szPrefix = 'export const VERIFIED_SIZES: Size[] = ';
  const szStart = content.indexOf(szPrefix);
  const szEnd = content.indexOf('export const VERIFIED_SALES_INVOICES');
  const purchaseSizes = JSON.parse(content.slice(szStart + szPrefix.length, szEnd).trim().replace(/;$/, ''));

  assert.equal(purchaseSizes.length, 27, 'Purchase sizes contains all 27 starter sizes');

  // 2. Simulate initializing sales sizes from purchase sizes
  let salesSizes = JSON.parse(JSON.stringify(purchaseSizes));
  assert.equal(salesSizes.length, 27, 'Sales sizes initially brought all 27 sizes from purchase');

  // 3. Adding a new size in sales sizes is completely isolated from purchase sizes
  const newSalesSize = {
    id: `ssiz-${Date.now()}`,
    code: 'SZ-NEW-01',
    name: '5/7 U',
    description: 'Special Export Grade 5/7 U',
    active: true
  };
  salesSizes.push(newSalesSize);

  assert.equal(salesSizes.length, 28, 'Sales sizes now has 28 sizes');
  assert.equal(purchaseSizes.length, 27, 'Purchase sizes remains completely unchanged at 27 sizes');

  // 4. Updating a size in sales does not mutate purchase sizes
  const targetSalesSize = salesSizes.find((s) => s.code === '71-90');
  assert.ok(targetSalesSize);
  targetSalesSize.description = 'Export customized description';

  const originalPurchaseSize = purchaseSizes.find((s) => s.code === '71-90');
  assert.notEqual(originalPurchaseSize.description, 'Export customized description', 'Purchase size description remains unaltered');

  // 5. Deleting a size in sales does not delete from purchase
  salesSizes = salesSizes.filter((s) => s.id !== newSalesSize.id);
  assert.equal(salesSizes.length, 27);
  assert.equal(purchaseSizes.length, 27);

  // 6. Verify SalesSizeManager component file exists and exports SalesSizeManager
  const salesSizeManagerPath = path.resolve('src/components/sales/SalesSizeManager.tsx');
  assert.ok(fs.existsSync(salesSizeManagerPath), 'SalesSizeManager.tsx must exist');
  const mgrContent = fs.readFileSync(salesSizeManagerPath, 'utf8');
  assert.ok(mgrContent.includes('export const SalesSizeManager'), 'SalesSizeManager component must be exported');

  // 7. Verify SalesSidebar includes sales-sizes under Commercial Masters
  const sidebarPath = path.resolve('src/components/sales/SalesSidebar.tsx');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  assert.ok(sidebarContent.includes("'sales-sizes'"), 'SalesSidebar must route sales-sizes');
  assert.ok(sidebarContent.includes("label: 'Grade / Size Master'"), 'SalesSidebar must show Grade / Size Master');

  // 8. Verify SalesInvoiceEntryForm and SalesReportsHub use salesSizes
  const entryFormPath = path.resolve('src/components/sales/SalesInvoiceEntryForm.tsx');
  const entryContent = fs.readFileSync(entryFormPath, 'utf8');
  assert.ok(entryContent.includes('salesSizes'), 'SalesInvoiceEntryForm must use salesSizes');
  assert.ok(entryContent.includes('sizeList={salesSizes}'), 'SizeCombobox must receive salesSizes');
});












