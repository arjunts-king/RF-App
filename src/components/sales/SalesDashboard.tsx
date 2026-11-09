import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, formatKg } from '../../utils/calculations';
import { convertToCSV, downloadFile } from '../../utils/exportUtils';
import { PageHeader } from '../common/PageHeader';
import { BentoCard } from '../common/BentoCard';
import { MultiSelectFilter } from '../common/MultiSelectFilter';
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
  FileText,
  Fish,
  Ship,
  DollarSign,
  CheckCircle2,
  Download,
  Search,
  Boxes,
  ArrowUpDown,
  Table,
  LayoutGrid
} from 'lucide-react';

export const SalesDashboard: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { salesInvoices, customers, ports, species } = useData();

  // Multi-Filter States (all combinable)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState<string[]>([]);
  const [selectedPolIds, setSelectedPolIds] = useState<string[]>([]);
  const [selectedPodIds, setSelectedPodIds] = useState<string[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Product Share Matrix State
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixSortBy, setMatrixSortBy] = useState<'value' | 'weight' | 'rate' | 'shipments' | 'name'>('value');
  const [matrixSortDir, setMatrixSortDir] = useState<'asc' | 'desc'>('desc');
  const [matrixViewMode, setMatrixViewMode] = useState<'table' | 'cards'>('table');

  // Lookups
  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const portMap = useMemo(() => new Map(ports.map((p) => [p.id, p])), [ports]);
  const speciesMap = useMemo(() => new Map(species.map((sp) => [sp.id, sp])), [species]);

  // Options for MultiSelectFilter
  const customerOptions = useMemo(
    () => customers.map((c) => ({ id: c.id, label: c.name, subLabel: c.country })),
    [customers]
  );

  const speciesOptions = useMemo(
    () => species.map((sp) => ({ id: sp.id, label: sp.name, subLabel: sp.scientificName || undefined })),
    [species]
  );

  const polOptions = useMemo(
    () => ports.map((p) => ({ id: p.id, label: `${p.code} - ${p.name}`, subLabel: p.country })),
    [ports]
  );

  const podOptions = useMemo(
    () => ports.map((p) => ({ id: p.id, label: `${p.code} - ${p.name}`, subLabel: p.country })),
    [ports]
  );

  const currencyOptions = useMemo(
    () => [
      { id: 'USD', label: 'USD ($)', subLabel: 'US Dollar' },
      { id: 'EUR', label: 'EUR (€)', subLabel: 'Euro' },
      { id: 'GBP', label: 'GBP (£)', subLabel: 'British Pound' },
      { id: 'JPY', label: 'JPY (¥)', subLabel: 'Japanese Yen' }
    ],
    []
  );

  const statusOptions = useMemo(
    () => [
      { id: 'Not Realized', label: 'Not Realized', subLabel: 'Awaiting remittance' },
      { id: 'Partially Realized', label: 'Partially Realized', subLabel: 'Advance credited' },
      { id: 'Fully Realized', label: 'Fully Realized', subLabel: '100% settled' }
    ],
    []
  );

  // Combinable Multi-Filtering
  const filteredInvoices = useMemo(() => {
    return salesInvoices.filter((inv) => {
      if (inv.isVoided) return false;

      if (startDate && inv.invoiceDate < startDate) return false;
      if (endDate && inv.invoiceDate > endDate) return false;
      if (
        selectedCustomerIds.length > 0 &&
        !selectedCustomerIds.includes(inv.consigneeId) &&
        !(inv.buyerId && selectedCustomerIds.includes(inv.buyerId))
      ) {
        return false;
      }
      if (selectedPolIds.length > 0 && !selectedPolIds.includes(inv.portOfLoadingId)) return false;
      if (selectedPodIds.length > 0 && !selectedPodIds.includes(inv.portOfDischargeId)) return false;
      if (selectedCurrencies.length > 0 && !selectedCurrencies.includes(inv.currency)) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(inv.realizationStatus)) return false;

      if (selectedSpeciesIds.length > 0) {
        const hasSpecies = inv.lineItems.some((l) => selectedSpeciesIds.includes(l.speciesId));
        if (!hasSpecies) return false;
      }

      return true;
    });
  }, [
    salesInvoices,
    startDate,
    endDate,
    selectedCustomerIds,
    selectedSpeciesIds,
    selectedPolIds,
    selectedPodIds,
    selectedCurrencies,
    selectedStatuses
  ]);

  // KPI Calculations
  const totalInvoices = filteredInvoices.length;
  const totalWeightKg = filteredInvoices.reduce((s, inv) => s + inv.totalWeightKg, 0);
  const totalUSD = filteredInvoices.reduce((s, inv) => s + inv.totalAmountCurrency, 0);
  const totalFOB = filteredInvoices.reduce((s, inv) => s + (inv.totalFobValueCurrency || 0), 0);
  const totalFobINR = filteredInvoices.reduce((s, inv) => s + (inv.totalFobValueINR || 0), 0);
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
    .map(([id, val]) => {
      const matchInv = filteredInvoices.find((i) => i.consigneeId === id);
      return {
        name: customerMap.get(id)?.name || matchInv?.consigneeName || matchInv?.buyerName || 'Overseas Buyer',
        val,
        pct: totalUSD > 0 ? (val / totalUSD) * 100 : 0
      };
    })
    .sort((a, b) => b.val - a.val)
    .slice(0, 5);

  // Complete Product Share Matrix Computation
  const productShareMap = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      scientificName?: string;
      hsCode: string;
      invoices: Set<string>;
      totalWeightKg: number;
      totalCartons: number;
      totalUSD: number;
      minRate: number;
      maxRate: number;
    }>();

    filteredInvoices.forEach((inv) => {
      inv.lineItems.forEach((l) => {
        const sp = speciesMap.get(l.speciesId);
        const name = (sp?.name || l.productDescription || 'Export Seafood').trim();
        const key = (l.speciesId || name).trim().toLowerCase();
        const hs = l.hsCode || sp?.hsCode || '03061790';
        const wt = Number(l.weightKg) || 0;
        const ctns = Number(l.cartonsCount) || 0;
        const usd = Number(l.amountCurrency) || 0;
        const rate = Number(l.ratePerKg) || (wt > 0 ? usd / wt : 0);

        if (!map.has(key)) {
          map.set(key, {
            id: l.speciesId || key,
            name,
            scientificName: sp?.scientificName,
            hsCode: hs,
            invoices: new Set(),
            totalWeightKg: 0,
            totalCartons: 0,
            totalUSD: 0,
            minRate: rate > 0 ? rate : Infinity,
            maxRate: rate > 0 ? rate : 0
          });
        }

        const item = map.get(key)!;
        item.invoices.add(inv.invoiceNo);
        item.totalWeightKg += wt;
        item.totalCartons += ctns;
        item.totalUSD += usd;
        if (rate > 0) {
          if (rate < item.minRate) item.minRate = rate;
          if (rate > item.maxRate) item.maxRate = rate;
        }
      });
    });

    return map;
  }, [filteredInvoices, speciesMap]);

  const fullProductShareMatrix = useMemo(() => {
    return Array.from(productShareMap.values()).map((item) => {
      const volumeSharePct = totalWeightKg > 0 ? (item.totalWeightKg / totalWeightKg) * 100 : 0;
      const valueSharePct = totalUSD > 0 ? (item.totalUSD / totalUSD) * 100 : 0;
      const avgRatePerKg = item.totalWeightKg > 0 ? item.totalUSD / item.totalWeightKg : 0;
      const safeMinRate = item.minRate === Infinity ? avgRatePerKg : item.minRate;

      return {
        id: item.id,
        name: item.name,
        scientificName: item.scientificName,
        hsCode: item.hsCode,
        invoicesCount: item.invoices.size,
        totalWeightKg: item.totalWeightKg,
        volumeSharePct,
        totalCartons: item.totalCartons,
        totalUSD: item.totalUSD,
        valueSharePct,
        avgRatePerKg,
        minRate: safeMinRate,
        maxRate: item.maxRate || avgRatePerKg,
        indicativeINR: item.totalUSD * 84.5
      };
    }).sort((a, b) => b.totalUSD - a.totalUSD);
  }, [productShareMap, totalWeightKg, totalUSD]);

  // Filtered and sorted product share matrix
  const displayProductMatrix = useMemo(() => {
    let list = fullProductShareMatrix;
    if (matrixSearch) {
      const q = matrixSearch.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.hsCode.toLowerCase().includes(q) ||
        (p.scientificName || '').toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      let diff = 0;
      if (matrixSortBy === 'value') diff = b.totalUSD - a.totalUSD;
      else if (matrixSortBy === 'weight') diff = b.totalWeightKg - a.totalWeightKg;
      else if (matrixSortBy === 'rate') diff = b.avgRatePerKg - a.avgRatePerKg;
      else if (matrixSortBy === 'shipments') diff = b.invoicesCount - a.invoicesCount;
      else if (matrixSortBy === 'name') diff = a.name.localeCompare(b.name);

      return matrixSortDir === 'desc' ? diff : -diff;
    });

    return list;
  }, [fullProductShareMatrix, matrixSearch, matrixSortBy, matrixSortDir]);

  // Top 6 products for visual card widget
  const topProducts = useMemo(() => fullProductShareMatrix.slice(0, 6), [fullProductShareMatrix]);

  // Export Matrix CSV handler
  const handleExportMatrixCSV = () => {
    const data = displayProductMatrix.map((p, idx) => ({
      Rank: idx + 1,
      Commodity: p.name,
      ScientificName: p.scientificName || '',
      HSCode: p.hsCode,
      Shipments: p.invoicesCount,
      NetWeightKg: p.totalWeightKg,
      VolumeSharePct: `${p.volumeSharePct.toFixed(2)}%`,
      Cartons: p.totalCartons,
      TotalSalesUSD: p.totalUSD,
      ValueSharePct: `${p.valueSharePct.toFixed(2)}%`,
      WeightedAvgRateUSDPerKg: p.avgRatePerKg.toFixed(2),
      PriceSpreadUSD: `$${p.minRate.toFixed(2)} – $${p.maxRate.toFixed(2)}`,
      IndicativeINR: p.indicativeINR
    }));

    const csv = convertToCSV(data, [
      { key: 'Rank', label: '#' },
      { key: 'Commodity', label: 'Export Commodity / Product' },
      { key: 'ScientificName', label: 'Scientific Name' },
      { key: 'HSCode', label: 'HS Code' },
      { key: 'Shipments', label: 'Shipments' },
      { key: 'NetWeightKg', label: 'Total Net Wt (Kg)' },
      { key: 'VolumeSharePct', label: 'Volume Share %' },
      { key: 'Cartons', label: 'Total Cartons' },
      { key: 'TotalSalesUSD', label: 'Total Sales (USD)' },
      { key: 'ValueSharePct', label: 'Value Share %' },
      { key: 'WeightedAvgRateUSDPerKg', label: 'Weighted Avg Rate ($/Kg)' },
      { key: 'PriceSpreadUSD', label: 'Price Spread ($/Kg)' },
      { key: 'IndicativeINR', label: 'Indicative Value (INR)' }
    ]);

    downloadFile(csv, `Commercial_Product_Share_Matrix_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Destination Port-wise Distribution (Top 4)
  const podDistributionMap = new Map<string, number>();
  filteredInvoices.forEach((inv) => {
    podDistributionMap.set(
      inv.portOfDischargeId,
      (podDistributionMap.get(inv.portOfDischargeId) || 0) + inv.totalWeightKg
    );
  });
  const topPorts = Array.from(podDistributionMap.entries())
    .map(([id, wt]) => {
      const matchInv = filteredInvoices.find((i) => i.portOfDischargeId === id);
      return {
        name: portMap.get(id)?.name || matchInv?.portOfDischarge || 'Discharge Port',
        code: portMap.get(id)?.code || 'POD',
        wt,
        pct: totalWeightKg > 0 ? (wt / totalWeightKg) * 100 : 0
      };
    })
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
    setSelectedCustomerIds([]);
    setSelectedSpeciesIds([]);
    setSelectedPolIds([]);
    setSelectedPodIds([]);
    setSelectedCurrencies([]);
    setSelectedStatuses([]);
  };

  const hasActiveFilter = Boolean(
    startDate ||
    endDate ||
    selectedCustomerIds.length > 0 ||
    selectedSpeciesIds.length > 0 ||
    selectedPolIds.length > 0 ||
    selectedPodIds.length > 0 ||
    selectedCurrencies.length > 0 ||
    selectedStatuses.length > 0
  );

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
      <div className="relative overflow-hidden p-5 bg-white/95 backdrop-blur-xl rounded-2xl text-ink-900 flex flex-wrap items-center justify-between gap-4 shadow-md border border-rose-100/90">
        {/* Mild red liquid ambient effects */}
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-rose-200/40 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-rose-100/50 blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-rose-50/30 to-white/90 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-700 shadow-2xs">
            <BadgeDollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-ink-950">FOB Export Valuation Ledger</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100/70 text-rose-800 border border-rose-200/80">Dual Currency (USD &amp; INR)</span>
            </div>
            <p className="text-xs text-ink-600 mt-0.5 font-medium">
              Net Free On Board export values, foreign buyers, and exchange rate realizations in both USD ($) and Indian Rupees (₹).
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-rose-700">Total Net FOB Valuation</div>
            <div className="text-sm font-black text-ink-950 flex items-center gap-2 justify-end">
              <span>${totalFOB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              {totalFobINR > 0 && (
                <>
                  <span className="text-rose-300">&bull;</span>
                  <span className="text-rose-700 font-bold">FOB: {formatINR(totalFobINR)}</span>
                </>
              )}
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('fob-dashboard')}
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0 btn-liquid"
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
            Sales Multi-Filter Matrix
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

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Date From */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl font-medium">
            <span className="text-[10px] font-bold text-ink-500 uppercase">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs outline-none font-semibold cursor-pointer"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl font-medium">
            <span className="text-[10px] font-bold text-ink-500 uppercase">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs outline-none font-semibold cursor-pointer"
            />
          </div>

          {/* Multi-select Customers */}
          <MultiSelectFilter
            label="Customers"
            options={customerOptions}
            selectedIds={selectedCustomerIds}
            onChange={setSelectedCustomerIds}
            icon={Users}
            badgeColor="rose"
            placeholder="Search customers..."
          />

          {/* Multi-select Species / Products */}
          <MultiSelectFilter
            label="Species"
            options={speciesOptions}
            selectedIds={selectedSpeciesIds}
            onChange={setSelectedSpeciesIds}
            icon={Fish}
            badgeColor="blue"
            placeholder="Search species..."
          />

          {/* Multi-select Port of Loading */}
          <MultiSelectFilter
            label="Loading Port"
            options={polOptions}
            selectedIds={selectedPolIds}
            onChange={setSelectedPolIds}
            icon={Ship}
            badgeColor="indigo"
            placeholder="Search loading ports..."
          />

          {/* Multi-select Port of Discharge */}
          <MultiSelectFilter
            label="Discharge Port"
            options={podOptions}
            selectedIds={selectedPodIds}
            onChange={setSelectedPodIds}
            icon={Anchor}
            badgeColor="emerald"
            placeholder="Search discharge ports..."
          />

          {/* Multi-select Currency */}
          <MultiSelectFilter
            label="Currency"
            options={currencyOptions}
            selectedIds={selectedCurrencies}
            onChange={setSelectedCurrencies}
            icon={DollarSign}
            badgeColor="amber"
            placeholder="Search currency..."
          />

          {/* Multi-select Realization Status */}
          <MultiSelectFilter
            label="Status"
            options={statusOptions}
            selectedIds={selectedStatuses}
            onChange={setSelectedStatuses}
            icon={CheckCircle2}
            badgeColor="purple"
            placeholder="Search status..."
          />
        </div>

        {/* Removable Filter Chips */}
        {hasActiveFilter && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
            <span className="text-[10px] uppercase font-bold text-ink-400">Active filters:</span>
            {startDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 text-ink-800 rounded-full text-xs font-semibold border border-gray-200">
                From: {startDate}
                <button onClick={() => setStartDate('')} className="hover:text-rose-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {endDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 text-ink-800 rounded-full text-xs font-semibold border border-gray-200">
                To: {endDate}
                <button onClick={() => setEndDate('')} className="hover:text-rose-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedCustomerIds.map((id) => {
              const c = customerMap.get(id);
              if (!c) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 text-rose-800 rounded-full text-xs font-semibold border border-rose-200"
                >
                  Client: {c.name}
                  <button onClick={() => setSelectedCustomerIds(selectedCustomerIds.filter((item) => item !== id))} className="hover:text-rose-950">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {selectedSpeciesIds.map((id) => {
              const sp = speciesMap.get(id);
              if (!sp) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-800 rounded-full text-xs font-semibold border border-blue-200"
                >
                  Species: {sp.name}
                  <button onClick={() => setSelectedSpeciesIds(selectedSpeciesIds.filter((item) => item !== id))} className="hover:text-blue-950">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {selectedPolIds.map((id) => {
              const p = portMap.get(id);
              if (!p) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-800 rounded-full text-xs font-semibold border border-indigo-200"
                >
                  POL: {p.code}
                  <button onClick={() => setSelectedPolIds(selectedPolIds.filter((item) => item !== id))} className="hover:text-indigo-950">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {selectedPodIds.map((id) => {
              const p = portMap.get(id);
              if (!p) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-xs font-semibold border border-emerald-200"
                >
                  POD: {p.code}
                  <button onClick={() => setSelectedPodIds(selectedPodIds.filter((item) => item !== id))} className="hover:text-emerald-950">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {selectedCurrencies.map((curr) => (
              <span
                key={curr}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 rounded-full text-xs font-semibold border border-amber-200"
              >
                Currency: {curr}
                <button onClick={() => setSelectedCurrencies(selectedCurrencies.filter((item) => item !== curr))} className="hover:text-amber-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {selectedStatuses.map((st) => (
              <span
                key={st}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 text-purple-800 rounded-full text-xs font-semibold border border-purple-200"
              >
                Status: {st}
                <button onClick={() => setSelectedStatuses(selectedStatuses.filter((item) => item !== st))} className="hover:text-purple-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
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
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-rose-700" />
              Product Export Share
            </h3>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              {fullProductShareMatrix.length} Commodities
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {topProducts.length === 0 ? (
              <p className="text-xs text-ink-500 py-6 text-center">No product data recorded.</p>
            ) : (
              topProducts.map((p) => (
                <div key={p.id} className="space-y-1">
                  <div className="flex justify-between items-baseline text-xs font-semibold">
                    <span className="truncate max-w-[170px] text-ink-900 font-bold" title={p.name}>
                      {p.name}
                    </span>
                    <span className="text-ink-700 tabular-nums font-bold text-[11px]">
                      ${p.totalUSD.toLocaleString()} ({p.valueSharePct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-ink-500 font-mono">
                    <span>{formatKg(p.totalWeightKg)} ({p.volumeSharePct.toFixed(1)}% wt)</span>
                    <span className="text-emerald-700 font-bold">${p.avgRatePerKg.toFixed(2)}/kg</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${p.valueSharePct}%` }} title="Value share" />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-gray-100">
            <a
              href="#commercial-product-share-matrix"
              className="text-[11px] font-bold text-rose-700 hover:text-rose-900 flex items-center justify-between group"
            >
              <span>Explore Full Product Share Matrix ({fullProductShareMatrix.length} items)</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </a>
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

      {/* ==================================================================== */}
      {/* FULL COMMERCIAL PRODUCT SHARE MATRIX (COMPLETE INTERACTIVE COMPONENT) */}
      {/* ==================================================================== */}
      <div id="commercial-product-share-matrix" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-ink-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-rose-700" />
                Commercial Product Share Matrix
              </h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {fullProductShareMatrix.length} Export Commodities
              </span>
            </div>
            <p className="text-xs text-ink-500 mt-0.5">
              Comprehensive volumetric, revenue share, and $/Kg realization cross-tabulation across all shipments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search commodity, HS code..."
                value={matrixSearch}
                onChange={(e) => setMatrixSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
              />
            </div>

            {/* Sort Selector */}
            <select
              value={matrixSortBy}
              onChange={(e) => setMatrixSortBy(e.target.value as any)}
              className="text-xs font-semibold px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="value">Sort: Sales Value (USD)</option>
              <option value="weight">Sort: Net Weight (Kg)</option>
              <option value="rate">Sort: Realization Rate ($/Kg)</option>
              <option value="shipments">Sort: Shipment Count</option>
              <option value="name">Sort: Commodity Name</option>
            </select>

            <button
              onClick={() => setMatrixSortDir(matrixSortDir === 'desc' ? 'asc' : 'desc')}
              className="p-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-ink-600 transition"
              title={matrixSortDir === 'desc' ? 'Descending' : 'Ascending'}
              aria-label="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setMatrixViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${
                  matrixViewMode === 'table' ? 'bg-white text-rose-700 shadow-xs' : 'text-ink-600 hover:text-ink-900'
                }`}
                title="Table View"
                aria-label="Table View"
              >
                <Table className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setMatrixViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${
                  matrixViewMode === 'cards' ? 'bg-white text-rose-700 shadow-xs' : 'text-ink-600 hover:text-ink-900'
                }`}
                title="Grid Cards View"
                aria-label="Grid Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* CSV Export */}
            <button
              onClick={handleExportMatrixCSV}
              className="px-3.5 py-1.5 bg-white hover:bg-rose-50 border border-gray-200 hover:border-rose-300 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Matrix CSV</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Summary Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-[10px] font-bold text-ink-500 uppercase block">Active Commodities</span>
            <span className="text-lg font-black text-ink-900 mt-0.5 block">{fullProductShareMatrix.length}</span>
            <span className="text-[10px] text-ink-500 mt-0.5 block">Across {totalInvoices} Invoices</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-[10px] font-bold text-ink-500 uppercase block">Total Net Weight</span>
            <span className="text-lg font-black text-ink-900 mt-0.5 block">{formatKg(totalWeightKg)}</span>
            <span className="text-[10px] text-ink-500 mt-0.5 block">{fullProductShareMatrix.reduce((s, p) => s + p.totalCartons, 0).toLocaleString()} Cartons</span>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
            <span className="text-[10px] font-bold text-rose-800 uppercase block">Total Export Value</span>
            <span className="text-lg font-black text-rose-950 mt-0.5 block">${totalUSD.toLocaleString()}</span>
            <span className="text-[10px] text-rose-800 font-semibold mt-0.5 block">≈ {formatINR(totalUSD * 84.5)}</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Weighted Realization</span>
            <span className="text-lg font-black text-emerald-950 mt-0.5 block">${avgUSDPerKg.toFixed(2)}/kg</span>
            <span className="text-[10px] text-emerald-800 font-semibold mt-0.5 block">Overall Portfolio Avg</span>
          </div>
          <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200">
            <span className="text-[10px] font-bold text-cyan-800 uppercase block">Top Commodity</span>
            <span className="text-xs font-black text-cyan-950 mt-1 block truncate" title={fullProductShareMatrix[0]?.name || 'N/A'}>
              {fullProductShareMatrix[0]?.name || 'N/A'}
            </span>
            <span className="text-[10px] text-cyan-800 font-bold mt-0.5 block">
              {fullProductShareMatrix[0] ? `$${fullProductShareMatrix[0].totalUSD.toLocaleString()} (${fullProductShareMatrix[0].valueSharePct.toFixed(1)}%)` : '—'}
            </span>
          </div>
        </div>

        {/* View Mode 1: Table View */}
        {matrixViewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3 text-center">#</th>
                  <th className="py-2.5 px-3">Export Commodity / Species</th>
                  <th className="py-2.5 px-3 font-mono">HS Code</th>
                  <th className="py-2.5 px-3 text-center">Shipments</th>
                  <th className="py-2.5 px-3 text-right">Net Wt (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Vol Share</th>
                  <th className="py-2.5 px-3 text-right">Cartons</th>
                  <th className="py-2.5 px-3 text-right">Sales Value (USD)</th>
                  <th className="py-2.5 px-3 text-right">Value Share</th>
                  <th className="py-2.5 px-3 text-right">Avg Rate ($/Kg)</th>
                  <th className="py-2.5 px-3 text-right">Price Spread</th>
                  <th className="py-2.5 px-3 text-right">Indicative INR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {displayProductMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-ink-500">
                      No commodities matched the search or filter query.
                    </td>
                  </tr>
                ) : (
                  displayProductMatrix.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-rose-50/20 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-ink-400 font-semibold">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-extrabold text-ink-900">{p.name}</div>
                        {p.scientificName && (
                          <div className="text-[10px] italic text-ink-400 font-normal">{p.scientificName}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-ink-600 font-medium">{p.hsCode}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-ink-700 font-bold text-[10px]">
                          {p.invoicesCount} inv
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-ink-900 tabular-nums">
                        {formatKg(p.totalWeightKg)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="font-semibold text-ink-700 tabular-nums">{p.volumeSharePct.toFixed(1)}%</div>
                        <div className="h-1 w-14 bg-gray-100 rounded-full overflow-hidden ml-auto mt-0.5">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, p.volumeSharePct)}%` }} />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-ink-600 tabular-nums">
                        {p.totalCartons > 0 ? p.totalCartons.toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-950 tabular-nums">
                        ${p.totalUSD.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="font-bold text-rose-800 tabular-nums">{p.valueSharePct.toFixed(1)}%</div>
                        <div className="h-1 w-14 bg-gray-100 rounded-full overflow-hidden ml-auto mt-0.5">
                          <div className="h-full bg-rose-600 rounded-full" style={{ width: `${Math.min(100, p.valueSharePct)}%` }} />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700 tabular-nums">
                        ${p.avgRatePerKg.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[11px] text-amber-800 tabular-nums">
                        ${p.minRate.toFixed(2)} – ${p.maxRate.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-ink-700 font-semibold tabular-nums">
                        {formatINR(p.indicativeINR)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50/90 font-bold text-ink-900 border-t-2 border-gray-200">
                  <td colSpan={4} className="py-3 px-3 uppercase text-[10px] text-ink-500 text-right">
                    Total Portfolio ({displayProductMatrix.length} commodities)
                  </td>
                  <td className="py-3 px-3 text-right font-extrabold text-ink-900">
                    {formatKg(displayProductMatrix.reduce((s, p) => s + p.totalWeightKg, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-blue-700">
                    {displayProductMatrix.reduce((s, p) => s + p.volumeSharePct, 0).toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right text-ink-700 font-bold">
                    {displayProductMatrix.reduce((s, p) => s + p.totalCartons, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-rose-950 text-sm">
                    ${displayProductMatrix.reduce((s, p) => s + p.totalUSD, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-rose-800">
                    {displayProductMatrix.reduce((s, p) => s + p.valueSharePct, 0).toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right font-black text-emerald-800">
                    ${(displayProductMatrix.reduce((s, p) => s + p.totalUSD, 0) / (displayProductMatrix.reduce((s, p) => s + p.totalWeightKg, 0) || 1)).toFixed(2)}/kg
                  </td>
                  <td></td>
                  <td className="py-3 px-3 text-right font-bold text-ink-900">
                    {formatINR(displayProductMatrix.reduce((s, p) => s + p.indicativeINR, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* View Mode 2: Grid Cards View */}
        {matrixViewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayProductMatrix.map((p, idx) => (
              <div key={p.id} className="p-4 bg-gray-50/80 hover:bg-rose-50/30 rounded-2xl border border-gray-200 transition space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-ink-400 font-bold">#{idx + 1}</span>
                    <h4 className="text-sm font-extrabold text-ink-900 leading-snug">{p.name}</h4>
                    <span className="text-[11px] font-mono text-ink-500">HS {p.hsCode}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-ink-700">
                    {p.invoicesCount} inv
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-200/60">
                  <div>
                    <span className="text-[10px] text-ink-400 block font-bold uppercase">Weight</span>
                    <span className="font-extrabold text-ink-900">{formatKg(p.totalWeightKg)}</span>
                    <span className="text-[10px] text-blue-700 font-semibold block">{p.volumeSharePct.toFixed(1)}% vol</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-ink-400 block font-bold uppercase">Sales USD</span>
                    <span className="font-black text-rose-950">${p.totalUSD.toLocaleString()}</span>
                    <span className="text-[10px] text-rose-700 font-semibold block">{p.valueSharePct.toFixed(1)}% val</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-400 block font-bold uppercase">Weighted Avg</span>
                    <span className="font-extrabold text-emerald-700">${p.avgRatePerKg.toFixed(2)}/kg</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-ink-400 block font-bold uppercase">Spread</span>
                    <span className="font-mono text-[11px] text-amber-800 font-bold">${p.minRate.toFixed(2)} – ${p.maxRate.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-ink-500 font-medium">
                    <span>Revenue Share Bar</span>
                    <span className="font-bold text-rose-700">{p.valueSharePct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-600 rounded-full" style={{ width: `${Math.min(100, p.valueSharePct)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
