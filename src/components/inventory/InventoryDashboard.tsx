import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { MultiSelectFilter } from '../common/MultiSelectFilter';
import {
  Boxes,
  TrendingUp,
  Receipt,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  CheckCircle2,
  DollarSign,
  PackageCheck,
  Scale,
  Filter,
  X,
  Layers,
  Fish
} from 'lucide-react';
import { InventoryNavTab } from './InventorySidebar';

interface InventoryDashboardProps {
  onNavigateTab: (tab: InventoryNavTab) => void;
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({ onNavigateTab }) => {
  const { inventoryCalculation, periodCloseLocks } = useData();
  
  const {
    totalCogsValue,
    totalSalesValueINR,
    overallGrossMarginPct,
    stockPositions,
    movementSummary,
    exceptions
  } = inventoryCalculation;

  // Multi-Filter States
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStockStatuses, setSelectedStockStatuses] = useState<string[]>([]);

  // Filtered Stock Positions
  const filteredStockPositions = useMemo(() => {
    return stockPositions.filter((pos) => {
      if (selectedItemIds.length > 0 && !selectedItemIds.includes(pos.inventoryItemId)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(pos.category)) return false;
      if (selectedStockStatuses.length > 0 && !selectedStockStatuses.includes(pos.stockStatus)) return false;
      return true;
    });
  }, [stockPositions, selectedItemIds, selectedCategories, selectedStockStatuses]);

  const filteredClosingQty = filteredStockPositions.reduce((s, p) => s + p.quantityOnHand, 0);
  const filteredClosingValue = filteredStockPositions.reduce((s, p) => s + p.totalStockValue, 0);
  const avgCostPerKg = filteredClosingQty > 0 ? filteredClosingValue / filteredClosingQty : 0;
  const lowStockItems = filteredStockPositions.filter((p) => p.stockStatus === 'Low Stock' || p.stockStatus === 'Out of Stock');
  const negativeStockItems = filteredStockPositions.filter((p) => p.stockStatus === 'Negative Stock');

  // Options for MultiSelectFilter
  const itemOptions = useMemo(
    () => stockPositions.map((p) => ({ id: p.inventoryItemId, label: p.itemName, subLabel: `${p.itemCode} • ${p.category}` })),
    [stockPositions]
  );

  const categoryOptions = useMemo(() => {
    const cats = Array.from(new Set(stockPositions.map((p) => p.category))).filter(Boolean);
    return cats.map((c) => ({ id: c, label: c }));
  }, [stockPositions]);

  const statusOptions = useMemo(
    () => [
      { id: 'Normal', label: 'Optimal / Normal' },
      { id: 'Low Stock', label: 'Low Stock' },
      { id: 'Negative Stock', label: 'Negative Stock' },
      { id: 'Out of Stock', label: 'Out of Stock' }
    ],
    []
  );

  const hasActiveFilters = Boolean(
    selectedItemIds.length > 0 || selectedCategories.length > 0 || selectedStockStatuses.length > 0
  );

  const clearAllFilters = () => {
    setSelectedItemIds([]);
    setSelectedCategories([]);
    setSelectedStockStatuses([]);
  };

  // Formatters
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const formatKg = (val: number) => {
    return `${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kg`;
  };

