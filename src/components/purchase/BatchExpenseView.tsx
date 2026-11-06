import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, formatKg } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
import { RefreshCw, AlertTriangle, Info, Sparkles, Percent, Scale, Trash2, CheckCircle2, Receipt } from 'lucide-react';

export const BatchExpenseView: React.FC = () => {
  const {
    purchases,
    species,
    expenseTypes,
    recalculateExpenseBatch,
    allocateBatchYield,
    clearBatchYield
  } = useData();

  // Mode: independent Expense Batching vs independent Yield Batching
  const [activeTab, setActiveTab] = useState<'expenses' | 'yield'>('expenses');

  // Distinct Expense Batches (support expenseBatchNo and legacy batchNo fallback)
  const expenseBatches = Array.from(
    new Set(
      purchases
        .filter((p) => (p.expenseBatchNo || p.batchNo) && !p.isVoided)
        .map((p) => (p.expenseBatchNo || p.batchNo)!)
    )
  );

  // Distinct Yield Batches (support yieldBatchNo and legacy batchNo fallback)
  const yieldBatches = Array.from(
    new Set(
      purchases
        .filter((p) => (p.yieldBatchNo || p.batchNo) && !p.isVoided)
        .map((p) => (p.yieldBatchNo || p.batchNo)!)
    )
  );

  const [selectedExpenseBatch, setSelectedExpenseBatch] = useState<string>(expenseBatches[0] || '');
  const [selectedYieldBatch, setSelectedYieldBatch] = useState<string>(yieldBatches[0] || '');

  // Keep selectedExpenseBatch valid
  useEffect(() => {
    if (!selectedExpenseBatch && expenseBatches.length > 0) {
      setSelectedExpenseBatch(expenseBatches[0]);
    } else if (selectedExpenseBatch && !expenseBatches.includes(selectedExpenseBatch) && expenseBatches.length > 0) {
      setSelectedExpenseBatch(expenseBatches[0]);
    }
  }, [expenseBatches, selectedExpenseBatch]);

  // Keep selectedYieldBatch valid
  useEffect(() => {
    if (!selectedYieldBatch && yieldBatches.length > 0) {
      setSelectedYieldBatch(yieldBatches[0]);
    } else if (selectedYieldBatch && !yieldBatches.includes(selectedYieldBatch) && yieldBatches.length > 0) {
      setSelectedYieldBatch(yieldBatches[0]);
    }
  }, [yieldBatches, selectedYieldBatch]);

  const speciesMap = new Map(species.map((s) => [s.id, s]));
  const expenseTypeMap = new Map(expenseTypes.map((e) => [e.id, e]));

  // --------------------------------------------------------------------------
  // 1. EXPENSE BATCH DATA & METRICS
  // --------------------------------------------------------------------------
  const expBatchPurchases = purchases.filter(
    (p) => (p.expenseBatchNo === selectedExpenseBatch || p.batchNo === selectedExpenseBatch) && !p.isVoided
  );
  const totalExpBatchWeight = expBatchPurchases.reduce((sum, p) => sum + p.weightKg, 0);
  const totalExpBatchCost = expBatchPurchases.reduce((sum, p) => sum + p.totalCost, 0);
  const totalExpBatchExpenses = expBatchPurchases.reduce((sum, p) => sum + p.totalExpenses, 0);

  const expExpenseKeys = Array.from(
    new Set(expBatchPurchases.flatMap((p) => Object.keys(p.expenseBreakdown || {})))
  );

  const isExpAlreadyAllocated =
    expBatchPurchases.length > 0 && expBatchPurchases.every((p) => p.isBatchAllocated);

  const expWarnings: string[] = [];
  if (!isExpAlreadyAllocated) {
    expExpenseKeys.forEach((key) => {
      const nonZeroCount = expBatchPurchases.filter((p) => (p.expenseBreakdown?.[key] || 0) > 0).length;
      if (nonZeroCount > 1) {
        const expName = expenseTypeMap.get(key)?.name || key;
        expWarnings.push(
          `Warning: Expense head "${expName}" is entered non-zero on ${nonZeroCount} rows in this batch before allocation. Please verify.`
        );
      }
    });
  }

  // --------------------------------------------------------------------------
  // 2. YIELD BATCH DATA & METRICS
  // --------------------------------------------------------------------------
  const yldBatchPurchases = purchases.filter(
    (p) => (p.yieldBatchNo === selectedYieldBatch || p.batchNo === selectedYieldBatch) && !p.isVoided
  );
  const totalYldBatchWeight = yldBatchPurchases.reduce((sum, p) => sum + p.weightKg, 0);
  const totalYldBatchCost = yldBatchPurchases.reduce((sum, p) => sum + p.totalCost, 0);

  const hasYldAllocated = yldBatchPurchases.length > 0 && yldBatchPurchases.some((p) => p.isBatchYieldAllocated);
  const currentYldWeightKg =
    yldBatchPurchases.find((p) => p.batchYieldWeightKg && p.batchYieldWeightKg > 0)?.batchYieldWeightKg ||
    yldBatchPurchases.reduce((sum, p) => sum + (p.yieldWeightKg || 0), 0);
  const currentYldPct =
    totalYldBatchWeight > 0 && currentYldWeightKg > 0
      ? Number(((currentYldWeightKg / totalYldBatchWeight) * 100).toFixed(2))
      : 0;
  const currentYldLossKg = Math.max(0, totalYldBatchWeight - currentYldWeightKg);
  const currentFinishedCostPerKg =
    currentYldWeightKg > 0 && totalYldBatchCost > 0
      ? Number((totalYldBatchCost / currentYldWeightKg).toFixed(2))
      : 0;

  // Interactive Form State for Yield Entry
  const [yieldWeightInput, setYieldWeightInput] = useState<string>('');
  const [yieldPctInput, setYieldPctInput] = useState<string>('');

  useEffect(() => {
    if (currentYldWeightKg > 0) {
      setYieldWeightInput(String(currentYldWeightKg));
      setYieldPctInput(currentYldPct.toFixed(2));
    } else {
      setYieldWeightInput('');
      setYieldPctInput('');
    }
  }, [selectedYieldBatch, currentYldWeightKg, currentYldPct]);

  const handleYieldWeightChange = (valStr: string) => {
    setYieldWeightInput(valStr);
    const numVal = parseFloat(valStr);
    if (!isNaN(numVal) && numVal > 0 && totalYldBatchWeight > 0) {
      const derivedPct = (numVal / totalYldBatchWeight) * 100;
      setYieldPctInput(derivedPct.toFixed(2));
    } else if (!valStr) {
      setYieldPctInput('');
    }
  };

  const handleYieldPctChange = (valStr: string) => {
    setYieldPctInput(valStr);
    const numVal = parseFloat(valStr);
    if (!isNaN(numVal) && numVal > 0 && totalYldBatchWeight > 0) {
      const derivedKg = (totalYldBatchWeight * numVal) / 100;
      setYieldWeightInput(derivedKg.toFixed(2));
    } else if (!valStr) {
      setYieldWeightInput('');
    }
  };

  const handleApplyYield = () => {
    if (!selectedYieldBatch) return;
    const kg = parseFloat(yieldWeightInput);
    const pct = parseFloat(yieldPctInput);
    allocateBatchYield(
      selectedYieldBatch,
      !isNaN(kg) && kg > 0 ? kg : undefined,
      !isNaN(pct) && pct > 0 ? pct : undefined
    );
  };

  const handleClearYield = () => {
    if (!selectedYieldBatch) return;
    clearBatchYield(selectedYieldBatch);
    setYieldWeightInput('');
    setYieldPctInput('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-liquid-up">
      {/* Header Block */}
      <PageHeader
        title="Decoupled batch expenses & yield engine"
        subtitle="Process shared landing expenses and processing meat recovery yields independently. Apportioning an Expense Batch distributes landing bills without touching yields; allocating a Yield Batch distributes finished meat recovery without altering costs."
        breadcrumbs={['Purchase', 'Batch Expenses & Yield']}
        primaryAction={
          activeTab === 'expenses' && selectedExpenseBatch
            ? {
                label: 'Apportion Landing Expenses by Kg',
                onClick: () => recalculateExpenseBatch(selectedExpenseBatch),
                icon: RefreshCw
              }
            : activeTab === 'yield' && selectedYieldBatch
            ? {
                label: hasYldAllocated ? 'Update Yield Batch' : 'Apportion Yield Batch by Kg',
                onClick: handleApplyYield,
                icon: Scale
              }
            : undefined
        }
      />

      {/* Mode / Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'expenses'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-ink-600 hover:text-ink-900 hover:bg-gray-100'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Expense Batch Processing</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'expenses' ? 'bg-amber-700 text-amber-100' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {expenseBatches.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('yield')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'yield'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-ink-600 hover:text-ink-900 hover:bg-gray-100'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Yield Batch Processing</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'yield' ? 'bg-emerald-700 text-emerald-100' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {yieldBatches.length}
            </span>
          </button>
        </div>

        <div className="text-[11px] font-semibold text-ink-500 flex items-center gap-1.5 px-3">
          <Info className="w-3.5 h-3.5 text-rose-600" />
          <span>
            {activeTab === 'expenses'
              ? 'Only landing expenses are pooled and apportioned across this expense batch.'
              : 'Only finished meat yield (Kg / %) is pooled and apportioned across this yield batch.'}
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. EXPENSE BATCH PROCESSING TAB                                     */}
      {/* ==================================================================== */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Expense Batch Selector Card */}
          <div className="glass-surface-regular p-5 rounded-2xl shadow-xs border border-white/80 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-amber-900 mr-2 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-amber-600" />
                Active Expense Batches:
              </span>
              {expenseBatches.length === 0 ? (
                <span className="text-xs text-ink-500 italic">
                  No expense batches created yet. Add an Expense Batch No. on the purchase entry form or via Excel import.
                </span>
              ) : (
                expenseBatches.map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedExpenseBatch(b)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                      selectedExpenseBatch === b
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white/80 text-ink-700 border-gray-200 hover:bg-amber-50'
                    }`}
                  >
                    Expense Batch: {b}
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedExpenseBatch && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-ink-500 uppercase block">Total Intake Weight</span>
                  <span className="text-base font-extrabold text-ink-900 mt-0.5 block tabular-nums">
                    {formatKg(totalExpBatchWeight)}
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-0.5 font-medium">
                    {expBatchPurchases.length} lots in pool
                  </span>
                </div>

                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-amber-900 uppercase block">Pooled Landing Expenses</span>
                  <span className="text-base font-extrabold text-amber-800 mt-0.5 block tabular-nums">
                    {formatINR(totalExpBatchExpenses)}
                  </span>
                  <span className="text-[10px] text-amber-700 block mt-0.5 font-medium">
                    {expExpenseKeys.length} expense heads
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-ink-500 uppercase block">Total Landed Cost</span>
                  <span className="text-base font-black text-rose-700 mt-0.5 block tabular-nums">
                    {formatINR(totalExpBatchCost)}
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-0.5 font-medium">
                    Gross Purchase + Expenses
                  </span>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-900 uppercase block">Allocation Status</span>
                  <span className="text-sm font-black text-emerald-800 mt-1 block">
                    {isExpAlreadyAllocated ? 'Fully Apportioned' : 'Pending Recalculation'}
                  </span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5 font-medium">
                    Proportional by Kg
                  </span>
                </div>
              </div>

              {/* Table of Lots sharing this Expense Batch */}
              <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
                <div className="p-4 bg-amber-50/50 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-amber-900">Expense Batch: {selectedExpenseBatch}</span>
                    <span className="text-ink-500 font-medium">({expBatchPurchases.length} purchase lots)</span>
                    {isExpAlreadyAllocated && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Expenses Allocated
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => recalculateExpenseBatch(selectedExpenseBatch)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Re-apportion Expenses
                  </button>
                </div>

                {expWarnings.length > 0 && (
                  <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 space-y-1">
                    {expWarnings.map((w, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-amber-50/30 border-b border-amber-100 text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Item &amp; ID</th>
                        <th className="py-3 px-4">Species</th>
                        <th className="py-3 px-4 text-right">Intake Weight (Kg)</th>
                        <th className="py-3 px-4 text-right">Expense Share</th>
                        {expExpenseKeys.map((k) => (
                          <th key={k} className="py-3 px-4 text-right">
                            {expenseTypeMap.get(k)?.name || k} (₹)
                          </th>
                        ))}
                        <th className="py-3 px-4 text-right bg-amber-50/60 text-amber-900 font-extrabold">
                          Total Expenses (₹)
                        </th>
                        <th className="py-3 px-4 text-right">Total Landed Cost</th>
                        <th className="py-3 px-4 text-right">Effective Rate/Kg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-ink-900 font-medium">
                      {expBatchPurchases.map((p, index) => {
                        const spec = speciesMap.get(p.speciesId);
                        const sharePct = totalExpBatchWeight > 0 ? (p.weightKg / totalExpBatchWeight) * 100 : 0;

                        return (
                          <tr key={p.id} className="hover:bg-amber-50/20 transition">
                            <td className="py-3 px-4 font-bold text-amber-900">
                              Item {index + 1} ({p.purchaseId})
                              {p.yieldBatchNo && (
                                <span className="block text-[9px] font-bold text-emerald-700">
                                  Yield Batch: {p.yieldBatchNo}
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
                            {expExpenseKeys.map((k) => (
                              <td key={k} className="py-3 px-4 text-right text-ink-700 tabular-nums">
                                {formatINR(p.expenseBreakdown?.[k] || 0)}
                              </td>
                            ))}
                            <td className="py-3 px-4 text-right font-black text-amber-900 tabular-nums bg-amber-50/40">
                              {formatINR(p.totalExpenses)}
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
                      <tr className="bg-amber-50/40 border-t-2 border-amber-200 font-bold text-xs text-ink-900">
                        <td colSpan={2} className="py-3 px-4 uppercase text-[11px] text-amber-900">
                          Expense Pool Total
                        </td>
                        <td className="py-3 px-4 text-right text-amber-900 tabular-nums">
                          {formatKg(totalExpBatchWeight)}
                        </td>
                        <td className="py-3 px-4 text-right text-amber-800 tabular-nums">100.0%</td>
                        {expExpenseKeys.map((k) => {
                          const sum = expBatchPurchases.reduce((s, p) => s + (p.expenseBreakdown?.[k] || 0), 0);
                          return (
                            <td key={k} className="py-3 px-4 text-right text-ink-900 tabular-nums">
                              {formatINR(sum)}
                            </td>
                          );
                        })}
                        <td className="py-3 px-4 text-right text-amber-900 tabular-nums bg-amber-100/60 font-black">
                          {formatINR(totalExpBatchExpenses)}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-900 tabular-nums">
                          {formatINR(totalExpBatchCost)}
                        </td>
                        <td className="py-3 px-4 text-right text-ink-500">—</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="p-4 bg-amber-50/20 border-t border-amber-100 text-[11px] text-ink-500 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Expense Batch Rule:</strong> Landing expenses (freight, ice, labour, dalali) entered on any row of this expense batch are pooled and apportioned strictly proportional to raw intake weight (Kg). Finished yield is calculated separately in the Yield Batch Engine.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. YIELD BATCH PROCESSING TAB                                       */}
      {/* ==================================================================== */}
      {activeTab === 'yield' && (
        <div className="space-y-6">
          {/* Yield Batch Selector Card */}
          <div className="glass-surface-regular p-5 rounded-2xl shadow-xs border border-white/80 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-emerald-900 mr-2 uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-emerald-600" />
                Active Yield Batches:
              </span>
              {yieldBatches.length === 0 ? (
                <span className="text-xs text-ink-500 italic">
                  No yield batches created yet. Add a Yield Batch No. on the purchase entry form or via Excel import.
                </span>
              ) : (
                yieldBatches.map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedYieldBatch(b)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                      selectedYieldBatch === b
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white/80 text-ink-700 border-gray-200 hover:bg-emerald-50'
                    }`}
                  >
                    Yield Batch: {b}
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedYieldBatch && (
            <div className="space-y-6">
              {/* Batch Yield Card with Interactive Entry */}
              <div className="glass-surface-blush p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </span>
                      <h3 className="text-sm font-extrabold text-ink-900 tracking-tight">
                        Whole-Batch Finished Meat Recovery Pool
                      </h3>
                      {hasYldAllocated ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          Yield Active ({currentYldPct.toFixed(1)}%)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Pending Allocation
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-600 max-w-3xl leading-relaxed">
                      Enter the factory finished meat recovery weight (Kg) or percentage below. It will be apportioned
                      proportionally based on raw weight strictly across lots sharing this <strong>Yield Batch</strong>. Expenses are NOT affected.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {hasYldAllocated && (
                      <button
                        onClick={handleClearYield}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-100/70 border border-rose-200 flex items-center gap-1.5 transition"
                        title="Remove yield allocation from this batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear Yield
                      </button>
                    )}
                    <button
                      onClick={handleApplyYield}
                      disabled={!yieldWeightInput && !yieldPctInput}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs flex items-center gap-1.5 transition"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      {hasYldAllocated ? 'Update Yield Allocation' : 'Apportion Yield Batch'}
                    </button>
                  </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-white/90 rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-ink-500 uppercase block">Raw Batch Intake</span>
                    <span className="text-base font-extrabold text-ink-900 mt-0.5 block tabular-nums">
                      {formatKg(totalYldBatchWeight)}
                    </span>
                    <span className="text-[10px] text-gray-500 block mt-0.5 font-medium">
                      {yldBatchPurchases.length} lots in yield pool
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Finished Meat Weight</span>
                    <span className="text-base font-extrabold text-emerald-900 mt-0.5 block tabular-nums">
                      {currentYldWeightKg > 0 ? formatKg(currentYldWeightKg) : '—'}
                    </span>
                    <span className="text-[10px] text-emerald-700 block mt-0.5 font-medium">
                      {currentYldWeightKg > 0 ? 'Peeled / Processed' : 'Pending Entry'}
                    </span>
                  </div>

                  <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-rose-800 uppercase block">Batch Recovery %</span>
                    <span className="text-base font-black text-rose-700 mt-0.5 block tabular-nums">
                      {currentYldPct > 0 ? `${currentYldPct.toFixed(2)}%` : '—'}
                    </span>
                    <span className="text-[10px] text-rose-700 block mt-0.5 font-medium">
                      {currentYldLossKg > 0 && currentYldWeightKg > 0 ? `Loss: ${formatKg(currentYldLossKg)}` : 'Apportioned to lots'}
                    </span>
                  </div>

                  <div className="p-3 bg-white/90 rounded-xl border border-emerald-300 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase block">Finished Meat Cost / Kg</span>
                    <span className="text-base font-black text-emerald-800 mt-0.5 block tabular-nums">
                      {currentFinishedCostPerKg > 0 ? `₹${currentFinishedCostPerKg.toFixed(2)}` : '—'}
                    </span>
                    <span className="text-[10px] text-gray-500 block mt-0.5 font-medium">
                      Landed Total: {formatINR(totalYldBatchCost)}
                    </span>
                  </div>
                </div>

                {/* Input Controls */}
                <div className="bg-white/90 p-4 rounded-xl border border-emerald-200 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[11px] font-bold text-ink-800 mb-1">
                      Batch Finished Meat Weight (Kg)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={`e.g. ${(totalYldBatchWeight * 0.52).toFixed(0)}`}
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
                      onClick={handleApplyYield}
                      disabled={!yieldWeightInput && !yieldPctInput}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs flex items-center gap-1.5 transition"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      Apportion Yield
                    </button>
                  </div>
                </div>
              </div>

              {/* Table of Lots sharing this Yield Batch */}
              <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
                <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-900">Yield Batch: {selectedYieldBatch}</span>
                    <span className="text-ink-500 font-medium">({yldBatchPurchases.length} seafood lots)</span>
                    {hasYldAllocated && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Yield Allocated ({currentYldPct.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-emerald-800 tabular-nums">
                    Total Intake: {formatKg(totalYldBatchWeight)}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-emerald-50/30 border-b border-emerald-100 text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Item &amp; ID</th>
                        <th className="py-3 px-4">Species</th>
                        <th className="py-3 px-4 text-right">Intake Weight (Kg)</th>
                        <th className="py-3 px-4 text-right">Yield Share</th>
                        <th className="py-3 px-4 text-right bg-emerald-50/60 text-emerald-900 font-extrabold">
                          Allocated Finished Meat (Kg)
                        </th>
                        <th className="py-3 px-4 text-right bg-emerald-50/60 text-emerald-900 font-extrabold">
                          Finished Yield %
                        </th>
                        <th className="py-3 px-4 text-right bg-emerald-50/60 text-emerald-900 font-extrabold">
                          Finished Meat Cost/Kg
                        </th>
                        <th className="py-3 px-4 text-right">Total Landed Cost</th>
                        <th className="py-3 px-4 text-right">Raw Rate/Kg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-ink-900 font-medium">
                      {yldBatchPurchases.map((p, index) => {
                        const spec = speciesMap.get(p.speciesId);
                        const sharePct = totalYldBatchWeight > 0 ? (p.weightKg / totalYldBatchWeight) * 100 : 0;
                        const itemYieldKg = p.yieldWeightKg || 0;
                        const itemYieldPct =
                          p.yieldPct ||
                          (p.weightKg > 0 && itemYieldKg > 0 ? (itemYieldKg / p.weightKg) * 100 : 0);
                        const itemMeatCost = itemYieldKg > 0 && p.totalCost > 0 ? p.totalCost / itemYieldKg : 0;

                        return (
                          <tr key={p.id} className="hover:bg-emerald-50/20 transition">
                            <td className="py-3 px-4 font-bold text-emerald-900">
                              Item {index + 1} ({p.purchaseId})
                              {p.isBatchYieldAllocated && (
                                <span className="block text-[9px] font-extrabold text-emerald-700 uppercase tracking-tight">
                                  Yield Apportioned
                                </span>
                              )}
                              {p.expenseBatchNo && (
                                <span className="block text-[9px] font-bold text-amber-700">
                                  Exp Batch: {p.expenseBatchNo}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-semibold text-ink-900">
                              {spec?.name || 'Seafood'}
                            </td>
                            <td className="py-3 px-4 text-right font-bold tabular-nums">
                              {formatKg(p.weightKg)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-800 tabular-nums">
                              {sharePct.toFixed(1)}%
                            </td>
                            <td className="py-3 px-4 text-right font-black text-emerald-900 tabular-nums bg-emerald-50/40">
                              {itemYieldKg > 0 ? formatKg(itemYieldKg) : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-800 tabular-nums bg-emerald-50/40">
                              {itemYieldPct > 0 ? `${itemYieldPct.toFixed(2)}%` : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-800 tabular-nums bg-emerald-50/40">
                              {itemMeatCost > 0 ? `₹${itemMeatCost.toFixed(2)}` : '—'}
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
                      <tr className="bg-emerald-50/40 border-t-2 border-emerald-200 font-bold text-xs text-ink-900">
                        <td colSpan={2} className="py-3 px-4 uppercase text-[11px] text-emerald-900">
                          Yield Pool Total
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-900 tabular-nums">
                          {formatKg(totalYldBatchWeight)}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-800 tabular-nums">100.0%</td>
                        <td className="py-3 px-4 text-right text-emerald-900 tabular-nums bg-emerald-100/60 font-black">
                          {currentYldWeightKg > 0 ? formatKg(currentYldWeightKg) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-800 tabular-nums bg-emerald-100/60">
                          {currentYldPct > 0 ? `${currentYldPct.toFixed(2)}%` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-800 tabular-nums bg-emerald-100/60">
                          {currentFinishedCostPerKg > 0 ? `₹${currentFinishedCostPerKg.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-900 tabular-nums">
                          {formatINR(totalYldBatchCost)}
                        </td>
                        <td className="py-3 px-4 text-right text-ink-500">—</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="p-4 bg-emerald-50/20 border-t border-emerald-100 text-[11px] text-ink-500 flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Yield Batch Rule:</strong> Finished peeled or processed seafood meat recovery distributes across items strictly in proportion to raw intake weight (Kg). Shared landing expenses and invoices are NOT altered here.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
