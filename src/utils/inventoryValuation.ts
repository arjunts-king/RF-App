import type {
  InventoryItem,
  InventoryItemMapping,
  OpeningStock,
  StockAdjustment,
  PhysicalStockCount,
  InventoryMovement,
  StockPositionItem,
  MovementSummaryItem,
  CogsReportItem,
  NrvCheckItem,
  InventoryReconciliation,
  InventoryException,
  InventoryCalculationResult,
  Purchase,
  PurchaseReturn,
  SalesInvoice,
  SalesInvoiceLine,
  Species,
  Customer,
  Supplier
} from '../types/index.ts';

export type { InventoryCalculationResult };

interface RawInventoryEvent {
  id: string;
  inventoryItemId: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  sequencePriority: number; // 1: Opening, 2: Receipt, 3: Returns, 4: Adjustments, 5: Issues
  movementType: InventoryMovement['movementType'];
  referenceId: string;
  referenceDescription: string;
  quantityIn: number;
  quantityOut: number;
  receiptValue?: number; // Only for receipts where incoming value is known
  fixedRate?: number; // For returns where original rate is known
  sourceRecord?: any;
}

/**
 * Rounding helpers per specification:
 * Quantity: 3 decimals, Rates: 4 decimals, Values: 2 decimals.
 */
export function roundQty(val: number): number {
  return Math.round((val + Number.EPSILON) * 1000) / 1000;
}

export function roundRate(val: number): number {
  return Math.round((val + Number.EPSILON) * 10000) / 10000;
}

