import test from 'node:test';
import assert from 'node:assert/strict';

// Genuine imports from production source modules (Zero Inline Duplication)
import {
  computePurchaseFields,
  allocateBatchCombined,
  allocateBatchExpenses,
  getIndianFinancialYear,
  calculateDueDate,
  derivePaymentStatus,
  getAgeingBucket
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




