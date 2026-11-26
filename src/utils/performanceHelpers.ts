import * as XLSX from 'xlsx';
import {
  PerformanceExpenseEntry,
  PerformanceSalesEntry,
  PerformanceFilters,
  Purchase,
  Species,
  SpeciesHead,
  PeriodCloseLock,
} from '../types';

export function resolveSpeciesHead(
  speciesIdOrName: string | undefined,
  productDescription: string | undefined,
  speciesList: Species[],
  speciesHeads: SpeciesHead[]
): { headId: string; headName: string } {
  const norm = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const lower = (s?: string) => (s || '').toLowerCase().trim();

  // 1. Find Species by id, code, or name
  const sp =
    speciesList.find((s) => s.id === speciesIdOrName) ||
    speciesList.find((s) => s.code && speciesIdOrName && norm(s.code) === norm(speciesIdOrName)) ||
    speciesList.find((s) => s.name && speciesIdOrName && norm(s.name) === norm(speciesIdOrName)) ||
    speciesList.find((s) => s.name && productDescription && norm(s.name) === norm(productDescription));

  // 2. Direct speciesHeadId match
  if (sp?.speciesHeadId) {
    const h = speciesHeads.find((sh) => sh.id === sp.speciesHeadId);
    if (h) return { headId: h.id, headName: h.name };
  }

  // 3. Direct speciesHeadName match
  if (sp?.speciesHeadName) {
    const h = speciesHeads.find((sh) => norm(sh.name) === norm(sp.speciesHeadName));
    if (h) return { headId: h.id, headName: h.name };
  }

  // 4. Name-based matching against SpeciesHead names
  const candidateText = [
    sp?.speciesHeadName,
    sp?.name,
    sp?.rawSpeciesName,
    productDescription,
    speciesIdOrName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (candidateText) {
    // Exact or substring match with any SpeciesHead name (longest match first)
    const sortedHeads = [...speciesHeads].sort((a, b) => b.name.length - a.name.length);
    for (const h of sortedHeads) {
      const hLower = lower(h.name);
      if (hLower && candidateText.includes(hLower)) {
        return { headId: h.id, headName: h.name };
      }
    }

    // Biological / commercial keyword matching
    const keywordRules: { keywords: string[]; headMatch: string[] }[] = [
      { keywords: ['vannamei', 'vanamei', 'litopenaeus', 'pvpd', 'hlso', 'shrimp', 'prawn'], headMatch: ['vannamei', 'shrimp', 'prawn'] },
      { keywords: ['mackerel', 'mackrel', 'kanagurta'], headMatch: ['mackerel'] },
      { keywords: ['ribbon', 'savala', 'hairtail'], headMatch: ['ribbon'] },
      { keywords: ['squid', 'loligo', 'duvaucelii'], headMatch: ['squid'] },
      { keywords: ['octopus', 'vulgaris'], headMatch: ['octopus'] },
      { keywords: ['cuttlefish', 'sepia'], headMatch: ['cuttlefish'] },
      { keywords: ['tuna', 'yellowfin', 'skipjack'], headMatch: ['tuna'] },
      { keywords: ['leather jacket'], headMatch: ['leather jacket'] },
      { keywords: ['poovalan'], headMatch: ['poovalan'] },
      { keywords: ['croaker'], headMatch: ['croaker'] },
      { keywords: ['seer', 'kingfish'], headMatch: ['seer', 'king'] },
      { keywords: ['pomfret'], headMatch: ['pomfret'] },
    ];

    for (const rule of keywordRules) {
      if (rule.keywords.some((kw) => candidateText.includes(kw))) {
        const matchedHead = sortedHeads.find((h) =>
          rule.headMatch.some((hm) => lower(h.name).includes(hm))
        );
        if (matchedHead) return { headId: matchedHead.id, headName: matchedHead.name };
      }
    }

    // Fallback: token overlap with any SpeciesHead name
    const tokens = candidateText.split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
    for (const h of sortedHeads) {
      const hTokens = lower(h.name).split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
      if (hTokens.some((ht) => tokens.includes(ht))) {
        return { headId: h.id, headName: h.name };
      }
    }
  }

  // Fallback to product name itself if no SpeciesHead exists yet, rather than opaque "Unmapped Product"
  if (sp?.name) {
    return { headId: `name_${norm(sp.name)}`, headName: sp.name };
  }
  if (productDescription && productDescription.trim()) {
    return { headId: `name_${norm(productDescription)}`, headName: productDescription.trim() };
  }
  return { headId: '__unmapped__', headName: 'Unmapped Product' };
}

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
    if (filters.speciesHeadIds.length > 0) {
      const inPrimary = filters.speciesHeadIds.includes(e.speciesHeadId);
      const inBreakdown = (e.headBreakdown || []).some((hb) => filters.speciesHeadIds.includes(hb.speciesHeadId));
      if (!inPrimary && !inBreakdown) return false;
    }
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
    if (filters.speciesHeadIds.length > 0) {
      const inPrimary = filters.speciesHeadIds.includes(e.speciesHeadId);
      const inBreakdown = (e.headBreakdown || []).some((hb) => filters.speciesHeadIds.includes(hb.speciesHeadId));
      if (!inPrimary && !inBreakdown) return false;
    }
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

export function printPdfReport(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  totalsRow?: (string | number)[],
  orientation: 'auto' | 'portrait' | 'landscape' = 'auto'
): void {
  const win = window.open('', '_blank');
  if (!win) return;

  const useLandscape =
    orientation === 'landscape' || (orientation === 'auto' && headers.length > 6);
  const isWide = headers.length >= 12;

  const formatCellHtml = (cell: string | number, isHeader = false) => {
    const str = String(cell ?? '');
    if (isHeader) return str;
    const isNegative = /^\(.*\)$/.test(str.trim()) || str.trim().startsWith('-₹') || str.trim().startsWith('-$');
    const isPending = str.toLowerCase().includes('pending');
    if (isNegative) {
      return `<span class="neg">${str}</span>`;
    }
    if (isPending) {
      return `<span class="pend">${str}</span>`;
    }
    return str;
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page {
          size: A4 ${useLandscape ? 'landscape' : 'portrait'};
          margin: ${useLandscape ? '8mm' : '10mm'};
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box;
        }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          padding: 16px;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
        }
        .report-banner {
          background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 55%, #ecfdf5 100%);
          color: #0f172a;
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          border-left: 5px solid #4f46e5;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .report-banner .eyebrow {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #4f46e5;
          margin-bottom: 3px;
        }
        .report-banner h1 {
          font-size: ${isWide ? '16px' : '18px'};
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 3px 0;
          letter-spacing: -0.01em;
        }
        .report-banner p {
          font-size: 10px;
          color: #475569;
          margin: 0;
        }
        .report-badge {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: ${isWide ? '8.5px' : '10.5px'};
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: ${isWide ? '4.5px 5.5px' : '6.5px 9px'};
          text-align: left;
          vertical-align: middle;
        }
        thead tr.totals td {
          background: #eef2ff;
          color: #1e1b4b;
          font-weight: 800;
          border-top: 2px solid #6366f1;
          border-bottom: 2px solid #c7d2fe;
        }
        thead tr.cols th {
          background: #f1f5f9;
          color: #334155;
          font-weight: 700;
          text-transform: uppercase;
          font-size: ${isWide ? '7.8px' : '9.5px'};
          letter-spacing: 0.03em;
          border-bottom: 2px solid #cbd5e1;
        }
        tbody tr:nth-child(even) {
          background: #f8fafc;
        }
        tbody tr:nth-child(odd) {
          background: #ffffff;
        }
        tbody tr.profit-row td {
          background: #ecfdf5 !important;
          color: #065f46;
          font-weight: 800;
          border-top: 2px solid #6ee7b7;
        }
        tbody tr.loss-row td {
          background: #fff1f2 !important;
          color: #9f1239;
          font-weight: 800;
          border-top: 2px solid #fda4af;
        }
        tbody tr.divider-row td {
          background: #eff6ff !important;
          color: #1e40af;
          font-weight: 700;
          text-transform: uppercase;
        }
        .neg {
          color: #be123c;
          font-weight: 700;
        }
        .pend {
          color: #b45309;
          font-weight: 700;
        }
        .footer-note {
          margin-top: 10px;
          font-size: 9px;
          color: #64748b;
          display: flex;
          justify-content: space-between;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="report-banner">
        <div>
          <div class="eyebrow">Performance Analysis &amp; Profitability Statement</div>
          <h1>${title}</h1>
          <p>Coastal Marine · Generated ${new Date().toLocaleString()}</p>
        </div>
        <div class="report-badge">${useLandscape ? 'A4 Landscape' : 'A4 Portrait'} · ${rows.length} Rows</div>
      </div>
      <table>
        <thead>
          ${totalsRow ? `<tr class="totals">${totalsRow.map((c) => `<td>${c}</td>`).join('')}</tr>` : ''}
          <tr class="cols">${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows
            .map((r) => {
              const first = String(r[0] ?? '').toLowerCase();
              let rowClass = '';
              if (first.includes('profit/(loss)') || first.includes('profit / (loss)')) {
                const amtStr = String(r[1] ?? '');
                rowClass = amtStr.includes('(') || amtStr.includes('-') ? 'loss-row' : 'profit-row';
              } else if (first === 'less:') {
                rowClass = 'divider-row';
              }
              return `<tr class="${rowClass}">${r.map((c) => `<td>${formatCellHtml(c)}</td>`).join('')}</tr>`;
            })
            .join('')}
        </tbody>
      </table>
      <div class="footer-note">
        <span>Seafood Purchase &amp; Export Management — Performance Analysis</span>
        <span>Tip: Enable "Background graphics" in your browser print dialog for full colour PDF.</span>
      </div>
      <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
