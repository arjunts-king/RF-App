import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  FileSpreadsheet,
  Download,
  Printer,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  EyeOff
} from 'lucide-react';
import {
  BarChartVisual,
  ComparisonBarVisual
} from '../common/charts';
import { InventoryNavTab } from './InventorySidebar';

interface InventoryReportsHubProps {
  onNavigateTab?: (tab: InventoryNavTab) => void;
}

type ReportSubTab =
  | 'cogs_margin'
  | 'movement_summary'
  | 'nrv_check'
  | 'reconciliation'
  | 'exceptions';

export const InventoryReportsHub: React.FC<InventoryReportsHubProps> = ({ onNavigateTab }) => {
  const { inventoryCalculation } = useData();
  const {
    cogsReport,
    movementSummary,
    nrvChecks,
    reconciliation,
    exceptions,
    totalCogsValue,
    totalSalesValueINR,
    overallGrossMarginPct
  } = inventoryCalculation;

  const [activeReportTab, setActiveReportTab] = useState<ReportSubTab>('cogs_margin');
  const [showVisuals, setShowVisuals] = useState<boolean>(true);

  const topProductsMargin = useMemo(() => {
    const map = new Map<string, { weight: number; cogs: number; sales: number; profit: number }>();
    cogsReport.forEach((c) => {
      const key = c.productName;
      const cur = map.get(key) || { weight: 0, cogs: 0, sales: 0, profit: 0 };
      cur.weight += c.quantityKg;
      cur.cogs += c.totalCogsINR;
      cur.sales += c.saleValueINR;
      cur.profit += c.grossProfitINR;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([label, d]) => {
        const marginPct = d.sales > 0 ? (d.profit / d.sales) * 100 : 0;
        return {
          label,
          value: Number(marginPct.toFixed(1)),
          formattedValue: `${marginPct.toFixed(1)}%`,
          secondaryValue: `₹${d.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [cogsReport]);

  // Formatters
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const formatKg = (val: number) => {
    return `${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} Kg`;
  };

  const handleExportActiveReport = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `Inventory_Report_${activeReportTab}_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeReportTab === 'cogs_margin') {
      headers = [
        'Invoice No',
        'Invoice Date',
        'Customer',
        'Product / Size',
        'Weight (Kg)',
        'Inventory Cost / Kg (INR)',
        'Total COGS (INR)',
        'Sales Value (INR)',
        'Gross Profit (INR)',
        'Margin %'
      ];
      rows = cogsReport.map((c) => [
        `"${c.invoiceNo}"`,
        c.invoiceDate,
        `"${c.customerName}"`,
        `"${c.productName}"`,
        c.quantityKg.toFixed(3),
        c.inventoryUnitCost.toFixed(4),
        c.totalCogsINR.toFixed(2),
        c.saleValueINR.toFixed(2),
        c.grossProfitINR.toFixed(2),
        `${c.grossMarginPct.toFixed(2)}%`
      ]);
    } else if (activeReportTab === 'movement_summary') {
      headers = [
        'Item Code',
        'Item Name',
        'Opening Qty (Kg)',
        'Opening Value (INR)',
        'Receipts Qty (Kg)',
        'Receipts Value (INR)',
        'Issues Qty (Kg)',
        'Issues Value (INR)',
        'Adjustments Qty (Kg)',
        'Adjustments Value (INR)',
        'Closing Qty (Kg)',
        'Closing Value (INR)',
        'Closing Avg Cost (INR/Kg)'
      ];
      rows = movementSummary.map((m) => [
        `"${m.itemCode}"`,
        `"${m.itemName}"`,
        m.openingQty.toFixed(3),
        m.openingValue.toFixed(2),
        m.receiptsQty.toFixed(3),
        m.receiptsValue.toFixed(2),
        m.issuesQty.toFixed(3),
        m.issuesValue.toFixed(2),
        m.adjustmentsQty.toFixed(3),
        m.adjustmentsValue.toFixed(2),
        m.closingQty.toFixed(3),
        m.closingValue.toFixed(2),
        m.closingAverageCost.toFixed(4)
      ]);
    } else if (activeReportTab === 'nrv_check') {
      headers = [
        'Item Code',
        'Item Name',
        'Qty on Hand (Kg)',
        'Moving Avg Cost (INR/Kg)',
        'Latest Realized Sales Price (INR/Kg)',
        'Variance / Kg',
        'Impaired Status',
        'Potential Impairment Value (INR)'
      ];
      rows = nrvChecks.map((n) => [
        `"${n.itemCode}"`,
        `"${n.itemName}"`,
        n.quantityOnHand.toFixed(3),
        n.averageCostPerKg.toFixed(4),
        n.latestSalePricePerKgINR.toFixed(4),
        n.variancePerKg.toFixed(4),
        n.nrvImpaired ? 'Impaired' : 'Normal',
        n.totalPotentialImpairment.toFixed(2)
      ]);
    } else if (activeReportTab === 'exceptions') {
      headers = [
        'Severity',
        'Exception Type',
        'Title',
        'Reference',
        'Date',
        'Details',
        'Suggested Action'
      ];
      rows = exceptions.map((e) => [
        e.severity.toUpperCase(),
        e.type,
        `"${e.title}"`,
        `"${e.referenceId}"`,
        e.date,
        `"${e.description.replace(/"/g, '""')}"`,
        `"${e.suggestedAction.replace(/"/g, '""')}"`
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-white/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-600 text-white shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-ink-900 tracking-tight">
              Inventory Reports & Control Hub
            </h1>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Executive Valuation Suite
            </span>
          </div>
          <p className="text-xs text-ink-500 font-medium mt-1">
            Complete perpetual valuation analytics: COGS & Gross Margins, Lower of Cost and NRV tests, Movement Summaries, Mathematical Reconciliations & Exception Alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVisuals(!showVisuals)}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-ink-700 border border-gray-200 rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
          >
            {showVisuals ? <EyeOff className="w-4 h-4 text-ink-500" /> : <BarChart3 className="w-4 h-4 text-rose-600" />}
            <span>{showVisuals ? 'Hide Graphs' : 'Show Graphs'}</span>
          </button>
          <button
            onClick={handleExportActiveReport}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Report CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-ink-700 border border-gray-200 rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-ink-500" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveReportTab('cogs_margin')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeReportTab === 'cogs_margin'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-ink-600 hover:text-ink-900 hover:bg-white'
          }`}
        >
          COGS & Gross Margin Report ({cogsReport.length})
        </button>

        <button
          onClick={() => setActiveReportTab('movement_summary')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeReportTab === 'movement_summary'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-ink-600 hover:text-ink-900 hover:bg-white'
          }`}
        >
          Movement Summary Reconciliation
        </button>

        <button
          onClick={() => setActiveReportTab('nrv_check')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeReportTab === 'nrv_check'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-ink-600 hover:text-ink-900 hover:bg-white'
          }`}
        >
          Lower of Cost & NRV Check
        </button>

        <button
          onClick={() => setActiveReportTab('reconciliation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeReportTab === 'reconciliation'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-ink-600 hover:text-ink-900 hover:bg-white'
          }`}
        >
          Module Cross-Tieouts
        </button>

        <button
          onClick={() => setActiveReportTab('exceptions')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeReportTab === 'exceptions'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-ink-600 hover:text-ink-900 hover:bg-white'
          }`}
        >
          <span>Exception Report</span>
          {exceptions.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeReportTab === 'exceptions' ? 'bg-white text-rose-700' : 'bg-rose-100 text-rose-800'
            }`}>
              {exceptions.length}
            </span>
          )}
        </button>
      </div>

      {/* REPORT 1: COGS AND GROSS MARGIN */}
      {activeReportTab === 'cogs_margin' && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white/80 rounded-2xl border border-white/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase">Total Sales Realization (INR)</span>
              <div className="text-2xl font-black text-ink-900">{formatCurrency(totalSalesValueINR)}</div>
            </div>
            <div className="p-4 bg-white/80 rounded-2xl border border-white/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase">Total COGS (Inventory Cost)</span>
              <div className="text-2xl font-black text-rose-700">{formatCurrency(totalCogsValue)}</div>
            </div>
            <div className="p-4 bg-white/80 rounded-2xl border border-white/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase">Portfolio Gross Margin %</span>
              <div className="text-2xl font-black text-emerald-700">{overallGrossMarginPct.toFixed(2)}%</div>
            </div>
          </div>

          {/* Graphical Analysis */}
          {showVisuals && cogsReport.length > 0 && (
            <div className="space-y-4 p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-white/80 shadow-xs">
              <ComparisonBarVisual
                title="Commercial Sales Realization vs. Inventory COGS"
                subtitle="Perpetual inventory cost recognized against outward sales receipts"
                metrics={[
                  {
                    label: 'Total COGS (Inventory Cost)',
                    value: totalCogsValue,
                    formattedValue: formatCurrency(totalCogsValue),
                    color: '#f43f5e',
                    subtext: 'Depleted inventory carrying value'
                  },
                  {
                    label: 'Realized Gross Profit (INR)',
                    value: Math.max(0, totalSalesValueINR - totalCogsValue),
                    formattedValue: formatCurrency(Math.max(0, totalSalesValueINR - totalCogsValue)),
                    color: '#10b981',
                    subtext: `Portfolio Margin: ${overallGrossMarginPct.toFixed(1)}%`
                  }
                ]}
                totalLabel="Total Sales Realization"
                totalFormatted={formatCurrency(totalSalesValueINR)}
              />
              {topProductsMargin.length > 0 && (
                <BarChartVisual
                  title="Top Products by Gross Margin %"
                  subtitle="Operational margin generated per commercial product heading"
                  data={topProductsMargin}
                  orientation="horizontal"
                  unit="%"
                />
              )}
            </div>
          )}

          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-ink-500 uppercase tracking-wider">
                    <th className="py-3 px-3">Invoice No</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Buyer / Consignee</th>
                    <th className="py-3 px-3">Product Item</th>
                    <th className="py-3 px-3 text-right">Weight (Kg)</th>
                    <th className="py-3 px-3 text-right">Inv Unit Cost (₹/Kg)</th>
                    <th className="py-3 px-3 text-right text-rose-700 font-bold">Total COGS (₹)</th>
                    <th className="py-3 px-3 text-right text-ink-900 font-bold">Sales Value (₹)</th>
                    <th className="py-3 px-3 text-right text-emerald-700 font-bold">Gross Profit (₹)</th>
                    <th className="py-3 px-3 text-center">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-ink-700">
                  {cogsReport.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-ink-400 font-semibold">
                        No commercial sales invoices posted. COGS is recorded on every sales issue.
                      </td>
                    </tr>
                  ) : (
                    cogsReport.map((c, i) => (
                      <tr key={`${c.invoiceId}-${i}`} className="hover:bg-rose-50/30 transition">
                        <td className="py-3 px-3 font-mono font-bold text-ink-900">{c.invoiceNo}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-ink-600">{c.invoiceDate}</td>
                        <td className="py-3 px-3 font-semibold text-ink-900">{c.customerName}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-ink-900">{c.productName}</div>
                          <div className="text-[10px] text-ink-400">{c.inventoryItemName}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-ink-900">
                          {formatKg(c.quantityKg)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-ink-600">
                          ₹{c.inventoryUnitCost.toFixed(4)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-700">
                          {formatCurrency(c.totalCogsINR)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-ink-900">
                          {formatCurrency(c.saleValueINR)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(c.grossProfitINR)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              c.grossMarginPct >= 20
                                ? 'bg-emerald-50 text-emerald-800'
                                : c.grossMarginPct >= 10
                                ? 'bg-blue-50 text-blue-800'
                                : c.grossMarginPct >= 0
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-rose-100 text-rose-900'
                            }`}
                          >
                            {c.grossMarginPct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: MOVEMENT SUMMARY RECONCILIATION */}
      {activeReportTab === 'movement_summary' && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/60">
            <h3 className="text-xs font-black uppercase tracking-wider text-ink-900">
              Perpetual Stock Movement Ledger Summary
            </h3>
            <p className="text-[11px] text-ink-500 font-medium">
              Proves exact reconciliation: Opening + Receipts - Issues +/- Adjustments = Closing.
            </p>
          </div>

          {/* Graphical Analysis */}
          {showVisuals && movementSummary.length > 0 && (
            <div className="p-4 space-y-4 border-b border-gray-100 bg-gray-50/30">
              <ComparisonBarVisual
                title="Perpetual Inventory Inflow vs Outflow Balance"
                subtitle="Total value movement through the seafood inventory pipeline"
                metrics={[
                  {
                    label: 'Opening Valuation',
                    value: movementSummary.reduce((s, m) => s + m.openingValue, 0),
                    formattedValue: formatCurrency(movementSummary.reduce((s, m) => s + m.openingValue, 0)),
                    color: '#3b82f6',
                    subtext: 'Starting stock value'
                  },
                  {
                    label: 'Receipts & Production Inflow',
                    value: movementSummary.reduce((s, m) => s + m.receiptsValue, 0),
                    formattedValue: formatCurrency(movementSummary.reduce((s, m) => s + m.receiptsValue, 0)),
                    color: '#10b981',
                    subtext: 'Factory output & procurement'
                  },
                  {
                    label: 'Issues (COGS Outflow)',
                    value: movementSummary.reduce((s, m) => s + m.issuesValue, 0),
                    formattedValue: formatCurrency(movementSummary.reduce((s, m) => s + m.issuesValue, 0)),
                    color: '#f43f5e',
                    subtext: 'Sales shipments deducted'
                  }
                ]}
                totalLabel="Gross Movement Volume"
                totalFormatted={formatCurrency(
                  movementSummary.reduce((s, m) => s + m.openingValue + m.receiptsValue + m.issuesValue, 0)
                )}
              />
              <BarChartVisual
                title="Top Inventory Items by Closing Valuation (INR)"
                subtitle="Highest value stock items currently on hand in cold storage"
                data={[...movementSummary]
                  .sort((a, b) => b.closingValue - a.closingValue)
                  .slice(0, 6)
                  .map((m) => ({
                    label: m.itemName,
                    value: m.closingValue,
                    formattedValue: formatCurrency(m.closingValue),
                    secondaryValue: `${formatKg(m.closingQty)}`
                  }))}
                orientation="horizontal"
                unit="INR"
              />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-ink-500 uppercase tracking-wider">
                  <th className="py-3 px-3">Item</th>
                  <th className="py-3 px-3 text-right">Opening Qty</th>
                  <th className="py-3 px-3 text-right">Opening Val</th>
                  <th className="py-3 px-3 text-right text-emerald-700">Receipts Qty</th>
                  <th className="py-3 px-3 text-right text-emerald-700">Receipts Val</th>
                  <th className="py-3 px-3 text-right text-rose-700">Issues Qty</th>
                  <th className="py-3 px-3 text-right text-rose-700">Issues Val</th>
                  <th className="py-3 px-3 text-right text-amber-700">Adj Qty</th>
                  <th className="py-3 px-3 text-right text-amber-700">Adj Val</th>
                  <th className="py-3 px-3 text-right font-black text-ink-900 bg-gray-100/50">Closing Qty</th>
                  <th className="py-3 px-3 text-right font-black text-emerald-900 bg-emerald-50/50">Closing Val</th>
                  <th className="py-3 px-3 text-right font-bold text-blue-700">Avg Cost/Kg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-ink-700">
                {movementSummary.map((m) => (
                  <tr key={m.inventoryItemId} className="hover:bg-rose-50/30 transition">
                    <td className="py-3 px-3">
                      <div className="font-bold text-ink-900">{m.itemName}</div>
                      <div className="text-[10px] text-ink-400 font-mono">{m.itemCode}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono">{formatKg(m.openingQty)}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatCurrency(m.openingValue)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">{formatKg(m.receiptsQty)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(m.receiptsValue)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-700">{formatKg(m.issuesQty)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-700">{formatCurrency(m.issuesValue)}</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700">{formatKg(m.adjustmentsQty)}</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700">{formatCurrency(m.adjustmentsValue)}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-ink-900 bg-gray-100/30">{formatKg(m.closingQty)}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-900 bg-emerald-50/30">{formatCurrency(m.closingValue)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-blue-700">₹{m.closingAverageCost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 3: LOWER OF COST AND NRV CHECK */}
      {activeReportTab === 'nrv_check' && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/60">
            <h3 className="text-xs font-black uppercase tracking-wider text-ink-900">
              Lower of Cost and Net Realizable Value (NRV) Analysis
            </h3>
            <p className="text-[11px] text-ink-500 font-medium">
              Compares weighted average inventory carrying cost with realized commercial sales export prices per Kg.
            </p>
          </div>

          {/* Graphical Analysis */}
          {showVisuals && nrvChecks.length > 0 && (
            <div className="p-4 border-b border-gray-100 bg-gray-50/30">
              <BarChartVisual
                title="Inventory Carrying Cost vs. Realized Sales NRV (₹/Kg)"
                subtitle="Compares inventory cost against latest commercial sales price to detect impairment"
                data={nrvChecks.slice(0, 8).map((n) => ({
                  label: n.itemName,
                  value: Number(n.latestSalePricePerKgINR > 0 ? n.latestSalePricePerKgINR.toFixed(2) : n.averageCostPerKg.toFixed(2)),
                  formattedValue: n.latestSalePricePerKgINR > 0 ? `₹${n.latestSalePricePerKgINR.toFixed(2)}/kg` : `₹${n.averageCostPerKg.toFixed(2)}/kg`,
                  secondaryValue: `Cost: ₹${n.averageCostPerKg.toFixed(2)}/kg`,
                  color: n.nrvImpaired ? '#ef4444' : '#10b981'
                }))}
                orientation="horizontal"
                unit="₹/Kg"
              />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-ink-500 uppercase tracking-wider">
                  <th className="py-3 px-3">Item Code & Name</th>
                  <th className="py-3 px-3 text-right">Quantity on Hand</th>
                  <th className="py-3 px-3 text-right">Carrying Cost (₹/Kg)</th>
                  <th className="py-3 px-3 text-right">Latest Sales NRV (₹/Kg)</th>
                  <th className="py-3 px-3 text-right">Variance / Kg (₹)</th>
                  <th className="py-3 px-3 text-center">Impairment Status</th>
                  <th className="py-3 px-3 text-right">Potential Impairment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-ink-700">
                {nrvChecks.map((n) => (
                  <tr key={n.inventoryItemId} className="hover:bg-rose-50/30 transition">
                    <td className="py-3 px-3">
                      <div className="font-bold text-ink-900">{n.itemName}</div>
                      <div className="text-[10px] text-ink-400 font-mono">{n.itemCode}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-ink-900">{formatKg(n.quantityOnHand)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-blue-700">₹{n.averageCostPerKg.toFixed(4)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-ink-900">
                      {n.latestSalePricePerKgINR > 0 ? `₹${n.latestSalePricePerKgINR.toFixed(4)}` : 'No Sales Yet'}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono font-bold ${
                      n.variancePerKg > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}>
                      {n.variancePerKg > 0 ? `+₹${n.variancePerKg.toFixed(4)}` : '₹0.00'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          n.nrvImpaired
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {n.nrvImpaired ? 'Impaired' : 'Healthy NRV'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-rose-700">
                      {n.totalPotentialImpairment > 0 ? formatCurrency(n.totalPotentialImpairment) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 4: MODULE CROSS-TIEOUTS */}
      {activeReportTab === 'reconciliation' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-white/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-ink-900 uppercase tracking-wide">
              Cross-Module Audit Tieouts
            </h3>
            <p className="text-xs text-ink-500">
              Verifies that inventory stock receipts reconcile with Purchase Total Costs, and stock issues reconcile with Sales exported weights.
            </p>

            {/* Graphical Analysis */}
            {showVisuals && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <ComparisonBarVisual
                  title="Procurement Cost Tieout"
                  subtitle="Purchase Bills Total vs Inventory Receipts Recorded"
                  metrics={[
                    {
                      label: 'Purchase Cost',
                      value: reconciliation.purchaseModuleTotalCost,
                      formattedValue: formatCurrency(reconciliation.purchaseModuleTotalCost),
                      color: '#3b82f6',
                      subtext: 'Procurement bills'
                    },
                    {
                      label: 'Inventory Receipts',
                      value: reconciliation.receiptsValue,
                      formattedValue: formatCurrency(reconciliation.receiptsValue),
                      color: '#10b981',
                      subtext: 'Recorded stock receipts'
                    }
                  ]}
                  totalLabel="Procurement Total"
                  totalFormatted={formatCurrency(reconciliation.purchaseModuleTotalCost)}
                />
                <ComparisonBarVisual
                  title="Sales Export Weight Tieout"
                  subtitle="Commercial Invoice Weight vs Inventory Outflow Issues"
                  metrics={[
                    {
                      label: 'Sales Invoices',
                      value: reconciliation.salesModuleTotalWeightKg,
                      formattedValue: formatKg(reconciliation.salesModuleTotalWeightKg),
                      color: '#e11d48',
                      subtext: 'Commercial export lines'
                    },
                    {
                      label: 'Inventory Issues',
                      value: movementSummary.reduce((s, m) => s + m.issuesQty, 0),
                      formattedValue: formatKg(movementSummary.reduce((s, m) => s + m.issuesQty, 0)),
                      color: '#06b6d4',
                      subtext: 'Depleted stock weight'
                    }
                  ]}
                  totalLabel="Volume Total"
                  totalFormatted={formatKg(reconciliation.salesModuleTotalWeightKg)}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Purchase Tieout */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-ink-900">
                  <span>Procurement Module Tie-out</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    {reconciliation.purchaseModuleAgreed ? 'Agreed' : 'Discrepancy'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-ink-600">
                  <span>Purchase Module Total Costs:</span>
                  <span className="font-mono font-bold text-ink-900">{formatCurrency(reconciliation.purchaseModuleTotalCost)}</span>
                </div>
                <div className="flex justify-between text-xs text-ink-600">
                  <span>Inventory Recorded Receipts:</span>
                  <span className="font-mono font-bold text-ink-900">{formatCurrency(reconciliation.receiptsValue)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-gray-200">
                  <span>Variance:</span>
                  <span className={`font-mono ${reconciliation.purchaseVariance === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatCurrency(reconciliation.purchaseVariance)}
                  </span>
                </div>
              </div>

              {/* Sales Tieout */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-ink-900">
                  <span>Commercial Sales Module Tie-out</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    {reconciliation.salesModuleAgreed ? 'Agreed' : 'Discrepancy'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-ink-600">
                  <span>Sales Invoices Export Weight:</span>
                  <span className="font-mono font-bold text-ink-900">{formatKg(reconciliation.salesModuleTotalWeightKg)}</span>
                </div>
                <div className="flex justify-between text-xs text-ink-600">
                  <span>Inventory Recorded Issues:</span>
                  <span className="font-mono font-bold text-ink-900">{formatKg(movementSummary.reduce((s, m) => s + m.issuesQty, 0))}</span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-gray-200">
                  <span>Variance:</span>
                  <span className={`font-mono ${reconciliation.salesVarianceKg === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatKg(reconciliation.salesVarianceKg)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 5: EXCEPTION REPORT */}
      {activeReportTab === 'exceptions' && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-ink-900">
                Inventory Exception & Attention Log
              </h3>
              <p className="text-[11px] text-ink-500 font-medium">
                Unmapped purchase lots, unmapped sales line items, missing Vannamei yields, and negative stock conditions.
              </p>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('item-master')}
                className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1"
              >
                <span>Fix Mappings in Item Master</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Graphical Analysis */}
          {showVisuals && exceptions.length > 0 && (
            <div className="p-4 border-b border-gray-100 bg-gray-50/30">
              <BarChartVisual
                title="Inventory Exceptions by Category"
                subtitle="Frequency of data quality divergences and audit attention alerts"
                data={(() => {
                  const map = new Map<string, number>();
                  exceptions.forEach((exc) => {
                    map.set(exc.type, (map.get(exc.type) || 0) + 1);
                  });
                  return Array.from(map.entries()).map(([label, value]) => ({
                    label,
                    value,
                    formattedValue: `${value} issues`,
                    color: label.toLowerCase().includes('negative') || label.toLowerCase().includes('critical') ? '#ef4444' : '#f59e0b'
                  }));
                })()}
                orientation="horizontal"
                unit=" issues"
              />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-ink-500 uppercase tracking-wider">
                  <th className="py-3 px-3">Severity</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Exception Title</th>
                  <th className="py-3 px-3">Reference</th>
                  <th className="py-3 px-3">Issue Description</th>
                  <th className="py-3 px-3">Suggested Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-ink-700">
                {exceptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-emerald-700 font-bold">
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-600" />
                      Zero Exceptions Detected! All purchases and sales are cleanly mapped with complete yield data.
                    </td>
                  </tr>
                ) : (
                  exceptions.map((exc) => (
                    <tr key={exc.id} className="hover:bg-rose-50/30 transition">
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            exc.severity === 'high'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {exc.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-ink-600 whitespace-nowrap">{exc.date}</td>
                      <td className="py-3 px-3 font-bold text-ink-900">{exc.title}</td>
                      <td className="py-3 px-3 font-mono font-bold text-ink-800">{exc.referenceId}</td>
                      <td className="py-3 px-3 text-ink-600 max-w-[280px]">{exc.description}</td>
                      <td className="py-3 px-3 text-rose-700 font-semibold max-w-[280px]">{exc.suggestedAction}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
