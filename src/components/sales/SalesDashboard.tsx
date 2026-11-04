import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, formatKg } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
import { BentoCard } from '../common/BentoCard';
import {
  TrendingUp,
  Anchor,
  Users,
  BadgeDollarSign,
  PlusCircle,
  Filter,
  Layers,
  ArrowUpRight,
  X,
  FileText
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Executive Figma PageHeader */}
      <PageHeader
        title="Commercial export and sales dashboard"
        subtitle="Global seafood export turnover, overseas receivables, realization tracking, and shipment volumes."
        breadcrumbs={['Sales', 'Export Intelligence']}
        primaryAction={
          onNavigate
            ? {
                label: 'New commercial invoice',
                onClick: () => onNavigate('invoice-entry'),
                icon: PlusCircle
              }
            : undefined
        }
        secondaryActions={
          onNavigate
            ? [
                {
                  label: 'FOB Dashboard (USD & INR)',
                  onClick: () => onNavigate('fob-dashboard'),
                  icon: BadgeDollarSign
                },
                {
                  label: 'Invoices register',
                  onClick: () => onNavigate('invoice-list'),
                  icon: FileText
                },
                {
                  label: 'Excel import',
                  onClick: () => onNavigate('sales-excel-import')
                }
              ]
            : undefined
        }
      />

      {/* FOB Value Intelligence Quick Banner (USD & INR) */}
      <div className="p-4 bg-gradient-to-r from-rose-950 via-rose-900 to-ink-950 rounded-2xl text-white flex flex-wrap items-center justify-between gap-4 shadow-sm border border-rose-800/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <BadgeDollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white">FOB Export Valuation Ledger</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">Dual Currency (USD &amp; INR)</span>
            </div>
            <p className="text-xs text-rose-200 mt-0.5">
              Net Free On Board export values, foreign buyers, and exchange rate realizations in both USD ($) and Indian Rupees (₹).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-rose-300">Total Net FOB Valuation</div>
            <div className="text-sm font-extrabold text-white flex items-center gap-2 justify-end">
              <span>${totalFOB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-rose-300">&bull;</span>
              <span className="text-amber-300">{formatINR(totalFOB * 84.5)}</span>
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('fob-dashboard')}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0"
            >
              <span>Open FOB Dashboard</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Combinable Multi-Filter Bar with Removable Filter Chips (Liquid Glass Surface) */}
      <div className="glass-surface-thin p-4 rounded-2xl border border-white/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink-900 flex items-center gap-1.5 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-rose-700" />
            Combinable Filter Matrix
          </span>
          {hasActiveFilter && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-rose-700 hover:text-rose-900 font-bold underline"
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
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-400 transition"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-400 transition"
            />
          </div>

          {/* Customer */}
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-400 transition"
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
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-400 transition"
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
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-400 transition"
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
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-400 transition"
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
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-400 transition"
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
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-400 transition"
            >
              <option value="">All</option>
              <option value="Not Realized">Not Realized</option>
              <option value="Partially Realized">Partially</option>
              <option value="Fully Realized">Fully</option>
            </select>
          </div>
        </div>

        {/* Removable Filter Chips */}
        {hasActiveFilter && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
            <span className="text-[10px] uppercase font-bold text-ink-400">Active filters:</span>
            {startDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 rounded-full text-xs font-semibold">
                From: {startDate}
                <button onClick={() => setStartDate('')} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {endDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 rounded-full text-xs font-semibold">
                To: {endDate}
                <button onClick={() => setEndDate('')} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedCustomerId && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 rounded-full text-xs font-semibold">
                Client: {customerMap.get(selectedCustomerId)?.name || selectedCustomerId}
                <button onClick={() => setSelectedCustomerId('')} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedSpeciesId && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 rounded-full text-xs font-semibold">
                Product: {speciesMap.get(selectedSpeciesId)?.name || selectedSpeciesId}
                <button onClick={() => setSelectedSpeciesId('')} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedPolId && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 rounded-full text-xs font-semibold">
                POL: {portMap.get(selectedPolId)?.code || selectedPolId}
                <button onClick={() => setSelectedPolId('')} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedPodId && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 rounded-full text-xs font-semibold">
                POD: {portMap.get(selectedPodId)?.code || selectedPodId}
                <button onClick={() => setSelectedPodId('')} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedCurrency && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 rounded-full text-xs font-semibold">
                Currency: {selectedCurrency}
                <button onClick={() => setSelectedCurrency('')} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedStatus && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 rounded-full text-xs font-semibold">
                Status: {selectedStatus}
                <button onClick={() => setSelectedStatus('')} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 8 Primary Bento KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        <BentoCard
          label="Total Invoices"
          value={totalInvoices}
          caption="Commercial export bills"
          linkText="Browse invoices"
          onLinkClick={() => onNavigate && onNavigate('invoice-list')}
        />
        <BentoCard
          label="Total Export Weight"
          value={formatKg(totalWeightKg)}
          caption="Net seafood cargo"
          linkText="Weight analysis"
          onLinkClick={() => onNavigate && onNavigate('reports')}
        />
        <BentoCard
          label="Gross Invoiced (USD)"
          value={`$${totalUSD.toLocaleString()}`}
          caption="Overseas gross value"
          variant="highlight"
          linkText="Turnover ledger"
          onLinkClick={() => onNavigate && onNavigate('reports')}
        />
        <BentoCard
          label="Total FOB Value"
          value={`$${totalFOB.toLocaleString()}`}
          caption="Port departure valuation"
          variant="highlight"
          linkText="FOB breakdown"
          onLinkClick={() => onNavigate && onNavigate('reports')}
        />
        <BentoCard
          label="Average USD / Kg"
          value={`$${avgUSDPerKg.toFixed(2)}`}
          caption="Realization rate per kg"
          variant="success"
          linkText="Yield analysis"
          onLinkClick={() => onNavigate && onNavigate('reports')}
        />
        <BentoCard
          label="Realized (INR)"
          value={formatINR(totalRealizedINR)}
          caption="Bank settlements settled"
          variant="success"
          linkText="Realization log"
          onLinkClick={() => onNavigate && onNavigate('invoice-list')}
        />
        <BentoCard
          label="Pending Outstanding"
          value={`$${totalOutstandingUSD.toLocaleString()}`}
          caption="Unrealized remittance"
          variant={totalOutstandingUSD > 0 ? 'warning' : 'default'}
          linkText="Ageing tracker"
          onLinkClick={() => onNavigate && onNavigate('reports')}
        />
        <BentoCard
          label="Active Overseas Buyers"
          value={uniqueCustomerCount}
          caption="Verified client importers"
          linkText="Manage clients"
          onLinkClick={() => onNavigate && onNavigate('customers')}
        />
      </div>

      {/* Row 1: Monthly Sales Trend & Realization vs Outstanding Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Sales Value Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-rose-700" />
                Monthly Sales Value Trend (USD)
              </h3>
              <p className="text-[11px] text-ink-500">Trailing 6-month export invoiced volumes</p>
            </div>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              Peak: ${(maxTrendUSD / 1000).toFixed(0)}k
            </span>
          </div>

          <div className="h-56 flex items-end gap-4 pt-6 px-2">
            {trendData.map((d) => {
              const heightPct = maxTrendUSD > 0 ? (d.val / maxTrendUSD) * 85 : 0;
              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] font-bold text-rose-800 opacity-0 group-hover:opacity-100 transition tabular-nums">
                    ${(d.val / 1000).toFixed(0)}k
                  </div>
                  <div
                    className="w-full bg-rose-600 hover:bg-rose-700 rounded-t-xl transition-all duration-300 relative group-hover:shadow-md"
                    style={{ height: `${Math.max(heightPct, 6)}%` }}
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
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4 flex flex-col justify-between">
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
                className="bg-rose-600 transition-all duration-500"
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
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
            <div className="font-bold text-[10px] text-ink-500 uppercase tracking-wider">Receivables Ageing Breakdown:</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-800 font-medium">0–30 days:</span>
              <span className="font-bold tabular-nums">${ageingStats['0-30'].toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-blue-800 font-medium">31–60 days:</span>
              <span className="font-bold tabular-nums">${ageingStats['31-60'].toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-amber-800 font-medium">61–90 days:</span>
              <span className="font-bold tabular-nums">${ageingStats['61-90'].toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-200">
              <span className="text-rose-800 font-bold">90+ days overdue:</span>
              <span className="font-extrabold text-rose-800 tabular-nums">${ageingStats['90+'].toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Customer Split, Product Split & Destination Ports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-rose-700" />
              Customer Value Split (Top 5)
            </h3>
            {onNavigate && (
              <button
                onClick={() => onNavigate('customers')}
                className="text-[11px] text-rose-700 font-bold hover:underline flex items-center gap-0.5"
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
                    <span className="text-ink-700 tabular-nums">${c.val.toLocaleString()} ({c.pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-600 rounded-full" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Product / Species Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-rose-700" />
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
                    <span className="text-ink-700 tabular-nums">${p.val.toLocaleString()} ({p.pct.toFixed(1)}%)</span>
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
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
              <Anchor className="w-4 h-4 text-rose-700" />
              Discharge Port Cargo Volume
            </h3>
            {onNavigate && (
              <button
                onClick={() => onNavigate('ports')}
                className="text-[11px] text-rose-700 font-bold hover:underline flex items-center gap-0.5"
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
                    <span className="text-ink-700 tabular-nums">{formatKg(pt.wt)} ({pt.pct.toFixed(1)}%)</span>
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
