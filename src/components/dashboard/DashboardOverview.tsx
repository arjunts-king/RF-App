import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, formatKg } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
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
  PlusCircle
} from 'lucide-react';

interface DashboardOverviewProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigateTab }) => {
  const { purchases, suppliers, species, locations, expenseTypes } = useData();

  // Dashboard Filters
  const [supplierFilter, setSupplierFilter] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const filteredPurchases = purchases.filter((p) => {
    if (p.isVoided) return false;
    if (supplierFilter && p.supplierId !== supplierFilter) return false;
    if (speciesFilter && p.speciesId !== speciesFilter) return false;
    if (locationFilter && p.locationId !== locationFilter) return false;
    if (dateFilter && p.purchaseDate !== dateFilter) return false;
    return true;
  });

  // KPI Calculations
  const totalWeight = filteredPurchases.reduce((s, p) => s + p.weightKg, 0);
  const totalPurchaseValue = filteredPurchases.reduce((s, p) => s + p.purchaseValue, 0);
  const totalCost = filteredPurchases.reduce((s, p) => s + p.totalCost, 0);
  const totalExpenses = filteredPurchases.reduce((s, p) => s + p.totalExpenses, 0);
  const totalOutstanding = filteredPurchases.reduce((s, p) => s + p.balancePayable, 0);

  const avgRate = totalWeight > 0 ? totalPurchaseValue / totalWeight : 0;
  const effectiveCostPerKg = totalWeight > 0 ? totalCost / totalWeight : 0;
  const activeSupplierCount = new Set(filteredPurchases.map((p) => p.supplierId)).size;

  // Chart 1: Species Volume & Value Split
  const speciesData = species.map((sp) => {
    const list = filteredPurchases.filter((p) => p.speciesId === sp.id);
    const weight = list.reduce((s, p) => s + p.weightKg, 0);
    const cost = list.reduce((s, p) => s + p.totalCost, 0);
    return { name: sp.name, weight, cost };
  }).filter((d) => d.weight > 0);

  // Chart 2: Expense Breakdown
  const expenseBreakdownData = expenseTypes.map((exp) => {
    const total = filteredPurchases.reduce(
      (s, p) => s + (p.expenseBreakdown?.[exp.id] || 0),
      0
    );
    return { name: exp.name, total };
  }).filter((d) => d.total > 0);

  // Chart 3: Outstanding Payables by Supplier
  const supplierOutstandingData = suppliers.map((supp) => {
    const outstanding = filteredPurchases
      .filter((p) => p.supplierId === supp.id)
      .reduce((s, p) => s + (p.balancePayable || 0), 0);
    return { name: supp.name, outstanding };
  }).filter((d) => d.outstanding > 0);

  // Helpers for active filter label lookups
  const selectedSupplierObj = suppliers.find((s) => s.id === supplierFilter);
  const selectedSpeciesObj = species.find((sp) => sp.id === speciesFilter);
  const selectedLocationObj = locations.find((l) => l.id === locationFilter);
  const hasActiveFilters = Boolean(dateFilter || supplierFilter || speciesFilter || locationFilter);

  const clearAllFilters = () => {
    setDateFilter('');
    setSupplierFilter('');
    setSpeciesFilter('');
    setLocationFilter('');
  };

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

      {/* 2. CLEAN STICKY FILTER BAR WITH REMOVABLE FILTER CHIPS */}
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xs border border-gray-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-ink-900 font-bold">
            <Filter className="w-4 h-4 text-rose-600" />
            <span>Dashboard Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-rose-600 transition"
              title="Filter by Purchase Date"
            />

            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-rose-600 transition"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-rose-600 transition"
            >
              <option value="">All Species</option>
              {species.map((sp) => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-rose-600 transition"
            >
              <option value="">All Harbours</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>

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
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                <span>Date: {dateFilter}</span>
                <button onClick={() => setDateFilter('')} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedSupplierObj && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                <span>Supplier: {selectedSupplierObj.name}</span>
                <button onClick={() => setSupplierFilter('')} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedSpeciesObj && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                <span>Species: {selectedSpeciesObj.name}</span>
                <button onClick={() => setSpeciesFilter('')} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedLocationObj && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                <span>Harbour: {selectedLocationObj.name}</span>
                <button onClick={() => setLocationFilter('')} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. BENTO-STYLE GRID OF ROUNDED KPI CARDS WITH CAPTIONS & REPORT LINKS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Volume */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between hover:border-gray-200 transition">
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
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between hover:border-gray-200 transition">
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
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-rose-200/80 bg-gradient-to-br from-white via-rose-50/20 to-rose-50/50 flex flex-col justify-between">
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
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between hover:border-gray-200 transition">
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
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between hover:border-gray-200 transition">
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
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between hover:border-gray-200 transition">
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
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between hover:border-gray-200 transition">
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
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between hover:border-gray-200 transition">
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
