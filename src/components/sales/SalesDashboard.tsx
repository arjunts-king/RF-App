import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, formatKg } from '../../utils/calculations';
import {
  TrendingUp,
  Anchor,
  Users,
  BadgeDollarSign,
  PlusCircle,
  Filter,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export const SalesDashboard: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { salesInvoices, customers, ports, species } = useData();

  // Multi-Filter States (all combinable)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState('');
  const [selectedPolId, setSelectedPolId] = useState('');
  const [selectedPodId, setSelectedPodId] = useState('');
  const [selectedDestId, setSelectedDestId] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Lookups
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const portMap = new Map(ports.map((p) => [p.id, p]));
  const speciesMap = new Map(species.map((sp) => [sp.id, sp]));

  // Combinable Filtering
  const filteredInvoices = salesInvoices.filter((inv) => {
    if (inv.isVoided) return false;

    if (startDate && inv.invoiceDate < startDate) return false;
    if (endDate && inv.invoiceDate > endDate) return false;
    if (selectedCustomerId && inv.consigneeId !== selectedCustomerId && inv.buyerId !== selectedCustomerId) return false;
    if (selectedPolId && inv.portOfLoadingId !== selectedPolId) return false;
    if (selectedPodId && inv.portOfDischargeId !== selectedPodId) return false;
    if (selectedDestId && inv.finalDestinationId !== selectedDestId) return false;
    if (selectedCurrency && inv.currency !== selectedCurrency) return false;
    if (selectedStatus && inv.realizationStatus !== selectedStatus) return false;

    if (selectedSpeciesId) {
      const hasSpecies = inv.lineItems.some((l) => l.speciesId === selectedSpeciesId);
      if (!hasSpecies) return false;
    }

    return true;
  });

  // KPI Calculations
  const totalInvoices = filteredInvoices.length;
  const totalWeightKg = filteredInvoices.reduce((s, inv) => s + inv.totalWeightKg, 0);
  const totalUSD = filteredInvoices.reduce((s, inv) => s + inv.totalAmountCurrency, 0);
  const totalFOB = filteredInvoices.reduce((s, inv) => s + inv.totalFobValueCurrency, 0);
  const avgUSDPerKg = totalWeightKg > 0 ? totalUSD / totalWeightKg : 0;
  const totalRealizedINR = filteredInvoices.reduce((s, inv) => s + inv.totalRealizedINR, 0);
  const totalRealizedUSD = filteredInvoices.reduce((s, inv) => s + inv.totalRealizedCurrency, 0);
  const totalOutstandingUSD = filteredInvoices.reduce((s, inv) => s + inv.balanceRealizationCurrency, 0);
  const uniqueCustomerCount = new Set(filteredInvoices.map((inv) => inv.consigneeId)).size;

  // Monthly Sales Value Trend Data (Last 6 Months)
  const monthMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    monthMap.set(key, 0);
  }
  filteredInvoices.forEach((inv) => {
    const m = inv.invoiceDate.slice(0, 7);
    if (monthMap.has(m)) {
      monthMap.set(m, (monthMap.get(m) || 0) + inv.totalAmountCurrency);
    }
  });
  const trendData = Array.from(monthMap.entries()).map(([month, val]) => ({
    month,
    val
  }));
  const maxTrendUSD = Math.max(...trendData.map((d) => d.val), 1000);

  // Customer-wise Distribution (Top 5)
  const custDistributionMap = new Map<string, number>();
  filteredInvoices.forEach((inv) => {
    custDistributionMap.set(
      inv.consigneeId,
      (custDistributionMap.get(inv.consigneeId) || 0) + inv.totalAmountCurrency
    );
  });
  const topCustomers = Array.from(custDistributionMap.entries())
    .map(([id, val]) => ({
      name: customerMap.get(id)?.name || 'Unknown',
      val,
      pct: totalUSD > 0 ? (val / totalUSD) * 100 : 0
    }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 5);

  // Product-wise Distribution (Top 5)
  const prodDistributionMap = new Map<string, number>();
  filteredInvoices.forEach((inv) => {
    inv.lineItems.forEach((l) => {
      prodDistributionMap.set(
        l.speciesId,
        (prodDistributionMap.get(l.speciesId) || 0) + l.amountCurrency
      );
    });
  });
  const topProducts = Array.from(prodDistributionMap.entries())
    .map(([id, val]) => ({
      name: speciesMap.get(id)?.name || 'Unknown',
      val,
      pct: totalUSD > 0 ? (val / totalUSD) * 100 : 0
    }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 5);

  // Destination Port-wise Distribution (Top 4)
  const podDistributionMap = new Map<string, number>();
  filteredInvoices.forEach((inv) => {
    podDistributionMap.set(
      inv.portOfDischargeId,
      (podDistributionMap.get(inv.portOfDischargeId) || 0) + inv.totalWeightKg
    );
  });
  const topPorts = Array.from(podDistributionMap.entries())
    .map(([id, wt]) => ({
      name: portMap.get(id)?.name || 'Unknown',
      code: portMap.get(id)?.code || 'POD',
      wt,
      pct: totalWeightKg > 0 ? (wt / totalWeightKg) * 100 : 0
    }))
    .sort((a, b) => b.wt - a.wt)
    .slice(0, 4);

  // Realization Ageing Breakdown
  const now = new Date().getTime();
  const ageingStats = {
    '0-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0
  };
  filteredInvoices
    .filter((inv) => inv.balanceRealizationCurrency > 0)
    .forEach((inv) => {
      const days = Math.max(0, Math.floor((now - new Date(inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24)));
      if (days <= 30) ageingStats['0-30'] += inv.balanceRealizationCurrency;
      else if (days <= 60) ageingStats['31-60'] += inv.balanceRealizationCurrency;
      else if (days <= 90) ageingStats['61-90'] += inv.balanceRealizationCurrency;
      else ageingStats['90+'] += inv.balanceRealizationCurrency;
    });

  const clearAllFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedCustomerId('');
    setSelectedSpeciesId('');
    setSelectedPolId('');
    setSelectedPodId('');
    setSelectedDestId('');
    setSelectedCurrency('');
    setSelectedStatus('');
  };

  const hasActiveFilter =
    Boolean(startDate || endDate || selectedCustomerId || selectedSpeciesId || selectedPolId || selectedPodId || selectedDestId || selectedCurrency || selectedStatus);

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-ink-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-rose-600" />
            Commercial Export &amp; Sales Dashboard
          </h2>
          <p className="text-xs text-ink-500 font-medium">
            Global seafood export turnover, overseas receivables, realization tracking, and shipment volumes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate('invoice-entry')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Commercial Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* Combinable Multi-Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink-900 flex items-center gap-1.5 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-rose-600" />
            Combinable Filter Matrix
          </span>
          {hasActiveFilter && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold underline"
            >
              Clear All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
          {/* Date From */}
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
            />
          </div>

          {/* Customer */}
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
            >
              <option value="">All Clients</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product */}
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">Product</label>
            <select
              value={selectedSpeciesId}
              onChange={(e) => setSelectedSpeciesId(e.target.value)}
              className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
            >
              <option value="">All Products</option>
              {species.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>

          {/* POL */}
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">Port of Loading</label>
            <select
              value={selectedPolId}
              onChange={(e) => setSelectedPolId(e.target.value)}
              className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
            >
              <option value="">All POLs</option>
              {ports.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code}
                </option>
              ))}
            </select>
          </div>

          {/* POD */}
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">Discharge Port</label>
            <select
              value={selectedPodId}
              onChange={(e) => setSelectedPodId(e.target.value)}
              className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
            >
              <option value="">All PODs</option>
              {ports.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Currency */}
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">Currency</label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
            >
              <option value="">All Currencies</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
            </select>
          </div>

          {/* Realization Status */}
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">Realization</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
            >
              <option value="">All</option>
              <option value="Not Realized">Not Realized</option>
              <option value="Partially Realized">Partially</option>
              <option value="Fully Realized">Fully</option>
            </select>
          </div>
        </div>
      </div>

      {/* 8 Primary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. Total Invoices */}
        <div className="p-3.5 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] font-bold text-ink-500 uppercase block tracking-wider">Invoices</span>
          <span className="text-xl font-black text-ink-900 mt-1 block">{totalInvoices}</span>
          <span className="text-[10px] text-ink-500 block">Commercial</span>
        </div>

        {/* 2. Total Weight */}
        <div className="p-3.5 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] font-bold text-ink-500 uppercase block tracking-wider">Total Weight</span>
          <span className="text-xl font-black text-ink-900 mt-1 block">{formatKg(totalWeightKg)}</span>
          <span className="text-[10px] text-ink-500 block">Net Cargo</span>
        </div>

        {/* 3. Total Amount in USD */}
        <div className="p-3.5 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] font-bold text-rose-800 uppercase block tracking-wider">Invoiced (USD)</span>
          <span className="text-xl font-black text-rose-950 mt-1 block">${totalUSD.toLocaleString()}</span>
          <span className="text-[10px] text-rose-700 block">Turnover</span>
        </div>

        {/* 4. Total FOB Value */}
        <div className="p-3.5 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] font-bold text-rose-800 uppercase block tracking-wider">FOB Value</span>
          <span className="text-xl font-black text-rose-950 mt-1 block">${totalFOB.toLocaleString()}</span>
          <span className="text-[10px] text-rose-700 block">Port Departure</span>
        </div>

        {/* 5. Average USD/Kg */}
        <div className="p-3.5 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider">Average USD/Kg</span>
          <span className="text-xl font-black text-emerald-950 mt-1 block">${avgUSDPerKg.toFixed(2)}</span>
          <span className="text-[10px] text-emerald-700 block">Realization/Kg</span>
        </div>

        {/* 6. Total Realized (INR) */}
        <div className="p-3.5 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider">Realized (INR)</span>
          <span className="text-xl font-black text-emerald-950 mt-1 block">{formatINR(totalRealizedINR)}</span>
          <span className="text-[10px] text-emerald-700 block">Bank Settled</span>
        </div>

        {/* 7. Outstanding Realization */}
        <div className="p-3.5 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase block tracking-wider">Pending USD</span>
          <span className="text-xl font-black text-amber-950 mt-1 block">${totalOutstandingUSD.toLocaleString()}</span>
          <span className="text-[10px] text-amber-700 block">Remittance Bal</span>
        </div>

        {/* 8. Active Customers */}
        <div className="p-3.5 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] font-bold text-ink-500 uppercase block tracking-wider">Active Buyers</span>
          <span className="text-xl font-black text-ink-900 mt-1 block">{uniqueCustomerCount}</span>
          <span className="text-[10px] text-ink-500 block">Overseas Clients</span>
        </div>
      </div>

      {/* Row 1: Monthly Sales Trend & Realization vs Outstanding Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Sales Value Trend SVG Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-rose-600" />
              Monthly Sales Value Trend (USD)
            </h3>
            <span className="text-[11px] font-bold text-ink-500">Trailing 6 Months</span>
          </div>

          <div className="h-56 flex items-end gap-4 pt-4 px-2">
            {trendData.map((d) => {
              const heightPct = maxTrendUSD > 0 ? (d.val / maxTrendUSD) * 85 : 0;
              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] font-bold text-rose-800 opacity-0 group-hover:opacity-100 transition">
                    ${(d.val / 1000).toFixed(0)}k
                  </div>
                  <div
                    className="w-full bg-rose-500 hover:bg-rose-600 rounded-t-xl transition-all duration-300 relative group-hover:shadow-md"
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                  <span className="text-[10px] font-semibold text-ink-500 whitespace-nowrap">
                    {d.month.slice(5)}/{d.month.slice(2, 4)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Realized vs Outstanding Remittance Value */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
              <BadgeDollarSign className="w-4 h-4 text-emerald-600" />
              Realization Status Balance
            </h3>
            <p className="text-[11px] text-ink-500 mt-1">Export proceeds received vs pending overseas wire transfers.</p>
          </div>

          {/* Progress / Share Bar */}
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-emerald-700">Realized: ${totalRealizedUSD.toLocaleString()}</span>
              <span className="text-rose-700">Outstanding: ${totalOutstandingUSD.toLocaleString()}</span>
            </div>

            <div className="h-4 w-full bg-rose-100 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${totalUSD > 0 ? (totalRealizedUSD / totalUSD) * 100 : 0}%` }}
                title="Realized Remittances"
              />
              <div
                className="bg-rose-500 transition-all duration-500"
                style={{ width: `${totalUSD > 0 ? (totalOutstandingUSD / totalUSD) * 100 : 100}%` }}
                title="Pending Outstanding"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-ink-500 font-medium">
              <span>{totalUSD > 0 ? ((totalRealizedUSD / totalUSD) * 100).toFixed(1) : 0}% Realized</span>
              <span>{totalUSD > 0 ? ((totalOutstandingUSD / totalUSD) * 100).toFixed(1) : 0}% Pending</span>
            </div>
          </div>

          {/* Ageing Breakdown */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5">
            <div className="font-bold text-[10px] text-ink-500 uppercase">Receivables Ageing:</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-800">0–30 days:</span>
              <span className="font-bold">${ageingStats['0-30'].toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-blue-800">31–60 days:</span>
              <span className="font-bold">${ageingStats['31-60'].toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-amber-800">61–90 days:</span>
              <span className="font-bold">${ageingStats['61-90'].toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-rose-800 font-bold">90+ days overdue:</span>
              <span className="font-extrabold text-rose-800">${ageingStats['90+'].toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Customer Split, Product Split & Destination Ports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-rose-600" />
              Customer Value Split (Top 5)
            </h3>
            {onNavigate && (
              <button
                onClick={() => onNavigate('customers')}
                className="text-[11px] text-rose-600 font-bold hover:underline flex items-center gap-0.5"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-3 pt-1">
            {topCustomers.length === 0 ? (
              <p className="text-xs text-ink-500 py-6 text-center">No export invoices recorded.</p>
            ) : (
              topCustomers.map((c) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="truncate max-w-[170px] text-ink-900">{c.name}</span>
                    <span className="text-ink-700">${c.val.toLocaleString()} ({c.pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Product / Species Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-rose-600" />
            Product Export Share
          </h3>

          <div className="space-y-3 pt-1">
            {topProducts.length === 0 ? (
              <p className="text-xs text-ink-500 py-6 text-center">No product data recorded.</p>
            ) : (
              topProducts.map((p) => (
                <div key={p.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="truncate max-w-[170px] text-ink-900">{p.name}</span>
                    <span className="text-ink-700">${p.val.toLocaleString()} ({p.pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Destination Port Volume */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
              <Anchor className="w-4 h-4 text-rose-600" />
              Discharge Port Cargo Volume
            </h3>
            {onNavigate && (
              <button
                onClick={() => onNavigate('ports')}
                className="text-[11px] text-rose-600 font-bold hover:underline flex items-center gap-0.5"
              >
                <span>Ports</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-3 pt-1">
            {topPorts.length === 0 ? (
              <p className="text-xs text-ink-500 py-6 text-center">No port shipment volume data.</p>
            ) : (
              topPorts.map((pt) => (
                <div key={pt.code} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="truncate max-w-[170px] text-ink-900">
                      {pt.name} ({pt.code})
                    </span>
                    <span className="text-ink-700">{formatKg(pt.wt)} ({pt.pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pt.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
