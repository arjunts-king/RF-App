import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { usePerformance } from '../../context/PerformanceContext';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../common/PageHeader';
import { formatINR, formatDDMMYYYY, resolveSpeciesHead } from '../../utils/performanceHelpers';
import { CheckCircle2, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';

export const ExceptionReportView: React.FC = () => {
  const {
    salesInvoices,
    species,
    purchaseSpecies,
    speciesHeads,
    customers,
    purchases,
  } = useData();
  const {
    performanceExpenses,
    performanceSales,
    syncFromInvoices,
    rebuildPerformanceData,
  } = usePerformance();
  const { currentUser, permissions } = useAuth();

  const [rebuildResult, setRebuildResult] = useState<ReturnType<typeof rebuildPerformanceData> | null>(null);

  useEffect(() => {
    syncFromInvoices(salesInvoices, species, speciesHeads, customers);
  }, [salesInvoices, species, speciesHeads, customers, syncFromInvoices]);

  const unmappedProducts = useMemo(() => {
    return species.filter((s) => {
      if (!s.active) return false;
      const resolved = resolveSpeciesHead(s.id, s.name, species, speciesHeads);
      return resolved.headId === '__unmapped__' || resolved.headId.startsWith('name_');
    });
  }, [species, speciesHeads]);

  const invoicesWithoutExpenses = useMemo(() => {
    return performanceExpenses.filter((e) => !e.isDeleted && !e.isVoided && e.grandTotal === 0);
  }, [performanceExpenses]);

  const orphanExpenses = useMemo(() => {
    const activeInvIds = new Set(salesInvoices.filter((i) => !i.isVoided).map((i) => i.id));
    return performanceExpenses.filter((e) => !e.isDeleted && (!activeInvIds.has(e.invoiceId) || e.isVoided));
  }, [performanceExpenses, salesInvoices]);

  const speciesHeadLookup = useMemo(() => {
    const map = new Map<string, string>();
    [...species, ...purchaseSpecies].forEach((sp) => {
      if (sp.speciesHeadId) map.set(sp.id, sp.speciesHeadId);
    });
    return map;
  }, [species, purchaseSpecies]);

  const lossMakingInvoices = useMemo(() => {
    const expMap = new Map(
      performanceExpenses.filter((e) => !e.isDeleted && !e.isVoided).map((e) => [`${e.invoiceId}__${e.speciesHeadId}`, e.grandTotal])
    );
    return performanceSales
      .filter((s) => !s.isDeleted && !s.isVoided)
      .map((s) => {
        const exp = expMap.get(`${s.invoiceId}__${s.speciesHeadId}`) || 0;
        const netBeforePurchase = s.salesAmountINR + s.drawbackReceived + s.rodtepReceived - exp;
        return { ...s, exp, netBeforePurchase };
      })
      .filter((r) => r.netBeforePurchase < 0);
  }, [performanceSales, performanceExpenses]);

  // Reconciliation tie-outs
  const tieOuts = useMemo(() => {
    const activeInvoices = salesInvoices.filter((i) => !i.isVoided);
    const salesModuleKg = activeInvoices.reduce((s, i) => s + (i.totalWeightKg || 0), 0);
    const salesModuleUSD = activeInvoices.reduce((s, i) => s + (i.totalAmountCurrency || 0), 0);

    const perfKg = performanceSales.filter((s) => !s.isDeleted && !s.isVoided).reduce((s, r) => s + r.weightKg, 0);
    const perfUSD = performanceSales.filter((s) => !s.isDeleted && !s.isVoided).reduce((s, r) => s + r.salesAmountUSD, 0);

    const purchaseModuleCost = purchases
      .filter((p) => !p.isVoided)
      .reduce((s, p) => s + (p.grossPurchaseValue ?? p.purchaseValue ?? 0), 0);
    const mappedPurchaseCost = purchases
      .filter((p) => !p.isVoided && speciesHeadLookup.has(p.speciesId))
      .reduce((s, p) => s + (p.grossPurchaseValue ?? p.purchaseValue ?? 0), 0);

    return {
      salesKgDiff: Math.abs(salesModuleKg - perfKg),
      salesModuleKg,
      perfKg,
      salesUsdDiff: Math.abs(salesModuleUSD - perfUSD),
      salesModuleUSD,
      perfUSD,
      purchaseDiff: Math.abs(purchaseModuleCost - mappedPurchaseCost),
      purchaseModuleCost,
      mappedPurchaseCost,
    };
  }, [salesInvoices, performanceSales, purchases, speciesHeadLookup]);

  // Drawback & RoTDEP Ageing
  const ageingRows = useMemo(() => {
    const today = Date.now();
    const byHead = new Map<
      string,
      { headName: string; dbPending: number; rtPending: number; b0_30: number; b31_60: number; b61_90: number; b90p: number }
    >();

    performanceSales
      .filter((s) => !s.isDeleted && !s.isVoided && (s.drawbackPending > 0 || s.rodtepPending > 0))
      .forEach((s) => {
        const cur = byHead.get(s.speciesHeadId) || {
          headName: s.speciesHeadName,
          dbPending: 0,
          rtPending: 0,
          b0_30: 0,
          b31_60: 0,
          b61_90: 0,
          b90p: 0,
        };
        const pend = s.drawbackPending + s.rodtepPending;
        cur.dbPending += s.drawbackPending;
        cur.rtPending += s.rodtepPending;

        const days = Math.floor((today - new Date(s.invoiceDate).getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 30) cur.b0_30 += pend;
        else if (days <= 60) cur.b31_60 += pend;
        else if (days <= 90) cur.b61_90 += pend;
        else cur.b90p += pend;

        byHead.set(s.speciesHeadId, cur);
      });

    return Array.from(byHead.values());
  }, [performanceSales]);

  const handleRebuild = () => {
    const res = rebuildPerformanceData(salesInvoices, species, speciesHeads, customers, currentUser);
    setRebuildResult(res);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Exception & Reconciliation Report"
        subtitle="Completeness checks, module tie-outs, unmapped products & Drawback/RoTDEP ageing"
        primaryAction={
          permissions.canDeletePerformanceData
            ? {
                label: 'Rebuild & Verify (Admin)',
                icon: RefreshCw,
                onClick: handleRebuild,
              }
            : undefined
        }
      />

      {rebuildResult && (
        <div
          className={`rounded-2xl p-4 border text-xs flex items-center justify-between ${
            rebuildResult.matchedCleanly
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div>
            <strong>Rebuild Complete:</strong> Processed {rebuildResult.totalInvoicesProcessed} invoices →{' '}
            {rebuildResult.expenseRowsAfter} expense rows, {rebuildResult.salesRowsAfter} sales rows.
          </div>
          <span className="font-bold">
            {rebuildResult.matchedCleanly ? '✓ Recomputed totals match stored values' : '⚠ Totals updated on rebuild'}
          </span>
        </div>
      )}

      {/* Module Tie-Outs */}
      <div className="glass-surface-regular rounded-2xl border border-white/80 p-5 space-y-3 shadow-xs">
        <h3 className="text-sm font-bold text-ink-900">Module Tie-Outs &amp; Reconciliation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className={`p-3.5 rounded-xl border ${tieOuts.salesKgDiff < 0.1 ? 'bg-emerald-50/70 border-emerald-200' : 'bg-red-50/70 border-red-200'}`}>
            <div className="flex items-center justify-between font-bold">
              <span>Sales Weight (Kg) Tie-Out</span>
              {tieOuts.salesKgDiff < 0.1 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
            </div>
            <div className="mt-1 text-ink-600">
              Sales Module: {tieOuts.salesModuleKg.toFixed(2)} Kg | Analysis: {tieOuts.perfKg.toFixed(2)} Kg
            </div>
          </div>

          <div className={`p-3.5 rounded-xl border ${tieOuts.salesUsdDiff < 0.1 ? 'bg-emerald-50/70 border-emerald-200' : 'bg-red-50/70 border-red-200'}`}>
            <div className="flex items-center justify-between font-bold">
              <span>Sales Amount (USD) Tie-Out</span>
              {tieOuts.salesUsdDiff < 0.1 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
            </div>
            <div className="mt-1 text-ink-600">
              Sales Module: ${tieOuts.salesModuleUSD.toFixed(2)} | Analysis: ${tieOuts.perfUSD.toFixed(2)}
            </div>
          </div>

          <div className={`p-3.5 rounded-xl border ${tieOuts.purchaseDiff < 1 ? 'bg-emerald-50/70 border-emerald-200' : 'bg-red-50/70 border-red-200'}`}>
            <div className="flex items-center justify-between font-bold">
              <span>Purchase Mapping Tie-Out</span>
              {tieOuts.purchaseDiff < 1 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
            </div>
            <div className="mt-1 text-ink-600">
              Total: {formatINR(tieOuts.purchaseModuleCost)} | Mapped: {formatINR(tieOuts.mappedPurchaseCost)}
            </div>
          </div>
        </div>
      </div>

      {/* Exceptions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Invoices without expenses */}
        <div className="glass-surface-regular rounded-2xl border border-white/80 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-900">Invoices Without Expenses Entered</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${invoicesWithoutExpenses.length === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {invoicesWithoutExpenses.length === 0 ? '✓ All Complete' : `${invoicesWithoutExpenses.length} Pending`}
            </span>
          </div>
          {invoicesWithoutExpenses.length === 0 ? (
            <p className="text-xs text-ink-500">All synced invoices have direct expenses entered.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto text-xs divide-y">
              {invoicesWithoutExpenses.map((e) => (
                <div key={e.id} className="py-2 flex justify-between">
                  <span className="font-mono font-bold text-rose-800">{e.invoiceNo}</span>
                  <span className="text-ink-600">{e.speciesHeadName}</span>
                  <span className="text-ink-400">{formatDDMMYYYY(e.invoiceDate)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unmapped products & Orphan expenses */}
        <div className="glass-surface-regular rounded-2xl border border-white/80 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-900">Unmapped Products &amp; Orphan Entries</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${unmappedProducts.length === 0 && orphanExpenses.length === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
              {unmappedProducts.length + orphanExpenses.length} Issues
            </span>
          </div>
          {unmappedProducts.length > 0 && (
            <div className="text-xs space-y-1">
              <div className="font-bold text-red-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Unmapped Products (missing Species Head):
              </div>
              {unmappedProducts.map((u) => (
                <div key={u.id} className="text-ink-700">
                  {u.code} — {u.name}
                </div>
              ))}
            </div>
          )}
          {orphanExpenses.length > 0 && (
            <div className="text-xs space-y-1">
              <div className="font-bold text-amber-700">Expense rows with voided/missing invoice:</div>
              {orphanExpenses.map((o) => (
                <div key={o.id} className="text-ink-700">
                  {o.invoiceNo} ({o.speciesHeadName}) — {formatINR(o.grandTotal)}
                </div>
              ))}
            </div>
          )}
          {unmappedProducts.length === 0 && orphanExpenses.length === 0 && (
            <p className="text-xs text-ink-500">All products are mapped to Species Heads and no orphan entries exist.</p>
          )}
        </div>
      </div>

      {/* Drawback & RoTDEP Ageing */}
      <div className="glass-surface-regular rounded-2xl border border-white/80 p-5 space-y-3 shadow-xs">
        <h3 className="text-sm font-bold text-ink-900">Drawback &amp; RoTDEP Pending Ageing</h3>
        {ageingRows.length === 0 ? (
          <p className="text-xs text-ink-500">No pending Drawback or RoTDEP balances.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-ink-700 font-bold">
                  <th className="p-2 text-left">Species Head</th>
                  <th className="p-2 text-right">Drawback Pending</th>
                  <th className="p-2 text-right">RoTDEP Pending</th>
                  <th className="p-2 text-right">0–30 Days</th>
                  <th className="p-2 text-right">31–60 Days</th>
                  <th className="p-2 text-right">61–90 Days</th>
                  <th className="p-2 text-right">90+ Days</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ageingRows.map((r) => (
                  <tr key={r.headName}>
                    <td className="p-2 font-semibold">{r.headName}</td>
                    <td className="p-2 text-right">{formatINR(r.dbPending)}</td>
                    <td className="p-2 text-right">{formatINR(r.rtPending)}</td>
                    <td className="p-2 text-right">{formatINR(r.b0_30)}</td>
                    <td className="p-2 text-right">{formatINR(r.b31_60)}</td>
                    <td className="p-2 text-right">{formatINR(r.b61_90)}</td>
                    <td className="p-2 text-right text-red-700 font-bold">{formatINR(r.b90p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Loss-making Invoices */}
      {lossMakingInvoices.length > 0 && (
        <div className="glass-surface-regular rounded-2xl border border-red-200 p-5 space-y-3 shadow-xs">
          <h3 className="text-sm font-bold text-red-800">Loss-Making Invoices Flagged</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-red-50 text-red-900 font-bold">
                  <th className="p-2 text-left">Inv No.</th>
                  <th className="p-2 text-left">Species Head</th>
                  <th className="p-2 text-right">Sales (INR)</th>
                  <th className="p-2 text-right">Direct Expenses</th>
                  <th className="p-2 text-right">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lossMakingInvoices.map((r) => (
                  <tr key={r.id}>
                    <td className="p-2 font-mono font-bold">{r.invoiceNo}</td>
                    <td className="p-2">{r.speciesHeadName}</td>
                    <td className="p-2 text-right">{formatINR(r.salesAmountINR)}</td>
                    <td className="p-2 text-right">{formatINR(r.exp)}</td>
                    <td className="p-2 text-right text-red-700 font-bold">{formatINR(r.netBeforePurchase, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
