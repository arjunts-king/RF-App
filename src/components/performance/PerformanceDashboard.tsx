import React, { useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { usePerformance } from '../../context/PerformanceContext';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../common/PageHeader';
import { BentoCard } from '../common/BentoCard';
import { BarChartVisual } from '../common/charts/BarChartVisual';
import { DonutChartVisual } from '../common/charts/DonutChartVisual';
import { PerformanceFilterBar } from './PerformanceFilterBar';
import {
  applySharedFiltersToExpenses,
  applySharedFiltersToSales,
  formatINR,
} from '../../utils/performanceHelpers';
import {
  TrendingUp,
  Receipt,
  Package,
  Activity,
  CheckCircle2,
  Clock,
  Boxes,
  AlertTriangle,
} from 'lucide-react';

interface PerformanceDashboardProps {
  onNavigate: (tab: string) => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ onNavigate }) => {
  const {
    salesInvoices,
    species,
    purchaseSpecies,
    speciesHeads,
    customers,
    purchases,
    inventoryCalculation,
  } = useData();
  const { performanceExpenses, performanceSales, filters, syncFromInvoices } = usePerformance();
  const { permissions } = useAuth();

  useEffect(() => {
    syncFromInvoices(salesInvoices, species, speciesHeads, customers);
  }, [salesInvoices, species, speciesHeads, customers, syncFromInvoices]);

  const filteredSales = useMemo(
    () => applySharedFiltersToSales(performanceSales, filters),
    [performanceSales, filters]
  );
  const filteredExpenses = useMemo(
    () => applySharedFiltersToExpenses(performanceExpenses, filters),
    [performanceExpenses, filters]
  );

  const speciesHeadLookup = useMemo(() => {
    const map = new Map<string, string>();
    [...species, ...purchaseSpecies].forEach((sp) => {
      if (sp.speciesHeadId) {
        map.set(sp.id, sp.speciesHeadId);
        if (sp.name) map.set(sp.name.toLowerCase(), sp.speciesHeadId);
      }
    });
    return map;
  }, [species, purchaseSpecies]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (p.isVoided) return false;
      const headId = speciesHeadLookup.get(p.speciesId) || speciesHeadLookup.get((p.speciesId || '').toLowerCase()) || '__unmapped__';
      if (filters.speciesHeadIds.length > 0 && !filters.speciesHeadIds.includes(headId)) return false;
      if (filters.dateFrom && p.purchaseDate < filters.dateFrom) return false;
      if (filters.dateTo && p.purchaseDate > filters.dateTo) return false;
      if (filters.financialYear && p.financialYear !== filters.financialYear) return false;
      if (filters.month && !p.purchaseDate.startsWith(filters.month)) return false;
      return true;
    });
  }, [purchases, speciesHeadLookup, filters]);

  const kpis = useMemo(() => {
    const totalSalesINR = filteredSales.reduce((s, r) => s + r.salesAmountINR, 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + e.grandTotal, 0);
    const totalPurchaseCost = filteredPurchases.reduce(
      (s, p) => s + (p.grossPurchaseValue ?? p.purchaseValue ?? 0) + (p.totalExpenses || 0),
      0
    );
    const drawbackReceived = filteredSales.reduce((s, r) => s + r.drawbackReceived, 0);
    const drawbackPending = filteredSales.reduce((s, r) => s + r.drawbackPending, 0);
    const rodtepReceived = filteredSales.reduce((s, r) => s + r.rodtepReceived, 0);
    const rodtepPending = filteredSales.reduce((s, r) => s + r.rodtepPending, 0);
    const closingStock = inventoryCalculation.totalClosingValue || 0;

    const profitLoss =
      totalSalesINR + drawbackReceived + rodtepReceived + closingStock - totalPurchaseCost - totalExpenses;
    const profitPct = totalSalesINR > 0 ? (profitLoss / totalSalesINR) * 100 : 0;
    const pendingExpenseCount = filteredExpenses.filter((e) => e.grandTotal === 0).length;

    return {
      totalSalesINR,
      totalExpenses,
      totalPurchaseCost,
      drawbackReceived,
      drawbackPending,
      rodtepReceived,
      rodtepPending,
      closingStock,
      profitLoss,
      profitPct,
      pendingExpenseCount,
    };
  }, [filteredSales, filteredExpenses, filteredPurchases, inventoryCalculation]);

  // Month-wise trend
  const monthTrendData = useMemo(() => {
    const expByKey = new Map(filteredExpenses.map((e) => [`${e.invoiceId}__${e.speciesHeadId}`, e.grandTotal]));
    const byMonth = new Map<string, number>();

    filteredSales.forEach((s) => {
      const m = s.invoiceDate.slice(0, 7);
      const exp = expByKey.get(`${s.invoiceId}__${s.speciesHeadId}`) || 0;
      const contrib = s.salesAmountINR + s.drawbackReceived + s.rodtepReceived - exp;
      byMonth.set(m, (byMonth.get(m) || 0) + contrib);
    });

    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, val]) => ({
        label: month,
        value: Math.max(0, val),
        formattedValue: formatINR(val, true),
      }));
  }, [filteredSales, filteredExpenses]);

  // Expense mix donut
  const expenseMixData = useMemo(() => {
    const sums = {
      'EIA Expense': 0,
      Carton: 0,
      Cover: 0,
      Freight: 0,
      Courier: 0,
      'Freezing Charge': 0,
      Ice: 0,
      'Other Expense': 0,
    };
    filteredExpenses.forEach((e) => {
      sums['EIA Expense'] += e.eiaExpense;
      sums.Carton += e.cartonExpense;
      sums.Cover += e.cover;
      sums.Freight += e.freight;
      sums.Courier += e.courier;
      sums['Freezing Charge'] += e.freezingCharge;
      sums.Ice += e.ice;
      sums['Other Expense'] += e.otherExpense;
    });
    return Object.entries(sums)
      .filter(([, v]) => v > 0)
      .map(([label, value]) => ({
        label,
        value,
        formattedValue: formatINR(value),
      }));
  }, [filteredExpenses]);

  // Species-Head comparison
  const headComparisonData = useMemo(() => {
    const expByHead = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      expByHead.set(e.speciesHeadName, (expByHead.get(e.speciesHeadName) || 0) + e.grandTotal);
    });
    const salesByHead = new Map<string, number>();
    filteredSales.forEach((s) => {
      salesByHead.set(
        s.speciesHeadName,
        (salesByHead.get(s.speciesHeadName) || 0) + s.salesAmountINR + s.drawbackReceived + s.rodtepReceived
      );
    });
    return Array.from(salesByHead.entries()).map(([head, rev]) => {
      const exp = expByHead.get(head) || 0;
      const contrib = rev - exp;
      return {
        label: head,
        value: Math.max(0, contrib),
        formattedValue: formatINR(contrib, true),
        subtext: `Rev ${formatINR(rev)} · Exp ${formatINR(exp)}`,
      };
    });
  }, [filteredSales, filteredExpenses]);

  // Top & Bottom invoices by contribution
  const invoiceContributions = useMemo(() => {
    const expByKey = new Map(filteredExpenses.map((e) => [`${e.invoiceId}__${e.speciesHeadId}`, e.grandTotal]));
    const byInv = new Map<string, { invoiceNo: string; customerName: string; kg: number; contrib: number }>();
    filteredSales.forEach((s) => {
      const exp = expByKey.get(`${s.invoiceId}__${s.speciesHeadId}`) || 0;
      const contrib = s.salesAmountINR + s.drawbackReceived + s.rodtepReceived - exp;
      const cur = byInv.get(s.invoiceId) || { invoiceNo: s.invoiceNo, customerName: s.customerName, kg: 0, contrib: 0 };
      cur.kg += s.weightKg;
      cur.contrib += contrib;
      byInv.set(s.invoiceId, cur);
    });
    return Array.from(byInv.values()).sort((a, b) => b.contrib - a.contrib);
  }, [filteredSales, filteredExpenses]);

  // COGS cross-check
  const invCogsProfit = kpis.totalSalesINR - (inventoryCalculation.totalCogsValue || 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profitability Dashboard"
        subtitle="Performance Analysis — Live P&L across Sales, Direct Expenses, Purchases & Stock"
        badge={kpis.pendingExpenseCount > 0 ? `${kpis.pendingExpenseCount} expenses pending` : 'All synced'}
        primaryAction={
          permissions.canViewPerformanceExpenses
            ? { label: 'Enter Direct Expenses', icon: Receipt, onClick: () => onNavigate('expense-analysis') }
            : undefined
        }
      />

      <PerformanceFilterBar showExpenseStatus showDrawbackRodtepStatus showProfitLoss />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BentoCard
          label="Total Sales (INR)"
          value={formatINR(kpis.totalSalesINR)}
          icon={TrendingUp}
          variant="info"
          caption={`${filteredSales.length} invoice head rows`}
          linkText={permissions.canViewPerformanceExpenses ? 'Sales Analysis' : undefined}
          onLinkClick={() => onNavigate('sales-analysis')}
        />
        <BentoCard
          label="Total Direct Expenses"
          value={formatINR(kpis.totalExpenses)}
          icon={Receipt}
          variant="warning"
          caption={`${kpis.pendingExpenseCount} rows pending`}
          linkText={permissions.canViewPerformanceExpenses ? 'Expense Analysis' : undefined}
          onLinkClick={() => onNavigate('expense-analysis')}
        />
        <BentoCard
          label="Purchase Cost (incl. Pur. Exp)"
          value={formatINR(kpis.totalPurchaseCost)}
          icon={Package}
          caption={`${filteredPurchases.length} purchase lots`}
        />
        {permissions.canViewPerformanceLedger ? (
          <BentoCard
            label="Net Profit / (Loss)"
            value={formatINR(kpis.profitLoss, true)}
            icon={Activity}
            variant={kpis.profitLoss >= 0 ? 'success' : 'highlight'}
            caption={`Profit Margin: ${kpis.profitPct.toFixed(1)}% of Sales`}
            linkText="Open Ledger"
            onLinkClick={() => onNavigate('species-ledger')}
          />
        ) : (
          <BentoCard
            label="Profit / (Loss)"
            value="Restricted"
            icon={Activity}
            caption="Hidden for Junior Accountant"
          />
        )}

        <BentoCard
          label="Drawback Received"
          value={formatINR(kpis.drawbackReceived)}
          icon={CheckCircle2}
          variant="success"
        />
        <BentoCard
          label="Drawback Pending"
          value={formatINR(kpis.drawbackPending)}
          icon={Clock}
          variant={kpis.drawbackPending > 0 ? 'warning' : 'default'}
        />
        <BentoCard
          label="RoTDEP Received / Pending"
          value={`${formatINR(kpis.rodtepReceived)}`}
          caption={`Pending: ${formatINR(kpis.rodtepPending)}`}
          icon={CheckCircle2}
        />
        <BentoCard
          label="Closing Stock (Inventory)"
          value={formatINR(kpis.closingStock)}
          icon={Boxes}
          caption="Weighted average valuation"
        />
      </div>

      {/* Charts Row 1 */}
      {permissions.canViewPerformanceLedger && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <BarChartVisual
            title="Month-wise Contribution Trend"
            subtitle="Sales + Drawback + RoTDEP - Direct Expenses"
            data={monthTrendData}
            orientation="vertical"
          />
          <DonutChartVisual
            title="Direct Expense Mix"
            subtitle="Distribution across the 8 expense heads"
            data={expenseMixData}
            centerLabel="Expenses"
            centerValue={formatINR(kpis.totalExpenses)}
          />
        </div>
      )}

      {/* Charts Row 2 */}
      {permissions.canViewPerformanceLedger && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <BarChartVisual
            title="Species-Head Contribution Comparison"
            subtitle="Revenue less direct invoice expenses per head"
            data={headComparisonData}
            orientation="horizontal"
          />

          <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-5 space-y-3">
            <h3 className="text-sm font-bold text-ink-900">Top &amp; Bottom Invoices by Contribution</h3>
            <div className="overflow-x-auto text-xs">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-ink-600 font-bold border-b">
                    <th className="p-2 text-left">Inv No.</th>
                    <th className="p-2 text-left">Customer</th>
                    <th className="p-2 text-right">Kg</th>
                    <th className="p-2 text-right">Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoiceContributions.slice(0, 8).map((inv) => (
                    <tr key={inv.invoiceNo}>
                      <td className="p-2 font-mono font-bold text-rose-800">{inv.invoiceNo}</td>
                      <td className="p-2 truncate max-w-[160px]">{inv.customerName}</td>
                      <td className="p-2 text-right">{inv.kg.toFixed(1)}</td>
                      <td className={`p-2 text-right font-bold ${inv.contrib >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatINR(inv.contrib, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Ledger vs Inventory COGS Cross-check */}
      {permissions.canViewPerformanceLedger && (
        <div className="glass-surface-regular rounded-2xl border border-white/80 p-5 space-y-2 text-xs shadow-xs">
          <div className="flex items-center gap-2 font-bold text-ink-900 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Ledger Profit vs Inventory COGS Cross-Check</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-white border border-gray-100">
              <div className="text-ink-500 font-semibold">Ledger Net Profit/(Loss)</div>
              <div className="text-base font-extrabold text-ink-900 mt-0.5">{formatINR(kpis.profitLoss, true)}</div>
            </div>
            <div className="p-3 rounded-xl bg-white border border-gray-100">
              <div className="text-ink-500 font-semibold">Sales Less Inventory COGS</div>
              <div className="text-base font-extrabold text-ink-900 mt-0.5">{formatINR(invCogsProfit, true)}</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
              <div className="text-amber-900 font-semibold">Explained Difference</div>
              <div className="text-base font-extrabold text-amber-900 mt-0.5">
                {formatINR(kpis.profitLoss - invCogsProfit, true)}
              </div>
              <div className="text-[11px] text-amber-800 mt-0.5">
                Reflects Drawback/RoTDEP (+), Direct Invoice Expenses (-), and Purchase vs Moving-Avg COGS timing.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
