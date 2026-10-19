import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, formatKg } from '../../utils/calculations';
import {
  Scale,
  DollarSign,
  TrendingUp,
  Layers,
  Clock,
  Users,
  Filter,
  PieChart,
  BarChart3
} from 'lucide-react';

export const DashboardOverview: React.FC = () => {
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


  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-ink-900 font-bold">
          <Filter className="w-4 h-4 text-rose-600" />
          <span>Dashboard Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="p-2 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-rose-600"
          />

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="p-2 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-rose-600"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="p-2 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-rose-600"
          >
            <option value="">All Species</option>
            {species.map((sp) => (
              <option key={sp.id} value={sp.id}>{sp.name}</option>
            ))}
          </select>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="p-2 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-rose-600"
          >
            <option value="">All Harbours</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          {(dateFilter || supplierFilter || speciesFilter || locationFilter) && (
            <button
              onClick={() => {
                setDateFilter('');
                setSupplierFilter('');
                setSpeciesFilter('');
                setLocationFilter('');
              }}
              className="text-rose-600 font-bold hover:underline px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 8 KPI CARDS SPECIFIED IN SECTION 8 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        {/* Total Weight */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">Total Volume</span>
            <span className="text-xl font-black text-ink-900 mt-1 block">{formatKg(totalWeight)}</span>
            <span className="text-[11px] text-ink-500 mt-0.5 block">{filteredPurchases.length} Batches Landed</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
        </div>

        {/* Total Purchase Value */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">Raw Purchase Value</span>
            <span className="text-xl font-black text-ink-900 mt-1 block">{formatINR(totalPurchaseValue)}</span>
            <span className="text-[11px] text-ink-500 mt-0.5 block">Pre-expense base cost</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Total Landed Cost */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-rose-100 bg-gradient-to-br from-white to-rose-50/30 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 block">Final Landed Cost</span>
            <span className="text-xl font-black text-rose-700 mt-1 block">{formatINR(totalCost)}</span>
            <span className="text-[11px] text-rose-900/70 mt-0.5 block">Includes direct expenses</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">Direct Expenses</span>
            <span className="text-xl font-black text-ink-900 mt-1 block">{formatINR(totalExpenses)}</span>
            <span className="text-[11px] text-ink-500 mt-0.5 block">Ice, transport, labour</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Average Rate */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">Average Buy Rate</span>
            <span className="text-xl font-black text-ink-900 mt-1 block">₹{avgRate.toFixed(2)} / Kg</span>
            <span className="text-[11px] text-ink-500 mt-0.5 block">Raw rate across lots</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        {/* Effective Cost / Kg */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">Effective Landed Rate</span>
            <span className="text-xl font-black text-rose-900 mt-1 block">₹{effectiveCostPerKg.toFixed(2)} / Kg</span>
            <span className="text-[11px] text-ink-500 mt-0.5 block">True landed unit cost</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Supplier Outstanding */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">Outstanding Payables</span>
            <span className="text-xl font-black text-rose-700 mt-1 block">{formatINR(totalOutstanding)}</span>
            <span className="text-[11px] text-ink-500 mt-0.5 block">Unsettled purchase dues</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Active Suppliers */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">Active Suppliers</span>
            <span className="text-xl font-black text-ink-900 mt-1 block">{activeSupplierCount} Suppliers</span>
            <span className="text-[11px] text-ink-500 mt-0.5 block">Boats, agents &amp; farms</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Species Volume Split */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-rose-600" />
              Species Volume Share
            </h3>
            <span className="text-[11px] text-ink-500">Live Breakdown</span>
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
                      <span className="text-ink-500 text-[11px] whitespace-nowrap">
                        {formatKg(item.weight)} ({weightPct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
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
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              Expense Head Breakdown
            </h3>
            <span className="text-[11px] text-ink-500">Total: {formatINR(totalExpenses)}</span>
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
                      <span className="text-ink-500 text-[11px] whitespace-nowrap">
                        {formatINR(item.total)} ({expensePct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
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
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-600" />
              Supplier Outstanding
            </h3>
            <span className="text-[11px] text-ink-500">Total: {formatINR(totalOutstanding)}</span>
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
                      <span className="text-rose-700 font-bold text-[11px] whitespace-nowrap">
                        {formatINR(item.outstanding)} ({outPct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
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
