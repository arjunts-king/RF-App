import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, formatKg } from '../../utils/calculations';
import { convertToCSV, downloadFile, triggerPrint } from '../../utils/exportUtils';
import {
  Calendar,
  BarChart,
  Grid,
  MapPin,
  TrendingUp,
  Download,
  Printer,
  Users
} from 'lucide-react';

type ReportTab =
  | 'daily'
  | 'monthly'
  | 'species'
  | 'grade-size'
  | 'location'
  | 'supplier'
  | 'price-analysis';

export const OperationalReportsHub: React.FC = () => {
  const { purchases, suppliers, species, grades, sizes, locations, businessSettings } = useData();

  const [activeReport, setActiveReport] = useState<ReportTab>('daily');

  // Filter states
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // Price analysis filter states
  const [paSpeciesId, setPaSpeciesId] = useState<string>(species[0]?.id || '');
  const [paGradeId, setPaGradeId] = useState<string>('');
  const [paSizeId, setPaSizeId] = useState<string>('');
  const [paLocationId, setPaLocationId] = useState<string>('');

  // Lookup maps
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
  const speciesMap = new Map(species.map((sp) => [sp.id, sp]));
  const locationMap = new Map(locations.map((l) => [l.id, l]));

  const activePurchases = purchases.filter((p) => !p.isVoided);

  // --------------------------------------------------------------------------
  // 1. DAILY PURCHASE REPORT
  // --------------------------------------------------------------------------
  const dailyPurchases = activePurchases.filter((p) => p.purchaseDate === selectedDate);
  const dailyTotalWeight = dailyPurchases.reduce((s, p) => s + p.weightKg, 0);
  const dailyTotalValue = dailyPurchases.reduce((s, p) => s + p.purchaseValue, 0);
  const dailyTotalCost = dailyPurchases.reduce((s, p) => s + p.totalCost, 0);
  const dailyTotalExpenses = dailyPurchases.reduce((s, p) => s + p.totalExpenses, 0);

  // --------------------------------------------------------------------------
  // 2. MONTHLY CONSOLIDATED REPORT (MoM comparison)
  // --------------------------------------------------------------------------
  const currentMonthPurchases = activePurchases.filter((p) => p.purchaseDate.startsWith(selectedMonth));
  const currentMonthWeight = currentMonthPurchases.reduce((s, p) => s + p.weightKg, 0);
  const currentMonthCost = currentMonthPurchases.reduce((s, p) => s + p.totalCost, 0);

  // Prior month calculation (MoM)
  const [currY, currM] = selectedMonth.split('-').map(Number);
  const priorMonthStr = `${currM === 1 ? currY - 1 : currY}-${String(currM === 1 ? 12 : currM - 1).padStart(2, '0')}`;
  const priorMonthPurchases = activePurchases.filter((p) => p.purchaseDate.startsWith(priorMonthStr));
  const priorMonthCost = priorMonthPurchases.reduce((s, p) => s + p.totalCost, 0);
  const priorMonthWeight = priorMonthPurchases.reduce((s, p) => s + p.weightKg, 0);

  const momCostChangePct = priorMonthCost > 0 ? ((currentMonthCost - priorMonthCost) / priorMonthCost) * 100 : 0;
  const momWeightChangePct = priorMonthWeight > 0 ? ((currentMonthWeight - priorMonthWeight) / priorMonthWeight) * 100 : 0;

  // --------------------------------------------------------------------------
  // 3. SPECIES-WISE ANALYSIS
  // --------------------------------------------------------------------------
  const speciesAnalysis = species.map((sp) => {
    const list = activePurchases.filter((p) => p.speciesId === sp.id);
    const weight = list.reduce((s, p) => s + p.weightKg, 0);
    const value = list.reduce((s, p) => s + p.purchaseValue, 0);
    const cost = list.reduce((s, p) => s + p.totalCost, 0);
    const avgRate = weight > 0 ? value / weight : 0;
    const effRate = weight > 0 ? cost / weight : 0;

    return {
      id: sp.id,
      name: sp.name,
      category: sp.category,
      lotsCount: list.length,
      weight,
      value,
      cost,
      avgRate,
      effRate
    };
  }).filter((sp) => sp.lotsCount > 0);

  // --------------------------------------------------------------------------
  // 4. GRADE & SIZE MATRIX ANALYSIS
  // --------------------------------------------------------------------------
  interface MatrixCell {
    gradeId: string;
    gradeName: string;
    sizeId: string;
    sizeName: string;
    weight: number;
    value: number;
    avgRate: number;
    minRate: number;
    maxRate: number;
    weightedAvgRate: number;
    lotsCount: number;
  }

  const matrixCells: MatrixCell[] = [];
  grades.forEach((g) => {
    sizes.forEach((sz) => {
      const match = activePurchases.filter((p) => p.gradeId === g.id && p.sizeId === sz.id);
      if (match.length > 0) {
        const weight = match.reduce((s, p) => s + p.weightKg, 0);
        const value = match.reduce((s, p) => s + p.purchaseValue, 0);
        const rates = match.map((p) => p.ratePerKg);
        const minRate = Math.min(...rates);
        const maxRate = Math.max(...rates);
        const avgRate = rates.reduce((s, r) => s + r, 0) / rates.length;
        const weightedAvgRate = weight > 0 ? value / weight : 0;

        matrixCells.push({
          gradeId: g.id,
          gradeName: g.name,
          sizeId: sz.id,
          sizeName: sz.name,
          weight,
          value,
          avgRate,
          minRate,
          maxRate,
          weightedAvgRate,
          lotsCount: match.length
        });
      }
    });
  });

  // --------------------------------------------------------------------------
  // 5. LOCATION ANALYSIS (Landing Harbour / District)
  // --------------------------------------------------------------------------
  const locationAnalysis = locations.map((loc) => {
    const list = activePurchases.filter((p) => p.locationId === loc.id);
    const weight = list.reduce((s, p) => s + p.weightKg, 0);
    const cost = list.reduce((s, p) => s + p.totalCost, 0);
    const avgRate = weight > 0 ? cost / weight : 0;

    return {
      id: loc.id,
      name: loc.name,
      district: loc.district,
      state: loc.state,
      harbourCentre: loc.harbourCentre,
      lotsCount: list.length,
      weight,
      cost,
      avgRate
    };
  }).filter((l) => l.lotsCount > 0);

  // --------------------------------------------------------------------------
  // 6. SUPPLIER-WISE NUMERIC REPORT (Purely numeric ranking, no subjective scoring)
  // --------------------------------------------------------------------------
  const supplierRanking = suppliers.map((supp) => {
    const list = activePurchases.filter((p) => p.supplierId === supp.id);
    const weight = list.reduce((s, p) => s + p.weightKg, 0);
    const value = list.reduce((s, p) => s + p.purchaseValue, 0);
    const cost = list.reduce((s, p) => s + p.totalCost, 0);
    const outstanding = list.reduce((s, p) => s + p.balancePayable, 0);

    return {
      id: supp.id,
      code: supp.code,
      name: supp.name,
      type: supp.type,
      lotsCount: list.length,
      weight,
      value,
      cost,
      outstanding
    };
  }).sort((a, b) => b.cost - a.cost);

  // --------------------------------------------------------------------------
  // 7. PURCHASE PRICE ANALYSIS & DAILY TREND
  // --------------------------------------------------------------------------
  const paFiltered = activePurchases.filter((p) => {
    if (paSpeciesId && p.speciesId !== paSpeciesId) return false;
    if (paGradeId && p.gradeId !== paGradeId) return false;
    if (paSizeId && p.sizeId !== paSizeId) return false;
    if (paLocationId && p.locationId !== paLocationId) return false;
    return true;
  });

  const paRates = paFiltered.map((p) => p.ratePerKg);
  const paMinRate = paRates.length > 0 ? Math.min(...paRates) : 0;
  const paMaxRate = paRates.length > 0 ? Math.max(...paRates) : 0;
  const paSimpleAvg = paRates.length > 0 ? paRates.reduce((s, r) => s + r, 0) / paRates.length : 0;
  const paTotalWeight = paFiltered.reduce((s, p) => s + p.weightKg, 0);
  const paTotalValue = paFiltered.reduce((s, p) => s + p.purchaseValue, 0);
  const paWeightedAvg = paTotalWeight > 0 ? paTotalValue / paTotalWeight : 0;

  // Group by date for daily rate trend
  const dailyRateTrendMap = new Map<string, { sumRate: number; count: number; weight: number }>();
  paFiltered.forEach((p) => {
    const curr = dailyRateTrendMap.get(p.purchaseDate) || { sumRate: 0, count: 0, weight: 0 };
    dailyRateTrendMap.set(p.purchaseDate, {
      sumRate: curr.sumRate + p.ratePerKg,
      count: curr.count + 1,
      weight: curr.weight + p.weightKg
    });
  });

  const dailyTrend = Array.from(dailyRateTrendMap.entries())
    .map(([date, data]) => ({
      date,
      avgRate: data.sumRate / data.count,
      weight: data.weight
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Report Tabs Definition
  const tabs: { id: ReportTab; label: string; icon: any }[] = [
    { id: 'daily', label: '1. Daily Purchase', icon: Calendar },
    { id: 'monthly', label: '2. Monthly Consolidated', icon: BarChart },
    { id: 'species', label: '3. Species Analysis', icon: TrendingUp },
    { id: 'grade-size', label: '4. Grade × Size Matrix', icon: Grid },
    { id: 'location', label: '5. Location Analysis', icon: MapPin },
    { id: 'supplier', label: '6. Supplier Numeric Ranking', icon: Users },
    { id: 'price-analysis', label: '7. Price & Trend Analysis', icon: TrendingUp }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header and Report Selector Tabs */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink-900">Procurement Operational Reports</h2>
            <p className="text-xs text-ink-500">
              Live queries directly derived from source transactions — guaranteed zero formula-drift.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                let exportData: any[] = [];
                let cols: { key: any; label: string }[] = [];
                let name = `Report_${activeReport}_${today}.csv`;

                if (activeReport === 'daily') {
                  exportData = dailyPurchases.map((p) => ({
                    ID: p.purchaseId,
                    Date: p.purchaseDate,
                    Supplier: supplierMap.get(p.supplierId)?.name || 'N/A',
                    Species: speciesMap.get(p.speciesId)?.name || 'N/A',
                    Weight: p.weightKg,
                    Rate: p.ratePerKg,
                    Expenses: p.totalExpenses,
                    TotalCost: p.totalCost,
                    Status: p.paymentStatus
                  }));
                  cols = [
                    { key: 'ID', label: 'Purchase ID' },
                    { key: 'Date', label: 'Date' },
                    { key: 'Supplier', label: 'Supplier' },
                    { key: 'Species', label: 'Species' },
                    { key: 'Weight', label: 'Weight (Kg)' },
                    { key: 'Rate', label: 'Rate/Kg' },
                    { key: 'Expenses', label: 'Expenses' },
                    { key: 'TotalCost', label: 'Total Cost' },
                    { key: 'Status', label: 'Status' }
                  ];
                } else if (activeReport === 'monthly') {
                  exportData = currentMonthPurchases.map((p) => ({
                    ID: p.purchaseId,
                    Date: p.purchaseDate,
                    Supplier: supplierMap.get(p.supplierId)?.name || 'N/A',
                    Species: speciesMap.get(p.speciesId)?.name || 'N/A',
                    Weight: p.weightKg,
                    Rate: p.ratePerKg,
                    Expenses: p.totalExpenses,
                    TotalCost: p.totalCost,
                    Status: p.paymentStatus
                  }));
                  cols = [
                    { key: 'ID', label: 'Purchase ID' },
                    { key: 'Date', label: 'Date' },
                    { key: 'Supplier', label: 'Supplier' },
                    { key: 'Species', label: 'Species' },
                    { key: 'Weight', label: 'Weight (Kg)' },
                    { key: 'Rate', label: 'Rate/Kg' },
                    { key: 'Expenses', label: 'Expenses' },
                    { key: 'TotalCost', label: 'Total Cost' },
                    { key: 'Status', label: 'Status' }
                  ];
                } else if (activeReport === 'species') {
                  exportData = speciesAnalysis;
                  cols = [
                    { key: 'name', label: 'Species' },
                    { key: 'category', label: 'Category' },
                    { key: 'lotsCount', label: 'Lots' },
                    { key: 'weight', label: 'Total Weight' },
                    { key: 'avgRate', label: 'Avg Rate' },
                    { key: 'effRate', label: 'Effective Rate' },
                    { key: 'cost', label: 'Total Cost' }
                  ];
                } else if (activeReport === 'grade-size') {
                  exportData = matrixCells;
                  cols = [
                    { key: 'gradeName', label: 'Grade' },
                    { key: 'sizeName', label: 'Size / Count' },
                    { key: 'lotsCount', label: 'Lots' },
                    { key: 'weight', label: 'Total Weight (Kg)' },
                    { key: 'minRate', label: 'Min Rate' },
                    { key: 'maxRate', label: 'Max Rate' },
                    { key: 'weightedAvgRate', label: 'Weighted Avg Rate' },
                    { key: 'value', label: 'Total Value' }
                  ];
                } else if (activeReport === 'location') {
                  exportData = locationAnalysis;
                  cols = [
                    { key: 'name', label: 'Landing Centre' },
                    { key: 'district', label: 'District' },
                    { key: 'state', label: 'State' },
                    { key: 'lotsCount', label: 'Batches' },
                    { key: 'weight', label: 'Volume (Kg)' },
                    { key: 'avgRate', label: 'Avg Rate/Kg' },
                    { key: 'cost', label: 'Total Expenditure' }
                  ];
                } else if (activeReport === 'supplier') {
                  exportData = supplierRanking;
                  cols = [
                    { key: 'name', label: 'Supplier' },
                    { key: 'code', label: 'Code' },
                    { key: 'type', label: 'Type' },
                    { key: 'lotsCount', label: 'Lots' },
                    { key: 'weight', label: 'Weight (Kg)' },
                    { key: 'cost', label: 'Total Cost' },
                    { key: 'outstanding', label: 'Outstanding Payable' }
                  ];
                } else if (activeReport === 'price-analysis') {
                  exportData = dailyTrend;
                  cols = [
                    { key: 'date', label: 'Date' },
                    { key: 'weight', label: 'Volume (Kg)' },
                    { key: 'avgRate', label: 'Daily Avg Rate/Kg' }
                  ];
                } else {
                  exportData = activePurchases.map((p) => ({
                    ID: p.purchaseId,
                    Date: p.purchaseDate,
                    Species: speciesMap.get(p.speciesId)?.name,
                    Weight: p.weightKg,
                    TotalCost: p.totalCost
                  }));
                  cols = [
                    { key: 'ID', label: 'Purchase ID' },
                    { key: 'Date', label: 'Date' },
                    { key: 'Species', label: 'Species' },
                    { key: 'Weight', label: 'Weight' },
                    { key: 'TotalCost', label: 'Total Cost' }
                  ];
                }

                const csv = convertToCSV(exportData, cols);
                downloadFile(csv, name);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-rose-50 text-ink-700 hover:text-rose-700 text-xs font-semibold border border-gray-200 rounded-xl transition"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={triggerPrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-rose-50 text-ink-700 hover:text-rose-700 text-xs font-semibold border border-gray-200 rounded-xl transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeReport === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-gray-50 text-ink-700 hover:bg-rose-50 hover:text-rose-700 border border-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* REPORT CONTENT SCREENS */}

      {/* 1. DAILY PURCHASE REPORT */}
      {activeReport === 'daily' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Daily Landing &amp; Purchase Register</h3>
              <p className="text-xs text-ink-500">Pick a landing date to inspect transaction totals.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-700">Select Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
              />
            </div>
          </div>

          {/* Daily KPI summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Total Net Weight</span>
              <span className="text-sm font-extrabold text-ink-900 mt-0.5 block">{formatKg(dailyTotalWeight)}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Raw Purchase Value</span>
              <span className="text-sm font-extrabold text-ink-900 mt-0.5 block">{formatINR(dailyTotalValue)}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Landing Expenses</span>
              <span className="text-sm font-extrabold text-ink-900 mt-0.5 block">{formatINR(dailyTotalExpenses)}</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[10px] font-bold text-rose-800 uppercase block">Total Landed Cost</span>
              <span className="text-sm font-black text-rose-700 mt-0.5 block">{formatINR(dailyTotalCost)}</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Purchase ID</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">Species</th>
                  <th className="py-2.5 px-3">Harbour</th>
                  <th className="py-2.5 px-3 text-right">Weight (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Rate/Kg</th>
                  <th className="py-2.5 px-3 text-right">Expenses</th>
                  <th className="py-2.5 px-3 text-right">Total Cost</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {dailyPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-ink-500">
                      No purchases recorded on {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  dailyPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-rose-50/30">
                      <td className="py-2.5 px-3 font-bold text-rose-700">{p.purchaseId}</td>
                      <td className="py-2.5 px-3">{supplierMap.get(p.supplierId)?.name}</td>
                      <td className="py-2.5 px-3 font-semibold">{speciesMap.get(p.speciesId)?.name}</td>
                      <td className="py-2.5 px-3 text-ink-500">{locationMap.get(p.locationId)?.name}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{p.weightKg.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right">₹{p.ratePerKg.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right">{formatINR(p.totalExpenses)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-900">{formatINR(p.totalCost)}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-ink-700">
                          {p.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. MONTHLY CONSOLIDATED REPORT (With MoM & YoY metrics) */}
      {activeReport === 'monthly' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Monthly Consolidated Procurement Analysis</h3>
              <p className="text-xs text-ink-500">Month-over-Month (MoM) procurement volume and expenditure shifts.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-700">Select Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[11px] font-bold text-rose-800 uppercase block">Monthly Total Landed Cost</span>
              <span className="text-xl font-black text-rose-950 mt-1 block">{formatINR(currentMonthCost)}</span>
              <div className="text-[11px] text-rose-700 mt-2">
                MoM Change: <strong>{momCostChangePct >= 0 ? `+${momCostChangePct.toFixed(1)}%` : `${momCostChangePct.toFixed(1)}%`}</strong> vs prior month ({formatINR(priorMonthCost)})
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[11px] font-bold text-ink-500 uppercase block">Monthly Volume (Weight)</span>
              <span className="text-xl font-black text-ink-900 mt-1 block">{formatKg(currentMonthWeight)}</span>
              <div className="text-[11px] text-ink-700 mt-2">
                MoM Change: <strong>{momWeightChangePct >= 0 ? `+${momWeightChangePct.toFixed(1)}%` : `${momWeightChangePct.toFixed(1)}%`}</strong> vs prior month ({formatKg(priorMonthWeight)})
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[11px] font-bold text-ink-500 uppercase block">Total Lots Landed</span>
              <span className="text-xl font-black text-ink-900 mt-1 block">{currentMonthPurchases.length} Batches</span>
              <div className="text-[11px] text-ink-700 mt-2">Active Indian FY: {businessSettings?.financialYear || 'FY 2026-27'}</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SPECIES-WISE ANALYSIS */}
      {activeReport === 'species' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-4">
          <h3 className="text-sm font-bold text-ink-900">Species-wise Volume, Expenditure &amp; Landed Margin</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Species / Product</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Lots</th>
                  <th className="py-2.5 px-3 text-right">Total Weight</th>
                  <th className="py-2.5 px-3 text-right">Avg Purchase Rate</th>
                  <th className="py-2.5 px-3 text-right">Effective Landed Rate</th>
                  <th className="py-2.5 px-3 text-right">Total Landed Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {speciesAnalysis.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-500">
                      No purchase transactions recorded for any species yet.
                    </td>
                  </tr>
                ) : (
                  speciesAnalysis.map((sp) => (
                    <tr key={sp.id} className="hover:bg-rose-50/30">
                      <td className="py-3 px-3 font-bold text-ink-900">{sp.name}</td>
                      <td className="py-3 px-3 text-ink-500">{sp.category}</td>
                      <td className="py-3 px-3 text-center">{sp.lotsCount}</td>
                      <td className="py-3 px-3 text-right font-bold">{formatKg(sp.weight)}</td>
                      <td className="py-3 px-3 text-right">₹{sp.avgRate.toFixed(2)} / Kg</td>
                      <td className="py-3 px-3 text-right font-bold text-rose-700">₹{sp.effRate.toFixed(2)} / Kg</td>
                      <td className="py-3 px-3 text-right font-extrabold text-ink-900">{formatINR(sp.cost)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. GRADE & SIZE MATRIX ANALYSIS */}
      {activeReport === 'grade-size' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-ink-900">Grade × Size/Count Procurement Matrix</h3>
            <p className="text-xs text-ink-500">
              Min, max, and weighted-average rates across seafood size counts and quality gradings.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Quality Grade</th>
                  <th className="py-2.5 px-3">Size / Count</th>
                  <th className="py-2.5 px-3 text-center">Lots</th>
                  <th className="py-2.5 px-3 text-right">Total Weight</th>
                  <th className="py-2.5 px-3 text-right">Min Rate</th>
                  <th className="py-2.5 px-3 text-right">Max Rate</th>
                  <th className="py-2.5 px-3 text-right font-extrabold text-rose-700">Weighted Avg Rate</th>
                  <th className="py-2.5 px-3 text-right">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {matrixCells.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-ink-500">
                      No grade or size transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  matrixCells.map((cell, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/30">
                      <td className="py-2.5 px-3 font-bold text-ink-900">{cell.gradeName}</td>
                      <td className="py-2.5 px-3 font-semibold text-rose-700">{cell.sizeName}</td>
                      <td className="py-2.5 px-3 text-center">{cell.lotsCount}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{formatKg(cell.weight)}</td>
                      <td className="py-2.5 px-3 text-right text-ink-500">₹{cell.minRate.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-ink-500">₹{cell.maxRate.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-rose-700">₹{cell.weightedAvgRate.toFixed(2)} / Kg</td>
                      <td className="py-2.5 px-3 text-right font-bold text-ink-900">{formatINR(cell.value)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. LOCATION ANALYSIS */}
      {activeReport === 'location' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-4">
          <h3 className="text-sm font-bold text-ink-900">Landing Location &amp; Harbour Centre Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Landing Centre / Wharf</th>
                  <th className="py-2.5 px-3">District &amp; State</th>
                  <th className="py-2.5 px-3 text-center">Batches Landed</th>
                  <th className="py-2.5 px-3 text-right">Volume (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Avg Rate / Kg</th>
                  <th className="py-2.5 px-3 text-right font-bold text-rose-900">Total Expenditure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {locationAnalysis.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-ink-500">
                      No purchase transactions recorded for any landing centre yet.
                    </td>
                  </tr>
                ) : (
                  locationAnalysis.map((loc) => (
                    <tr key={loc.id} className="hover:bg-rose-50/30">
                      <td className="py-3 px-3 font-bold text-ink-900">{loc.name}</td>
                      <td className="py-3 px-3 text-ink-500">{loc.district}, {loc.state}</td>
                      <td className="py-3 px-3 text-center">{loc.lotsCount}</td>
                      <td className="py-3 px-3 text-right font-bold">{formatKg(loc.weight)}</td>
                      <td className="py-3 px-3 text-right">₹{loc.avgRate.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-bold text-rose-900">{formatINR(loc.cost)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. SUPPLIER-WISE REPORT (Purely numeric ranking) */}
      {activeReport === 'supplier' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-ink-900">Supplier Procurement Ranking (Numeric Only)</h3>
            <p className="text-xs text-ink-500">Purely numeric volume, cost, and outstanding metrics — zero subjective scoring.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Rank &amp; Supplier</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Lots</th>
                  <th className="py-2.5 px-3 text-right">Weight (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Purchase Value</th>
                  <th className="py-2.5 px-3 text-right">Landed Cost</th>
                  <th className="py-2.5 px-3 text-right font-bold text-rose-700">Outstanding Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {supplierRanking.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-500">
                      No supplier records or purchase transactions found.
                    </td>
                  </tr>
                ) : (
                  supplierRanking.map((s, index) => (
                    <tr key={s.id} className="hover:bg-rose-50/30">
                      <td className="py-3 px-3 font-bold text-ink-900">
                        <span className="text-ink-400 mr-2 font-mono">#{index + 1}</span>
                        {s.name} ({s.code})
                      </td>
                      <td className="py-3 px-3 text-ink-500 capitalize">{s.type.replace('_', ' ')}</td>
                      <td className="py-3 px-3 text-center">{s.lotsCount}</td>
                      <td className="py-3 px-3 text-right font-bold">{formatKg(s.weight)}</td>
                      <td className="py-3 px-3 text-right">{formatINR(s.value)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-rose-950">{formatINR(s.cost)}</td>
                      <td className="py-3 px-3 text-right font-bold text-rose-700">{formatINR(s.outstanding)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. PURCHASE PRICE ANALYSIS & DAILY TREND */}
      {activeReport === 'price-analysis' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-ink-900">Purchase Price Trend &amp; Variance Analysis</h3>
            <p className="text-xs text-ink-500">
              Min, max, simple average and weighted-average rate across any filter combination.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <label className="block text-[11px] font-semibold text-ink-700 mb-1">Species</label>
              <select
                value={paSpeciesId}
                onChange={(e) => setPaSpeciesId(e.target.value)}
                className="w-full p-2 bg-white border border-gray-300 rounded-lg outline-none"
              >
                <option value="">All Species</option>
                {species.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-700 mb-1">Grade</label>
              <select
                value={paGradeId}
                onChange={(e) => setPaGradeId(e.target.value)}
                className="w-full p-2 bg-white border border-gray-300 rounded-lg outline-none"
              >
                <option value="">All Grades</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-700 mb-1">Size / Count</label>
              <select
                value={paSizeId}
                onChange={(e) => setPaSizeId(e.target.value)}
                className="w-full p-2 bg-white border border-gray-300 rounded-lg outline-none"
              >
                <option value="">All Sizes</option>
                {sizes.map((sz) => (
                  <option key={sz.id} value={sz.id}>
                    {sz.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-700 mb-1">Harbour Location</label>
              <select
                value={paLocationId}
                onChange={(e) => setPaLocationId(e.target.value)}
                className="w-full p-2 bg-white border border-gray-300 rounded-lg outline-none"
              >
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Min Rate Landed</span>
              <span className="text-base font-extrabold text-ink-900 mt-1 block">₹{paMinRate.toFixed(2)} / Kg</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Max Rate Landed</span>
              <span className="text-base font-extrabold text-ink-900 mt-1 block">₹{paMaxRate.toFixed(2)} / Kg</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Simple Average Rate</span>
              <span className="text-base font-extrabold text-ink-900 mt-1 block">₹{paSimpleAvg.toFixed(2)} / Kg</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[10px] font-bold text-rose-800 uppercase block">Weighted Average Rate</span>
              <span className="text-base font-black text-rose-700 mt-1 block">₹{paWeightedAvg.toFixed(2)} / Kg</span>
            </div>
          </div>

          {/* Daily Trend Table */}
          <div>
            <h4 className="text-xs font-bold text-ink-900 mb-2">Daily Historical Rate Trend</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Volume (Kg)</th>
                    <th className="py-2.5 px-3 text-right">Daily Avg Rate / Kg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {dailyTrend.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-ink-500">
                        No transactions match the selected filter combination.
                      </td>
                    </tr>
                  ) : (
                    dailyTrend.map((t) => (
                      <tr key={t.date} className="hover:bg-rose-50/30">
                        <td className="py-2.5 px-3 font-bold text-ink-900">{t.date}</td>
                        <td className="py-2.5 px-3 text-right">{formatKg(t.weight)}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-rose-700">₹{t.avgRate.toFixed(2)} / Kg</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
