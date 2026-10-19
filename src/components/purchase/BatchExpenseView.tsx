import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, formatKg } from '../../utils/calculations';
import { Layers, RefreshCw, AlertTriangle, Info } from 'lucide-react';

export const BatchExpenseView: React.FC = () => {
  const { purchases, species, expenseTypes, recalculateBatch } = useData();

  // Find all distinct batches
  const batches = Array.from(
    new Set(purchases.filter((p) => p.batchNo && !p.isVoided).map((p) => p.batchNo!))
  );

  const [selectedBatch, setSelectedBatch] = useState<string>(batches[0] || '');

  const speciesMap = new Map(species.map((s) => [s.id, s]));
  const expenseTypeMap = new Map(expenseTypes.map((e) => [e.id, e]));

  const batchPurchases = purchases.filter((p) => p.batchNo === selectedBatch && !p.isVoided);
  const totalBatchWeight = batchPurchases.reduce((sum, p) => sum + p.weightKg, 0);

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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Concept Explanation */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-900">Shared Batch Expense Allocation Engine</h2>
              <p className="text-xs text-ink-500">
                Proportionally divides shared landing expenses (ice, vehicle rent, porters) across batched species by weight.
              </p>
            </div>
          </div>

          {selectedBatch && (
            <button
              onClick={() => recalculateBatch(selectedBatch)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recalculate Batch Split</span>
            </button>
          )}
        </div>

        {/* Batch Selector Pills */}
        <div className="mt-5 flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100">
          <span className="text-xs font-semibold text-ink-500 mr-2">Active Batches:</span>
          {batches.length === 0 ? (
            <span className="text-xs text-ink-500 italic">No batches created yet. Add a Batch No. on the purchase entry form.</span>
          ) : (
            batches.map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBatch(b)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  selectedBatch === b
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-gray-50 text-ink-700 border-gray-200 hover:bg-rose-50'
                }`}
              >
                {b}
              </button>
            ))
          )}
        </div>
      </div>

      {selectedBatch && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
          {/* Batch Status Banner */}
          <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-ink-900">Batch Identifier: {selectedBatch}</span>
              <span className="text-ink-500">({batchPurchases.length} seafood items pooled)</span>
              {isAlreadyAllocated && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Allocated Proportional to Weight
                </span>
              )}
            </div>
            <div className="font-bold text-rose-700">
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

          {/* Table matching Section 6 Worked Example */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-rose-50/40 border-b border-rose-100 text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Item &amp; ID</th>
                  <th className="py-3 px-4">Species</th>
                  <th className="py-3 px-4 text-right">Weight (Kg)</th>
                  <th className="py-3 px-4 text-right">Share of Batch</th>
                  {expenseKeys.map((k) => (
                    <th key={k} className="py-3 px-4 text-right">
                      {expenseTypeMap.get(k)?.name || k} (Allocated)
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right">Total Landed Cost</th>
                  <th className="py-3 px-4 text-right">Effective Rate/Kg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-ink-900 font-medium">
                {batchPurchases.map((p, index) => {
                  const spec = speciesMap.get(p.speciesId);
                  const sharePct = totalBatchWeight > 0 ? (p.weightKg / totalBatchWeight) * 100 : 0;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3 px-4 font-bold text-rose-700">
                        Item {index + 1} ({p.purchaseId})
                      </td>
                      <td className="py-3 px-4 font-semibold text-ink-900">
                        {spec?.name || 'Seafood'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {p.weightKg.toLocaleString('en-IN')} Kg
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-800">
                        {sharePct.toFixed(1)}%
                      </td>
                      {expenseKeys.map((k) => (
                        <td key={k} className="py-3 px-4 text-right text-ink-700">
                          {formatINR(p.expenseBreakdown?.[k] || 0)}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right font-bold text-rose-900">
                        {formatINR(p.totalCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-ink-900">
                        ₹{p.effectiveRatePerKg.toFixed(2)} / Kg
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs text-ink-900">
                  <td colSpan={2} className="py-3 px-4">
                    Batch Total Pool
                  </td>
                  <td className="py-3 px-4 text-right text-rose-700">
                    {formatKg(totalBatchWeight)}
                  </td>
                  <td className="py-3 px-4 text-right text-amber-800">100.0%</td>
                  {expenseKeys.map((k) => {
                    const sum = batchPurchases.reduce((s, p) => s + (p.expenseBreakdown?.[k] || 0), 0);
                    return (
                      <td key={k} className="py-3 px-4 text-right text-ink-900">
                        {formatINR(sum)}
                      </td>
                    );
                  })}
                  <td className="py-3 px-4 text-right text-rose-900">
                    {formatINR(batchPurchases.reduce((s, p) => s + p.totalCost, 0))}
                  </td>
                  <td className="py-3 px-4 text-right text-ink-500">—</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="p-4 bg-gray-50/40 border-t border-gray-100 text-[11px] text-ink-500 flex items-center gap-2">
            <Info className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Operational Principle:</strong> Shared bills entered on any single item automatically distribute across all rows by weight proportion, preventing double-counting while ensuring true landed margin accuracy.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
