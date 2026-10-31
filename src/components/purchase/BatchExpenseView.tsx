import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, formatKg } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
import { RefreshCw, AlertTriangle, Info, Sparkles, Percent, Scale, Trash2, CheckCircle2 } from 'lucide-react';

export const BatchExpenseView: React.FC = () => {
  const { purchases, species, expenseTypes, recalculateBatch, allocateBatchYield, clearBatchYield } = useData();

  // Find all distinct batches
  const batches = Array.from(
    new Set(purchases.filter((p) => p.batchNo && !p.isVoided).map((p) => p.batchNo!))
  );

  const [selectedBatch, setSelectedBatch] = useState<string>(batches[0] || '');

  // Keep selectedBatch valid when batches change
  useEffect(() => {
    if (!selectedBatch && batches.length > 0) {
      setSelectedBatch(batches[0]);
    } else if (selectedBatch && !batches.includes(selectedBatch) && batches.length > 0) {
      setSelectedBatch(batches[0]);
    }
  }, [batches, selectedBatch]);

  const speciesMap = new Map(species.map((s) => [s.id, s]));
  const expenseTypeMap = new Map(expenseTypes.map((e) => [e.id, e]));

  const batchPurchases = purchases.filter((p) => p.batchNo === selectedBatch && !p.isVoided);
  const totalBatchWeight = batchPurchases.reduce((sum, p) => sum + p.weightKg, 0);
  const totalBatchCost = batchPurchases.reduce((sum, p) => sum + p.totalCost, 0);

  // Batch Yield Status & Calculations
  const hasBatchYieldAllocated = batchPurchases.length > 0 && batchPurchases.some((p) => p.isBatchYieldAllocated);
  const currentBatchYieldWeightKg =
    batchPurchases.find((p) => p.batchYieldWeightKg && p.batchYieldWeightKg > 0)?.batchYieldWeightKg ||
    batchPurchases.reduce((sum, p) => sum + (p.yieldWeightKg || 0), 0);
  const currentBatchYieldPct =
    totalBatchWeight > 0 && currentBatchYieldWeightKg > 0
      ? Number(((currentBatchYieldWeightKg / totalBatchWeight) * 100).toFixed(2))
      : 0;
  const currentBatchLossKg = Math.max(0, totalBatchWeight - currentBatchYieldWeightKg);
  const currentFinishedMeatCostPerKg =
    currentBatchYieldWeightKg > 0 && totalBatchCost > 0
      ? Number((totalBatchCost / currentBatchYieldWeightKg).toFixed(2))
      : 0;

  // Interactive Form State for Batch Yield Entry
  const [yieldWeightInput, setYieldWeightInput] = useState<string>('');
  const [yieldPctInput, setYieldPctInput] = useState<string>('');

  // Sync inputs when selected batch changes
  useEffect(() => {
    if (currentBatchYieldWeightKg > 0) {
      setYieldWeightInput(String(currentBatchYieldWeightKg));
      setYieldPctInput(currentBatchYieldPct.toFixed(2));
    } else {
      setYieldWeightInput('');
      setYieldPctInput('');
    }
  }, [selectedBatch, currentBatchYieldWeightKg, currentBatchYieldPct]);

  // Handle typing in Yield Weight (Kg)
  const handleYieldWeightChange = (valStr: string) => {
    setYieldWeightInput(valStr);
    const numVal = parseFloat(valStr);
    if (!isNaN(numVal) && numVal > 0 && totalBatchWeight > 0) {
      const derivedPct = (numVal / totalBatchWeight) * 100;
      setYieldPctInput(derivedPct.toFixed(2));
    } else if (!valStr) {
      setYieldPctInput('');
    }
  };

  // Handle typing in Yield %
  const handleYieldPctChange = (valStr: string) => {
    setYieldPctInput(valStr);
    const numVal = parseFloat(valStr);
    if (!isNaN(numVal) && numVal > 0 && totalBatchWeight > 0) {
      const derivedKg = (totalBatchWeight * numVal) / 100;
      setYieldWeightInput(derivedKg.toFixed(2));
    } else if (!valStr) {
      setYieldWeightInput('');
    }
  };

  const handleApplyBatchYield = () => {
    if (!selectedBatch) return;
    const kg = parseFloat(yieldWeightInput);
    const pct = parseFloat(yieldPctInput);
    allocateBatchYield(selectedBatch, !isNaN(kg) && kg > 0 ? kg : undefined, !isNaN(pct) && pct > 0 ? pct : undefined);
  };

  const handleClearBatchYield = () => {
    if (!selectedBatch) return;
    clearBatchYield(selectedBatch);
    setYieldWeightInput('');
    setYieldPctInput('');
  };

  // Collect distinct expense types in this batch
  const expenseKeys = Array.from(
    new Set(
      batchPurchases.flatMap((p) => Object.keys(p.expenseBreakdown || {}))
    )
  );

  // Check for duplicate entry warnings (suppressed when already allocated)
  const isAlreadyAllocated = batchPurchases.length > 0 && batchPurchases.every((p) => p.isBatchAllocated);
  const warnings: string[] = [];
  if (!isAlreadyAllocated) {
    expenseKeys.forEach((key) => {
      const nonZeroCount = batchPurchases.filter((p) => (p.expenseBreakdown?.[key] || 0) > 0).length;
      if (nonZeroCount > 1) {
        const expName = expenseTypeMap.get(key)?.name || key;
        warnings.push(`Warning: Expense head "${expName}" is entered non-zero on ${nonZeroCount} rows in this batch before allocation. Please verify.`);
      }
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-liquid-up">
      {/* Header Block */}
      <PageHeader
        title="Unified batch expenses & yield apportionment engine"
        subtitle="When lots share the same Batch No, both landing expenses (ice, freight, dalali) and whole-batch finished meat yield are pooled and apportioned proportionally based on each item's intake weight (Kg)."
        breadcrumbs={['Purchase', 'Batch Expenses & Yield Engine']}
        primaryAction={
          selectedBatch
            ? {
                label: 'Apportion Expenses & Yield by Kg',
                onClick: () => recalculateBatch(selectedBatch),
                icon: RefreshCw
              }
            : undefined
        }
      />

      {/* Batch Selector Card */}
      <div className="glass-surface-regular p-5 rounded-2xl shadow-xs border border-white/80 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink-900 mr-2 uppercase tracking-wider">Active Procurement Batches:</span>
          {batches.length === 0 ? (
            <span className="text-xs text-ink-500 italic">No batches created yet. Add a Batch No. on the purchase entry form or via Excel import.</span>
          ) : (
            batches.map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBatch(b)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                  selectedBatch === b
                    ? 'bg-rose-700 text-white border-rose-700 shadow-xs btn-liquid'
                    : 'bg-white/80 text-ink-700 border-gray-200 hover:bg-rose-50 btn-secondary-liquid'
                }`}
              >
                Batch {b}
              </button>
            ))
          )}
        </div>
      </div>

      {selectedBatch && (
        <div className="space-y-6">
          {/* 1. BATCH YIELD RECOVERY & VALUATION CARD */}
          <div className="glass-surface-blush p-6 rounded-2xl border border-rose-200/90 shadow-sm space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-extrabold text-ink-900 tracking-tight">
                    Batch Finished Yield &amp; Peeling Recovery Pool
                  </h3>
                  {hasBatchYieldAllocated ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      Batch Yield Active ({currentBatchYieldPct.toFixed(1)}%)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      Not Yet Allocated
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-600 max-w-3xl leading-relaxed">
                  When seafood is purchased in batches across grades or sizes, factory peeling/processing yield is measured for the <strong>whole batch together</strong>. Enter the batch finished weight or recovery percentage below to automatically apportion finished yield proportionally across every item in this batch.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {hasBatchYieldAllocated && (
                  <button
                    onClick={handleClearBatchYield}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-100/70 border border-rose-200 flex items-center gap-1.5 transition btn-secondary-liquid"
                    title="Remove batch yield allocation from this batch"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear Yield
                  </button>
                )}
                <button
                  onClick={handleApplyBatchYield}
                  disabled={!yieldWeightInput && !yieldPctInput}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs flex items-center gap-1.5 transition btn-liquid"
                >
                  <Scale className="w-3.5 h-3.5" />
                  {hasBatchYieldAllocated ? 'Update Batch Yield' : 'Allocate Batch Yield'}
                </button>
              </div>
            </div>

            {/* Live KPI Grid for Batch Yield */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-white/90 rounded-xl border border-gray-200/90 shadow-2xs">
                <span className="text-[10px] font-bold text-ink-500 uppercase block">Raw Batch Intake</span>
                <span className="text-base font-extrabold text-ink-900 mt-0.5 block tabular-nums">
                  {formatKg(totalBatchWeight)}
                </span>
                <span className="text-[10px] text-gray-500 block mt-0.5 font-medium">
                  {batchPurchases.length} lots pooled
                </span>
              </div>

              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Batch Finished Yield</span>
                <span className="text-base font-extrabold text-emerald-900 mt-0.5 block tabular-nums">
                  {currentBatchYieldWeightKg > 0 ? formatKg(currentBatchYieldWeightKg) : '—'}
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5 font-medium">
                  {currentBatchYieldWeightKg > 0 ? 'Peeled / Processed' : 'Pending Entry'}
                </span>
              </div>

              <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 shadow-2xs">
                <span className="text-[10px] font-bold text-rose-800 uppercase block">Batch Recovery %</span>
                <span className="text-base font-black text-rose-700 mt-0.5 block tabular-nums">
                  {currentBatchYieldPct > 0 ? `${currentBatchYieldPct.toFixed(2)}%` : '—'}
                </span>
                <span className="text-[10px] text-rose-700 block mt-0.5 font-medium">
                  {currentBatchLossKg > 0 && currentBatchYieldWeightKg > 0 ? `Loss: ${formatKg(currentBatchLossKg)}` : 'Apportioned to all lots'}
                </span>
              </div>

              <div className="p-3 bg-white/90 rounded-xl border border-emerald-300 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-900 uppercase block">Finished Meat Cost / Kg</span>
                <span className="text-base font-black text-emerald-800 mt-0.5 block tabular-nums">
                  {currentFinishedMeatCostPerKg > 0 ? `₹${currentFinishedMeatCostPerKg.toFixed(2)}` : '—'}
                </span>
                <span className="text-[10px] text-gray-500 block mt-0.5 font-medium">
                  Landed Total: {formatINR(totalBatchCost)}
                </span>
              </div>
            </div>

            {/* Interactive Batch Yield Input Row */}
            <div className="bg-white/80 p-4 rounded-xl border border-rose-100 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-bold text-ink-800 mb-1">
                  Batch Finished Meat Weight (Kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={`e.g. ${(totalBatchWeight * 0.52).toFixed(0)}`}
                    value={yieldWeightInput}
                    onChange={(e) => handleYieldWeightChange(e.target.value)}
                    className="w-full text-xs font-bold text-ink-900 px-3 py-2 bg-emerald-50/40 border border-emerald-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                  />
                  <span className="absolute right-3 top-2 text-[11px] font-bold text-gray-500">Kg</span>
                </div>
              </div>

              <div className="flex items-center text-xs font-bold text-gray-400 self-end mb-2.5">
                OR
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-bold text-ink-800 mb-1 flex items-center gap-1">
                  <Percent className="w-3 h-3 text-emerald-600" />
                  Batch Yield Recovery %
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g. 52.00"
                    value={yieldPctInput}
                    onChange={(e) => handleYieldPctChange(e.target.value)}
                    className="w-full text-xs font-bold text-ink-900 px-3 py-2 bg-emerald-50/40 border border-emerald-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                  />
                  <span className="absolute right-3 top-2 text-[11px] font-bold text-gray-500">%</span>
                </div>
              </div>

              <div className="self-end mb-0.5">
                <button
                  onClick={handleApplyBatchYield}
                  disabled={!yieldWeightInput && !yieldPctInput}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs flex items-center gap-1.5 transition btn-liquid"
                >
                  <Scale className="w-3.5 h-3.5" />
                  Apportion Yield
                </button>
              </div>
            </div>
          </div>

          {/* 2. BATCH DETAILS & COMBINED ALLOCATION TABLE */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
            {/* Batch Status Banner */}
            <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-ink-900">Batch Identifier: {selectedBatch}</span>
                <span className="text-ink-500 font-medium">({batchPurchases.length} seafood items pooled)</span>
                {isAlreadyAllocated && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Landing Expenses Allocated
                  </span>
                )}
                {hasBatchYieldAllocated && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Batch Yield Allocated ({currentBatchYieldPct.toFixed(1)}%)
                  </span>
                )}
              </div>
              <div className="font-bold text-rose-700 tabular-nums">
                Total Weight Pool: {formatKg(totalBatchWeight)}
              </div>
            </div>

            {/* Warnings Banner if any */}
            {warnings.length > 0 && (
              <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 space-y-1">
                {warnings.map((w, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Table matching Section 6 Worked Example + Batch Yield */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-rose-50/40 border-b border-rose-100 text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Item &amp; ID</th>
                    <th className="py-3 px-4">Species</th>
                    <th className="py-3 px-4 text-right">Intake Weight (Kg)</th>
                    <th className="py-3 px-4 text-right">Batch Share</th>
                    {expenseKeys.map((k) => (
                      <th key={k} className="py-3 px-4 text-right">
                        {expenseTypeMap.get(k)?.name || k} (Allocated)
                      </th>
                    ))}
                    <th className="py-3 px-4 text-right bg-emerald-50/40 text-emerald-900">
                      Allocated Yield (Kg)
                    </th>
                    <th className="py-3 px-4 text-right bg-emerald-50/40 text-emerald-900">
                      Yield %
                    </th>
                    <th className="py-3 px-4 text-right bg-emerald-50/40 text-emerald-900">
                      Finished Cost / Kg
                    </th>
                    <th className="py-3 px-4 text-right">Total Landed Cost</th>
                    <th className="py-3 px-4 text-right">Raw Rate/Kg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-ink-900 font-medium">
                  {batchPurchases.map((p, index) => {
                    const spec = speciesMap.get(p.speciesId);
                    const sharePct = totalBatchWeight > 0 ? (p.weightKg / totalBatchWeight) * 100 : 0;
                    const itemYieldKg = p.yieldWeightKg || 0;
                    const itemYieldPct = p.yieldPct || (p.weightKg > 0 && itemYieldKg > 0 ? (itemYieldKg / p.weightKg) * 100 : 0);
                    const itemFinishedCost = itemYieldKg > 0 && p.totalCost > 0 ? p.totalCost / itemYieldKg : 0;

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/60 transition">
                        <td className="py-3 px-4 font-bold text-rose-700">
                          Item {index + 1} ({p.purchaseId})
                          {p.isBatchYieldAllocated && (
                            <span className="block text-[9px] font-extrabold text-emerald-700 uppercase tracking-tight">
                              Batch Apportioned
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-ink-900">
                          {spec?.name || 'Seafood'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums">
                          {formatKg(p.weightKg)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-amber-800 tabular-nums">
                          {sharePct.toFixed(1)}%
                        </td>
                        {expenseKeys.map((k) => (
                          <td key={k} className="py-3 px-4 text-right text-ink-700 tabular-nums">
                            {formatINR(p.expenseBreakdown?.[k] || 0)}
                          </td>
                        ))}
                        <td className="py-3 px-4 text-right font-extrabold text-emerald-800 tabular-nums bg-emerald-50/20">
                          {itemYieldKg > 0 ? formatKg(itemYieldKg) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-900 tabular-nums bg-emerald-50/20">
                          {itemYieldPct > 0 ? `${itemYieldPct.toFixed(2)}%` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-800 tabular-nums bg-emerald-50/20">
                          {itemFinishedCost > 0 ? `₹${itemFinishedCost.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-900 tabular-nums">
                          {formatINR(p.totalCost)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-ink-900 tabular-nums">
                          ₹{p.effectiveRatePerKg.toFixed(2)} / Kg
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs text-ink-900">
                    <td colSpan={2} className="py-3 px-4 uppercase text-[11px]">
                      Batch Total Pool
                    </td>
                    <td className="py-3 px-4 text-right text-rose-700 tabular-nums">
                      {formatKg(totalBatchWeight)}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-800 tabular-nums">100.0%</td>
                    {expenseKeys.map((k) => {
                      const sum = batchPurchases.reduce((s, p) => s + (p.expenseBreakdown?.[k] || 0), 0);
                      return (
                        <td key={k} className="py-3 px-4 text-right text-ink-900 tabular-nums">
                          {formatINR(sum)}
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-right text-emerald-800 tabular-nums bg-emerald-50/30">
                      {currentBatchYieldWeightKg > 0 ? formatKg(currentBatchYieldWeightKg) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-900 tabular-nums bg-emerald-50/30">
                      {currentBatchYieldPct > 0 ? `${currentBatchYieldPct.toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-800 tabular-nums bg-emerald-50/30">
                      {currentFinishedMeatCostPerKg > 0 ? `₹${currentFinishedMeatCostPerKg.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-900 tabular-nums">
                      {formatINR(totalBatchCost)}
                    </td>
                    <td className="py-3 px-4 text-right text-ink-500">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-4 bg-gray-50/40 border-t border-gray-100 text-[11px] text-ink-500 flex items-center gap-2">
              <Info className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Batch Processing Principle:</strong> When goods are purchased in batches, shared landing bills and total factory finished meat yields distribute across all items strictly in proportion to their raw intake weight, ensuring precise valuation and flawless factory export pricing.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
