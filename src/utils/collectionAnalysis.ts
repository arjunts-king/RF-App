import type { SalesInvoice, Customer } from '../types/index.ts';

export interface InvoiceCollectionMetric {
  invoiceId: string;
  invoiceNo: string;
  invoiceDate: string;
  consigneeId: string;
  consigneeName: string;
  buyerName?: string;
  country: string;
  currency: string;
  totalAmountCurrency: number;
  bankPreDeterminedExchangeRate: number;
  advanceExchangeRate: number;
  balanceExchangeRate: number;
  
  // Advance specifics
  advanceTermsUSD?: number;
  advanceReceivedCurrency: number;
  advanceShortfallUSD?: number;
  advanceReceivedDate?: string;
  advanceBankRef?: string;
  outstandingAfterAdvanceCurrency: number;
  outstandingAfterAdvanceINR: number;
  advancePct: number;
  outstandingAfterAdvancePct: number;
  
  // Balance specifics
  balanceActualPriceUSD?: number;
  balancePaymentAmountCurrency: number;
  balanceShortfallUSD?: number;
  balancePaymentDate?: string;
  balanceBankRef?: string;
  
  // Realization status & totals
  totalShortfallUSD?: number;
  totalRealizedCurrency: number;
  totalRealizedINR: number;
  balanceRealizationCurrency: number;
  realizationStatus: string;
  
  // Turnaround & Velocity
  daysToAdvance: number | null; // invoiceDate -> advanceReceivedDate
  daysAdvanceToBalance: number | null; // advanceReceivedDate -> balancePaymentDate
  totalCollectionDays: number | null; // invoiceDate -> final settlement date
  ageDays: number; // invoiceDate -> asOfDate (for outstanding)
  ageingBucket: '0-30 Days' | '31-60 Days' | '61-90 Days' | '90+ Days';
  collectionVelocityRating: 'Prompt' | 'Standard' | 'Delayed' | 'Critical';
}

export interface ConsigneeCollectionSummary {
  consigneeId: string;
  consigneeName: string;
  country: string;
  totalInvoicesCount: number;
  realizedInvoicesCount: number;
  outstandingInvoicesCount: number;
  totalInvoicedUSD: number;
  totalAdvanceUSD: number;
  totalOutstandingAfterAdvanceUSD: number;
  totalBalanceUSD: number;
  totalCollectedUSD: number;
  totalOutstandingUSD: number;
  totalOutstandingINR: number;
  totalShortfallUSD: number;
  avgDaysToAdvance: number | null;
  avgDaysAdvanceToBalance: number | null;
  avgCollectionDays: number | null; // Unweighted DSO in days
  weightedAvgCollectionDays: number | null; // USD-weighted DSO
  collectionEfficiencyPct: number; // (Collected / Invoiced) * 100
  collectionHealth: 'Prompt' | 'Standard' | 'Delayed' | 'Critical';
}

export interface ReceivablesCollectionAnalysis {
  asOfDate: string;
  totalActiveInvoices: number;
  totalRealizedInvoices: number;
  totalPartiallyRealizedInvoices: number;
  totalNotRealizedInvoices: number;
  
  totalInvoicedUSD: number;
  totalAdvanceUSD: number;
  totalOutstandingAfterAdvanceUSD: number;
  totalBalanceUSD: number;
  totalCollectedUSD: number;
  totalOutstandingUSD: number;
  totalOutstandingINR: number;
  totalShortfallUSD: number;
  collectionEfficiencyIndex: number;
  
  // DSO & Turnaround Metrics
  averageCollectionPeriodDays: number | null;
  weightedCollectionPeriodDays: number | null;
  averageDaysToAdvance: number | null;
  averageDaysAdvanceToBalance: number | null;
  
  // Ageing of Outstanding Receivables
  ageingBuckets: {
    '0-30 Days': { count: number; balanceUSD: number; balanceINR: number; pct: number };
    '31-60 Days': { count: number; balanceUSD: number; balanceINR: number; pct: number };
    '61-90 Days': { count: number; balanceUSD: number; balanceINR: number; pct: number };
    '90+ Days': { count: number; balanceUSD: number; balanceINR: number; pct: number };
  };
  