  // Total Receipts and Issues from Movement Summary
  const totalReceiptsQty = movementSummary.reduce((sum, m) => sum + m.receiptsQty, 0);
  const totalReceiptsValue = movementSummary.reduce((sum, m) => sum + m.receiptsValue, 0);
  const totalIssuesQty = movementSummary.reduce((sum, m) => sum + m.issuesQty, 0);
  const totalIssuesValue = movementSummary.reduce((sum, m) => sum + m.issuesValue, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-white/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-600 text-white shadow-2xs">
              <Boxes className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-ink-900 tracking-tight">
              Perpetual Inventory Valuation Dashboard
            </h1>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Moving Weighted Average
            </span>
          </div>
          <p className="text-xs text-ink-500 font-medium mt-1">
            Real-time valuation synchronized automatically from Harbour Purchases (Stock In) and Commercial Sales (Stock Out).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('stock-card')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <Boxes className="w-4 h-4" />
            <span>Valuation Ledger</span>
          </button>
          <button
            onClick={() => onNavigateTab('reports-hub')}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-ink-700 border border-gray-200 rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
          >
            <span>All Reports Hub</span>
          </button>
        </div>
      </div>

      {/* Critical Exceptions & Warnings Alert Banner */}
      {exceptions.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-200/70 text-amber-900 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wide">
                {exceptions.length} Attention Notice{exceptions.length > 1 ? 's' : ''} in Inventory Engine
              </div>
              <p className="text-xs text-amber-900/90 font-medium mt-0.5">
                {exceptions[0].title}: {exceptions[0].description}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('reports-hub')}
            className="text-xs font-bold px-3 py-1.5 bg-amber-200/80 hover:bg-amber-300 text-amber-900 rounded-xl transition shrink-0"
          >
            Resolve in Exception Log &rarr;
          </button>
        </div>
      )}

      {/* STICKY INVENTORY MULTI-FILTER BAR (Liquid Glass Surface) */}
      <div className="sticky top-16 z-30 glass-surface-thin p-4 rounded-2xl border border-white/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-ink-900">
            <Filter className="w-4 h-4 text-rose-600" />
            <span>Inventory Multi-Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MultiSelectFilter
              label="Items & Species"
              options={itemOptions}
              selectedIds={selectedItemIds}
              onChange={setSelectedItemIds}
              icon={Fish}
              badgeColor="blue"
              placeholder="Search items..."
            />

            <MultiSelectFilter
              label="Categories"
              options={categoryOptions}
              selectedIds={selectedCategories}
              onChange={setSelectedCategories}
              icon={Layers}
              badgeColor="rose"
              placeholder="Search categories..."
            />

            <MultiSelectFilter
              label="Stock Health"
              options={statusOptions}
              selectedIds={selectedStockStatuses}
              onChange={setSelectedStockStatuses}
              icon={PackageCheck}
              badgeColor="emerald"
              placeholder="Search status..."
              align="right"
            />

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Removable Active Filter Chips Strip */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-ink-500">Active filters:</span>

            {selectedItemIds.map((id) => {
              const pos = stockPositions.find((p) => p.inventoryItemId === id);
              if (!pos) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200"
                >
                  <span>Item: {pos.itemName}</span>
                  <button
                    onClick={() => setSelectedItemIds(selectedItemIds.filter((item) => item !== id))}
                    className="hover:text-blue-950"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {selectedCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200"
              >
                <span>Category: {cat}</span>
                <button
                  onClick={() => setSelectedCategories(selectedCategories.filter((item) => item !== cat))}
                  className="hover:text-rose-950"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {selectedStockStatuses.map((st) => (
              <span
                key={st}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
              >
                <span>Health: {st}</span>
                <button
                  onClick={() => setSelectedStockStatuses(selectedStockStatuses.filter((item) => item !== st))}
                  className="hover:text-emerald-950"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* KPI Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 relative z-10">
        {/* 1. Total Closing Value */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Closing Stock Value</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-700 tracking-tight">
            {formatCurrency(filteredClosingValue)}
          </div>
          <div className="text-[10px] text-ink-500 flex items-center gap-1">
            <span className="font-semibold text-ink-700">{filteredStockPositions.length}</span> active inventory items
          </div>
        </div>

        {/* 2. Total Closing Quantity */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Closing Stock Qty</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-ink-900 tracking-tight">
            {formatKg(filteredClosingQty)}
          </div>
          <div className="text-[10px] text-ink-500">
            Finished export & processing weight
          </div>
        </div>

        {/* 3. Weighted Average Cost / Kg */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Portfolio Avg Cost</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-ink-900 tracking-tight">
            ₹{avgCostPerKg.toFixed(2)} <span className="text-xs font-semibold text-ink-500">/ Kg</span>
          </div>
          <div className="text-[10px] text-ink-500">
            Weighted moving average across filtered items
          </div>
        </div>

        {/* 4. Total COGS Value */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total COGS (Issues)</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-ink-900 tracking-tight">
            {formatCurrency(totalCogsValue)}
          </div>
          <div className="text-[10px] text-ink-500">
            Cost of goods issued to sales orders
          </div>
        </div>

        {/* 5. Gross Margin % */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gross Margin %</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-black tracking-tight ${overallGrossMarginPct >= 15 ? 'text-emerald-700' : overallGrossMarginPct >= 5 ? 'text-amber-700' : 'text-rose-700'}`}>
            {overallGrossMarginPct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-ink-500 truncate">
            Realized: {formatCurrency(totalSalesValueINR)}
          </div>
        </div>

        {/* 6. Low Stock / Stock Cover */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Stock Health</span>
            <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-ink-900 tracking-tight flex items-center gap-1.5">
            {lowStockItems.length === 0 ? (
              <span className="text-emerald-700 flex items-center gap-1 text-sm font-black">
                <CheckCircle2 className="w-4 h-4" /> Optimal
              </span>
            ) : (
              <span className="text-amber-700 flex items-center gap-1 text-sm font-black">
                <AlertTriangle className="w-4 h-4" /> {lowStockItems.length} Low
              </span>
            )}
          </div>
          <div className="text-[10px] text-ink-500">
            {negativeStockItems.length > 0 ? `${negativeStockItems.length} negative stock!` : 'No negative balances'}
          </div>
        </div>
      </div>

      {/* Main Two-Column Analytics Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Breakdown by Inventory Item */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-ink-900 uppercase tracking-wide">
                Closing Stock Breakdown by Inventory Item
              </h3>
              <p className="text-xs text-ink-500 font-medium">
                Live quantities, average cost per Kg, and closing valuation
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('stock-position')}
              className="text-xs font-bold text-rose-700 hover:text-rose-800 transition"
            >
              Full Position Statement &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold text-ink-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Item Code & Name</th>
                  <th className="py-2.5 px-3">Quantity Basis</th>
                  <th className="py-2.5 px-3 text-right">Closing Qty (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Avg Cost / Kg</th>
                  <th className="py-2.5 px-3 text-right">Stock Value (₹)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-ink-700">
                {filteredStockPositions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-ink-400">
                      No inventory items match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStockPositions.map((pos) => {
                    const pctOfTotal = filteredClosingValue > 0 ? (pos.totalStockValue / filteredClosingValue) * 100 : 0;
                    return (
                      <tr key={pos.inventoryItemId} className="hover:bg-rose-50/40 transition">
                        <td className="py-3 px-3">
                          <div className="font-bold text-ink-900">{pos.itemName}</div>
                          <div className="text-[10px] text-ink-400 font-mono">{pos.itemCode} &middot; {pos.category}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            pos.quantityBasis === 'yield' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {pos.quantityBasis === 'yield' ? 'Yield Output' : 'Purchase Weight'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-ink-900">
                          {formatKg(pos.quantityOnHand)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          ₹{pos.averageCostPerKg.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="font-black text-ink-900">{formatCurrency(pos.totalStockValue)}</div>
                          <div className="text-[10px] text-ink-400 font-semibold">{pctOfTotal.toFixed(1)}% of pool</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                              pos.stockStatus === 'Normal'
                                ? 'bg-emerald-50 text-emerald-700'
                                : pos.stockStatus === 'Low Stock'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : pos.stockStatus === 'Negative Stock'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {pos.stockStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Inventory Flow & Movement Summary */}
        <div className="space-y-6">
          {/* Movement Flow (Receipts vs Issues) */}
          <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-ink-900 uppercase tracking-wide">
              Stock In vs Stock Out Flow
            </h3>

            <div className="space-y-3">
              {/* Stock In (Receipts) */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span className="flex items-center gap-1.5">
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" /> Stock In (Purchases)
                  </span>
                  <span>{formatCurrency(totalReceiptsValue)}</span>
                </div>
                <div className="text-[11px] text-emerald-800 font-semibold mt-1">
                  Volume: {formatKg(totalReceiptsQty)}
                </div>
                <div className="text-[10px] text-emerald-600/90 mt-0.5">
                  Includes raw weight, finished Vannamei yields & landing expenses
                </div>
              </div>

              {/* Stock Out (Issues) */}
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100">
                <div className="flex items-center justify-between text-xs font-bold text-rose-950">
                  <span className="flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4 text-rose-600" /> Stock Out (Sales Issues)
                  </span>
                  <span>{formatCurrency(totalIssuesValue)}</span>
                </div>
                <div className="text-[11px] text-rose-800 font-semibold mt-1">
                  Volume: {formatKg(totalIssuesQty)}
                </div>
                <div className="text-[10px] text-rose-600/90 mt-0.5">
                  Valued strictly at current weighted average cost at moment of issue
                </div>
              </div>
            </div>

            {/* Quick Navigation Action Tiles */}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">
                Quick Actions
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => onNavigateTab('stock-adjustments')}
                  className="p-2.5 rounded-xl bg-gray-50 hover:bg-rose-50 text-ink-700 hover:text-rose-700 font-bold transition text-left border border-gray-100"
                >
                  Post Adjustment &rarr;
                </button>
                <button
                  onClick={() => onNavigateTab('physical-count')}
                  className="p-2.5 rounded-xl bg-gray-50 hover:bg-rose-50 text-ink-700 hover:text-rose-700 font-bold transition text-left border border-gray-100"
                >
                  Record Count &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Period Close Lock Status Widget */}
          <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-900 uppercase">Period Close Locks</span>
              <span className="text-[10px] font-bold text-ink-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {periodCloseLocks.filter((l) => l.status === 'locked').length} Locked
              </span>
            </div>
            <p className="text-xs text-ink-500">
              Locked inventory months are sealed against modifications. Only Owner/Admin can unlock with justification.
            </p>
            <button
              onClick={() => onNavigateTab('period-close')}
              className="w-full mt-2 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-ink-800 rounded-xl text-xs font-bold transition text-center"
            >
              Manage Month-End Period Locks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
