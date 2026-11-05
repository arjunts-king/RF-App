import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, formatKg } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
import { MultiSelectFilter } from '../common/MultiSelectFilter';
import { NavTab } from '../common/Sidebar';
import {
  Scale,
  DollarSign,
  TrendingUp,
  Layers,
  Clock,
  Users,
  Filter,
  PieChart,
  BarChart3,
  X,
  ArrowRight,
  PlusCircle,
  Fish,
  Anchor
} from 'lucide-react';

interface DashboardOverviewProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigateTab }) => {
  const { purchases, suppliers, species, locations, expenseTypes } = useData();

  // Dashboard Multiple Filters (all combinable)
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState<string[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState('');

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (p.isVoided) return false;
      if (selectedSupplierIds.length > 0 && !selectedSupplierIds.includes(p.supplierId)) return false;
      if (selectedSpeciesIds.length > 0 && !selectedSpeciesIds.includes(p.speciesId)) return false;
      if (selectedLocationIds.length > 0 && !selectedLocationIds.includes(p.locationId)) return false;
      if (dateFilter && p.purchaseDate !== dateFilter) return false;
      return true;
    });
  }, [purchases, selectedSupplierIds, selectedSpeciesIds, selectedLocationIds, dateFilter]);

  // Memoized KPI Calculations
  const kpis = useMemo(() => {
    const totalWeight = filteredPurchases.reduce((s, p) => s + p.weightKg, 0);
    const totalPurchaseValue = filteredPurchases.reduce((s, p) => s + p.purchaseValue, 0);
    const totalCost = filteredPurchases.reduce((s, p) => s + p.totalCost, 0);
    const totalExpenses = filteredPurchases.reduce((s, p) => s + p.totalExpenses, 0);
    const totalOutstanding = filteredPurchases.reduce((s, p) => s + p.balancePayable, 0);

    const avgRate = totalWeight > 0 ? totalPurchaseValue / totalWeight : 0;
    const effectiveCostPerKg = totalWeight > 0 ? totalCost / totalWeight : 0;
    const activeSupplierCount = new Set(filteredPurchases.map((p) => p.supplierId)).size;

    return {
      totalWeight,
      totalPurchaseValue,
      totalCost,
      totalExpenses,
      totalOutstanding,
      avgRate,
      effectiveCostPerKg,
      activeSupplierCount
    };
  }, [filteredPurchases]);

  const {
    totalWeight,
    totalPurchaseValue,
    totalCost,
    totalExpenses,
    totalOutstanding,
    avgRate,
    effectiveCostPerKg,
    activeSupplierCount
  } = kpis;

  // Charts 1, 2, 3: Single-pass O(P) grouping accumulator instead of repeated O(N * M) filtering
  const { speciesData, expenseBreakdownData, supplierOutstandingData } = useMemo(() => {
    const spMap = new Map<string, { weight: number; cost: number }>();
    const expMap = new Map<string, number>();
    const suppMap = new Map<string, number>();

    for (const p of filteredPurchases) {
      if (p.speciesId) {
        const cur = spMap.get(p.speciesId) || { weight: 0, cost: 0 };
        cur.weight += p.weightKg || 0;
        cur.cost += p.totalCost || 0;
        spMap.set(p.speciesId, cur);
      }
      if (p.expenseBreakdown) {
        for (const [expId, amt] of Object.entries(p.expenseBreakdown)) {
          if (amt) {
            expMap.set(expId, (expMap.get(expId) || 0) + amt);
          }
        }
      }
      if (p.supplierId && (p.balancePayable || 0) > 0) {
        suppMap.set(p.supplierId, (suppMap.get(p.supplierId) || 0) + (p.balancePayable || 0));
      }
    }

    const speciesList = species
      .map((sp) => {
        const data = spMap.get(sp.id);
        return { name: sp.name, weight: data?.weight || 0, cost: data?.cost || 0 };
      })
      .filter((d) => d.weight > 0);

    const expenseList = expenseTypes
      .map((exp) => ({ name: exp.name, total: expMap.get(exp.id) || 0 }))
      .filter((d) => d.total > 0);

    const supplierList = suppliers
      .map((supp) => ({ name: supp.name, outstanding: suppMap.get(supp.id) || 0 }))
      .filter((d) => d.outstanding > 0);

    return {
      speciesData: speciesList,
      expenseBreakdownData: expenseList,
      supplierOutstandingData: supplierList
    };
  }, [species, expenseTypes, suppliers, filteredPurchases]);

  const hasActiveFilters = Boolean(
    dateFilter ||
    selectedSupplierIds.length > 0 ||
    selectedSpeciesIds.length > 0 ||
    selectedLocationIds.length > 0
  );

  const clearAllFilters = () => {
    setDateFilter('');
    setSelectedSupplierIds([]);
    setSelectedSpeciesIds([]);
    setSelectedLocationIds([]);
  };

  // Options for MultiSelectFilter
  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ id: s.id, label: s.name, subLabel: s.district ? `${s.district}, ${s.state}` : s.state || s.code || undefined })),
    [suppliers]
  );

  const speciesOptions = useMemo(
    () => species.map((sp) => ({ id: sp.id, label: sp.name, subLabel: sp.scientificName || undefined })),
    [species]
  );

  const locationOptions = useMemo(
    () => locations.map((l) => ({ id: l.id, label: l.name, subLabel: l.state || undefined })),
    [locations]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. FIGMA-STYLE HEADLINE-FIRST PAGE OPENING */}
      <PageHeader
        title="Procurement dashboard"
        description="Real-time operational intelligence across harbour landings, weighments, direct landing expenses, and outstanding supplier payables."
        badge={`${filteredPurchases.length} Batches`}
        primaryAction={
          onNavigateTab
            ? {
                label: 'New harbour purchase',
                icon: PlusCircle,
                onClick: () => onNavigateTab('purchase-entry')
              }
            : undefined
        }
        secondaryActions={[
          {
            label: 'View transactions',
            onClick: () => onNavigateTab && onNavigateTab('purchases')
          },
          {
            label: 'Supplier ledger',
            onClick: () => onNavigateTab && onNavigateTab('payments')
          }
        ]}
      />

      {/* 2. CLEAN STICKY FILTER BAR WITH MULTI-SELECT FILTERS & REMOVABLE FILTER CHIPS (Liquid Glass Surface) */}
      <div className="sticky top-16 z-20 glass-surface-thin p-4 rounded-2xl border border-white/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-ink-900 font-bold">
            <Filter className="w-4 h-4 text-rose-600" />
            <span>Dashboard Multi-Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-rose-600 transition"
              title="Filter by Purchase Date"
            />

            <MultiSelectFilter
              label="Suppliers"
              options={supplierOptions}
              selectedIds={selectedSupplierIds}
              onChange={setSelectedSupplierIds}
              icon={Users}
              badgeColor="rose"
              placeholder="Search suppliers..."
            />

            <MultiSelectFilter
              label="Species"
              options={speciesOptions}
              selectedIds={selectedSpeciesIds}
              onChange={setSelectedSpeciesIds}
              icon={Fish}
              badgeColor="blue"
              placeholder="Search species..."
            />

            <MultiSelectFilter
              label="Harbours"
              options={locationOptions}
              selectedIds={selectedLocationIds}
              onChange={setSelectedLocationIds}
              icon={Anchor}
              badgeColor="emerald"
              placeholder="Search harbours..."
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

            {dateFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-ink-800 border border-gray-200">
                <span>Date: {dateFilter}</span>
                <button onClick={() => setDateFilter('')} className="hover:text-rose-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedSupplierIds.map((id) => {
              const supp = suppliers.find((s) => s.id === id);
              if (!supp) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200"
                >
                  <span>Supplier: {supp.name}</span>
                  <button
                    onClick={() => setSelectedSupplierIds(selectedSupplierIds.filter((item) => item !== id))}
                    className="hover:text-rose-950"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {selectedSpeciesIds.map((id) => {
              const sp = species.find((s) => s.id === id);
              if (!sp) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200"
                >
                  <span>Species: {sp.name}</span>
                  <button
                    onClick={() => setSelectedSpeciesIds(selectedSpeciesIds.filter((item) => item !== id))}
                    className="hover:text-blue-950"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {selectedLocationIds.map((id) => {
              const loc = locations.find((l) => l.id === id);
              if (!loc) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  <span>Harbour: {loc.name}</span>
                  <button
                    onClick={() => setSelectedLocationIds(selectedLocationIds.filter((item) => item !== id))}
                    className="hover:text-emerald-950"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. BENTO-STYLE GRID OF ROUNDED KPI CARDS WITH CAPTIONS & REPORT LINKS (Liquid Glass Polish) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Volume */}
        <div className="glass-surface-regular card-liquid-hover p-5 rounded-2xl border border-white/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">Total Volume</span>
              <span className="text-2xl font-black text-ink-900 mt-1 block font-mono">{formatKg(totalWeight)}</span>
              <p className="text-[11px] text-ink-500 mt-0.5">Weighed landings across all centres</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-gray-50">
            <button
              onClick={() => onNavigateTab && onNavigateTab('reports')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 group"
            >
              <span>View daily landing report</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* KPI 2: Raw Purchase Value */}
        <div className="glass-surface-regular card-liquid-hover p-5 rounded-2xl border border-white/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">Raw Purchase Value</span>
              <span className="text-2xl font-black text-ink-900 mt-1 block font-mono">{formatINR(totalPurchaseValue)}</span>
              <p className="text-[11px] text-ink-500 mt-0.5">Pre-expense base procurement cost</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-gray-50">
            <button
              onClick={() => onNavigateTab && onNavigateTab('purchases')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 group"
            >
              <span>View purchase transactions</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* KPI 3: Final Landed Cost */}
        <div className="glass-surface-blush card-liquid-hover p-5 rounded-2xl border border-rose-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 block">Final Landed Cost</span>
              <span className="text-2xl font-black text-rose-700 mt-1 block font-mono">{formatINR(totalCost)}</span>
              <p className="text-[11px] text-rose-900/70 mt-0.5">Includes base cost minus damage + all expenses</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-rose-100">
            <button
              onClick={() => onNavigateTab && onNavigateTab('reports')}
              className="text-xs font-bold text-rose-800 hover:text-rose-950 inline-flex items-center gap-1 group"
            >
              <span>View consolidated monthly audit</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* KPI 4: Direct Expenses */}
        <div className="glass-surface-regular card-liquid-hover p-5 rounded-2xl border border-white/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">Direct Expenses</span>
              <span className="text-2xl font-black text-ink-900 mt-1 block font-mono">{formatINR(totalExpenses)}</span>
              <p className="text-[11px] text-ink-500 mt-0.5">Ice, transport, dalali &amp; harbour labour</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-gray-50">
            <button
              onClick={() => onNavigateTab && onNavigateTab('batch-expenses')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 group"
            >
              <span>View shared batch expense pools</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* KPI 5: Average Buy Rate */}
        <div className="glass-surface-regular card-liquid-hover p-5 rounded-2xl border border-white/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">Average Buy Rate</span>
              <span className="text-2xl font-black text-ink-900 mt-1 block font-mono">₹{avgRate.toFixed(2)} / Kg</span>
              <p className="text-[11px] text-ink-500 mt-0.5">Volume-weighted raw buy rate</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-gray-50">
            <button
              onClick={() => onNavigateTab && onNavigateTab('reports')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 group"
            >
              <span>View species &amp; grade price variance</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* KPI 6: Effective Landed Rate */}
        <div className="glass-surface-regular card-liquid-hover p-5 rounded-2xl border border-white/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">Effective Landed Rate</span>
              <span className="text-2xl font-black text-rose-900 mt-1 block font-mono">₹{effectiveCostPerKg.toFixed(2)} / Kg</span>
              <p className="text-[11px] text-ink-500 mt-0.5">True landed unit cost per raw Kg</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-gray-50">
            <button
              onClick={() => onNavigateTab && onNavigateTab('reports')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 group"
            >
              <span>View cost matrix analysis</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* KPI 7: Outstanding Payables */}
        <div className="glass-surface-regular card-liquid-hover p-5 rounded-2xl border border-white/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">Outstanding Payables</span>
              <span className="text-2xl font-black text-rose-700 mt-1 block font-mono">{formatINR(totalOutstanding)}</span>
              <p className="text-[11px] text-ink-500 mt-0.5">Unsettled dues to suppliers &amp; boats</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-gray-50">
            <button
              onClick={() => onNavigateTab && onNavigateTab('outstanding')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 group"
            >
              <span>View ageing buckets (180+d)</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* KPI 8: Active Suppliers */}
        <div className="glass-surface-regular card-liquid-hover p-5 rounded-2xl border border-white/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">Active Suppliers</span>
              <span className="text-2xl font-black text-ink-900 mt-1 block font-mono">{activeSupplierCount}</span>
              <p className="text-[11px] text-ink-500 mt-0.5">Supplying boats, agents &amp; farms</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-gray-50">
            <button
              onClick={() => onNavigateTab && onNavigateTab('payments')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 group"
            >
              <span>Open supplier ledger statement</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. CHARTS SITTING IN WHITE CARDS WITH CLEAR TITLES, SOFT SHADOWS & PALETTE COLORS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Species Volume Split */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-rose-600" />
              Species Volume Share
            </h3>
            <span className="text-[11px] font-semibold text-ink-500">Live Catch</span>
          </div>

          <div className="space-y-3 pt-2">
            {speciesData.length === 0 ? (
              <p className="text-xs text-ink-500 py-8 text-center italic">
                No purchase transactions recorded yet. Entries will show up here live.
              </p>
            ) : (
              speciesData.map((item) => {
                const weightPct = totalWeight > 0 ? (item.weight / totalWeight) * 100 : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="font-bold text-ink-900 line-clamp-1">{item.name}</span>
                      <span className="text-ink-500 text-[11px] font-mono whitespace-nowrap">
                        {formatKg(item.weight)} ({weightPct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${weightPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chart 2: Direct Expense Heads Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              Expense Head Breakdown
            </h3>
            <span className="text-[11px] font-bold text-ink-900 font-mono">Total: {formatINR(totalExpenses)}</span>
          </div>

          <div className="space-y-3 pt-2">
            {expenseBreakdownData.length === 0 ? (
              <p className="text-xs text-ink-500 py-8 text-center italic">
                No landing expenses recorded yet.
              </p>
            ) : (
              expenseBreakdownData.map((item) => {
                const expensePct = totalExpenses > 0 ? (item.total / totalExpenses) * 100 : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="font-bold text-ink-900 line-clamp-1">{item.name}</span>
                      <span className="text-ink-500 text-[11px] font-mono whitespace-nowrap">
                        {formatINR(item.total)} ({expensePct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${expensePct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chart 3: Outstanding Payables by Supplier */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-600" />
              Supplier Outstanding
            </h3>
            <span className="text-[11px] font-bold text-rose-700 font-mono">Total: {formatINR(totalOutstanding)}</span>
          </div>

          <div className="space-y-3 pt-2">
            {supplierOutstandingData.length === 0 ? (
              <p className="text-xs text-ink-500 py-8 text-center italic">
                All supplier purchase accounts are fully settled.
              </p>
            ) : (
              supplierOutstandingData.map((item) => {
                const outPct = totalOutstanding > 0 ? (item.outstanding / totalOutstanding) * 100 : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="font-bold text-ink-900 line-clamp-1">{item.name}</span>
                      <span className="text-rose-700 font-bold text-[11px] font-mono whitespace-nowrap">
                        {formatINR(item.outstanding)} ({outPct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-700 h-full rounded-full transition-all duration-300"
                        style={{ width: `${outPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
