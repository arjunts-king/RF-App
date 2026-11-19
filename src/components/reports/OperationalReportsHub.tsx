import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, formatKg } from '../../utils/calculations';
import { convertToCSV, downloadFile, triggerPrint } from '../../utils/exportUtils';
import { PageHeader } from '../common/PageHeader';
import {
  Calendar,
  BarChart,
  BarChart3,
  PieChart,
  Grid,
  MapPin,
  TrendingUp,
  Download,
  Printer,
  Users,
  Sparkles,
  Percent,
  Award,
  AlertCircle,
  EyeOff
} from 'lucide-react';
import {
  BarChartVisual,
  DonutChartVisual,
  TrendLineVisual,
  ComparisonBarVisual
} from '../common/charts';

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
  const { purchases, suppliers, purchaseSpecies, species, grades, sizes, counts, locations, businessSettings } = useData();

  const [activeReport, setActiveReport] = useState<ReportTab>('daily');
  const [showVisuals, setShowVisuals] = useState<boolean>(true);

  // Filter states
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // Price analysis filter states
  const [paSpeciesId, setPaSpeciesId] = useState<string>('');
  const [paGradeId, setPaGradeId] = useState<string>('');
  const [paSizeId, setPaSizeId] = useState<string>('');
  const [paCountId, setPaCountId] = useState<string>('');
  const [paLocationId, setPaLocationId] = useState<string>('');

  // Yield analysis filter states
  const [yieldSpeciesId, setYieldSpeciesId] = useState<string>('');
  const [yieldSupplierId, setYieldSupplierId] = useState<string>('');

  // Lookup maps
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
  const locationMap = new Map(locations.map((l) => [l.id, l]));
  const gradeMap = new Map(grades.map((g) => [g.id, g]));
  const sizeMap = new Map(sizes.map((s) => [s.id, s]));
  const countMap = new Map(counts.map((c) => [c.id, c]));

  // Robust purchase species resolver across ID, code, name, rawSpeciesName, scientificName
  const findSpecies = useMemo(() => {
    const combined = [...(purchaseSpecies || []), ...(species || [])];
    const byId = new Map(combined.map((sp) => [sp.id.toLowerCase(), sp]));
    const byCode = new Map(combined.map((sp) => [sp.code.toLowerCase(), sp]));
    const byName = new Map(combined.map((sp) => [sp.name.trim().toLowerCase(), sp]));
    const byRaw = new Map<string, (typeof combined)[0]>();
    combined.forEach((sp) => {
      if (sp.rawSpeciesName) {
        byRaw.set(sp.rawSpeciesName.trim().toLowerCase(), sp);
      }
    });

    return (idOrKey: string) => {
      if (!idOrKey) return undefined;
      const clean = idOrKey.trim();
      const lower = clean.toLowerCase();
      return (
        byId.get(lower) ||
        byCode.get(lower) ||
        byName.get(lower) ||
        byRaw.get(lower) ||
        combined.find(
          (sp) =>
            sp.id.toLowerCase() === lower ||
            sp.code.toLowerCase() === lower ||
            sp.name.toLowerCase() === lower ||
            (sp.rawSpeciesName && sp.rawSpeciesName.toLowerCase() === lower) ||
            (sp.scientificName && sp.scientificName.toLowerCase() === lower)
        )
      );
    };
  }, [purchaseSpecies, species]);

  const isAutoString = (str?: string): boolean => {
    if (!str) return false;
    const s = str.trim().toLowerCase();
    return (
      s.startsWith('sp-auto') ||
      s.startsWith('auto-') ||
      s.includes('auto uploaded') ||
      s.includes('autouploaded') ||
      s.includes('auto-uploaded') ||
      s.includes('auto-created') ||
      s.includes('autocreated') ||
      s === 'auto' ||
      s === 'recorded'
    );
  };

  // Helper to obtain clean authentic purchase/raw species name (never sales export names)
  const getRawPurchaseSpeciesName = (rawId: string, p?: (typeof purchases)[0]): { id: string; label: string; subLabel?: string } => {
    const sp = findSpecies(rawId);
    let label = '';
    let subLabel = sp?.scientificName || undefined;

    if (sp) {
      if (sp.rawSpeciesName && !isAutoString(sp.rawSpeciesName)) {
        label = sp.rawSpeciesName.trim();
      } else if (sp.name && !isAutoString(sp.name)) {
        // Strip export sales prefixes/suffixes (e.g. "Frozen Indian Mackerel" -> "Indian Mackerel")
        label = sp.name.replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim();
      } else if (sp.code && !isAutoString(sp.code)) {
        label = sp.code.trim();
      }
    }

    // Fallback: If label is empty or still an auto string, check purchase remarks or rawId
    if (!label || isAutoString(label)) {
      if (p?.remarks && !isAutoString(p.remarks)) {
        label = p.remarks.trim();
      } else if (!isAutoString(rawId)) {
        label = rawId.replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim();
      } else {
        const extracted = rawId.replace(/^(sp-)?auto[-_]?/i, '').replace(/[-_]\d+.*$/, '').trim();
        label = extracted ? extracted.charAt(0).toUpperCase() + extracted.slice(1) : (sp?.rawSpeciesName || sp?.name || 'Raw Material');
      }
    }

    const resolvedSp = sp || findSpecies(label);
    const resolvedId = resolvedSp ? resolvedSp.id : (isAutoString(rawId) ? label : rawId);

    return {
      id: resolvedId,
      label,
      subLabel: subLabel || resolvedSp?.scientificName
    };
  };

  // Purchase species options strictly isolated from sales export products
  const speciesOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { id: string; label: string; subLabel?: string }[] = [];

    if (purchases.length > 0) {
      purchases.forEach((p) => {
        if (p.isVoided) return;
        const rawId = (p.speciesId || '').trim();
        if (!rawId) return;

        const info = getRawPurchaseSpeciesName(rawId, p);
        const lowerLabel = info.label.toLowerCase();

        if (!seen.has(lowerLabel) && !isAutoString(info.label)) {
          seen.add(lowerLabel);
          seen.add(info.id.toLowerCase());
          seen.add(rawId.toLowerCase());
          options.push({
            id: info.id,
            label: info.label,
            subLabel: info.subLabel
          });
        }
      });
    } else {
      (purchaseSpecies || []).forEach((sp) => {
        const rawName = sp.rawSpeciesName && !isAutoString(sp.rawSpeciesName)
          ? sp.rawSpeciesName.trim()
          : sp.name.replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim();

        const lowerLabel = rawName.toLowerCase();
        if (!seen.has(lowerLabel) && !isAutoString(rawName)) {
          seen.add(lowerLabel);
          options.push({
            id: sp.id,
            label: rawName,
            subLabel: sp.scientificName || undefined
          });
        }
      });
    }

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [purchases, purchaseSpecies, findSpecies]);

  const resolveSpeciesName = (spId?: string, p?: (typeof purchases)[0]): string => {
    if (!spId) return 'Unspecified Species';
    const opt = speciesOptions.find((o) => o.id === spId || o.label.toLowerCase() === spId.toLowerCase());
    if (opt) return opt.label;
    const direct = (purchaseSpecies || []).find((s) => s.id === spId);
    if (direct) {
      if (direct.rawSpeciesName && !isAutoString(direct.rawSpeciesName)) return direct.rawSpeciesName;
      if (direct.name && !isAutoString(direct.name)) {
        return direct.name.replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim();
      }
    }
    const found = findSpecies(spId);
    if (found) {
      if (found.rawSpeciesName && !isAutoString(found.rawSpeciesName)) return found.rawSpeciesName;
      if (found.name && !isAutoString(found.name)) {
        return found.name.replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim();
      }
    }
    if (p?.remarks && !isAutoString(p.remarks)) return p.remarks.trim();
    if (!isAutoString(spId) && !spId.startsWith('prd-') && !spId.startsWith('sp-')) {
      return spId.replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim();
    }
    return 'Raw Material';
  };

  const matchesSpecies = (p: (typeof purchases)[0], targetSpId: string): boolean => {
    if (!targetSpId) return true;
    const rawEntrySpId = (p.speciesId || '').trim();
    if (rawEntrySpId === targetSpId || rawEntrySpId.toLowerCase() === targetSpId.toLowerCase()) return true;

    const entrySp = findSpecies(rawEntrySpId);
    const entrySpName = (entrySp?.name || rawEntrySpId).trim().toLowerCase();
    const entrySpCode = (entrySp?.code || '').trim().toLowerCase();
    const entrySpRaw = (entrySp?.rawSpeciesName || '').trim().toLowerCase();
    const entryRawName = getRawPurchaseSpeciesName(rawEntrySpId, p).label.trim().toLowerCase();

    const selSp = findSpecies(targetSpId);
    if (entrySp && selSp && entrySp.id === selSp.id) return true;

    if (selSp) {
      if (rawEntrySpId.toLowerCase() === selSp.id.toLowerCase()) return true;
      if (rawEntrySpId.toLowerCase() === selSp.code.toLowerCase()) return true;
      if (rawEntrySpId.toLowerCase() === selSp.name.trim().toLowerCase()) return true;
      if (selSp.rawSpeciesName && rawEntrySpId.toLowerCase() === selSp.rawSpeciesName.trim().toLowerCase()) return true;
      if (selSp.scientificName && rawEntrySpId.toLowerCase() === selSp.scientificName.trim().toLowerCase()) return true;

      if (entrySpName && entrySpName === selSp.name.trim().toLowerCase()) return true;
      if (entrySpCode && entrySpCode === selSp.code.toLowerCase()) return true;
      if (entrySpRaw && selSp.rawSpeciesName && entrySpRaw === selSp.rawSpeciesName.trim().toLowerCase()) return true;

      const selRawName = (selSp.rawSpeciesName || selSp.name).replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim().toLowerCase();
      if (entryRawName && entryRawName === selRawName) return true;
    }

    if (entrySp) {
      const selLower = targetSpId.trim().toLowerCase();
      if (selLower === entrySp.id.toLowerCase()) return true;
      if (selLower === entrySpCode) return true;
      if (selLower === entrySpName) return true;
      if (entrySpRaw && selLower === entrySpRaw) return true;
    }

    const selOpt = speciesOptions.find((o) => o.id === targetSpId || o.label.toLowerCase() === targetSpId.toLowerCase());
    if (selOpt) {
      const optLabel = selOpt.label.trim().toLowerCase();
      if (optLabel === entrySpName || optLabel === rawEntrySpId.toLowerCase()) return true;
      if (optLabel === entryRawName) return true;
      if (entrySpRaw && optLabel.includes(entrySpRaw)) return true;
    }

    return false;
  };

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
  const speciesAnalysis = useMemo(() => {
    return speciesOptions.map((sp) => {
      const list = activePurchases.filter((p) => matchesSpecies(p, sp.id));
      const weight = list.reduce((s, p) => s + p.weightKg, 0);
      const value = list.reduce((s, p) => s + p.purchaseValue, 0);
      const cost = list.reduce((s, p) => s + p.totalCost, 0);
      const avgRate = weight > 0 ? value / weight : 0;
      const effRate = weight > 0 ? cost / weight : 0;
      const directSp = findSpecies(sp.id);

      return {
        id: sp.id,
        name: sp.label,
        category: directSp?.category || 'Raw Catch',
        lotsCount: list.length,
        weight,
        value,
        cost,
        avgRate,
        effRate
      };
    }).filter((sp) => sp.lotsCount > 0);
  }, [speciesOptions, activePurchases, matchesSpecies, findSpecies]);

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
    if (paSpeciesId && !matchesSpecies(p, paSpeciesId)) return false;
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
    if (yieldSpeciesId && !matchesSpecies(p, yieldSpeciesId)) return false;
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
  const speciesYieldAnalysis = useMemo(() => {
    return speciesOptions.map((sp) => {
      const list = yieldRecordedPurchases.filter((p) => matchesSpecies(p, sp.id));
      const rawWeight = list.reduce((s, p) => s + p.weightKg, 0);
      const yieldWeight = list.reduce((s, p) => s + (p.yieldWeightKg || 0), 0);
      const cost = list.reduce((s, p) => s + p.totalCost, 0);
      const yieldPct = rawWeight > 0 ? (yieldWeight / rawWeight) * 100 : 0;
      const lossKg = Math.max(0, rawWeight - yieldWeight);
      const rawRate = rawWeight > 0 ? cost / rawWeight : 0;
      const finishedCost = yieldWeight > 0 ? cost / yieldWeight : 0;
      const directSp = findSpecies(sp.id);

      return {
        id: sp.id,
        name: sp.label,
        category: directSp?.category || 'Raw Catch',
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
  }, [speciesOptions, yieldRecordedPurchases, matchesSpecies, findSpecies]);

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

  // Batch-wise yield performance
  const batchYieldMap = new Map<string, typeof yieldRecordedPurchases>();
  yieldRecordedPurchases.forEach((p) => {
    if (p.batchNo) {
      const cur = batchYieldMap.get(p.batchNo) || [];
      cur.push(p);
      batchYieldMap.set(p.batchNo, cur);
    }
  });

  const batchYieldAnalysis = Array.from(batchYieldMap.entries()).map(([batchNo, list]) => {
    const rawWeight = list.reduce((s, p) => s + p.weightKg, 0);
    const yieldWeight = list.reduce((s, p) => s + (p.yieldWeightKg || 0), 0);
    const cost = list.reduce((s, p) => s + p.totalCost, 0);
    const yieldPct = rawWeight > 0 ? (yieldWeight / rawWeight) * 100 : 0;
    const lossKg = Math.max(0, rawWeight - yieldWeight);
    const finishedCost = yieldWeight > 0 ? cost / yieldWeight : 0;
    const isAllocated = list.some((p) => p.isBatchYieldAllocated);

    return {
      batchNo,
      lotsCount: list.length,
      rawWeight,
      yieldWeight,
      yieldPct,
      lossKg,
      cost,
      finishedCost,
      isAllocated
    };
  }).sort((a, b) => b.rawWeight - a.rawWeight);

  // Visual Chart Data Memos
  const dailySpeciesChartData = useMemo(() => {
    const map = new Map<string, number>();
    dailyPurchases.forEach((p) => {
      const name = resolveSpeciesName(p.speciesId, p);
      map.set(name, (map.get(name) || 0) + p.weightKg);
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({
        label,
        value,
        formattedValue: formatKg(value)
      }))
      .sort((a, b) => b.value - a.value);
  }, [dailyPurchases, speciesOptions]);

  const monthlyDailyTrendData = useMemo(() => {
    const map = new Map<string, number>();
    currentMonthPurchases.forEach((p) => {
      const day = p.purchaseDate.split('-')[2] || p.purchaseDate;
      map.set(day, (map.get(day) || 0) + p.weightKg);
    });
    return Array.from(map.entries())
      .map(([day, weight]) => ({
        label: `Day ${parseInt(day, 10)}`,
        value: weight,
        formattedValue: formatKg(weight)
      }))
      .sort((a, b) => {
        const da = parseInt(a.label.replace('Day ', ''), 10);
        const db = parseInt(b.label.replace('Day ', ''), 10);
        return da - db;
      });
  }, [currentMonthPurchases]);

  const speciesVolumeChartData = useMemo(() => {
    return speciesAnalysis.map((sp) => ({
      label: sp.name,
      value: sp.weight,
      formattedValue: formatKg(sp.weight),
      secondaryLabel: 'Eff Rate',
      secondaryValue: `₹${sp.effRate.toFixed(1)}/Kg`
    })).sort((a, b) => b.value - a.value);
  }, [speciesAnalysis]);

  const speciesRateChartData = useMemo(() => {
    return speciesAnalysis.map((sp) => ({
      label: sp.name,
      value: sp.effRate,
      formattedValue: `₹${sp.effRate.toFixed(2)}/Kg`,
      secondaryLabel: 'Base Rate',
      secondaryValue: `₹${sp.avgRate.toFixed(2)}`
    })).sort((a, b) => b.value - a.value);
  }, [speciesAnalysis]);

  const gradeDistributionData = useMemo(() => {
    const map = new Map<string, number>();
    matrixCells.forEach((c) => {
      map.set(c.gradeName, (map.get(c.gradeName) || 0) + c.weight);
    });
    return Array.from(map.entries()).map(([label, value]) => ({
      label,
      value,
      formattedValue: formatKg(value)
    })).sort((a, b) => b.value - a.value);
  }, [matrixCells]);

  const sizeDistributionData = useMemo(() => {
    return matrixCells.map((c) => ({
      label: `${c.specName} (${c.gradeName})`,
      value: c.weight,
      formattedValue: formatKg(c.weight),
      secondaryLabel: 'Avg Rate',
      secondaryValue: `₹${c.weightedAvgRate.toFixed(1)}`
    })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [matrixCells]);

  const locationShareData = useMemo(() => {
    return locationAnalysis.map((loc) => ({
      label: loc.name,
      value: loc.weight,
      formattedValue: formatKg(loc.weight),
      subtext: `${loc.district}, ${loc.state}`
    })).sort((a, b) => b.value - a.value);
  }, [locationAnalysis]);

  const locationRateData = useMemo(() => {
    return locationAnalysis.map((loc) => ({
      label: loc.name,
      value: loc.avgRate,
      formattedValue: `₹${loc.avgRate.toFixed(2)}/Kg`,
      secondaryLabel: 'Batches',
      secondaryValue: loc.lotsCount
    })).sort((a, b) => b.value - a.value);
  }, [locationAnalysis]);

  const supplierVolumeData = useMemo(() => {
    return supplierRanking.map((s) => ({
      label: s.name,
      value: s.weight,
      formattedValue: formatKg(s.weight),
      secondaryLabel: 'Cost',
      secondaryValue: formatINR(s.cost)
    })).slice(0, 8);
  }, [supplierRanking]);

  const supplierCostData = useMemo(() => {
    return supplierRanking.map((s) => ({
      label: s.name,
      value: s.cost,
      formattedValue: formatINR(s.cost),
      secondaryLabel: 'Payable',
      secondaryValue: formatINR(s.outstanding)
    })).slice(0, 8);
  }, [supplierRanking]);

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

  const handleExportCSV = () => {
    let exportData: any[] = [];
    let cols: { key: any; label: string }[] = [];
    let name = `Report_${activeReport}_${today}.csv`;

    if (activeReport === 'daily') {
      exportData = dailyPurchases.map((p) => ({
        ID: p.purchaseId,
        Date: p.purchaseDate,
        Supplier: supplierMap.get(p.supplierId)?.name || 'N/A',
        Species: resolveSpeciesName(p.speciesId, p),
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
        Species: resolveSpeciesName(p.speciesId, p),
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
        Species: resolveSpeciesName(p.speciesId, p),
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
        Species: resolveSpeciesName(p.speciesId, p),
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
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Figma Header Block */}
      <PageHeader
        title="Procurement operational reports"
        subtitle="Live queries directly derived from source transactions — guaranteed zero formula-drift."
        breadcrumbs={['Purchase', 'Procurement Reports']}
        primaryAction={{
          label: 'Export CSV',
          onClick: handleExportCSV,
          icon: Download
        }}
        secondaryActions={[
          {
            label: showVisuals ? 'Hide Graphs' : 'Show Graphs',
            onClick: () => setShowVisuals(!showVisuals),
            icon: showVisuals ? EyeOff : BarChart3
          },
          {
            label: 'Print Report',
            onClick: triggerPrint,
            icon: Printer
          }
        ]}
      />

      {/* Pill Tab Switcher (Liquid Glass Surface) */}
      <div className="glass-surface-thin p-4 rounded-2xl border border-white/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeReport === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold btn-secondary-liquid transition-all ${
                  isActive
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'glass-surface-thin text-ink-700 hover:text-rose-700 border border-white/80'
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

          {/* Graphical Representation */}
          {showVisuals && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1 pb-2">
              <DonutChartVisual
                title="Daily Sourcing Volume Split"
                subtitle={`Catch volume breakdown for ${selectedDate}`}
                icon={PieChart}
                data={dailySpeciesChartData}
                centerLabel="Landed Weight"
                centerValue={formatKg(dailyTotalWeight)}
                unit="Kg"
                emptyMessage="No purchases recorded on this date."
              />
              <ComparisonBarVisual
                title="Cost & Expense Breakdown"
                subtitle="Raw Purchase Value vs Direct Landing Expenses"
                metrics={[
                  { label: 'Raw Catch Value', value: dailyTotalValue, formattedValue: formatINR(dailyTotalValue), color: '#0284c7' },
                  { label: 'Landing Expenses', value: dailyTotalExpenses, formattedValue: formatINR(dailyTotalExpenses), color: '#f59e0b' },
                  { label: 'Total Landed Cost', value: dailyTotalCost, formattedValue: formatINR(dailyTotalCost), color: '#f43f5e' }
                ]}
                totalLabel="Total Expenditure"
                totalFormatted={formatINR(dailyTotalCost)}
              />
            </div>
          )}

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
                      <td className="py-2.5 px-3 font-semibold">{resolveSpeciesName(p.speciesId, p)}</td>
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

          {/* Graphical Representation */}
          {showVisuals && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
              <div className="lg:col-span-2">
                <BarChartVisual
                  title="Daily Procurement Velocity"
                  subtitle={`Daily raw catch landings (Kg) in ${selectedMonth}`}
                  icon={BarChart3}
                  orientation="vertical"
                  data={monthlyDailyTrendData}
                  unit="Kg"
                  emptyMessage="No purchases recorded for this month."
                />
              </div>
              <ComparisonBarVisual
                title="MoM Procurement Shift"
                subtitle="Current Month vs Prior Month"
                metrics={[
                  { label: `Current (${selectedMonth})`, value: currentMonthCost, formattedValue: formatINR(currentMonthCost), color: '#f43f5e', subtext: `${formatKg(currentMonthWeight)} landed` },
                  { label: 'Prior Month', value: priorMonthCost, formattedValue: formatINR(priorMonthCost), color: '#64748b', subtext: `${formatKg(priorMonthWeight)} landed` }
                ]}
                badge={{
                  label: momCostChangePct >= 0 ? `+${momCostChangePct.toFixed(1)}% MoM` : `${momCostChangePct.toFixed(1)}% MoM`,
                  variant: momCostChangePct <= 0 ? 'success' : 'warning'
                }}
                totalLabel="Current Landed"
                totalFormatted={formatINR(currentMonthCost)}
              />
            </div>
          )}
        </div>
      )}

      {/* 3. SPECIES-WISE ANALYSIS */}
      {activeReport === 'species' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-4">
          <h3 className="text-sm font-bold text-ink-900">Species-wise Volume, Expenditure &amp; Landed Margin</h3>

          {/* Graphical Representation */}
          {showVisuals && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-2">
              <BarChartVisual
                title="Procurement Volume by Species"
                subtitle="Total landed weight (Kg) and percentage share across raw catch"
                icon={BarChart3}
                data={speciesVolumeChartData}
                unit="Kg"
                maxItems={8}
                emptyMessage="No species transactions recorded."
              />
              <BarChartVisual
                title="Landed Rate Comparison (₹/Kg)"
                subtitle="Effective landed rate (with landing expenses) vs base purchase rate"
                icon={TrendingUp}
                data={speciesRateChartData}
                maxItems={8}
                emptyMessage="No rate records available."
              />
            </div>
          )}

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

          {/* Graphical Representation */}
          {showVisuals && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-2">
              <DonutChartVisual
                title="Quality Grade Distribution"
                subtitle="Catch share across quality gradings (A, B, C Grade)"
                icon={PieChart}
                data={gradeDistributionData}
                centerLabel="Grades"
                centerValue={`${gradeDistributionData.length} Grades`}
                unit="Kg"
                emptyMessage="No grade records available."
              />
              <BarChartVisual
                title="Top Size & Piece Count Slices"
                subtitle="Procurement volume by physical size or count specification"
                icon={BarChart3}
                data={sizeDistributionData}
                unit="Kg"
                maxItems={8}
                emptyMessage="No size or count records available."
              />
            </div>
          )}

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

          {/* Graphical Representation */}
          {showVisuals && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-2">
              <DonutChartVisual
                title="Harbour Procurement Share"
                subtitle="Proportion of raw catch sourced per coastal landing wharf"
                icon={MapPin}
                data={locationShareData}
                centerLabel="Harbours"
                centerValue={`${locationAnalysis.length} Ports`}
                unit="Kg"
                emptyMessage="No harbour transactions recorded."
              />
              <BarChartVisual
                title="Average Landed Rate by Harbour"
                subtitle="Cost efficiency comparison per landing wharf (₹/Kg)"
                icon={TrendingUp}
                data={locationRateData}
                emptyMessage="No rate records available."
              />
            </div>
          )}

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

          {/* Graphical Representation */}
          {showVisuals && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-2">
              <BarChartVisual
                title="Top Suppliers by Procurement Volume"
                subtitle="Ranked raw landing volume in Kilograms"
                icon={Users}
                data={supplierVolumeData}
                unit="Kg"
                maxItems={8}
                emptyMessage="No supplier transactions found."
              />
              <BarChartVisual
                title="Supplier Sourcing Expenditure"
                subtitle="Total purchase expenditure vs current outstanding payables"
                icon={BarChart3}
                data={supplierCostData}
                maxItems={8}
                emptyMessage="No cost records found."
              />
            </div>
          )}

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
                {speciesOptions.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.label}
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

          {/* Graphical Representation */}
          {showVisuals && (
            <div className="pt-1">
              <TrendLineVisual
                title={`Price Movement Trend: ${resolveSpeciesName(paSpeciesId) !== 'Unspecified Species' && paSpeciesId ? resolveSpeciesName(paSpeciesId) : 'All Sourced Species'}`}
                subtitle="Daily weighted average rate per Kg over time across procurement dates"
                icon={TrendingUp}
                points={dailyTrend.map((d) => ({
                  label: d.date,
                  value: d.avgRate,
                  formattedValue: `₹${d.avgRate.toFixed(2)}/Kg`,
                  secondaryLabel: 'Landed',
                  secondaryValue: formatKg(d.weight)
                }))}
                unit="₹/Kg"
                benchmark={{
                  value: paWeightedAvg,
                  label: 'Weighted Avg'
                }}
                badge={{
                  label: `Spread: ₹${(paMaxRate - paMinRate).toFixed(2)}/Kg`,
                  variant: 'info'
                }}
                emptyMessage="No historical price points match the current filter selection."
              />
            </div>
          )}

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
                  {speciesOptions.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.label}
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

          {/* Graphical Representation */}
          {showVisuals && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1 pb-2">
              <ComparisonBarVisual
                title="Sourcing vs Output Recovery Split"
                subtitle="Raw Material Inflow vs Finished Recovery vs Processing Loss"
                metrics={[
                  { label: 'Finished Yield Output', value: totalFinishedYieldWeight, formattedValue: formatKg(totalFinishedYieldWeight), color: '#10b981', subtext: `${overallYieldPct.toFixed(1)}% recovery` },
                  { label: 'Processing Loss / Peeling', value: totalProcessingLossKg, formattedValue: formatKg(totalProcessingLossKg), color: '#f43f5e', subtext: `${overallLossPct.toFixed(1)}% weight loss` }
                ]}
                totalLabel="Total Raw Weight"
                totalFormatted={formatKg(totalYieldRawWeight)}
                badge={{
                  label: `${overallYieldPct.toFixed(1)}% Yield`,
                  variant: overallYieldPct >= 50 ? 'success' : 'warning'
                }}
              />
              <BarChartVisual
                title="Species Recovery Percentage"
                subtitle="Finished recovery % per species (Target benchmark: 50%+)"
                icon={Percent}
                data={speciesYieldAnalysis.map((s) => ({
                  label: s.name,
                  value: s.yieldPct,
                  formattedValue: `${s.yieldPct.toFixed(1)}%`,
                  percentage: s.yieldPct,
                  color: s.yieldPct >= 50 ? '#10b981' : s.yieldPct >= 40 ? '#f59e0b' : '#f43f5e',
                  secondaryLabel: 'Finished Cost',
                  secondaryValue: `₹${s.finishedCost.toFixed(1)}/Kg`
                }))}
                emptyMessage="No species yield records available."
              />
            </div>
          )}

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

          {/* SECTION 3: BATCH PROCESSING YIELD POOLS SUMMARY */}
          {batchYieldAnalysis.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-ink-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  Batch Processing Yield Pools Summary
                </h4>
                <span className="text-[11px] text-gray-500">
                  {batchYieldAnalysis.length} multi-lot procurement batch pool(s)
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-rose-50/40 text-[11px] font-bold text-ink-500 uppercase border-b border-rose-100">
                      <th className="py-2.5 px-3">Batch Identifier</th>
                      <th className="py-2.5 px-3 text-center">Lots Pooled</th>
                      <th className="py-2.5 px-3 text-right">Intake Weight (Kg)</th>
                      <th className="py-2.5 px-3 text-right">Finished Yield (Kg)</th>
                      <th className="py-2.5 px-3 text-right">Batch Yield %</th>
                      <th className="py-2.5 px-3 text-right">Processing Loss (Kg)</th>
                      <th className="py-2.5 px-3 text-right">Total Landed Cost</th>
                      <th className="py-2.5 px-3 text-right">Finished Meat Cost / Kg</th>
                      <th className="py-2.5 px-3 text-center">Batch Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {batchYieldAnalysis.map((b) => (
                      <tr key={b.batchNo} className="hover:bg-rose-50/30">
                        <td className="py-2.5 px-3 font-bold text-rose-700 flex items-center gap-1.5">
                          Batch {b.batchNo}
                          {b.isAllocated && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] bg-emerald-100 text-emerald-800 font-extrabold uppercase">
                              Allocated
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold">{b.lotsCount}</td>
                        <td className="py-2.5 px-3 text-right font-medium">{formatKg(b.rawWeight)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-800">{formatKg(b.yieldWeight)}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-ink-900">{b.yieldPct.toFixed(2)}%</td>
                        <td className="py-2.5 px-3 text-right text-rose-700">{formatKg(b.lossKg)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{formatINR(b.cost)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-900">₹{b.finishedCost.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              b.yieldPct >= 50
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : b.yieldPct >= 40
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {b.yieldPct >= 50 ? 'Optimal Yield' : b.yieldPct >= 40 ? 'Normal Yield' : 'High Waste'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 4: INDIVIDUAL LOT YIELD AUDIT REGISTER */}
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
                    <th className="py-2.5 px-3">Batch No</th>
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
                      <td colSpan={11} className="py-10 text-center text-ink-500">
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
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {p.batchNo ? (
                              <span className="font-semibold text-ink-800 flex items-center gap-1">
                                {p.batchNo}
                                {p.isBatchYieldAllocated && (
                                  <span className="px-1.5 py-0.2 rounded text-[8px] bg-emerald-100 text-emerald-800 font-extrabold uppercase">
                                    Batch
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-300 font-light">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-gray-700">{p.purchaseDate}</td>
                          <td className="py-2.5 px-3 font-semibold text-ink-900">{supplierMap.get(p.supplierId)?.name || 'Unknown'}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-ink-900">{resolveSpeciesName(p.speciesId, p)}</span>
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
