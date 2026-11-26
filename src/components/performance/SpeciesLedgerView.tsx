import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { usePerformance } from '../../context/PerformanceContext';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../common/PageHeader';
import { PerformanceFilterBar } from './PerformanceFilterBar';
import {
  applySharedFiltersToExpenses,
  applySharedFiltersToSales,
  formatINR,
  formatDDMMYYYY,
  exportLedgerExcel,
  printPdfReport,
  resolveSpeciesHead,
} from '../../utils/performanceHelpers';
import { FileSpreadsheet, Printer, ShieldAlert, X, TrendingUp, TrendingDown } from 'lucide-react';

interface LedgerLine {
  id: string;
  particulars: string;
  amount: number | null;
  isDivider?: boolean;
  isTotal?: boolean;
  isDeduction?: boolean;
  drillType?: 'sales' | 'drawback' | 'rodtep' | 'closing_stock' | 'opening_stock' | 'purchase' | 'purchase_exp' | 'invoice_exp';
  expenseField?: string;
}

export const SpeciesLedgerView: React.FC = () => {
  const {
    salesInvoices,
    species,
    purchaseSpecies,
    speciesHeads,
    customers,
    purchases,
    expenseTypes,
    inventoryItems,
    inventoryMappings,
    inventoryCalculation,
  } = useData();
  const { performanceExpenses, performanceSales, filters, syncFromInvoices } = usePerformance();
  const { permissions } = useAuth();

  const [selectedHeadId, setSelectedHeadId] = useState<string>('ALL');
  const [drillLine, setDrillLine] = useState<LedgerLine | null>(null);

  useEffect(() => {
    syncFromInvoices(salesInvoices, species, speciesHeads, customers);
  }, [salesInvoices, species, speciesHeads, customers, syncFromInvoices]);

  const selectedHead = useMemo(
    () => speciesHeads.find((h) => h.id === selectedHeadId) || null,
    [speciesHeads, selectedHeadId]
  );

  const ledgerTitle = selectedHead
    ? `${selectedHead.name.toUpperCase()} Sales Ledger`
    : 'CONSOLIDATED ALL SPECIES Sales Ledger';

  // Map purchase speciesId -> speciesHeadId (falling back to name-based resolution)
  const speciesHeadLookup = useMemo(() => {
    const map = new Map<string, string>();
    [...species, ...purchaseSpecies].forEach((sp) => {
      const resolved = resolveSpeciesHead(sp.id, sp.name, [...species, ...purchaseSpecies], speciesHeads);
      map.set(sp.id, resolved.headId);
      if (sp.name) map.set(sp.name.toLowerCase(), resolved.headId);
    });
    return map;
  }, [species, purchaseSpecies, speciesHeads]);

  // Map inventoryItemId -> speciesHeadId via inventoryMappings
  const invItemHeadMap = useMemo(() => {
    const map = new Map<string, string>();
    inventoryMappings.forEach((m) => {
      const spId = m.salesProductId || m.speciesId;
      if (spId && speciesHeadLookup.has(spId)) {
        map.set(m.inventoryItemId, speciesHeadLookup.get(spId)!);
      }
    });
    return map;
  }, [inventoryMappings, speciesHeadLookup]);

  // Filtered sales & expense rows scoped to selectedHeadId + shared filters (apportioning multi-head invoices by headBreakdown)
  const scopedSales = useMemo(() => {
    const base = applySharedFiltersToSales(performanceSales, filters);
    if (selectedHeadId === 'ALL') return base;
    return base
      .map((s) => {
        const hb = (s.headBreakdown || []).find((h) => h.speciesHeadId === selectedHeadId);
        if (hb) {
          return {
            ...s,
            weightKg: hb.weightKg,
            cartonsCount: hb.cartonsCount,
            salesAmountUSD: hb.salesAmountUSD,
            salesAmountINR: hb.salesAmountINR,
            drawbackReceived: Number((s.drawbackReceived * hb.splitRatio).toFixed(2)),
            rodtepReceived: Number((s.rodtepReceived * hb.splitRatio).toFixed(2)),
          };
        }
        return s.speciesHeadId === selectedHeadId ? s : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [performanceSales, filters, selectedHeadId]);

  const scopedExpenses = useMemo(() => {
    const base = applySharedFiltersToExpenses(performanceExpenses, filters);
    if (selectedHeadId === 'ALL') return base;
    return base
      .map((e) => {
        const hb = (e.headBreakdown || []).find((h) => h.speciesHeadId === selectedHeadId);
        if (hb) {
          const r = hb.splitRatio;
          return {
            ...e,
            lineWeightKg: hb.weightKg,
            eiaExpense: Number((e.eiaExpense * r).toFixed(2)),
            cartonExpense: Number((e.cartonExpense * r).toFixed(2)),
            cover: Number((e.cover * r).toFixed(2)),
            freight: Number((e.freight * r).toFixed(2)),
            courier: Number((e.courier * r).toFixed(2)),
            freezingCharge: Number((e.freezingCharge * r).toFixed(2)),
            ice: Number((e.ice * r).toFixed(2)),
            otherExpense: Number((e.otherExpense * r).toFixed(2)),
            grandTotal: Number((e.grandTotal * r).toFixed(2)),
          };
        }
        return e.speciesHeadId === selectedHeadId ? e : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [performanceExpenses, filters, selectedHeadId]);

  // Filtered purchases for the same species head & period
  const scopedPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (p.isVoided) return false;
      const headId = speciesHeadLookup.get(p.speciesId) || speciesHeadLookup.get((p.speciesId || '').toLowerCase()) || '__unmapped__';
      if (selectedHeadId !== 'ALL' && headId !== selectedHeadId) return false;
      if (filters.speciesHeadIds.length > 0 && !filters.speciesHeadIds.includes(headId)) return false;
      if (filters.dateFrom && p.purchaseDate < filters.dateFrom) return false;
      if (filters.dateTo && p.purchaseDate > filters.dateTo) return false;
      if (filters.financialYear && p.financialYear !== filters.financialYear) return false;
      if (filters.month && !p.purchaseDate.startsWith(filters.month)) return false;
      return true;
    });
  }, [purchases, speciesHeadLookup, selectedHeadId, filters]);

  // Classify purchase-side expense types (Ice, Transportation, Commission, Other)
  const purchaseExpenseBuckets = useMemo(() => {
    const iceIds = new Set<string>();
    const transportIds = new Set<string>();
    const commissionIds = new Set<string>();

    expenseTypes.forEach((et) => {
      const n = et.name.toLowerCase();
      if (n.includes('ice')) iceIds.add(et.id);
      else if (n.includes('transport') || n.includes('freight') || n.includes('carriage')) transportIds.add(et.id);
      else if (n.includes('commission') || n.includes('broker')) commissionIds.add(et.id);
    });

    let ice = 0;
    let transportation = 0;
    let commission = 0;
    let other = 0;

    scopedPurchases.forEach((p) => {
      const bd = p.expenseBreakdown || {};
      const entries = Object.entries(bd);
      if (entries.length === 0 && p.totalExpenses > 0) {
        other += p.totalExpenses;
      } else {
        entries.forEach(([etId, amt]) => {
          const val = Number(amt) || 0;
          if (iceIds.has(etId)) ice += val;
          else if (transportIds.has(etId)) transportation += val;
          else if (commissionIds.has(etId)) commission += val;
          else other += val;
        });
      }
    });

    return { ice, transportation, commission, other };
  }, [scopedPurchases, expenseTypes]);

  // Opening & Closing Stock from Inventory module (weighted average cost)
  const { openingStock, closingStock } = useMemo(() => {
    const isFullHistory = !filters.dateFrom && !filters.dateTo && !filters.financialYear && !filters.month;
    let closing = 0;
    let opening = 0;

    inventoryItems.forEach((item) => {
      if (item.isDeleted) return;
      const headId = invItemHeadMap.get(item.id);
      if (selectedHeadId !== 'ALL' && headId !== selectedHeadId) return;
      if (filters.speciesHeadIds.length > 0 && (!headId || !filters.speciesHeadIds.includes(headId))) return;

      const movs = inventoryCalculation.movementsByItem[item.id] || [];
      if (movs.length === 0) return;

      // Closing stock at end of period (or latest)
      const endMovs = filters.dateTo ? movs.filter((m) => m.date <= filters.dateTo) : movs;
      if (endMovs.length > 0) {
        closing += endMovs[endMovs.length - 1].balanceValue || 0;
      }

      // Opening stock = 0 when whole history is viewed; otherwise last balance before dateFrom
      if (!isFullHistory && filters.dateFrom) {
        const beforeMovs = movs.filter((m) => m.date < filters.dateFrom);
        if (beforeMovs.length > 0) {
          opening += beforeMovs[beforeMovs.length - 1].balanceValue || 0;
        }
      }
    });

    return { openingStock: opening, closingStock: closing };
  }, [inventoryItems, invItemHeadMap, inventoryCalculation, selectedHeadId, filters]);

  const totalKg = useMemo(() => scopedSales.reduce((s, r) => s + (r.weightKg || 0), 0), [scopedSales]);

  const ledgerData = useMemo(() => {
    const salesTotal = scopedSales.reduce((s, r) => s + (r.salesAmountINR || 0), 0);
    const drawbackTotal = scopedSales.reduce((s, r) => s + (r.drawbackReceived || 0), 0);
    const rodtepTotal = scopedSales.reduce((s, r) => s + (r.rodtepReceived || 0), 0);
    const purchaseTotal = scopedPurchases.reduce((s, p) => s + (p.grossPurchaseValue ?? p.purchaseValue ?? 0), 0);

    const eia = scopedExpenses.reduce((s, e) => s + e.eiaExpense, 0);
    const carton = scopedExpenses.reduce((s, e) => s + e.cartonExpense, 0);
    const cover = scopedExpenses.reduce((s, e) => s + e.cover, 0);
    const freight = scopedExpenses.reduce((s, e) => s + e.freight, 0);
    const courier = scopedExpenses.reduce((s, e) => s + e.courier, 0);
    const freezing = scopedExpenses.reduce((s, e) => s + e.freezingCharge, 0);
    const iceInv = scopedExpenses.reduce((s, e) => s + e.ice, 0);
    const otherInv = scopedExpenses.reduce((s, e) => s + e.otherExpense, 0);

    const totalPurchaseSideExp =
      purchaseExpenseBuckets.ice +
      purchaseExpenseBuckets.transportation +
      purchaseExpenseBuckets.commission +
      purchaseExpenseBuckets.other;
    const totalInvoiceExp = eia + carton + cover + freight + courier + freezing + iceInv + otherInv;

    const profitLoss =
      salesTotal +
      drawbackTotal +
      rodtepTotal +
      closingStock -
      openingStock -
      purchaseTotal -
      totalPurchaseSideExp -
      totalInvoiceExp;

    const rows: LedgerLine[] = [
      { id: 'sales', particulars: 'Sales', amount: salesTotal, drillType: 'sales' },
      { id: 'drawback', particulars: 'Drawback', amount: drawbackTotal, drillType: 'drawback' },
      { id: 'rodtep', particulars: 'RoTDEP', amount: rodtepTotal, drillType: 'rodtep' },
      { id: 'closing', particulars: 'Closing Stock', amount: closingStock, drillType: 'closing_stock' },
      { id: 'opening', particulars: 'Opening Stock (Less)', amount: openingStock, isDeduction: true, drillType: 'opening_stock' },
      { id: 'less_div', particulars: 'Less:', amount: null, isDivider: true },
      { id: 'purchase', particulars: 'Purchase', amount: purchaseTotal, isDeduction: true, drillType: 'purchase' },
      { id: 'pur_ice', particulars: 'Ice (Purchase)', amount: purchaseExpenseBuckets.ice, isDeduction: true, drillType: 'purchase_exp' },
      { id: 'pur_trans', particulars: 'Transportation (Purchase)', amount: purchaseExpenseBuckets.transportation, isDeduction: true, drillType: 'purchase_exp' },
      { id: 'pur_comm', particulars: 'Commission (Purchase)', amount: purchaseExpenseBuckets.commission, isDeduction: true, drillType: 'purchase_exp' },
      { id: 'pur_other', particulars: 'Other (Purchase)', amount: purchaseExpenseBuckets.other, isDeduction: true, drillType: 'purchase_exp' },
      { id: 'eia', particulars: 'EIA Expense', amount: eia, isDeduction: true, drillType: 'invoice_exp', expenseField: 'eiaExpense' },
      { id: 'carton', particulars: 'Carton ', amount: carton, isDeduction: true, drillType: 'invoice_exp', expenseField: 'cartonExpense' },
      { id: 'cover', particulars: 'Cover', amount: cover, isDeduction: true, drillType: 'invoice_exp', expenseField: 'cover' },
      { id: 'freight', particulars: 'Freight', amount: freight, isDeduction: true, drillType: 'invoice_exp', expenseField: 'freight' },
      { id: 'courier', particulars: 'Courier', amount: courier, isDeduction: true, drillType: 'invoice_exp', expenseField: 'courier' },
      { id: 'freezing', particulars: 'Freezing Charge', amount: freezing, isDeduction: true, drillType: 'invoice_exp', expenseField: 'freezingCharge' },
      { id: 'ice', particulars: 'Ice', amount: iceInv, isDeduction: true, drillType: 'invoice_exp', expenseField: 'ice' },
      { id: 'other', particulars: 'Other Expense', amount: otherInv, isDeduction: true, drillType: 'invoice_exp', expenseField: 'otherExpense' },
      { id: 'profit', particulars: 'Profit/(Loss)', amount: profitLoss, isTotal: true },
    ];

    return { rows, salesTotal, profitLoss, totalPurchaseSideExp, totalInvoiceExp, purchaseTotal, drawbackTotal, rodtepTotal };
  }, [scopedSales, scopedPurchases, scopedExpenses, purchaseExpenseBuckets, closingStock, openingStock]);

  if (!permissions.canViewPerformanceLedger) {
    return (
      <div className="glass-surface-regular rounded-2xl p-8 text-center space-y-2 border border-rose-200">
        <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
        <h2 className="text-lg font-bold text-ink-900">Access Restricted</h2>
        <p className="text-sm text-ink-600">
          Species-Head Sales Ledger and Profit/(Loss) figures are restricted for Junior Accountant role.
        </p>
      </div>
    );
  }

  const maxBar = Math.max(
    ledgerData.salesTotal,
    Math.abs(ledgerData.profitLoss),
    ledgerData.purchaseTotal,
    1
  );

  const waterfallSegments = [
    { label: 'Sales', value: ledgerData.salesTotal, color: 'bg-emerald-500' },
    { label: '+ Drawback & RoTDEP', value: ledgerData.drawbackTotal + ledgerData.rodtepTotal, color: 'bg-sky-500' },
    { label: '+ Closing Stock', value: closingStock, color: 'bg-teal-500' },
    { label: '- Opening Stock', value: -openingStock, color: 'bg-amber-500' },
    { label: '- Purchase & Pur. Exp', value: -(ledgerData.purchaseTotal + ledgerData.totalPurchaseSideExp), color: 'bg-rose-500' },
    { label: '- Direct Invoice Exp', value: -ledgerData.totalInvoiceExp, color: 'bg-orange-500' },
    { label: 'Profit / (Loss)', value: ledgerData.profitLoss, color: ledgerData.profitLoss >= 0 ? 'bg-emerald-700' : 'bg-red-600' },
  ];

  const handleExportPdf = () => {
    const headers = ['Particulars', 'Amount (INR)', 'Per Kg (INR)', '% of Sales'];
    const rows = ledgerData.rows.map((r) => [
      r.particulars,
      r.isDivider || r.amount === null ? '' : formatINR(r.amount, true),
      r.isDivider || r.amount === null || totalKg <= 0 ? '' : formatINR(r.amount / totalKg, true),
      r.isDivider || r.amount === null || ledgerData.salesTotal <= 0
        ? ''
        : `${((r.amount / ledgerData.salesTotal) * 100).toFixed(2)}%`,
    ]);
    printPdfReport(ledgerTitle, headers, rows);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={ledgerTitle}
        subtitle="Part 3 — Live P&L Ledger from Sales, Purchase, Direct Expenses & Inventory Valuation"
        primaryAction={{
          label: 'Export Excel',
          icon: FileSpreadsheet,
          onClick: () => exportLedgerExcel(ledgerTitle, ledgerData.rows),
        }}
        secondaryActions={[{ label: 'Export PDF', icon: Printer, onClick: handleExportPdf }]}
      />

      <div className="glass-surface-regular rounded-2xl border border-white/80 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-ink-600 uppercase">Select Species Head:</label>
          <select
            value={selectedHeadId}
            onChange={(e) => setSelectedHeadId(e.target.value)}
            className="px-3 py-2 text-sm font-semibold bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:border-rose-500"
          >
            <option value="ALL">Consolidated — All Species Heads</option>
            {speciesHeads.map((sh) => (
              <option key={sh.id} value={sh.id}>
                {sh.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-ink-500">
            Shipped Qty: <strong className="text-ink-900">{totalKg.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Kg</strong>
          </span>
          <span className={`font-bold flex items-center gap-1 ${ledgerData.profitLoss >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {ledgerData.profitLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            Net: {formatINR(ledgerData.profitLoss, true)}
          </span>
        </div>
      </div>

      <PerformanceFilterBar showExpenseStatus={false} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Ledger Table */}
        <div className="lg:col-span-2 glass-surface-regular rounded-2xl border border-white/80 shadow-xs overflow-hidden">
          <div className="px-5 py-3 bg-rose-900 text-white font-bold text-sm flex justify-between items-center">
            <span>{ledgerTitle}</span>
            <span className="text-xs font-normal text-rose-200">Click any row to drill down</span>
          </div>
          <table className="w-full text-xs border-collapse bg-white">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-ink-700 font-bold">
                <th className="px-4 py-2.5 text-left">Particulars</th>
                <th className="px-4 py-2.5 text-right">Amount (INR)</th>
                <th className="px-4 py-2.5 text-right">Per Kg</th>
                <th className="px-4 py-2.5 text-right">% of Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ledgerData.rows.map((row) => {
                if (row.isDivider) {
                  return (
                    <tr key={row.id} className="bg-gray-100">
                      <td colSpan={4} className="px-4 py-1.5 font-extrabold text-ink-600 uppercase tracking-wider text-[11px]">
                        {row.particulars}
                      </td>
                    </tr>
                  );
                }

                const amt = row.amount ?? 0;
                const perKg = totalKg > 0 ? amt / totalKg : 0;
                const pctSales = ledgerData.salesTotal > 0 ? (amt / ledgerData.salesTotal) * 100 : 0;
                const isLoss = row.isTotal && amt < 0;
                const isProfit = row.isTotal && amt >= 0;

                return (
                  <tr
                    key={row.id}
                    onClick={() => row.drillType && setDrillLine(row)}
                    className={`${
                      row.isTotal
                        ? isLoss
                          ? 'bg-red-50/70 font-extrabold text-sm border-t-2 border-red-200'
                          : 'bg-emerald-50/70 font-extrabold text-sm border-t-2 border-emerald-200'
                        : row.drillType
                        ? 'hover:bg-rose-50/40 cursor-pointer transition-colors'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 font-semibold text-ink-900">{row.particulars}</td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono font-bold ${
                        isLoss
                          ? 'text-red-700'
                          : isProfit
                          ? 'text-emerald-700'
                          : row.isDeduction
                          ? 'text-ink-700'
                          : 'text-ink-900'
                      }`}
                    >
                      {formatINR(amt, true)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-ink-500 font-mono">
                      {totalKg > 0 ? formatINR(perKg, true) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-ink-500 font-mono">
                      {ledgerData.salesTotal > 0 ? `${pctSales.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Waterfall Chart */}
        <div className="glass-surface-regular rounded-2xl border border-white/80 p-5 space-y-4 shadow-xs h-fit">
          <div>
            <h3 className="text-sm font-bold text-ink-900">Profit Waterfall</h3>
            <p className="text-xs text-ink-500">From Sales through Costs to Net Profit/(Loss)</p>
          </div>
          <div className="space-y-3">
            {waterfallSegments.map((seg) => {
              const widthPct = Math.min(100, Math.max(2, (Math.abs(seg.value) / maxBar) * 100));
              return (
                <div key={seg.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-ink-700">{seg.label}</span>
                    <span className={`font-mono font-bold ${seg.value < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      {formatINR(seg.value, true)}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${seg.color}`} style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Drill-down Modal */}
      {drillLine && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-rose-50/50">
              <div>
                <h3 className="text-base font-bold text-ink-900">Drill-Down: {drillLine.particulars}</h3>
                <p className="text-xs text-ink-500">Total: {formatINR(drillLine.amount ?? 0, true)}</p>
              </div>
              <button onClick={() => setDrillLine(null)} className="text-ink-400 hover:text-ink-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto text-xs">
              {(drillLine.drillType === 'sales' || drillLine.drillType === 'drawback' || drillLine.drillType === 'rodtep') && (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b text-ink-700">
                      <th className="p-2 text-left">Inv No.</th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Species Head</th>
                      <th className="p-2 text-right">Kg</th>
                      <th className="p-2 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {scopedSales.map((s) => (
                      <tr key={s.id}>
                        <td className="p-2 font-mono font-bold text-rose-800">{s.invoiceNo}</td>
                        <td className="p-2">{formatDDMMYYYY(s.invoiceDate)}</td>
                        <td className="p-2">{s.speciesHeadName}</td>
                        <td className="p-2 text-right">{s.weightKg.toFixed(2)}</td>
                        <td className="p-2 text-right font-bold">
                          {formatINR(
                            drillLine.drillType === 'sales'
                              ? s.salesAmountINR
                              : drillLine.drillType === 'drawback'
                              ? s.drawbackReceived
                              : s.rodtepReceived
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {drillLine.drillType === 'invoice_exp' && (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b text-ink-700">
                      <th className="p-2 text-left">Inv No.</th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Species Head</th>
                      <th className="p-2 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {scopedExpenses.map((e) => (
                      <tr key={e.id}>
                        <td className="p-2 font-mono font-bold text-rose-800">{e.invoiceNo}</td>
                        <td className="p-2">{formatDDMMYYYY(e.invoiceDate)}</td>
                        <td className="p-2">{e.speciesHeadName}</td>
                        <td className="p-2 text-right font-bold">
                          {formatINR(Number((e as any)[drillLine.expenseField || 'grandTotal']) || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {(drillLine.drillType === 'purchase' || drillLine.drillType === 'purchase_exp') && (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b text-ink-700">
                      <th className="p-2 text-left">Purchase ID</th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-right">Kg</th>
                      <th className="p-2 text-right">Purchase Value</th>
                      <th className="p-2 text-right">Expenses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {scopedPurchases.map((p) => (
                      <tr key={p.id}>
                        <td className="p-2 font-mono font-bold text-rose-800">{p.purchaseId}</td>
                        <td className="p-2">{formatDDMMYYYY(p.purchaseDate)}</td>
                        <td className="p-2 text-right">{p.weightKg.toFixed(2)}</td>
                        <td className="p-2 text-right font-bold">{formatINR(p.grossPurchaseValue ?? p.purchaseValue)}</td>
                        <td className="p-2 text-right">{formatINR(p.totalExpenses)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {(drillLine.drillType === 'closing_stock' || drillLine.drillType === 'opening_stock') && (
                <p className="text-ink-600">
                  Derived directly from the Inventory module&apos;s perpetual weighted-average valuation across items mapped to this species head.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