export function roundValue(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Normalizes strings for robust matching across master names and codes.
 */
function cleanKey(val: string | undefined | null): string {
  return String(val || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Resolves which InventoryItem a Purchase record maps to.
 */
export function findInventoryItemForPurchase(
  p: Purchase,
  items: InventoryItem[],
  mappings: InventoryItemMapping[],
  speciesList: Species[]
): InventoryItem | null {
  // 1. Explicit mapping in mappings table
  const explicit = mappings.find(
    (m) =>
      m.module === 'purchase' &&
      m.speciesId === p.speciesId &&
      (!m.gradeId || m.gradeId === p.gradeId) &&
      (!m.sizeId || m.sizeId === p.sizeId)
  );
  if (explicit) {
    const item = items.find((i) => i.id === explicit.inventoryItemId && !i.isDeleted);
    if (item) return item;
  }

  // 2. Mapping by species.inventoryItemId
  const sp = speciesList.find((s) => s.id === p.speciesId);
  if (sp?.inventoryItemId) {
    const item = items.find((i) => i.id === sp.inventoryItemId && !i.isDeleted);
    if (item) return item;
  }

  // 3. Fallback matching by name heuristics (Vannamei, Tiger, Tuna, Squid)
  const spName = cleanKey(sp?.name || '');
  const matched = items.find((i) => {
    if (i.isDeleted) return false;
    const iName = cleanKey(i.name);
    const iCode = cleanKey(i.code);
    return iName.includes(spName) || spName.includes(iName) || iCode.includes(spName);
  });

  return matched || null;
}

/**
 * Resolves which InventoryItem a SalesInvoiceLine maps to.
 */
export function findInventoryItemForSalesLine(
  line: SalesInvoiceLine,
  items: InventoryItem[],
  mappings: InventoryItemMapping[],
  speciesList: Species[]
): InventoryItem | null {
  // 1. Explicit mapping in mappings table
  const explicit = mappings.find(
    (m) =>
      m.module === 'sales' &&
      m.salesProductId === line.speciesId &&
      (!m.salesSizeId || m.salesSizeId === line.sizeId)
  );
  if (explicit) {
    const item = items.find((i) => i.id === explicit.inventoryItemId && !i.isDeleted);
    if (item) return item;
  }

  // 2. Check if the sales product references an inventory item or raw species
  const prod = speciesList.find((s) => s.id === line.speciesId);
  if (prod?.inventoryItemId) {
    const item = items.find((i) => i.id === prod.inventoryItemId && !i.isDeleted);
    if (item) return item;
  }

  // 3. Match by rawSpeciesName or product name
  const rawKey = cleanKey(prod?.rawSpeciesName || prod?.name || line.productDescription);
  const matched = items.find((i) => {
    if (i.isDeleted) return false;
    const iName = cleanKey(i.name);
    const iCode = cleanKey(i.code);
    return iName.includes(rawKey) || rawKey.includes(iName) || iCode.includes(rawKey);
  });

  return matched || null;
}

/**
 * Master Perpetual Inventory Valuation Ledger Calculator
 * Uses the Moving Weighted Average Cost Method.
 */
export function calculatePerpetualInventory(params: {
  items?: InventoryItem[];
  inventoryItems?: InventoryItem[];
  mappings?: InventoryItemMapping[];
  openingStocks?: OpeningStock[];
  purchases?: Purchase[];
  purchaseReturns?: PurchaseReturn[];
  salesInvoices?: SalesInvoice[];
  stockAdjustments?: StockAdjustment[];
  physicalCounts?: PhysicalStockCount[];
  speciesList?: Species[];
  suppliers?: Supplier[];
  customers?: Customer[];
  gradesList?: any[];
  sizesList?: any[];
}): InventoryCalculationResult {
  const inventoryItems = params.inventoryItems || params.items || [];
  const mappings = params.mappings || [];
  const openingStocks = params.openingStocks || [];
  const purchases = params.purchases || [];
  const purchaseReturns = params.purchaseReturns || [];
  const salesInvoices = params.salesInvoices || [];
  const stockAdjustments = params.stockAdjustments || [];
  const physicalCounts = params.physicalCounts || [];
  const speciesList = params.speciesList || [];
  const suppliers = params.suppliers || [];
  const customers = params.customers || [];

  const activeItems = inventoryItems.filter((i) => !i.isDeleted);
  const exceptions: InventoryException[] = [];
  const rawEvents: RawInventoryEvent[] = [];

  // Map lookups for fast references
  const itemMap = new Map(activeItems.map((i) => [i.id, i]));
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const speciesMap = new Map(speciesList.map((s) => [s.id, s]));
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

  // 1. OPENING STOCK EVENTS (Priority 1)
  openingStocks.forEach((os) => {
    const item = itemMap.get(os.inventoryItemId);
    if (!item) return;
    const dateObj = new Date(os.effectiveDate);
    const timestamp = isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();

    rawEvents.push({
      id: `ev-op-${os.id}`,
      inventoryItemId: item.id,
      date: os.effectiveDate,
      timestamp,
      sequencePriority: 1,
      movementType: 'opening_stock',
      referenceId: os.id,
      referenceDescription: `Opening Stock Balance (${os.remarks || 'Initial Setup'})`,
      quantityIn: roundQty(os.quantityKg),
      quantityOut: 0,
      receiptValue: roundValue(os.totalValue || os.quantityKg * os.unitCost),
      fixedRate: roundRate(os.unitCost),
      sourceRecord: os
    });
  });

  // 2. PURCHASE RECEIPTS (Priority 2)
  const activePurchases = purchases.filter((p) => !p.isVoided);
  activePurchases.forEach((p) => {
    const matchedItem = findInventoryItemForPurchase(p, activeItems, mappings, speciesList);
    const sp = speciesMap.get(p.speciesId);
    const speciesName = sp?.name || 'Seafood Lot';
    const sup = supplierMap.get(p.supplierId);
    const supplierName = sup?.name || 'Supplier';

    if (!matchedItem) {
      exceptions.push({
        id: `exc-unmapped-pur-${p.id}`,
        type: 'unmapped_purchase',
        severity: 'high',
        title: `Unmapped Purchase: ${speciesName}`,
        description: `Purchase lot ${p.purchaseId} (${supplierName}, ${p.weightKg} Kg) is not mapped to any inventory item.`,
        referenceId: p.purchaseId,
        date: p.purchaseDate,
        affectedItem: speciesName,
        suggestedAction: `Create a mapping in Inventory Item Master linking species "${speciesName}" to an inventory item.`
      });
      return;
    }

    // Determine Receipt Quantity
    let receiptQty = 0;
    const isYieldBasis = matchedItem.quantityBasis === 'yield';

    if (isYieldBasis) {
      // For Vannamei or yield-basis items: receipt quantity = yield weight!
      if (p.yieldWeightKg && p.yieldWeightKg > 0) {
        receiptQty = p.yieldWeightKg;
      } else {
        // Missing yield for Vannamei
        exceptions.push({
          id: `exc-yield-missing-${p.id}`,
          type: 'missing_yield_vannamei',
          severity: 'high',
          title: `Missing Yield Weight for ${speciesName}`,
          description: `Purchase lot ${p.purchaseId} has inventory basis set to "Yield", but finished yield weight is missing. Raw weight was used temporarily.`,
          referenceId: p.purchaseId,
          date: p.purchaseDate,
          affectedItem: matchedItem.name,
          suggestedAction: `Edit purchase ${p.purchaseId} to record the finished yield quantity (Kg).`
        });
        receiptQty = Math.max(0, p.weightKg - (p.damageWeightKg || 0));
      }
    } else {
      // Normal purchase basis: Weight less damage weight
      receiptQty = Math.max(0, p.weightKg - (p.damageWeightKg || 0));
    }

    // Receipt Value = Total Cost (Gross purchase value + landing expenses + allocated shared batch expenses)
    const receiptValue = roundValue(p.totalCost || 0);

    const dateObj = new Date(p.purchaseDate);
    const timestamp = isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();

    rawEvents.push({
      id: `ev-pur-${p.id}`,
      inventoryItemId: matchedItem.id,
      date: p.purchaseDate,
      timestamp,
      sequencePriority: 2,
      movementType: 'purchase_receipt',
      referenceId: p.purchaseId,
      referenceDescription: `Purchase ${p.purchaseId} - ${supplierName} (${speciesName}${isYieldBasis ? ' · Yield basis' : ''})`,
      quantityIn: roundQty(receiptQty),
      quantityOut: 0,
      receiptValue,
      sourceRecord: p
    });
  });

  // 3. PURCHASE RETURNS (Priority 3 - Stock Out at cost it came in)
  const activeReturns = (purchaseReturns || []).filter((r) => !r.isVoided);
  activeReturns.forEach((pr) => {
    const origPurchase = activePurchases.find((p) => p.id === pr.purchaseId);
    if (!origPurchase) return;

    const matchedItem = findInventoryItemForPurchase(origPurchase, activeItems, mappings, speciesList);
    if (!matchedItem) return;

    // Original purchase rate per kg
    const origIncomingRate = origPurchase.weightKg > 0 ? origPurchase.totalCost / origPurchase.weightKg : origPurchase.ratePerKg;
    const returnQty = roundQty(pr.returnedWeightKg || 0);
    const returnValue = roundValue(pr.returnedValue || returnQty * origIncomingRate);

    const dateObj = new Date(pr.returnDate);
    const timestamp = isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();

    rawEvents.push({
      id: `ev-pr-${pr.id}`,
      inventoryItemId: matchedItem.id,
      date: pr.returnDate,
      timestamp,
      sequencePriority: 3,
      movementType: 'purchase_return',
      referenceId: pr.id,
      referenceDescription: `Purchase Return for ${origPurchase.purchaseId} (${pr.reason || 'Returned'})`,
      quantityIn: 0,
      quantityOut: returnQty,
      receiptValue: returnValue,
      fixedRate: roundRate(origIncomingRate),
      sourceRecord: pr
    });
  });

  // 4. STOCK ADJUSTMENTS & WASTAGE (Priority 4)
  const activeAdjustments = stockAdjustments.filter((a) => !a.isDeleted);
  activeAdjustments.forEach((adj) => {
    const item = itemMap.get(adj.inventoryItemId);
    if (!item) return;

    const dateObj = new Date(adj.date);
    const timestamp = isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();

    if (adj.quantityKg >= 0) {
      // Positive adjustment: stock gain
      rawEvents.push({
        id: `ev-adj-${adj.id}`,
        inventoryItemId: item.id,
        date: adj.date,
        timestamp,
        sequencePriority: 4,
        movementType: 'stock_adjustment',
        referenceId: adj.id,
        referenceDescription: `Stock Gain Adjustment (${adj.reason}): ${adj.remarks || ''}`,
        quantityIn: roundQty(adj.quantityKg),
        quantityOut: 0,
        fixedRate: adj.unitCost,
        receiptValue: roundValue(adj.totalValue || adj.quantityKg * adj.unitCost),
        sourceRecord: adj
      });
    } else {
      // Negative adjustment: wastage, shrinkage, damage
      rawEvents.push({
        id: `ev-adj-${adj.id}`,
        inventoryItemId: item.id,
        date: adj.date,
        timestamp,
        sequencePriority: 4,
        movementType: 'stock_adjustment',
        referenceId: adj.id,
        referenceDescription: `Stock Deduction (${adj.reason}): ${adj.remarks || ''}`,
        quantityIn: 0,
        quantityOut: roundQty(Math.abs(adj.quantityKg)),
        sourceRecord: adj
      });
    }
  });

  // 5. POSTED PHYSICAL STOCK COUNTS (Priority 4)
  const postedCounts = physicalCounts.filter((c) => c.status === 'posted');
  postedCounts.forEach((count) => {
    count.items.forEach((itemCount, idx) => {
      const item = itemMap.get(itemCount.inventoryItemId);
      if (!item) return;

      const varianceQty = roundQty(itemCount.varianceQuantityKg);
      if (Math.abs(varianceQty) < 0.001) return; // no variance

      exceptions.push({
        id: `exc-cnt-var-${count.id}-${idx}`,
        type: 'count_variance',
        severity: Math.abs(varianceQty) > 50 ? 'high' : 'medium',
        title: `Count Variance on ${item.name}`,
        description: `Physical count ${count.referenceNo} recorded ${itemCount.countedQuantityKg} Kg vs Book ${itemCount.bookQuantityKg} Kg (Variance: ${varianceQty > 0 ? '+' : ''}${varianceQty} Kg, ${roundValue(itemCount.varianceValue)} INR).`,
        referenceId: count.referenceNo,
        date: count.countDate,
        affectedItem: item.name,
        suggestedAction: 'Review count audit sheets and storehouse verification.'
      });

      const dateObj = new Date(count.countDate);
      const timestamp = isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();

      if (varianceQty > 0) {
        rawEvents.push({
          id: `ev-cnt-${count.id}-${idx}`,
          inventoryItemId: item.id,
          date: count.countDate,
          timestamp,
          sequencePriority: 4,
          movementType: 'physical_count_variance',
          referenceId: count.referenceNo,
          referenceDescription: `Physical Count Variance (+) Ref ${count.referenceNo}`,
          quantityIn: varianceQty,
          quantityOut: 0,
          receiptValue: roundValue(itemCount.varianceValue || varianceQty * itemCount.unitCost),
          fixedRate: roundRate(itemCount.unitCost),
          sourceRecord: count
        });
      } else {
        rawEvents.push({
          id: `ev-cnt-${count.id}-${idx}`,
          inventoryItemId: item.id,
          date: count.countDate,
          timestamp,
          sequencePriority: 4,
          movementType: 'physical_count_variance',
          referenceId: count.referenceNo,
          referenceDescription: `Physical Count Variance (-) Ref ${count.referenceNo}`,
          quantityIn: 0,
          quantityOut: Math.abs(varianceQty),
          sourceRecord: count
        });
      }
    });
  });

  // 6. SALES ISSUES (Priority 5 - Valued at Current Moving Weighted Average Cost)
  const activeSales = salesInvoices.filter((inv) => !inv.isVoided);
  const salesLineEventMapping: Array<{ eventId: string; line: SalesInvoiceLine; invoice: SalesInvoice; item: InventoryItem }> = [];

  activeSales.forEach((inv) => {
    inv.lineItems.forEach((line) => {
      const matchedItem = findInventoryItemForSalesLine(line, activeItems, mappings, speciesList);
      if (!matchedItem) {
        const prod = speciesMap.get(line.speciesId);
        const prodName = prod?.name || line.productDescription || line.speciesId;
        exceptions.push({
          id: `exc-unmapped-sale-${inv.id}-${line.id}`,
          type: 'unmapped_sale',
          severity: 'high',
          title: `Unmapped Sales Product: ${prodName}`,
          description: `Invoice ${inv.invoiceNo} line item "${prodName}" (${line.weightKg} Kg) is not mapped to any inventory item.`,
          referenceId: inv.invoiceNo,
          date: inv.invoiceDate,
          affectedItem: prodName,
          suggestedAction: `Create a mapping in Inventory Item Master linking sales product "${prodName}" to an inventory item.`
        });
        return;
      }

      const issueQty = roundQty(line.weightKg);
      const dateObj = new Date(inv.invoiceDate);
      const timestamp = isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();
      const eventId = `ev-sale-${inv.id}-${line.id}`;

      rawEvents.push({
        id: eventId,
        inventoryItemId: matchedItem.id,
        date: inv.invoiceDate,
        timestamp,
        sequencePriority: 5,
        movementType: 'sales_issue',
        referenceId: inv.invoiceNo,
        referenceDescription: `Export Invoice ${inv.invoiceNo} - ${inv.consigneeName || 'Consignee'} (${line.productDescription || matchedItem.name})`,
        quantityIn: 0,
        quantityOut: issueQty,
        sourceRecord: { line, invoice: inv }
      });

      salesLineEventMapping.push({ eventId, line, invoice: inv, item: matchedItem });
    });
  });

  // SORT ALL EVENTS CHRONOLOGICALLY
  // 1. Date ascending
  // 2. Sequence Priority ascending (Receipts processed before Issues on same day)
  // 3. Timestamp ascending as tie-breaker
  rawEvents.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.sequencePriority !== b.sequencePriority) return a.sequencePriority - b.sequencePriority;
    return a.timestamp - b.timestamp;
  });

  // GROUP EVENTS BY INVENTORY ITEM AND COMPUTE MOVING AVERAGE VALUATION
  const movementsByItem: Record<string, InventoryMovement[]> = {};
  const allComputedMovements: InventoryMovement[] = [];
  const movementValuationMap = new Map<string, { unitCost: number; movementValue: number }>();

  activeItems.forEach((item) => {
    const itemEvents = rawEvents.filter((e) => e.inventoryItemId === item.id);
    const itemMovements: InventoryMovement[] = [];

    let balanceQty = 0;
    let balanceValue = 0;
    let currentAverageCost = 0;

    itemEvents.forEach((ev) => {
      let rate = 0;
      let movementValue = 0;
      let isNegative = false;

      if (ev.quantityIn > 0) {
        // === RECEIPT (Stock In) ===
        // Formula: New Average Cost = (Value on hand + Receipt value) / (Qty on hand + Receipt qty)
        const incomingQty = ev.quantityIn;
        const incomingValue = ev.receiptValue !== undefined
          ? ev.receiptValue
          : roundValue(incomingQty * (ev.fixedRate || currentAverageCost));

        rate = incomingQty > 0 ? roundRate(incomingValue / incomingQty) : currentAverageCost;
        movementValue = incomingValue;

        const newBalanceQty = roundQty(balanceQty + incomingQty);
        const newBalanceValue = roundValue(balanceValue + incomingValue);

        if (newBalanceQty > 0) {
          currentAverageCost = roundRate(newBalanceValue / newBalanceQty);
        } else {
          currentAverageCost = rate;
        }

        balanceQty = newBalanceQty;
        balanceValue = newBalanceValue;
      } else if (ev.quantityOut > 0) {
        // === ISSUE (Stock Out) ===
        // Valued at current Moving Average Cost at that exact moment. Average cost remains unchanged!
        const outgoingQty = ev.quantityOut;
        rate = ev.fixedRate !== undefined ? ev.fixedRate : currentAverageCost;
        movementValue = roundValue(outgoingQty * rate);

        const newBalanceQty = roundQty(balanceQty - outgoingQty);

        // Check for negative stock
        if (newBalanceQty < 0) {
          isNegative = true;
          exceptions.push({
            id: `exc-neg-stock-${ev.id}`,
            type: 'negative_stock',
            severity: 'high',
            title: `Negative Stock on ${item.name}`,
            description: `Movement on ${ev.date} (${ev.referenceDescription}) caused balance to drop below zero to ${newBalanceQty} Kg.`,
            referenceId: ev.referenceId,
            date: ev.date,
            affectedItem: item.name,
            suggestedAction: 'Verify if a purchase receipt is missing or entered with a later date.'
          });
        }

        balanceQty = newBalanceQty;
        // Balance value = balance quantity * current average cost
        if (ev.movementType === 'purchase_return') {
          balanceValue = roundValue(Math.max(0, balanceValue - movementValue));
          currentAverageCost = balanceQty > 0 ? roundRate(balanceValue / balanceQty) : 0;
        } else {
          balanceValue = roundValue(balanceQty * currentAverageCost);
        }
      }

      const mov: InventoryMovement = {
        id: `mov-${ev.id}`,
        inventoryItemId: item.id,
        date: ev.date,
        timestamp: ev.timestamp,
        movementType: ev.movementType,
        referenceId: ev.referenceId,
        referenceDescription: ev.referenceDescription,
        quantityIn: ev.quantityIn,
        quantityOut: ev.quantityOut,
        rate,
        movementValue,
        balanceQuantity: balanceQty,
        balanceValue,
        averageCost: currentAverageCost,
        isNegativeStock: isNegative
      };

      itemMovements.push(mov);
      allComputedMovements.push(mov);
      movementValuationMap.set(ev.id, { unitCost: rate, movementValue });
    });

    movementsByItem[item.id] = itemMovements;
  });

  // SORT CONSOLIDATED MOVEMENTS
  allComputedMovements.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.timestamp - b.timestamp;
  });

  // GENERATE CURRENT STOCK POSITIONS
  const stockPositions: StockPositionItem[] = activeItems.map((item) => {
    const itemMovs = movementsByItem[item.id] || [];
    const latestMov = itemMovs.length > 0 ? itemMovs[itemMovs.length - 1] : null;

    const qtyOnHand = latestMov ? latestMov.balanceQuantity : 0;
    const avgCost = latestMov ? latestMov.averageCost : 0;
    const totalVal = latestMov ? latestMov.balanceValue : 0;

    // Calculate Average Daily Sales (issues over last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];

    const recentIssues = itemMovs
      .filter((m) => m.movementType === 'sales_issue' && m.date >= thirtyDaysStr)
      .reduce((sum, m) => sum + m.quantityOut, 0);

    const avgDailySales = roundQty(recentIssues / 30);
    const daysOfCover = avgDailySales > 0 ? Math.round(qtyOnHand / avgDailySales) : qtyOnHand > 0 ? 999 : 0;

    let stockStatus: StockPositionItem['stockStatus'] = 'Normal';
    if (qtyOnHand < 0) {
      stockStatus = 'Negative Stock';
    } else if (qtyOnHand === 0) {
      stockStatus = 'Out of Stock';
    } else if (qtyOnHand < item.minimumStockQuantity) {
      stockStatus = 'Low Stock';
    }

    return {
      inventoryItemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      category: item.category,
      unit: item.unit,
      quantityBasis: item.quantityBasis,
      quantityOnHand: qtyOnHand,
      averageCostPerKg: avgCost,
      totalStockValue: totalVal,
      minimumStockQuantity: item.minimumStockQuantity,
      stockStatus,
      averageDailySalesKg: avgDailySales,
      daysOfCover,
      lastMovementDate: latestMov?.date
    };
  });

  // GENERATE MOVEMENT SUMMARY
  const movementSummary: MovementSummaryItem[] = activeItems.map((item) => {
    const itemMovs = movementsByItem[item.id] || [];
    const openingMov = itemMovs.find((m) => m.movementType === 'opening_stock');

    const openingQty = openingMov ? openingMov.quantityIn : 0;
    const openingValue = openingMov ? openingMov.movementValue : 0;

    const receipts = itemMovs.filter((m) => m.movementType === 'purchase_receipt');
    const returns = itemMovs.filter((m) => m.movementType === 'purchase_return');
    const grossReceiptsQty = receipts.reduce((s, m) => s + m.quantityIn, 0);
    const returnsQty = returns.reduce((s, m) => s + m.quantityOut, 0);
    const receiptsQty = roundQty(grossReceiptsQty - returnsQty);

    const grossReceiptsValue = receipts.reduce((s, m) => s + m.movementValue, 0);
    const returnsValue = returns.reduce((s, m) => s + m.movementValue, 0);
    const receiptsValue = roundValue(grossReceiptsValue - returnsValue);

    const issues = itemMovs.filter((m) => m.movementType === 'sales_issue');
    const issuesQty = roundQty(issues.reduce((s, m) => s + m.quantityOut, 0));
    const issuesValue = roundValue(issues.reduce((s, m) => s + m.movementValue, 0));

    const adjustments = itemMovs.filter(
      (m) => m.movementType === 'stock_adjustment' || m.movementType === 'physical_count_variance'
    );
    const adjInQty = adjustments.reduce((s, m) => s + m.quantityIn, 0);
    const adjOutQty = adjustments.reduce((s, m) => s + m.quantityOut, 0);
    const adjustmentsQty = roundQty(adjInQty - adjOutQty);

    const adjInVal = adjustments.reduce((s, m) => (m.quantityIn > 0 ? s + m.movementValue : s), 0);
    const adjOutVal = adjustments.reduce((s, m) => (m.quantityOut > 0 ? s + m.movementValue : s), 0);
    const adjustmentsValue = roundValue(adjInVal - adjOutVal);

    const latest = itemMovs.length > 0 ? itemMovs[itemMovs.length - 1] : null;
    const closingQty = latest ? latest.balanceQuantity : 0;
    const closingValue = latest ? latest.balanceValue : 0;
    const closingAverageCost = latest ? latest.averageCost : 0;

    return {
      inventoryItemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      unit: item.unit,
      openingQty,
      openingValue,
      receiptsQty,
      receiptsValue,
      issuesQty,
      issuesValue,
      adjustmentsQty,
      adjustmentsValue,
      closingQty,
      closingValue,
      closingAverageCost
    };
  });

  // GENERATE COGS & GROSS MARGIN REPORT
  const cogsReport: CogsReportItem[] = salesLineEventMapping.map(({ eventId, line, invoice, item }) => {
    const valuation = movementValuationMap.get(eventId) || { unitCost: 0, movementValue: 0 };
    const customer = customerMap.get(invoice.consigneeId);
    const custName = customer?.name || invoice.consigneeName || 'Foreign Buyer';
    const prod = speciesMap.get(line.speciesId);
    const prodName = prod?.name || line.productDescription || item.name;

    // Selling Value in INR (use realized INR when settled, otherwise amount in USD * exchange rate)
    let saleValueINR = roundValue(line.amountCurrency * invoice.exchangeRate);
    if (invoice.totalRealizedINR > 0 && invoice.totalAmountCurrency > 0) {
      const lineProportion = line.amountCurrency / invoice.totalAmountCurrency;
      saleValueINR = roundValue(invoice.totalRealizedINR * lineProportion);
    }

    const totalCogsINR = roundValue(valuation.movementValue);
    const grossProfitINR = roundValue(saleValueINR - totalCogsINR);
    const grossMarginPct = saleValueINR > 0 ? roundRate((grossProfitINR / saleValueINR) * 100) : 0;

    return {
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      invoiceDate: invoice.invoiceDate,
      customerId: invoice.consigneeId,
      customerName: custName,
      productId: line.speciesId,
      productName: prodName,
      inventoryItemId: item.id,
      inventoryItemName: item.name,
      quantityKg: roundQty(line.weightKg),
      inventoryUnitCost: roundRate(valuation.unitCost),
      totalCogsINR,
      saleValueCurrency: line.amountCurrency,
      saleValueINR,
      grossProfitINR,
      grossMarginPct
    };
  });

  // LOWER OF COST AND NRV CHECK
  const nrvChecks: NrvCheckItem[] = stockPositions.map((pos) => {
    // Find latest sales line for this item
    const matchingCogs = cogsReport.filter((c) => c.inventoryItemId === pos.inventoryItemId);
    let latestSalePricePerKgINR = 0;

    if (matchingCogs.length > 0) {
      // Sort by date descending
      matchingCogs.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
      const latest = matchingCogs[0];
      latestSalePricePerKgINR = latest.quantityKg > 0 ? roundRate(latest.saleValueINR / latest.quantityKg) : 0;
    }

    const nrvImpaired = latestSalePricePerKgINR > 0 && pos.averageCostPerKg > latestSalePricePerKgINR;
    const variancePerKg = nrvImpaired ? roundRate(pos.averageCostPerKg - latestSalePricePerKgINR) : 0;
    const totalPotentialImpairment = nrvImpaired ? roundValue(variancePerKg * Math.max(0, pos.quantityOnHand)) : 0;

    return {
      inventoryItemId: pos.inventoryItemId,
      itemCode: pos.itemCode,
      itemName: pos.itemName,
      quantityOnHand: pos.quantityOnHand,
      averageCostPerKg: pos.averageCostPerKg,
      latestSalePricePerKgINR,
      nrvImpaired,
      variancePerKg,
      totalPotentialImpairment
    };
  });

  // INVENTORY RECONCILIATION
  const totalOpeningValue = roundValue(movementSummary.reduce((s, m) => s + m.openingValue, 0));
  const totalReceiptsValue = roundValue(movementSummary.reduce((s, m) => s + m.receiptsValue, 0));
  const totalIssuesValue = roundValue(movementSummary.reduce((s, m) => s + m.issuesValue, 0));
  const totalAdjustmentsValue = roundValue(movementSummary.reduce((s, m) => s + m.adjustmentsValue, 0));
  const totalClosingValue = roundValue(movementSummary.reduce((s, m) => s + m.closingValue, 0));
  const totalClosingQty = roundQty(movementSummary.reduce((s, m) => s + m.closingQty, 0));

  const formulaCalc = roundValue(totalOpeningValue + totalReceiptsValue - totalIssuesValue + totalAdjustmentsValue);
  const formulaCheck = Math.abs(formulaCalc - totalClosingValue) < 0.05;

  // Tie-outs with Purchase and Sales Modules
  const totalReturnsCost = roundValue(
    (purchaseReturns || [])
      .filter((r) => !r.isVoided)
      .reduce((s, r) => {
        if (r.returnedValue !== undefined && r.returnedValue > 0) return s + r.returnedValue;
        const orig = activePurchases.find((p) => p.id === r.purchaseId);
        const rate = orig && orig.weightKg > 0 ? orig.totalCost / orig.weightKg : (orig?.ratePerKg || 0);
        return s + roundValue((r.returnedWeightKg || 0) * rate);
      }, 0)
  );
  const purchaseModuleTotalCost = roundValue(
    activePurchases.reduce((s, p) => s + p.totalCost, 0) - totalReturnsCost
  );
  const purchaseVariance = roundValue(Math.abs(totalReceiptsValue - purchaseModuleTotalCost));
  const purchaseModuleAgreed = purchaseVariance < 0.05;

  const salesModuleTotalWeightKg = roundQty(activeSales.reduce((s, inv) => s + inv.totalWeightKg, 0));
  const totalIssuesQty = roundQty(movementSummary.reduce((s, m) => s + m.issuesQty, 0));
  const salesVarianceKg = roundQty(Math.abs(totalIssuesQty - salesModuleTotalWeightKg));
  const salesModuleAgreed = salesVarianceKg < 0.05;

  const status: InventoryReconciliation['status'] = formulaCheck && purchaseModuleAgreed && salesModuleAgreed
    ? 'Passed'
    : 'Variance Detected';

  const reconciliation: InventoryReconciliation = {
    period: 'All Time / FY Cumulative',
    openingValue: totalOpeningValue,
    receiptsValue: totalReceiptsValue,
    issuesValue: totalIssuesValue,
    adjustmentsValue: totalAdjustmentsValue,
    closingValue: totalClosingValue,
    formulaCheck,
    purchaseModuleTotalCost,
    purchaseModuleAgreed,
    purchaseVariance,
    salesModuleTotalWeightKg,
    salesModuleAgreed,
    salesVarianceKg,
    status
  };

  // Overall totals
  const totalCogsValue = roundValue(cogsReport.reduce((s, c) => s + c.totalCogsINR, 0));
  const totalSalesValueINR = roundValue(cogsReport.reduce((s, c) => s + c.saleValueINR, 0));
  const totalGrossProfitINR = roundValue(totalSalesValueINR - totalCogsValue);
  const overallGrossMarginPct = totalSalesValueINR > 0 ? roundRate((totalGrossProfitINR / totalSalesValueINR) * 100) : 0;

  return {
    movementsByItem,
    allMovements: allComputedMovements,
    stockPositions,
    movementSummary,
    cogsReport,
    nrvChecks,
    reconciliation,
    exceptions,
    totalClosingValue,
    totalClosingQty,
    totalCogsValue,
    totalSalesValueINR,
    overallGrossMarginPct
  };
}
