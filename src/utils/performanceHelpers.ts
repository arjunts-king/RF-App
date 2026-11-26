import * as XLSX from 'xlsx';
import {
  PerformanceExpenseEntry,
  PerformanceSalesEntry,
  PerformanceFilters,
  Purchase,
  Species,
  PeriodCloseLock,
} from '../types';

export function formatINR(amount: number, showBracketsForNegative = false): string {
  const num = Number(amount) || 0;
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (num < 0) {
    return showBracketsForNegative ? `(₹${formatted})` : `-₹${formatted}`;
  }
  return `₹${formatted}`;
}

export function formatUSD(amount: number): string {
  const num = Number(amount) || 0;
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDDMMYYYY(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('T')[0].split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export function isDateInLockedPeriod(dateStr: string, periodLocks: PeriodCloseLock[]): PeriodCloseLock | undefined {
  if (!dateStr || !periodLocks || periodLocks.length === 0) return undefined;
  const ym = dateStr.slice(0, 7); // YYYY-MM
  return periodLocks.find((l) => l.period === ym && (l.status === 'locked' || !l.status));
}

export function applySharedFiltersToExpenses(
  entries: PerformanceExpenseEntry[],
  filters: PerformanceFilters,
  profitByInvoiceHead?: Map<string, number>
): PerformanceExpenseEntry[] {
  return entries.filter((e) => {
    if (e.isDeleted || e.isVoided) return false;
    if (filters.dateFrom && e.invoiceDate < filters.dateFrom) return false;
    if (filters.dateTo && e.invoiceDate > filters.dateTo) return false;
    if (filters.financialYear && e.financialYear && e.financialYear !== filters.financialYear) return false;
    if (filters.month && !e.invoiceDate.startsWith(filters.month)) return false;
    if (filters.speciesHeadIds.length > 0 && !filters.speciesHeadIds.includes(e.speciesHeadId)) return false;
    if (filters.customerIds.length > 0 && !filters.customerIds.includes(e.customerId)) return false;
    if (filters.invoiceNumbers.length > 0 && !filters.invoiceNumbers.includes(e.invoiceNo)) return false;
    if (filters.portIds && filters.portIds.length > 0) {
      const matchPort =
        (e.portOfLoadingId && filters.portIds.includes(e.portOfLoadingId)) ||
        (e.portOfDischargeId && filters.portIds.includes(e.portOfDischargeId));
      if (!matchPort) return false;
    }
    if (filters.expenseTypes && filters.expenseTypes.length > 0) {
      const hasAny = filters.expenseTypes.some((t) => Number((e as any)[t]) > 0);
      if (!hasAny) return false;
    }
    if (filters.expensesStatus === 'pending' && e.grandTotal > 0) return false;
    if (filters.expensesStatus === 'complete' && e.grandTotal <= 0) return false;
    if (filters.profitLoss !== 'all' && profitByInvoiceHead) {
      const profit = profitByInvoiceHead.get(`${e.invoiceId}__${e.speciesHeadId}`) ?? 0;
      if (filters.profitLoss === 'profit' && profit < 0) return false;
      if (filters.profitLoss === 'loss' && profit >= 0) return false;
    }
    return true;
  });
}

export function applySharedFiltersToSales(
  entries: PerformanceSalesEntry[],
  filters: PerformanceFilters,
  profitByInvoiceHead?: Map<string, number>
): PerformanceSalesEntry[] {
  return entries.filter((e) => {
    if (e.isDeleted || e.isVoided) return false;
    if (filters.dateFrom && e.invoiceDate < filters.dateFrom) return false;
    if (filters.dateTo && e.invoiceDate > filters.dateTo) return false;
    if (filters.financialYear && e.financialYear && e.financialYear !== filters.financialYear) return false;
    if (filters.month && !e.invoiceDate.startsWith(filters.month)) return false;
    if (filters.speciesHeadIds.length > 0 && !filters.speciesHeadIds.includes(e.speciesHeadId)) return false;
    if (filters.customerIds.length > 0 && !filters.customerIds.includes(e.customerId)) return false;
    if (filters.invoiceNumbers.length > 0 && !filters.invoiceNumbers.includes(e.invoiceNo)) return false;
    if (filters.portIds && filters.portIds.length > 0) {
      if (!e.portOfDischargeId || !filters.portIds.includes(e.portOfDischargeId)) return false;
    }
    if (filters.drawbackStatus === 'pending' && e.drawbackPending <= 0) return false;
    if (filters.drawbackStatus === 'received' && e.drawbackReceived <= 0) return false;
    if (filters.rodtepStatus === 'pending' && e.rodtepPending <= 0) return false;
    if (filters.rodtepStatus === 'received' && e.rodtepReceived <= 0) return false;
    if (filters.profitLoss !== 'all' && profitByInvoiceHead) {
      const profit = profitByInvoiceHead.get(`${e.invoiceId}__${e.speciesHeadId}`) ?? 0;
      if (filters.profitLoss === 'profit' && profit < 0) return false;
      if (filters.profitLoss === 'loss' && profit >= 0) return false;
    }
    return true;
  });
}

export function getPurchaseHeadId(
  p: Purchase,
  purchaseSpeciesMap: Map<string, Species>,
  speciesByNameMap: Map<string, Species>
): string {
  const sp = purchaseSpeciesMap.get(p.speciesId) || speciesByNameMap.get(p.speciesId);
  return sp?.speciesHeadId || '__unmapped__';
}

export function exportExpenseAnalysisExcel(entries: PerformanceExpenseEntry[]): void {
  const totals = entries.reduce(
    (acc, e) => ({
      carton: acc.carton + e.lineCartonsCount,
      kg: acc.kg + e.lineWeightKg,
      eia: acc.eia + e.eiaExpense,
      cartonExp: acc.cartonExp + e.cartonExpense,
      cover: acc.cover + e.cover,
      freight: acc.freight + e.freight,
      courier: acc.courier + e.courier,
      freezing: acc.freezing + e.freezingCharge,
      ice: acc.ice + e.ice,
      other: acc.other + e.otherExpense,
      grandTotal: acc.grandTotal + e.grandTotal,
    }),
    { carton: 0, kg: 0, eia: 0, cartonExp: 0, cover: 0, freight: 0, courier: 0, freezing: 0, ice: 0, other: 0, grandTotal: 0 }
  );

  const aoa: (string | number)[][] = [
    ['', '', '', '', totals.carton, totals.kg, totals.eia, totals.cartonExp, totals.cover, totals.freight, totals.courier, totals.freezing, totals.ice, totals.other, totals.grandTotal],
    ['Direct Expense Analysis'],
    ['Inv No.', 'Item', 'Inv Date', 'Inv No.', 'Carton', 'Kg', 'EIA Expense', 'Carton ', 'Cover', 'Freight', 'Courier', 'Freezing Charge', 'Ice', 'Other Expense', 'Grand Total'],
    ...entries.map((e) => [
      e.serialNo || '',
      e.speciesHeadName,
      formatDDMMYYYY(e.invoiceDate),
      e.invoiceNo,
      e.lineCartonsCount,
      e.lineWeightKg,
      e.eiaExpense,
      e.cartonExpense,
      e.cover,
      e.freight,
      e.courier,
      e.freezingCharge,
      e.ice,
      e.otherExpense,
      e.grandTotal,
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, 'Direct Expense Analysis');
  XLSX.writeFile(wb, `Direct_Expense_Analysis_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportSalesAnalysisExcel(entries: PerformanceSalesEntry[]): void {
  const totals = entries.reduce(
    (acc, e) => ({
      carton: acc.carton + e.cartonsCount,
      kg: acc.kg + e.weightKg,
      usd: acc.usd + e.salesAmountUSD,
      inr: acc.inr + e.salesAmountINR,
      db: acc.db + e.drawbackReceived,
      rt: acc.rt + e.rodtepReceived,
    }),
    { carton: 0, kg: 0, usd: 0, inr: 0, db: 0, rt: 0 }
  );

  const aoa: (string | number)[][] = [
    ['', '', '', totals.carton, totals.kg, totals.usd, totals.inr, totals.db, totals.rt],
    ['Sales Analysis'],
    ['Item', 'Inv Date', 'Inv No.', 'Carton', 'Kg', 'Sales Amount (USD)', 'Sales Amount (INR)', 'Drawback', 'RoTDEP'],
    ...entries.map((e) => [
      e.speciesHeadName,
      formatDDMMYYYY(e.invoiceDate),
      e.invoiceNo,
      e.cartonsCount,
      e.weightKg,
      e.salesAmountUSD,
      e.salesAmountINR,
      e.drawbackReceived,
      e.rodtepReceived,
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, 'Sales Analysis');
  XLSX.writeFile(wb, `Sales_Analysis_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportLedgerExcel(title: string, rows: { particulars: string; amount: number | null; isDivider?: boolean }[]): void {
  const aoa: (string | number)[][] = [
    ['', ''],
    ['', title],
    ['', 'Particulars', 'Amount'],
    ...rows.map((r) => ['', r.particulars, r.isDivider || r.amount === null ? '' : r.amount]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, 'Sales Ledger');
  XLSX.writeFile(wb, `${title.replace(/[^a-z0-9]+/gi, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function printPdfReport(title: string, headers: string[], rows: (string | number)[][], totalsRow?: (string | number)[]): void {
  const win = window.open('', '_blank');
  if (!win) return;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #1e1e24; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        p { font-size: 11px; color: #666; margin-bottom: 14px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f8f1f3; font-weight: bold; }
        tr.totals { background: #881337; color: #fff; font-weight: bold; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p>Generated on ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          ${totalsRow ? `<tr class="totals">${totalsRow.map((c) => `<td>${c}</td>`).join('')}</tr>` : ''}
          <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
      <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
