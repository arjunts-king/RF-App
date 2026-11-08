import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { SalesInvoice } from '../../types';
import { formatINR, formatKg } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
import { MultiSelectFilter } from '../common/MultiSelectFilter';
import { ExportInvoicePreviewModal } from './ExportInvoicePreviewModal';
import {
  TrendingUp,
  BadgeDollarSign,
  PlusCircle,
  FileText,
  Download,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  Ship,
  Globe2,
  FileSpreadsheet,
  RefreshCw,
  Scale,
  Users,
  Fish,
  Anchor,
  X
} from 'lucide-react';

export type CurrencyViewMode = 'dual' | 'usd' | 'inr';
export type DatePreset = 'all' | 'this_month' | 'last_month' | 'last_90' | 'fy';

const formatUSD = (val: number | undefined | null): string => {
  const num = Number(val || 0);
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const FobDashboard: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { salesInvoices, customers, ports, species, businessSettings } = useData();

  // Currency View Mode: Dual (both side-by-side), USD only, INR only
  const [currencyMode, setCurrencyMode] = useState<CurrencyViewMode>('dual');

  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState<string[]>([]);
  const [selectedPodIds, setSelectedPodIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Invoice Preview Modal State
  const [previewInvoice, setPreviewInvoice] = useState<SalesInvoice | null>(null);

  // Selected invoices for bulk export
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  // Maps for lookups
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

  const podOptions = useMemo(
    () => ports.map((p) => ({ id: p.id, label: `${p.code} - ${p.name}`, subLabel: p.country })),
    [ports]
  );

  const statusOptions = useMemo(
    () => [
      { id: 'Fully Realized', label: 'Fully Realized', subLabel: '100% settled' },
      { id: 'Partially Realized', label: 'Partially Realized', subLabel: 'Advance credited' },
      { id: 'Not Realized', label: 'Not Realized', subLabel: 'Awaiting remittance' }
    ],
    []
  );

  // Handle Preset Changes
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'this_month') {
      const y = now.getFullYear();
      const m = now.getMonth();
      const last = new Date(y, m + 1, 0);
      setStartDate(`${y}-${pad(m + 1)}-01`);
      setEndDate(`${y}-${pad(m + 1)}-${pad(last.getDate())}`);
    } else if (preset === 'last_month') {
      const y = now.getFullYear();
      const m = now.getMonth() - 1;
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      setStartDate(`${first.getFullYear()}-${pad(first.getMonth() + 1)}-01`);
      setEndDate(`${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`);
    } else if (preset === 'last_90') {
      const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'fy') {
      const m = now.getMonth();
      const startYear = m >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      setStartDate(`${startYear}-04-01`);
      setEndDate(`${startYear + 1}-03-31`);
    }
  };

  // Filter Invoices
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
      if (selectedPodIds.length > 0 && !selectedPodIds.includes(inv.portOfDischargeId)) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(inv.realizationStatus)) return false;

      if (selectedSpeciesIds.length > 0) {
        const hasSpecies = inv.lineItems.some((l) => selectedSpeciesIds.includes(l.speciesId));
        if (!hasSpecies) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const invNoMatch = inv.invoiceNo.toLowerCase().includes(q);
        const custName = customerMap.get(inv.consigneeId)?.name.toLowerCase() || '';
        const buyerName = customerMap.get(inv.buyerId || '')?.name.toLowerCase() || '';
        const podName = portMap.get(inv.portOfDischargeId)?.name.toLowerCase() || '';
        const hasProductMatch = inv.lineItems.some((l) => {
          const spName = speciesMap.get(l.speciesId)?.name.toLowerCase() || '';
          return spName.includes(q);
        });

        if (!invNoMatch && !custName.includes(q) && !buyerName.includes(q) && !podName.includes(q) && !hasProductMatch) {
          return false;
        }
      }

      return true;
    });
  }, [salesInvoices, startDate, endDate, selectedCustomerIds, selectedPodIds, selectedStatuses, selectedSpeciesIds, searchQuery, customerMap, portMap, speciesMap]);

  // Aggregated KPI Calculations
  const stats = useMemo(() => {
    const totalInvoices = filteredInvoices.length;
    const totalWeightKg = Number(filteredInvoices.reduce((s, inv) => s + inv.totalWeightKg, 0).toFixed(2));
    const totalWeightMT = Number((totalWeightKg / 1000).toFixed(3));
    const totalCartons = filteredInvoices.reduce((s, inv) => s + inv.totalCartons, 0);

    // Sales Values
    const totalSalesUSD = Number(filteredInvoices.reduce((s, inv) => s + inv.totalAmountCurrency, 0).toFixed(2));

    // Realized Invoices (only invoices realized / settled have confirmed INR value)
    const realizedInvoices = filteredInvoices.filter(
      (inv) => inv.realizationStatus === 'Fully Realized' || (inv.totalRealizedINR && inv.totalRealizedINR > 0)
    );
    const totalSalesINR = Number(realizedInvoices.reduce((s, inv) => s + (inv.totalRealizedINR || 0), 0).toFixed(2));

    // FOB Values
    const totalFobUSD = Number(filteredInvoices.reduce((s, inv) => s + inv.totalFobValueCurrency, 0).toFixed(2));
    const totalFobINR = Number(
      realizedInvoices
        .reduce((s, inv) => s + (inv.totalFobValueINR || inv.totalRealizedINR || 0), 0)
        .toFixed(2)
    );

    // Purchase Values (Cost of Goods)
    const totalPurchaseUSD = Number(
      filteredInvoices.reduce((s, inv) => s + (inv.totalPurchaseValueCurrency || 0), 0).toFixed(2)
    );
    const totalPurchaseINR = Number(
      filteredInvoices
        .reduce(
          (s, inv) =>
            s +
            (inv.totalPurchaseValueINR ||
              (inv.totalPurchaseValueCurrency ? Number((inv.totalPurchaseValueCurrency * inv.exchangeRate).toFixed(2)) : 0)),
          0
        )
        .toFixed(2)
    );

    // Gross Export Margins
    const grossProfitUSD = totalPurchaseUSD > 0 ? Number((totalFobUSD - totalPurchaseUSD).toFixed(2)) : undefined;
    const grossProfitINR = totalPurchaseINR > 0 ? Number((totalFobINR - totalPurchaseINR).toFixed(2)) : undefined;
    const marginPct =
      totalFobUSD > 0 && grossProfitUSD !== undefined ? Number(((grossProfitUSD / totalFobUSD) * 100).toFixed(2)) : undefined;

    // Realizations
    const totalRealizedUSD = Number(filteredInvoices.reduce((s, inv) => s + inv.totalRealizedCurrency, 0).toFixed(2));
    const totalRealizedINR = Number(filteredInvoices.reduce((s, inv) => s + inv.totalRealizedINR, 0).toFixed(2));
    const totalOutstandingUSD = Number(filteredInvoices.reduce((s, inv) => s + inv.balanceRealizationCurrency, 0).toFixed(2));
    const totalOutstandingINR = Number(
      filteredInvoices
        .reduce((s, inv) => s + Number((inv.balanceRealizationCurrency * inv.exchangeRate).toFixed(2)), 0)
        .toFixed(2)
    );
    const realizationPct = totalSalesUSD > 0 ? Number(((totalRealizedUSD / totalSalesUSD) * 100).toFixed(1)) : 0;

    // Averages
    const avgFobPerKgUSD = totalWeightKg > 0 ? Number((totalFobUSD / totalWeightKg).toFixed(2)) : 0;
    const avgFobPerKgINR = totalWeightKg > 0 && totalFobINR > 0 ? Number((totalFobINR / totalWeightKg).toFixed(2)) : 0;
    const avgSalesPerKgUSD = totalWeightKg > 0 ? Number((totalSalesUSD / totalWeightKg).toFixed(2)) : 0;
    const avgSalesPerKgINR = totalWeightKg > 0 && totalSalesINR > 0 ? Number((totalSalesINR / totalWeightKg).toFixed(2)) : 0;

    // Exchange Rate Performance
    const avgBookingRate = 84.5;
    const avgRealizedRate =
      totalRealizedUSD > 0 ? Number((totalRealizedINR / totalRealizedUSD).toFixed(2)) : avgBookingRate;

    return {
      totalInvoices,
      totalWeightKg,
      totalWeightMT,
      totalCartons,
      totalSalesUSD,
      totalSalesINR,
      totalFobUSD,
      totalFobINR,
      totalPurchaseUSD,
      totalPurchaseINR,
      grossProfitUSD,
      grossProfitINR,
      marginPct,
      totalRealizedUSD,
      totalRealizedINR,
      totalOutstandingUSD,
      totalOutstandingINR,
      realizationPct,
      avgFobPerKgUSD,
      avgFobPerKgINR,
      avgSalesPerKgUSD,
      avgSalesPerKgINR,
      avgBookingRate,
      avgRealizedRate
    };
  }, [filteredInvoices]);

  // Monthly FOB Trend Analysis (Last 6 Months)
  const monthlyData = useMemo(() => {
    const map = new Map<string, { fobUSD: number; fobINR: number; salesUSD: number; salesINR: number; wtKg: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      map.set(key, { fobUSD: 0, fobINR: 0, salesUSD: 0, salesINR: 0, wtKg: 0 });
    }

    filteredInvoices.forEach((inv) => {
      const m = inv.invoiceDate.slice(0, 7);
      const fobINR = inv.totalFobValueINR || Number((inv.totalFobValueCurrency * inv.exchangeRate).toFixed(2));
      if (map.has(m)) {
        const item = map.get(m)!;
        item.fobUSD += inv.totalFobValueCurrency;
        item.fobINR += fobINR;
        item.salesUSD += inv.totalAmountCurrency;
        item.salesINR += inv.estimatedAmountINR;
        item.wtKg += inv.totalWeightKg;
      }
    });

    return Array.from(map.entries()).map(([month, data]) => ({
      month,
      ...data
    }));
  }, [filteredInvoices]);

  const maxMonthFobUSD = Math.max(...monthlyData.map((d) => d.fobUSD), 1000);
  const maxMonthFobINR = Math.max(...monthlyData.map((d) => d.fobINR), 100000);

  // Top Foreign Buyers by FOB
  const topBuyers = useMemo(() => {
    const map = new Map<string, { fobUSD: number; fobINR: number; wtKg: number; count: number; nameFallback?: string; countryFallback?: string }>();
    filteredInvoices.forEach((inv) => {
      const custId = inv.consigneeId || 'overseas-cust';
      const fobINR = inv.totalFobValueINR || Number((inv.totalFobValueCurrency * inv.exchangeRate).toFixed(2));
      const curr = map.get(custId) || { fobUSD: 0, fobINR: 0, wtKg: 0, count: 0, nameFallback: inv.consigneeName || inv.buyerName, countryFallback: inv.countryOfDestination };
      curr.fobUSD += inv.totalFobValueCurrency;
      curr.fobINR += fobINR;
      curr.wtKg += inv.totalWeightKg;
      curr.count += 1;
      map.set(custId, curr);
    });

    return Array.from(map.entries())
      .map(([id, data]) => {
        const cust = customerMap.get(id);
        const name = cust?.name || data.nameFallback || 'Overseas Customer';
        const country = cust?.country || data.countryFallback || 'Global Export';
        return {
          id,
          name,
          country,
          customer: cust,
          ...data,
          pct: stats.totalFobUSD > 0 ? (data.fobUSD / stats.totalFobUSD) * 100 : 0
        };
      })
      .sort((a, b) => b.fobUSD - a.fobUSD)
      .slice(0, 5);
  }, [filteredInvoices, customerMap, stats.totalFobUSD]);

  // Top Products / Species by FOB
  const topProducts = useMemo(() => {
    const map = new Map<string, { fobUSD: number; fobINR: number; wtKg: number; linesCount: number; nameFallback?: string; hsCodeFallback?: string }>();
    filteredInvoices.forEach((inv) => {
      inv.lineItems.forEach((l) => {
        const spId = l.speciesId;
        const lineFobINR = l.fobValueINR || Number((l.fobValueCurrency * inv.exchangeRate).toFixed(2));
        const curr = map.get(spId) || { fobUSD: 0, fobINR: 0, wtKg: 0, linesCount: 0, nameFallback: l.productDescription, hsCodeFallback: l.hsCode };
        curr.fobUSD += l.fobValueCurrency;
        curr.fobINR += lineFobINR;
        curr.wtKg += l.weightKg;
        curr.linesCount += 1;
        map.set(spId, curr);
      });
    });

    return Array.from(map.entries())
      .map(([id, data]) => {
        const sp = speciesMap.get(id);
        const name = sp?.name || data.nameFallback || 'Export Seafood Commodity';
        const hsCode = sp?.hsCode || data.hsCodeFallback || '03061790';
        return {
          id,
          name,
          hsCode,
          species: sp,
          ...data,
          pct: stats.totalFobUSD > 0 ? (data.fobUSD / stats.totalFobUSD) * 100 : 0
        };
      })
      .sort((a, b) => b.fobUSD - a.fobUSD)
      .slice(0, 5);
  }, [filteredInvoices, speciesMap, stats.totalFobUSD]);

  // Destination Port Distribution
  const topPorts = useMemo(() => {
    const map = new Map<string, { fobUSD: number; fobINR: number; wtKg: number; count: number; nameFallback?: string; countryFallback?: string }>();
    filteredInvoices.forEach((inv) => {
      const podId = inv.portOfDischargeId;
      const fobINR = inv.totalFobValueINR || Number((inv.totalFobValueCurrency * inv.exchangeRate).toFixed(2));
      const curr = map.get(podId) || { fobUSD: 0, fobINR: 0, wtKg: 0, count: 0, nameFallback: inv.portOfDischarge, countryFallback: inv.countryOfDestination };
      curr.fobUSD += inv.totalFobValueCurrency;
      curr.fobINR += fobINR;
      curr.wtKg += inv.totalWeightKg;
      curr.count += 1;
      map.set(podId, curr);
    });

    return Array.from(map.entries())
      .map(([id, data]) => {
        const port = portMap.get(id);
        const name = port?.name || data.nameFallback || 'Discharge Port';
        const country = port?.country || data.countryFallback || 'Destination';
        const code = port?.code || '';
        return {
          id,
          name,
          country,
          code,
          port,
          ...data,
          pct: stats.totalFobUSD > 0 ? (data.fobUSD / stats.totalFobUSD) * 100 : 0
        };
      })
      .sort((a, b) => b.fobUSD - a.fobUSD)
      .slice(0, 4);
  }, [filteredInvoices, portMap, stats.totalFobUSD]);

  // Bulk Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedInvoiceIds(filteredInvoices.map((i) => i.id));
    } else {
      setSelectedInvoiceIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedInvoiceIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // CSV Export of FOB Performance Ledger
  const handleExportCSV = () => {
    const targetInvoices =
      selectedInvoiceIds.length > 0
        ? filteredInvoices.filter((i) => selectedInvoiceIds.includes(i.id))
        : filteredInvoices;

    if (targetInvoices.length === 0) return;

    const headers = [
      'Invoice No',
      'Invoice Date',
      'Consignee Name',
      'Destination Country',
      'Port of Discharge',
      'Exchange Rate (INR/USD)',
      'Total Net Weight (Kg)',
      'Total Sales Value (USD)',
      'Total Sales Value (INR)',
      'Total FOB Value (USD)',
      'Total FOB Value (INR)',
      'Purchase Value (USD)',
      'Purchase Value (INR)',
      'Gross Profit (USD)',
      'Gross Profit (INR)',
      'Margin %',
      'Realized USD',
      'Realized INR',
      'Balance USD',
      'Realization Status'
    ];

    const rows = targetInvoices.map((inv) => {
      const cust = customerMap.get(inv.consigneeId);
      const pod = portMap.get(inv.portOfDischargeId);
      const fobINR = inv.totalFobValueINR || Number((inv.totalFobValueCurrency * inv.exchangeRate).toFixed(2));
      const purUSD = inv.totalPurchaseValueCurrency || 0;
      const purINR = inv.totalPurchaseValueINR || (purUSD ? Number((purUSD * inv.exchangeRate).toFixed(2)) : 0);
      const profitUSD = purUSD > 0 ? Number((inv.totalFobValueCurrency - purUSD).toFixed(2)) : '';
      const profitINR = purINR > 0 ? Number((fobINR - purINR).toFixed(2)) : '';
      const margin = inv.totalFobValueCurrency > 0 && purUSD > 0 ? Number((((inv.totalFobValueCurrency - purUSD) / inv.totalFobValueCurrency) * 100).toFixed(2)) : '';

      return [
        `"${inv.invoiceNo}"`,
        `"${inv.invoiceDate}"`,
        `"${cust?.name || inv.consigneeName || inv.buyerName || 'Overseas Customer'}"`,
        `"${cust?.country || inv.countryOfDestination || 'Global Export'}"`,
        `"${pod?.name || inv.portOfDischarge || 'POD'}"`,
        inv.exchangeRate,
        inv.totalWeightKg,
        inv.totalAmountCurrency.toFixed(2),
        inv.estimatedAmountINR.toFixed(2),
        inv.totalFobValueCurrency.toFixed(2),
        fobINR.toFixed(2),
        purUSD ? purUSD.toFixed(2) : '',
        purINR ? purINR.toFixed(2) : '',
        profitUSD,
        profitINR,
        margin,
        inv.totalRealizedCurrency.toFixed(2),
        inv.totalRealizedINR.toFixed(2),
        inv.balanceRealizationCurrency.toFixed(2),
        `"${inv.realizationStatus}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FOB_Export_Performance_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearAllFilters = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setSelectedCustomerIds([]);
    setSelectedSpeciesIds([]);
    setSelectedPodIds([]);
    setSelectedStatuses([]);
  };

  const hasActiveFilter = Boolean(
    startDate ||
    endDate ||
    searchQuery ||
    selectedCustomerIds.length > 0 ||
    selectedSpeciesIds.length > 0 ||
    selectedPodIds.length > 0 ||
    selectedStatuses.length > 0
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* Executive PageHeader */}
      <PageHeader
        title="FOB Export Performance Dashboard"
        subtitle="Dual-currency intelligence tracking Free On Board (FOB) export valuations, commercial sales turnover, procurement costs, and foreign exchange margins in USD ($) and Indian Rupees (₹)."
        breadcrumbs={['Sales', 'Export Performance', 'FOB Dashboard']}
        primaryAction={
          onNavigate
            ? {
                label: 'New commercial invoice',
                onClick: () => onNavigate('invoice-entry'),
                icon: PlusCircle
              }
            : undefined
        }
        secondaryActions={[
          {
            label: 'Export FOB Ledger (CSV)',
            onClick: handleExportCSV,
            icon: Download
          },
          ...(onNavigate
            ? [
                {
                  label: 'Excel Migration',
                  onClick: () => onNavigate('sales-excel-import'),
                  icon: FileSpreadsheet
                }
              ]
            : [])
        ]}
      />

      {/* Dual Currency Controller Bar */}
      <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-3">
        {/* Currency View Mode Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-xl">
          <button
            onClick={() => setCurrencyMode('dual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currencyMode === 'dual'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <BadgeDollarSign className="w-3.5 h-3.5 text-rose-600" />
            <span>Dual View (USD &amp; INR)</span>
          </button>
          <button
            onClick={() => setCurrencyMode('usd')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currencyMode === 'usd'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <span>USD Focus ($)</span>
          </button>
          <button
            onClick={() => setCurrencyMode('inr')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currencyMode === 'inr'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <span>INR Focus (₹)</span>
          </button>
        </div>

        {/* Live Forex Indicators */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 rounded-lg font-medium text-rose-900">
            <Globe2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Avg Booking Rate: <strong>₹{stats.avgBookingRate.toFixed(2)}</strong> / $</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-lg font-medium text-emerald-900">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Realized Rate: <strong>₹{stats.avgRealizedRate.toFixed(2)}</strong> / $</span>
          </div>
        </div>
      </div>

      {/* Quick Date Presets & Combinable Filter Matrix */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-rose-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-ink-600">Quick Range Presets:</span>
            <div className="flex items-center gap-1 ml-2">
              {[
                { id: 'all', label: 'All Records' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'last_90', label: 'Last 90 Days' },
                { id: 'fy', label: 'Current FY' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id as DatePreset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    datePreset === p.id
                      ? 'bg-rose-600 text-white'
                      : 'bg-gray-100 text-ink-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilter && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Detailed Combinable Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs pt-1">
          {/* Search Query */}
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">Search Keyword</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Invoice, Buyer, Species..."
                className="w-full pl-8 pr-2 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-400 transition"
              />
            </div>
          </div>

          {/* Date From */}
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">Date From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('all');
              }}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-400 transition"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">Date To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('all');
              }}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-400 transition"
            />
          </div>

          {/* Multi-select Customer / Consignee */}
          <div className="flex flex-col justify-end">
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">Consignee / Buyer</label>
            <MultiSelectFilter
              label="Buyers"
              options={customerOptions}
              selectedIds={selectedCustomerIds}
              onChange={setSelectedCustomerIds}
              icon={Users}
              badgeColor="rose"
              placeholder="Search buyers..."
              className="w-full"
            />
          </div>

          {/* Multi-select Product / Species */}
          <div className="flex flex-col justify-end">
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">Product / Species</label>
            <MultiSelectFilter
              label="Species"
              options={speciesOptions}
              selectedIds={selectedSpeciesIds}
              onChange={setSelectedSpeciesIds}
              icon={Fish}
              badgeColor="blue"
              placeholder="Search species..."
              className="w-full"
            />
          </div>

          {/* Multi-select Discharge Port (POD) */}
          <div className="flex flex-col justify-end">
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">Discharge Port</label>
            <MultiSelectFilter
              label="Discharge Ports"
              options={podOptions}
              selectedIds={selectedPodIds}
              onChange={setSelectedPodIds}
              icon={Anchor}
              badgeColor="emerald"
              placeholder="Search ports..."
              className="w-full"
            />
          </div>

          {/* Multi-select Realization Status */}
          <div className="flex flex-col justify-end">
            <label className="text-[10px] font-bold text-ink-500 uppercase block mb-1">Realization Status</label>
            <MultiSelectFilter
              label="Status"
              options={statusOptions}
              selectedIds={selectedStatuses}
              onChange={setSelectedStatuses}
              icon={CheckCircle2}
              badgeColor="purple"
              placeholder="Search status..."
              className="w-full"
            />
          </div>
        </div>

        {/* Removable Filter Chips */}
        {hasActiveFilter && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
            <span className="text-[10px] uppercase font-bold text-ink-400">Active filters:</span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 text-ink-800 rounded-full text-xs font-semibold border border-gray-200">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-rose-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

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
                  Buyer: {c.name}
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

      {/* 6 High-Impact Dual-Currency Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Total FOB Export Value */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs border-l-4 border-l-rose-500 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-ink-500 font-bold uppercase tracking-wider mb-2">
              <span>Total FOB Export Valuation</span>
              <BadgeDollarSign className="w-4 h-4 text-rose-600" />
            </div>
            <div className="space-y-2">
              {(currencyMode === 'dual' || currencyMode === 'usd') && (
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-rose-900 tracking-tight">
                    {formatUSD(stats.totalFobUSD)}
                  </span>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">USD</span>
                </div>
              )}
              {(currencyMode === 'dual' || currencyMode === 'inr') && (
                <div className="flex items-baseline justify-between border-t border-gray-100 pt-1.5">
                  <span className="text-lg font-black text-ink-900">
                    {stats.totalFobINR > 0 ? formatINR(stats.totalFobINR) : '—'}
                  </span>
                  <span className="text-xs font-bold text-ink-600 bg-gray-100 px-2 py-0.5 rounded-md">Realized INR</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-[11px] text-ink-500 pt-3 flex items-center justify-between border-t border-gray-100 mt-2">
            <span>Avg FOB Rate:</span>
            <strong className="text-ink-800">
              {formatUSD(stats.avgFobPerKgUSD)}/Kg {stats.avgFobPerKgINR > 0 ? `• ${formatINR(stats.avgFobPerKgINR)}/Kg` : ''}
            </strong>
          </div>
        </div>

        {/* 2. Total Commercial Sales Turnover */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-ink-500 font-bold uppercase tracking-wider mb-2">
              <span>Total Commercial Sales Turnover</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="space-y-2">
              {(currencyMode === 'dual' || currencyMode === 'usd') && (
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-emerald-900 tracking-tight">
                    {formatUSD(stats.totalSalesUSD)}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">USD</span>
                </div>
              )}
              {(currencyMode === 'dual' || currencyMode === 'inr') && (
                <div className="flex items-baseline justify-between border-t border-gray-100 pt-1.5">
                  <span className="text-lg font-black text-ink-900">
                    {stats.totalSalesINR > 0 ? formatINR(stats.totalSalesINR) : '—'}
                  </span>
                  <span className="text-xs font-bold text-ink-600 bg-gray-100 px-2 py-0.5 rounded-md">Realized INR</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-[11px] text-ink-500 pt-3 flex items-center justify-between border-t border-gray-100 mt-2">
            <span>Avg Sales Rate:</span>
            <strong className="text-emerald-700 font-bold">
              {formatUSD(stats.avgSalesPerKgUSD)}/Kg {stats.avgSalesPerKgINR > 0 ? `• ${formatINR(stats.avgSalesPerKgINR)}/Kg` : ''}
            </strong>
          </div>
        </div>

        {/* 3. Procurement Purchase Cost (Cost of Raw Materials) */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-ink-500 font-bold uppercase tracking-wider mb-2">
              <span>Procurement Purchase Cost</span>
              <Scale className="w-4 h-4 text-amber-600" />
            </div>
            <div className="space-y-2">
              {(currencyMode === 'dual' || currencyMode === 'usd') && (
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-amber-900 tracking-tight">
                    {stats.totalPurchaseUSD > 0 ? formatUSD(stats.totalPurchaseUSD) : 'Cost Ledgers'}
                  </span>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">USD</span>
                </div>
              )}
              {(currencyMode === 'dual' || currencyMode === 'inr') && (
                <div className="flex items-baseline justify-between border-t border-gray-100 pt-1.5">
                  <span className="text-lg font-black text-ink-900">
                    {stats.totalPurchaseINR > 0 ? formatINR(stats.totalPurchaseINR) : 'Landed Batches'}
                  </span>
                  <span className="text-xs font-bold text-ink-600 bg-gray-100 px-2 py-0.5 rounded-md">INR</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-[11px] text-ink-500 pt-3 flex items-center justify-between border-t border-gray-100 mt-2">
            <span>Gross Margin %:</span>
            <strong className={`font-bold ${stats.marginPct && stats.marginPct > 0 ? 'text-emerald-700' : 'text-ink-700'}`}>
              {stats.marginPct !== undefined ? `+${stats.marginPct}%` : 'Turnover Aligned'}
            </strong>
          </div>
        </div>

        {/* 4. FOB Realizations & Banking Settlement */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs border-l-4 border-l-indigo-500 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-ink-500 font-bold uppercase tracking-wider mb-2">
              <span>Settled / Realized Export Value</span>
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="space-y-2">
              {(currencyMode === 'dual' || currencyMode === 'usd') && (
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-indigo-900 tracking-tight">
                    {formatUSD(stats.totalRealizedUSD)}
                  </span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">USD</span>
                </div>
              )}
              {(currencyMode === 'dual' || currencyMode === 'inr') && (
                <div className="flex items-baseline justify-between border-t border-gray-100 pt-1.5">
                  <span className="text-lg font-black text-ink-900">
                    {formatINR(stats.totalRealizedINR)}
                  </span>
                  <span className="text-xs font-bold text-ink-600 bg-gray-100 px-2 py-0.5 rounded-md">INR</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-[11px] text-ink-500 pt-3 flex items-center justify-between border-t border-gray-100 mt-2">
            <span>Settlement Rate:</span>
            <strong className="text-indigo-700 font-bold">{stats.realizationPct}% Realized</strong>
          </div>
        </div>

        {/* 5. Outstanding Receivables */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs border-l-4 border-l-rose-400 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-ink-500 font-bold uppercase tracking-wider mb-2">
              <span>Outstanding / Pending Receivables</span>
              <Clock className="w-4 h-4 text-rose-600" />
            </div>
            <div className="space-y-2">
              {(currencyMode === 'dual' || currencyMode === 'usd') && (
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-rose-800 tracking-tight">
                    {formatUSD(stats.totalOutstandingUSD)}
                  </span>
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">USD</span>
                </div>
              )}
              {(currencyMode === 'dual' || currencyMode === 'inr') && (
                <div className="flex items-baseline justify-between border-t border-gray-100 pt-1.5">
                  <span className="text-sm font-semibold text-ink-500 italic">
                    Awaiting Realization
                  </span>
                  <span className="text-xs font-bold text-ink-400 bg-gray-100 px-2 py-0.5 rounded-md">INR</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-[11px] text-ink-500 pt-3 flex items-center justify-between border-t border-gray-100 mt-2">
            <span>Pending Invoices:</span>
            <strong className="text-rose-700 font-bold">
              {filteredInvoices.filter((i) => i.balanceRealizationCurrency > 0).length} Shipments
            </strong>
          </div>
        </div>

        {/* 6. Export Volume & Container Shipping */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs border-l-4 border-l-teal-500 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-ink-500 font-bold uppercase tracking-wider mb-2">
              <span>Total Export Shipping Volume</span>
              <Ship className="w-4 h-4 text-teal-600" />
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-teal-900 tracking-tight">
                  {formatKg(stats.totalWeightKg)}
                </span>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                  {stats.totalWeightMT} MT
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-gray-100 pt-1.5">
                <span className="text-lg font-bold text-ink-900">
                  {stats.totalCartons.toLocaleString()} Cartons
                </span>
                <span className="text-xs text-ink-500 font-medium">Export Pack</span>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-ink-500 pt-3 flex items-center justify-between border-t border-gray-100 mt-2">
            <span>Active Shipments:</span>
            <strong className="text-teal-800 font-bold">{stats.totalInvoices} Invoices</strong>
          </div>
        </div>
      </div>

      {/* Analytics Visual Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Monthly FOB Valuation Trend */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                Monthly FOB Valuation Trend
              </h3>
              <p className="text-xs text-ink-500">
                Monthly trajectory in {currencyMode === 'inr' ? 'Indian Rupees (₹)' : 'USD ($)'}
              </p>
            </div>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
              6-Month Ledger
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {monthlyData.map((d) => {
              const val = currencyMode === 'inr' ? d.fobINR : d.fobUSD;
              const maxVal = currencyMode === 'inr' ? maxMonthFobINR : maxMonthFobUSD;
              const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;

              return (
                <div key={d.month} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink-800 font-mono">{d.month}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-ink-500">{formatKg(d.wtKg)}</span>
                      <strong className="text-rose-700">
                        {currencyMode === 'inr' ? formatINR(d.fobINR) : formatUSD(d.fobUSD)}
                      </strong>
                      {currencyMode === 'dual' && (
                        <span className="text-[11px] text-ink-500">({formatINR(d.fobINR)})</span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-rose-500 to-rose-700 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel 2: Top Foreign Buyers by FOB Performance */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                Top Overseas Buyers (FOB Valuation)
              </h3>
              <p className="text-xs text-ink-500">Leading consignees ranked by FOB value</p>
            </div>
            <Users className="w-4 h-4 text-rose-600" />
          </div>

          <div className="space-y-3 pt-1">
            {topBuyers.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-400">No buyer records found</div>
            ) : (
              topBuyers.map((b) => (
                <div key={b.id} className="p-2.5 bg-gray-50/70 hover:bg-rose-50/30 rounded-xl transition space-y-1.5 border border-gray-100">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-ink-900">{b.name}</strong>
                      <span className="text-[10px] text-ink-500 block">{b.country}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-rose-700">{formatUSD(b.fobUSD)}</div>
                      <div className="text-[10px] text-ink-500">{formatINR(b.fobINR)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-ink-500">
                    <span>{b.count} Shipment{b.count > 1 ? 's' : ''} &bull; {formatKg(b.wtKg)}</span>
                    <span className="font-semibold text-rose-600">{b.pct.toFixed(1)}% of total FOB</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 3: Top Export Products by FOB */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                Export Products &amp; Species FOB
              </h3>
              <p className="text-xs text-ink-500">Product-level FOB valuation in USD &amp; INR</p>
            </div>
            <Fish className="w-4 h-4 text-rose-600" />
          </div>

          <div className="space-y-3 pt-1">
            {topProducts.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-400">No product records found</div>
            ) : (
              topProducts.map((p) => (
                <div key={p.id} className="p-2.5 bg-gray-50/70 hover:bg-rose-50/30 rounded-xl transition space-y-1.5 border border-gray-100">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-ink-900">{p.name}</strong>
                      <span className="text-[10px] text-ink-500 block">HS Code: {p.hsCode}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-rose-700">{formatUSD(p.fobUSD)}</div>
                      <div className="text-[10px] text-ink-500">{formatINR(p.fobINR)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-ink-500">
                    <span>{formatKg(p.wtKg)}</span>
                    <span className="font-semibold text-rose-600">{p.pct.toFixed(1)}% of total FOB</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 4: Discharge Port (POD) Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                Major Destination Discharge Ports
              </h3>
              <p className="text-xs text-ink-500">Port of Discharge (POD) volume and FOB value</p>
            </div>
            <Anchor className="w-4 h-4 text-rose-600" />
          </div>

          <div className="space-y-3 pt-1">
            {topPorts.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-400">No port records found</div>
            ) : (
              topPorts.map((p) => (
                <div key={p.id} className="p-2.5 bg-gray-50/70 hover:bg-rose-50/30 rounded-xl transition space-y-1.5 border border-gray-100">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-ink-900">{p.name}</strong>
                      <span className="text-[10px] text-ink-500 block">{p.country}{p.code ? ` (${p.code})` : ''}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-rose-700">{formatUSD(p.fobUSD)}</div>
                      <div className="text-[10px] text-ink-500">{formatINR(p.fobINR)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-ink-500">
                    <span>{p.count} Shipments &bull; {formatKg(p.wtKg)}</span>
                    <span className="font-semibold text-rose-600">{p.pct.toFixed(1)}% of total</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Comprehensive FOB Shipment Performance Register Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
              <BadgeDollarSign className="w-4 h-4 text-rose-600" />
              FOB Export Shipment Performance Register
            </h3>
            <p className="text-xs text-ink-500">
              Complete shipment ledger with dual-currency total sales value and FOB valuation in USD and Indian Rupees.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-ink-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV ({selectedInvoiceIds.length > 0 ? selectedInvoiceIds.length : filteredInvoices.length})</span>
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                <th className="py-2.5 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedInvoiceIds.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onChange={handleSelectAll}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                </th>
                <th className="py-2.5 px-3">Invoice &amp; Date</th>
                <th className="py-2.5 px-3">Consignee &amp; Port</th>
                <th className="py-2.5 px-3 text-right">Net Weight</th>
                <th className="py-2.5 px-3 text-right">Fx Rate</th>
                <th className="py-2.5 px-3 text-right bg-emerald-50/40">Total Sales Value (USD)</th>
                <th className="py-2.5 px-3 text-right bg-rose-50/40">FOB Value (USD)</th>
                <th className="py-2.5 px-3 text-right bg-rose-50/60">Realized FOB (INR)</th>
                <th className="py-2.5 px-3 text-right">Realization Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs text-ink-400">
                    No export sales invoices matched your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isChecked = selectedInvoiceIds.includes(inv.id);
                  const cust = customerMap.get(inv.consigneeId);
                  const pod = portMap.get(inv.portOfDischargeId);
                  const isRealized = inv.realizationStatus === 'Fully Realized' || (inv.totalRealizedINR && inv.totalRealizedINR > 0);
                  const realizedFobINR = isRealized ? (inv.totalFobValueINR || inv.totalRealizedINR) : 0;

                  return (
                    <tr key={inv.id} className={`hover:bg-rose-50/20 transition ${isChecked ? 'bg-rose-50/40' : ''}`}>
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(inv.id)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-ink-900 font-mono">{inv.invoiceNo}</div>
                        <div className="text-[11px] text-ink-500 flex items-center gap-1.5">
                          <span>{inv.invoiceDate}</span>
                          {inv.salesOrderNo && (
                            <span className="font-mono text-indigo-700 bg-indigo-50 px-1 rounded text-[10px] font-semibold border border-indigo-100">
                              {inv.salesOrderNo}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-ink-800">{cust?.name || inv.consigneeName || inv.buyerName || 'Overseas Customer'}</div>
                        <div className="text-[11px] text-ink-500">{pod?.name || inv.portOfDischarge || 'POD'} ({cust?.country || inv.countryOfDestination || 'Global'})</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        {formatKg(inv.totalWeightKg)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-ink-600">
                        ₹{inv.exchangeRate.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/20">
                        {formatUSD(inv.totalAmountCurrency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-800 bg-rose-50/20">
                        {formatUSD(inv.totalFobValueCurrency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-ink-900 bg-rose-50/40">
                        {isRealized ? formatINR(realizedFobINR) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.realizationStatus === 'Fully Realized'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.realizationStatus === 'Partially Realized'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {inv.realizationStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setPreviewInvoice(inv)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-rose-100 hover:text-rose-700 text-ink-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 mx-auto"
                        >
                          <FileText className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredInvoices.length > 0 && (
              <tfoot>
                <tr className="bg-gray-100/90 text-xs font-bold text-ink-900 border-t-2 border-gray-300">
                  <td colSpan={3} className="py-3 px-3 uppercase tracking-wider">
                    Total ({filteredInvoices.length} Shipments)
                  </td>
                  <td className="py-3 px-3 text-right font-mono">{formatKg(stats.totalWeightKg)}</td>
                  <td className="py-3 px-3 text-right font-mono text-ink-600">₹{stats.avgBookingRate.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-900 bg-emerald-100/50">
                    {formatUSD(stats.totalSalesUSD)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-rose-900 bg-rose-100/50">
                    {formatUSD(stats.totalFobUSD)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-ink-900 bg-rose-200/50">
                    {stats.totalFobINR > 0 ? formatINR(stats.totalFobINR) : '—'}
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-right text-[11px] text-ink-600">
                    {stats.realizationPct}% Settled
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <ExportInvoicePreviewModal
          isOpen={Boolean(previewInvoice)}
          onClose={() => setPreviewInvoice(null)}
          invoice={previewInvoice}
          settings={businessSettings}
          customers={customers}
          ports={ports}
        />
      )}
    </div>
  );
};
