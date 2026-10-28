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
  Users,
  Sparkles,
  Percent,
  Award,
  AlertCircle
} from 'lucide-react';

type ReportTab =
  | 'daily'
  | 'monthly'
  | 'species'
  | 'grade-size'
  | 'location'
  | 'supplier'
  | 'price-analysis'
  | 'yield-analysis';

export const OperationalReportsHub: React.FC = () => {
  const { purchases, suppliers, species, grades, sizes, counts, locations, businessSettings } = useData();

  const [activeReport, setActiveReport] = useState<ReportTab>('daily');

  // Filter states
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // Price analysis filter states
  const [paSpeciesId, setPaSpeciesId] = useState<string>(species[0]?.id || '');
  const [paGradeId, setPaGradeId] = useState<string>('');
  const [paSizeId, setPaSizeId] = useState<string>('');
  const [paCountId, setPaCountId] = useState<string>('');
  const [paLocationId, setPaLocationId] = useState<string>('');

  // Yield analysis filter states
  const [yieldSpeciesId, setYieldSpeciesId] = useState<string>('');
  const [yieldSupplierId, setYieldSupplierId] = useState<string>('');

  // Lookup maps
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
  const speciesMap = new Map(species.map((sp) => [sp.id, sp]));
  const locationMap = new Map(locations.map((l) => [l.id, l]));
  const gradeMap = new Map(grades.map((g) => [g.id, g]));
  const sizeMap = new Map(sizes.map((s) => [s.id, s]));
  const countMap = new Map(counts.map((c) => [c.id, c]));

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
  // 4. GRADE, SIZE & COUNT MATRIX ANALYSIS
  // --------------------------------------------------------------------------
  interface MatrixCell {
    gradeId: string;
    gradeName: string;
    type: 'Physical Size' | 'Piece Count';
    specName: string;
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
          type: 'Physical Size',
          specName: sz.name,
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

    counts.forEach((cnt) => {
      const match = activePurchases.filter((p) => p.gradeId === g.id && p.countId === cnt.id);
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
          type: 'Piece Count',
          specName: cnt.name,
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
    if (paSizeId && p.sizeId !== paSizeId && (!p.isDualSize || p.secondarySizeId !== paSizeId)) return false;
    if (paCountId && p.countId !== paCountId) return false;
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

  // --------------------------------------------------------------------------
  // 8. YIELD & RECOVERY ANALYSIS
  // --------------------------------------------------------------------------
  const yieldPurchases = activePurchases.filter((p) => {
    if (yieldSpeciesId && p.speciesId !== yieldSpeciesId) return false;
    if (yieldSupplierId && p.supplierId !== yieldSupplierId) return false;
    return true;
  });

  const yieldRecordedPurchases = yieldPurchases.filter((p) => p.yieldWeightKg && p.yieldWeightKg > 0);
  const totalYieldRawWeight = yieldRecordedPurchases.reduce((s, p) => s + p.weightKg, 0);
  const totalFinishedYieldWeight = yieldRecordedPurchases.reduce((s, p) => s + (p.yieldWeightKg || 0), 0);
  const totalYieldCost = yieldRecordedPurchases.reduce((s, p) => s + p.totalCost, 0);
  const overallYieldPct = totalYieldRawWeight > 0 ? (totalFinishedYieldWeight / totalYieldRawWeight) * 100 : 0;
  const totalProcessingLossKg = Math.max(0, totalYieldRawWeight - totalFinishedYieldWeight);
  const overallLossPct = totalYieldRawWeight > 0 ? (totalProcessingLossKg / totalYieldRawWeight) * 100 : 0;
  const overallFinishedYieldCostPerKg = totalFinishedYieldWeight > 0 ? totalYieldCost / totalFinishedYieldWeight : 0;
  const overallRawRatePerKg = totalYieldRawWeight > 0 ? totalYieldCost / totalYieldRawWeight : 0;

  // Species-wise yield breakdown
  const speciesYieldAnalysis = species.map((sp) => {
    const list = yieldRecordedPurchases.filter((p) => p.speciesId === sp.id);
    const rawWeight = list.reduce((s, p) => s + p.weightKg, 0);
    const yieldWeight = list.reduce((s, p) => s + (p.yieldWeightKg || 0), 0);
    const cost = list.reduce((s, p) => s + p.totalCost, 0);
    const yieldPct = rawWeight > 0 ? (yieldWeight / rawWeight) * 100 : 0;
    const lossKg = Math.max(0, rawWeight - yieldWeight);
    const rawRate = rawWeight > 0 ? cost / rawWeight : 0;
    const finishedCost = yieldWeight > 0 ? cost / yieldWeight : 0;

    return {
      id: sp.id,
      name: sp.name,
      category: sp.category,
      lotsCount: list.length,
      rawWeight,
      yieldWeight,
      yieldPct,
      lossKg,
      cost,
      rawRate,
      finishedCost
    };
  }).filter((s) => s.lotsCount > 0).sort((a, b) => b.yieldWeight - a.yieldWeight);

  // Supplier-wise yield performance
  const supplierYieldAnalysis = suppliers.map((sup) => {
    const list = yieldRecordedPurchases.filter((p) => p.supplierId === sup.id);
    const rawWeight = list.reduce((s, p) => s + p.weightKg, 0);
    const yieldWeight = list.reduce((s, p) => s + (p.yieldWeightKg || 0), 0);
    const cost = list.reduce((s, p) => s + p.totalCost, 0);
    const yieldPct = rawWeight > 0 ? (yieldWeight / rawWeight) * 100 : 0;
    const lossKg = Math.max(0, rawWeight - yieldWeight);
    const finishedCost = yieldWeight > 0 ? cost / yieldWeight : 0;

    return {
      id: sup.id,
      name: sup.name,
      code: sup.code,
      type: sup.type,
      lotsCount: list.length,
      rawWeight,
      yieldWeight,
      yieldPct,
      lossKg,
      cost,
      finishedCost
    };
  }).filter((s) => s.lotsCount > 0).sort((a, b) => b.yieldPct - a.yieldPct);

  // Report Tabs Definition
  const tabs: { id: ReportTab; label: string; icon: any }[] = [
    { id: 'daily', label: '1. Daily Purchase', icon: Calendar },
    { id: 'monthly', label: '2. Monthly Consolidated', icon: BarChart },
    { id: 'species', label: '3. Species Analysis', icon: TrendingUp },
    { id: 'grade-size', label: '4. Grade × Size Matrix', icon: Grid },
    { id: 'location', label: '5. Location Analysis', icon: MapPin },
    { id: 'supplier', label: '6. Supplier Numeric Ranking', icon: Users },
    { id: 'price-analysis', label: '7. Price & Trend Analysis', icon: TrendingUp },
    { id: 'yield-analysis', label: '8. Yield & Recovery Analysis', icon: Sparkles }
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
                    { key: 'type', label: 'Type' },
                    { key: 'specName', label: 'Size / Count Specification' },
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
                } else if (activeReport === 'yield-analysis') {
                  exportData = yieldRecordedPurchases.map((p) => ({
                    ID: p.purchaseId,
                    Date: p.purchaseDate,
                    Supplier: supplierMap.get(p.supplierId)?.name || 'N/A',
                    Species: speciesMap.get(p.speciesId)?.name || 'N/A',
                    RawWeightKg: p.weightKg,
                    YieldWeightKg: p.yieldWeightKg || 0,
                    YieldPct: p.yieldPct ? `${p.yieldPct}%` : `${(((p.yieldWeightKg || 0) / p.weightKg) * 100).toFixed(2)}%`,
                    LossKg: Math.max(0, p.weightKg - (p.yieldWeightKg || 0)),
                    TotalCost: p.totalCost,
                    RawRateKg: p.effectiveRatePerKg,
                    FinishedYieldCostKg: p.yieldWeightKg ? Number((p.totalCost / p.yieldWeightKg).toFixed(2)) : 0
                  }));
                  cols = [
                    { key: 'ID', label: 'Purchase ID' },
                    { key: 'Date', label: 'Date' },
                    { key: 'Supplier', label: 'Supplier' },
                    { key: 'Species', label: 'Species' },
                    { key: 'RawWeightKg', label: 'Raw Landed Kg' },
                    { key: 'YieldWeightKg', label: 'Finished Yield Kg' },
                    { key: 'YieldPct', label: 'Yield %' },
                    { key: 'LossKg', label: 'Processing Loss (Kg)' },
                    { key: 'TotalCost', label: 'Total Landed Cost (₹)' },
                    { key: 'RawRateKg', label: 'Raw Landed Rate/Kg' },
                    { key: 'FinishedYieldCostKg', label: 'Finished Yield Cost/Kg' }
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

      {/* 4. GRADE, SIZE & COUNT MATRIX ANALYSIS */}
      {activeReport === 'grade-size' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-ink-900">Grade × Size &amp; Count Procurement Matrix</h3>
            <p className="text-xs text-ink-500">
              Min, max, and weighted-average rates across physical sizes, piece counts, and quality gradings.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Quality Grade</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Size / Count Spec</th>
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
                    <td colSpan={9} className="py-8 text-center text-ink-500">
                      No grade, size, or count transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  matrixCells.map((cell, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/30">
                      <td className="py-2.5 px-3 font-bold text-ink-900">{cell.gradeName}</td>
                      <td className="py-2.5 px-3 text-ink-500">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cell.type === 'Physical Size' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {cell.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-rose-700">{cell.specName}</td>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
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
              <label className="block text-[11px] font-semibold text-ink-700 mb-1">Physical Size</label>
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
              <label className="block text-[11px] font-semibold text-ink-700 mb-1">Piece Count</label>
              <select
                value={paCountId}
                onChange={(e) => setPaCountId(e.target.value)}
                className="w-full p-2 bg-white border border-gray-300 rounded-lg outline-none"
              >
                <option value="">All Counts</option>
                {counts.map((cnt) => (
                  <option key={cnt.id} value={cnt.id}>
                    {cnt.name}
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

      {/* 8. YIELD & RECOVERY ANALYSIS REPORT */}
      {activeReport === 'yield-analysis' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-6">
          {/* Header & Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-ink-900">Processing Yield &amp; Output Recovery Analysis</h3>
              </div>
              <p className="text-xs text-ink-500 mt-0.5">
                Monitor finished meat output, peeling/processing loss, and real finished cost per Kg across lots, species, and suppliers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div>
                <select
                  value={yieldSpeciesId}
                  onChange={(e) => setYieldSpeciesId(e.target.value)}
                  className="text-xs font-medium px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
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
                <select
                  value={yieldSupplierId}
                  onChange={(e) => setYieldSupplierId(e.target.value)}
                  className="text-xs font-medium px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
                >
                  <option value="">All Suppliers</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>

              {(yieldSpeciesId || yieldSupplierId) && (
                <button
                  onClick={() => {
                    setYieldSpeciesId('');
                    setYieldSupplierId('');
                  }}
                  className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 px-2 py-1 rounded-lg hover:bg-rose-50"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Educational Formula & Process Note */}
          <div className="p-4 bg-gradient-to-r from-emerald-50/70 via-rose-50/40 to-white rounded-xl border border-emerald-200/80 text-xs text-ink-800 flex items-start gap-3">
            <span className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
              <Percent className="w-4 h-4" />
            </span>
            <div className="space-y-1">
              <div className="font-bold text-ink-900">
                Understanding Seafood Yield &amp; Finished Meat Valuation:
              </div>
              <p className="text-ink-600 leading-relaxed">
                When raw whole seafood (e.g. 5,000 Kg raw Vannamei shrimp or whole Tuna) is received at the harbour, peeling, heading, and gutting reduce weight to usable finished yield (e.g. 2,400 Kg finished meat = <strong>48.00% Yield Recovery</strong>). The <strong>Finished Yield Cost per Kg</strong> (₹{overallFinishedYieldCostPerKg.toFixed(2)}) reflects the true procurement price of the marketable product, which directly determines factory export pricing and profitability.
              </p>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Raw Material Procured</span>
              <span className="text-base font-extrabold text-ink-900 mt-1 block">
                {formatKg(totalYieldRawWeight)}
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5 font-medium">
                {yieldRecordedPurchases.length} Lots Tracked
              </span>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Finished Yield Recovered</span>
              <span className="text-base font-extrabold text-emerald-900 mt-1 block">
                {formatKg(totalFinishedYieldWeight)}
              </span>
              <span className="text-[10px] text-emerald-700 block mt-0.5 font-medium">
                Peeled / Processed Output
              </span>
            </div>

            <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200">
              <span className="text-[10px] font-bold text-rose-800 uppercase block">Weighted Portfolio Yield</span>
              <span className="text-base font-black text-rose-700 mt-1 block">
                {overallYieldPct > 0 ? `${overallYieldPct.toFixed(2)}%` : '—'}
              </span>
              <span className="text-[10px] text-rose-700 block mt-0.5 font-medium">
                {overallYieldPct >= 50 ? 'High Recovery' : overallYieldPct >= 40 ? 'Normal Recovery' : 'Low Recovery'}
              </span>
            </div>

            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">Processing / Peeling Loss</span>
              <span className="text-base font-extrabold text-amber-900 mt-1 block">
                {formatKg(totalProcessingLossKg)}
              </span>
              <span className="text-[10px] text-amber-700 block mt-0.5 font-medium">
                {overallLossPct.toFixed(1)}% Weight Reduction
              </span>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300">
              <span className="text-[10px] font-bold text-emerald-900 uppercase block">Finished Yield Cost / Kg</span>
              <span className="text-base font-black text-emerald-800 mt-1 block">
                ₹{overallFinishedYieldCostPerKg.toFixed(2)}
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5 font-medium">
                Raw Rate: ₹{overallRawRatePerKg.toFixed(2)}/Kg
              </span>
            </div>
          </div>

          {/* SECTION 1: SPECIES-WISE YIELD BREAKDOWN */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-ink-900 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-rose-600" />
                Species Yield &amp; Recovery Performance
              </h4>
              <span className="text-[11px] text-gray-500">
                {speciesYieldAnalysis.length} species with yield data
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">Species / Product</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Lots</th>
                    <th className="py-2.5 px-3 text-right">Raw Landed (Kg)</th>
                    <th className="py-2.5 px-3 text-right">Finished Yield (Kg)</th>
                    <th className="py-2.5 px-3 text-right">Yield %</th>
                    <th className="py-2.5 px-3 text-right">Processing Loss</th>
                    <th className="py-2.5 px-3 text-right">Raw Rate / Kg</th>
                    <th className="py-2.5 px-3 text-right">Finished Cost / Kg</th>
                    <th className="py-2.5 px-3 text-right">Cost Escalation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {speciesYieldAnalysis.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-ink-500">
                        No species yield records available for current filters.
                      </td>
                    </tr>
                  ) : (
                    speciesYieldAnalysis.map((sp) => {
                      const escalation = sp.rawRate > 0 && sp.finishedCost > 0 ? (sp.finishedCost / sp.rawRate).toFixed(2) : '1.00';
                      return (
                        <tr key={sp.id} className="hover:bg-rose-50/30">
                          <td className="py-2.5 px-3 font-bold text-ink-900">{sp.name}</td>
                          <td className="py-2.5 px-3 capitalize text-gray-600">{sp.category}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-[10px] font-bold">
                              {sp.lotsCount}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold">{formatKg(sp.rawWeight)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-800">{formatKg(sp.yieldWeight)}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              sp.yieldPct >= 50
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : sp.yieldPct >= 40
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {sp.yieldPct.toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-700">
                            {formatKg(sp.lossKg)} ({sp.rawWeight > 0 ? ((sp.lossKg / sp.rawWeight) * 100).toFixed(1) : '0'}%)
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-700">₹{sp.rawRate.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-900">₹{sp.finishedCost.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-rose-800">+{escalation}x</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2: SUPPLIER YIELD & QUALITY RANKING */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-ink-900 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-rose-600" />
                Supplier Meat-Recovery Quality Ranking
              </h4>
              <span className="text-[11px] text-gray-500">
                Sorted by highest realized yield percentage
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-center">Lots</th>
                    <th className="py-2.5 px-3 text-right">Raw Landed (Kg)</th>
                    <th className="py-2.5 px-3 text-right">Finished Yield (Kg)</th>
                    <th className="py-2.5 px-3 text-right">Yield %</th>
                    <th className="py-2.5 px-3 text-right">Finished Yield Cost / Kg</th>
                    <th className="py-2.5 px-3 text-center">Recovery Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {supplierYieldAnalysis.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-ink-500">
                        No supplier yield records available for current filters.
                      </td>
                    </tr>
                  ) : (
                    supplierYieldAnalysis.map((sup, idx) => (
                      <tr key={sup.id} className="hover:bg-rose-50/30">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-ink-900 flex items-center gap-1.5">
                            {idx === 0 && <span className="text-amber-500" title="Top Performer">👑</span>}
                            {sup.name}
                          </div>
                          <div className="text-[10px] text-gray-500">{sup.code}</div>
                        </td>
                        <td className="py-2.5 px-3 capitalize text-gray-600">{sup.type?.replace('_', ' ')}</td>
                        <td className="py-2.5 px-3 text-center font-semibold">{sup.lotsCount}</td>
                        <td className="py-2.5 px-3 text-right font-medium">{formatKg(sup.rawWeight)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-800">{formatKg(sup.yieldWeight)}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-ink-900">
                          {sup.yieldPct.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-900">₹{sup.finishedCost.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            sup.yieldPct >= 50
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : sup.yieldPct >= 40
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {sup.yieldPct >= 50 ? 'High Grade' : sup.yieldPct >= 40 ? 'Standard Grade' : 'High Waste'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: INDIVIDUAL LOT YIELD AUDIT REGISTER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-ink-900 uppercase tracking-wider">
                Individual Lot Yield Audit Register
              </h4>
              <span className="text-[11px] text-gray-500">
                {yieldRecordedPurchases.length} total processed purchase transactions
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">Purchase ID</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3">Species &amp; Grade</th>
                    <th className="py-2.5 px-3 text-right">Raw Landed (Kg)</th>
                    <th className="py-2.5 px-3 text-right">Finished Yield (Kg)</th>
                    <th className="py-2.5 px-3 text-right">Yield %</th>
                    <th className="py-2.5 px-3 text-right">Loss (Kg)</th>
                    <th className="py-2.5 px-3 text-right">Landed Cost</th>
                    <th className="py-2.5 px-3 text-right">Finished Cost / Kg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {yieldRecordedPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-ink-500">
                        <div className="max-w-md mx-auto space-y-2">
                          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                          <div className="font-bold text-ink-800">No Yield Data Recorded Yet</div>
                          <p className="text-xs text-ink-500">
                            Yield tracking is optional during procurement. You can enter the Finished Yield Weight (Kg) when recording a harbour purchase, via Excel batch import using the Yield columns, or by editing existing purchase lots.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    yieldRecordedPurchases.map((p) => {
                      const yieldPct = p.yieldPct ? p.yieldPct : (p.yieldWeightKg ? (p.yieldWeightKg / p.weightKg) * 100 : 0);
                      const lossKg = Math.max(0, p.weightKg - (p.yieldWeightKg || 0));
                      const finishedCost = p.yieldWeightKg ? p.totalCost / p.yieldWeightKg : 0;

                      return (
                        <tr key={p.id} className="hover:bg-rose-50/30">
                          <td className="py-2.5 px-3 font-bold text-rose-700 whitespace-nowrap">{p.purchaseId}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-gray-700">{p.purchaseDate}</td>
                          <td className="py-2.5 px-3 font-semibold text-ink-900">{supplierMap.get(p.supplierId)?.name || 'Unknown'}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-ink-900">{speciesMap.get(p.speciesId)?.name}</span>
                            <div className="text-[10px] text-gray-500">
                              {p.isDualSize && p.secondarySizeId ? (
                                `Dual Size: ${sizeMap.get(p.sizeId)?.name || 'N/A'} & ${sizeMap.get(p.secondarySizeId)?.name || 'N/A'}`
                              ) : (
                                [gradeMap.get(p.gradeId)?.name, sizeMap.get(p.sizeId)?.name, countMap.get(p.countId)?.name].filter(Boolean).join(' · ') || 'Standard'
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">{formatKg(p.weightKg)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-800">{formatKg(p.yieldWeightKg || 0)}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              yieldPct >= 50
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : yieldPct >= 40
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {yieldPct.toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-700">{formatKg(lossKg)}</td>
                          <td className="py-2.5 px-3 text-right text-gray-700">{formatINR(p.totalCost)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-900">₹{finishedCost.toFixed(2)}</td>
                        </tr>
                      );
                    })
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