  consigneeBreakdown: ConsigneeCollectionSummary[];
  invoiceMetrics: InvoiceCollectionMetric[];
}

/**
 * Safely parse a date string supporting ISO (YYYY-MM-DD) and Indian/Export formats (DD-MM-YYYY).
 */
export function parseDateSafe(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Calculate difference in calendar days between two dates.
 */
export function calculateDaysBetween(startDateStr?: string | null, endDateStr?: string | null): number | null {
  const start = parseDateSafe(startDateStr);
  const end = parseDateSafe(endDateStr);
  if (!start || !end) return null;
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Directly calculate how much is outstanding when an advance is recorded against a total invoice amount.
 */
export function computeOutstandingFromAdvance(
  totalInvoiceAmount: number,
  advanceReceived: number,
  exchangeRate: number = 1
): {
  outstandingAfterAdvanceCurrency: number;
  outstandingAfterAdvanceINR: number;
  advancePercentage: number;
  outstandingPercentage: number;
} {
  const total = Number(totalInvoiceAmount) || 0;
  const adv = Number(advanceReceived) || 0;
  const outstandingUSD = Math.max(0, Number((total - adv).toFixed(2)));
  const rate = Number(exchangeRate) || 1;
  const outstandingINR = Number((outstandingUSD * rate).toFixed(2));
  const advancePercentage = total > 0 ? Number(((adv / total) * 100).toFixed(1)) : 0;
  const outstandingPercentage = total > 0 ? Number(((outstandingUSD / total) * 100).toFixed(1)) : 0;

  return {
    outstandingAfterAdvanceCurrency: outstandingUSD,
    outstandingAfterAdvanceINR: outstandingINR,
    advancePercentage,
    outstandingPercentage
  };
}

/**
 * Comprehensive calculation of Receivables Collection Period Analysis.
 */
export function calculateReceivablesCollectionAnalysis(
  invoices: SalesInvoice[],
  customers: Customer[],
  asOfDate: Date = new Date()
): ReceivablesCollectionAnalysis {
  const activeInvoices = invoices.filter((inv) => !inv.isVoided);
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const asOfDateStr = asOfDate.toISOString().split('T')[0];

  const ageingBuckets = {
    '0-30 Days': { count: 0, balanceUSD: 0, balanceINR: 0, pct: 0 },
    '31-60 Days': { count: 0, balanceUSD: 0, balanceINR: 0, pct: 0 },
    '61-90 Days': { count: 0, balanceUSD: 0, balanceINR: 0, pct: 0 },
    '90+ Days': { count: 0, balanceUSD: 0, balanceINR: 0, pct: 0 }
  };

  const invoiceMetrics: InvoiceCollectionMetric[] = [];
  const consigneeGroups = new Map<string, InvoiceCollectionMetric[]>();

  let totalInvoicedUSD = 0;
  let totalAdvanceUSD = 0;
  let totalBalanceUSD = 0;
  let totalCollectedUSD = 0;
  let totalOutstandingUSD = 0;
  let totalOutstandingINR = 0;

  let realizedCount = 0;
  let partialCount = 0;
  let notRealizedCount = 0;

  activeInvoices.forEach((inv) => {
    const cust = customerMap.get(inv.consigneeId);
    const buyer = inv.buyerId ? customerMap.get(inv.buyerId) : undefined;
    const rate = inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5;
    const advanceRate = inv.advanceExchangeRate || rate;
    const balanceRate = inv.balanceExchangeRate || rate;
    const advUSD = inv.advanceReceivedCurrency || 0;
    const balUSD = inv.balancePaymentAmountCurrency || 0;
    const totalCollected = inv.totalRealizedCurrency || (advUSD + balUSD);
    const outstandingUSD = inv.balanceRealizationCurrency;
    const outstandingINR = Number((outstandingUSD * balanceRate).toFixed(2));

    totalInvoicedUSD += inv.totalAmountCurrency;
    totalAdvanceUSD += advUSD;
    totalBalanceUSD += balUSD;
    totalCollectedUSD += totalCollected;
    totalOutstandingUSD += outstandingUSD;
    totalOutstandingINR += outstandingINR;

    if (inv.realizationStatus === 'Fully Realized') realizedCount++;
    else if (inv.realizationStatus === 'Partially Realized') partialCount++;
    else notRealizedCount++;

    // Direct calculation of outstanding after advance
    const outstandingAfterAdv = computeOutstandingFromAdvance(inv.totalAmountCurrency, advUSD, rate);

    // Days to advance (from invoice date)
    let daysToAdvance: number | null = null;
    if (inv.advanceReceivedDate && advUSD > 0) {
      const d = calculateDaysBetween(inv.invoiceDate, inv.advanceReceivedDate);
      if (d !== null) daysToAdvance = Math.max(0, d);
    }

    // Days from advance to balance
    let daysAdvanceToBalance: number | null = null;
    if (inv.advanceReceivedDate && inv.balancePaymentDate && advUSD > 0 && balUSD > 0) {
      const d = calculateDaysBetween(inv.advanceReceivedDate, inv.balancePaymentDate);
      if (d !== null) daysAdvanceToBalance = Math.max(0, d);
    }

    // Total collection days (for realized or settled portions)
    let totalCollectionDays: number | null = null;
    const finalSettlementDate = inv.balancePaymentDate || inv.lastRealizationDate || (outstandingUSD <= 0.05 ? inv.advanceReceivedDate : undefined);
    if (finalSettlementDate) {
      const d = calculateDaysBetween(inv.invoiceDate, finalSettlementDate);
      if (d !== null) totalCollectionDays = Math.max(0, d);
    }

    // Ageing for outstanding balance
    const ageDays = Math.max(0, calculateDaysBetween(inv.invoiceDate, asOfDateStr) || 0);

    let bucket: '0-30 Days' | '31-60 Days' | '61-90 Days' | '90+ Days' = '0-30 Days';
    if (ageDays > 90) bucket = '90+ Days';
    else if (ageDays > 60) bucket = '61-90 Days';
    else if (ageDays > 30) bucket = '31-60 Days';

    if (outstandingUSD > 0.05) {
      ageingBuckets[bucket].count += 1;
      ageingBuckets[bucket].balanceUSD += outstandingUSD;
      ageingBuckets[bucket].balanceINR += outstandingINR;
    }

    // Rating
    const metricDays = totalCollectionDays !== null ? totalCollectionDays : ageDays;
    let rating: 'Prompt' | 'Standard' | 'Delayed' | 'Critical' = 'Standard';
    if (metricDays <= 20) rating = 'Prompt';
    else if (metricDays <= 40) rating = 'Standard';
    else if (metricDays <= 60) rating = 'Delayed';
    else rating = 'Critical';

    const metric: InvoiceCollectionMetric = {
      invoiceId: inv.id,
      invoiceNo: inv.invoiceNo,
      invoiceDate: inv.invoiceDate,
      consigneeId: inv.consigneeId,
      consigneeName: cust?.name || inv.consigneeName || inv.buyerName || 'Overseas Customer',
      buyerName: buyer?.name || inv.buyerName || cust?.name || 'Overseas Customer',
      country: cust?.country || inv.countryOfDestination || 'Global Export',
      currency: inv.currency,
      totalAmountCurrency: inv.totalAmountCurrency,
      bankPreDeterminedExchangeRate: rate,
      advanceExchangeRate: advanceRate,
      balanceExchangeRate: balanceRate,
      advanceTermsUSD: inv.advanceTermsUSD,
      advanceReceivedCurrency: advUSD,
      advanceShortfallUSD: inv.advanceShortfallUSD,
      advanceReceivedDate: inv.advanceReceivedDate,
      advanceBankRef: inv.advanceBankRef,
      outstandingAfterAdvanceCurrency: outstandingAfterAdv.outstandingAfterAdvanceCurrency,
      outstandingAfterAdvanceINR: outstandingAfterAdv.outstandingAfterAdvanceINR,
      advancePct: outstandingAfterAdv.advancePercentage,
      outstandingAfterAdvancePct: outstandingAfterAdv.outstandingPercentage,
      balanceActualPriceUSD: inv.balanceActualPriceUSD,
      balancePaymentAmountCurrency: balUSD,
      balanceShortfallUSD: inv.balanceShortfallUSD,
      balancePaymentDate: inv.balancePaymentDate,
      balanceBankRef: inv.balanceBankRef,
      totalShortfallUSD: inv.totalShortfallUSD,
      totalRealizedCurrency: totalCollected,
      totalRealizedINR: inv.totalRealizedINR || Number((totalCollected * rate).toFixed(2)),
      balanceRealizationCurrency: outstandingUSD,
      realizationStatus: inv.realizationStatus,
      daysToAdvance,
      daysAdvanceToBalance,
      totalCollectionDays,
      ageDays,
      ageingBucket: bucket,
      collectionVelocityRating: rating
    };

    invoiceMetrics.push(metric);

    if (!consigneeGroups.has(inv.consigneeId)) {
      consigneeGroups.set(inv.consigneeId, []);
    }
    consigneeGroups.get(inv.consigneeId)!.push(metric);
  });

  // Calculate ageing percentages
  if (totalOutstandingUSD > 0) {
    (Object.keys(ageingBuckets) as (keyof typeof ageingBuckets)[]).forEach((k) => {
      ageingBuckets[k].pct = Number(((ageingBuckets[k].balanceUSD / totalOutstandingUSD) * 100).toFixed(1));
    });
  }

  // Calculate global DSO & Turnaround
  const realizedMetrics = invoiceMetrics.filter((m) => m.totalCollectionDays !== null);
  const averageCollectionPeriodDays =
    realizedMetrics.length > 0
      ? Math.round(realizedMetrics.reduce((s, m) => s + (m.totalCollectionDays || 0), 0) / realizedMetrics.length)
      : null;

  const totalRealizedUSDVolume = realizedMetrics.reduce((s, m) => s + m.totalAmountCurrency, 0);
  const weightedCollectionPeriodDays =
    totalRealizedUSDVolume > 0
      ? Math.round(
          realizedMetrics.reduce((s, m) => s + (m.totalCollectionDays || 0) * m.totalAmountCurrency, 0) /
            totalRealizedUSDVolume
        )
      : null;

  const advanceMetrics = invoiceMetrics.filter((m) => m.daysToAdvance !== null);
  const averageDaysToAdvance =
    advanceMetrics.length > 0
      ? Math.round(advanceMetrics.reduce((s, m) => s + (m.daysToAdvance || 0), 0) / advanceMetrics.length)
      : null;

  const balanceMetrics = invoiceMetrics.filter((m) => m.daysAdvanceToBalance !== null);
  const averageDaysAdvanceToBalance =
    balanceMetrics.length > 0
      ? Math.round(balanceMetrics.reduce((s, m) => s + (m.daysAdvanceToBalance || 0), 0) / balanceMetrics.length)
      : null;

  const collectionEfficiencyIndex =
    totalInvoicedUSD > 0 ? Number(((totalCollectedUSD / totalInvoicedUSD) * 100).toFixed(1)) : 0;

  // Consignee summaries
  const consigneeBreakdown: ConsigneeCollectionSummary[] = Array.from(consigneeGroups.entries()).map(
    ([custId, list]) => {
      const cust = customerMap.get(custId);
      const totalInvoiced = list.reduce((s, m) => s + m.totalAmountCurrency, 0);
      const totalAdv = list.reduce((s, m) => s + m.advanceReceivedCurrency, 0);
      const totalBal = list.reduce((s, m) => s + m.balancePaymentAmountCurrency, 0);
      const totalCol = list.reduce((s, m) => s + m.totalRealizedCurrency, 0);
      const totalOutUSD = list.reduce((s, m) => s + m.balanceRealizationCurrency, 0);
      const totalOutINR = list.reduce(
        (s, m) => s + m.balanceRealizationCurrency * m.bankPreDeterminedExchangeRate,
        0
      );

      const realInvs = list.filter((m) => m.totalCollectionDays !== null);
      const avgColDays =
        realInvs.length > 0
          ? Math.round(realInvs.reduce((s, m) => s + (m.totalCollectionDays || 0), 0) / realInvs.length)
          : null;

      const realUSD = realInvs.reduce((s, m) => s + m.totalAmountCurrency, 0);
      const weightedAvgColDays =
        realUSD > 0
          ? Math.round(
              realInvs.reduce((s, m) => s + (m.totalCollectionDays || 0) * m.totalAmountCurrency, 0) / realUSD
            )
          : null;

      const advList = list.filter((m) => m.daysToAdvance !== null);
      const avgDaysAdv =
        advList.length > 0
          ? Math.round(advList.reduce((s, m) => s + (m.daysToAdvance || 0), 0) / advList.length)
          : null;

      const balList = list.filter((m) => m.daysAdvanceToBalance !== null);
      const avgDaysBal =
        balList.length > 0
          ? Math.round(balList.reduce((s, m) => s + (m.daysAdvanceToBalance || 0), 0) / balList.length)
          : null;

      const colEff = totalInvoiced > 0 ? Number(((totalCol / totalInvoiced) * 100).toFixed(1)) : 0;

      // Determine health
      const refDays = avgColDays !== null ? avgColDays : list[0]?.ageDays || 30;
      let health: 'Prompt' | 'Standard' | 'Delayed' | 'Critical' = 'Standard';
      if (refDays <= 20) health = 'Prompt';
      else if (refDays <= 40) health = 'Standard';
      else if (refDays <= 60) health = 'Delayed';
      else health = 'Critical';

      return {
        consigneeId: custId,
        consigneeName: cust?.name || list[0]?.consigneeName || 'Overseas Customer',
        country: cust?.country || list[0]?.country || 'Global Export',
        totalInvoicesCount: list.length,
        realizedInvoicesCount: list.filter((m) => m.realizationStatus === 'Fully Realized').length,
        outstandingInvoicesCount: list.filter((m) => m.balanceRealizationCurrency > 0.05).length,
        totalInvoicedUSD: totalInvoiced,
        totalAdvanceUSD: totalAdv,
        totalOutstandingAfterAdvanceUSD: Math.max(0, totalInvoiced - totalAdv),
        totalBalanceUSD: totalBal,
        totalCollectedUSD: totalCol,
        totalOutstandingUSD: totalOutUSD,
        totalOutstandingINR: totalOutINR,
        totalShortfallUSD: list.reduce((s, m) => s + (m.totalShortfallUSD || 0), 0),
        avgDaysToAdvance: avgDaysAdv,
        avgDaysAdvanceToBalance: avgDaysBal,
        avgCollectionDays: avgColDays,
        weightedAvgCollectionDays: weightedAvgColDays,
        collectionEfficiencyPct: colEff,
        collectionHealth: health
      };
    }
  ).sort((a, b) => b.totalOutstandingUSD - a.totalOutstandingUSD);

  return {
    asOfDate: asOfDateStr,
    totalActiveInvoices: activeInvoices.length,
    totalRealizedInvoices: realizedCount,
    totalPartiallyRealizedInvoices: partialCount,
    totalNotRealizedInvoices: notRealizedCount,
    totalInvoicedUSD,
    totalAdvanceUSD,
    totalOutstandingAfterAdvanceUSD: Math.max(0, totalInvoicedUSD - totalAdvanceUSD),
    totalBalanceUSD,
    totalCollectedUSD,
    totalOutstandingUSD,
    totalOutstandingINR,
    totalShortfallUSD: invoiceMetrics.reduce((s, m) => s + (m.totalShortfallUSD || 0), 0),
    collectionEfficiencyIndex,
    averageCollectionPeriodDays,
    weightedCollectionPeriodDays,
    averageDaysToAdvance,
    averageDaysAdvanceToBalance,
    ageingBuckets,
    consigneeBreakdown,
    invoiceMetrics
  };
}
