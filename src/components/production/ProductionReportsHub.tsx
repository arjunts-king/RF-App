import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { DailyProcessingEntry } from '../../types';
import { formatKg } from '../../utils/calculations';
import { convertToCSV, downloadFile, triggerPrint } from '../../utils/exportUtils';
import {
  Calendar,
  Layers,
  BarChart3,
  Users,
  Grid,
  AlertTriangle,
  Download,
  Printer,
  CheckCircle2,
  Percent,
  ShieldAlert
} from 'lucide-react';

type ProductionReportTab =
  | 'daily-processing'
  | 'daily-consolidated'
  | 'monthly-summary'
  | 'item-analysis'
  | 'matrix'
  | 'exceptions'
  | 'yield-reconciliation';

export const ProductionReportsHub: React.FC = () => {
  const {
    processingEntries,
    purchases,
    suppliers,
    species,
    grades,
    sizes,
    counts,
    slabTypes
  } = useData();

  const [activeReport, setActiveReport] = useState<ProductionReportTab>('daily-processing');

  // Filter States
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // Sub-tabs for Item Analysis
  const [itemAnalysisTab, setItemAnalysisTab] = useState<'supplier' | 'grade' | 'size'>('supplier');

  // Matrix Pivot View State ('product-grade' | 'grade-size')
  const [matrixView, setMatrixView] = useState<'product-grade' | 'grade-size'>('product-grade');

  // Exception Report Filters
  const [exceptionTypeFilter, setExceptionTypeFilter] = useState<string>('all');

  // Lookups
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
  const speciesMap = new Map(species.map((sp) => [sp.id, sp]));
  const gradeMap = new Map(grades.map((g) => [g.id, g]));
  const sizeMap = new Map(sizes.map((sz) => [sz.id, sz]));
  const countMap = new Map(counts.map((c) => [c.id, c]));
  const slabTypeMap = new Map(slabTypes.map((st) => [st.id, st]));

  const activeEntries = processingEntries.filter((p) => !p.isVoided);

  // --------------------------------------------------------------------------
  // 1. DAILY PROCESSING REPORT (Pick a date, full record list)
  // --------------------------------------------------------------------------
  const dailyRecords = activeEntries.filter((p) => p.processingDate === selectedDate);
  const dailyTotalProcessedKg = dailyRecords.reduce((s, p) => s + p.processedWeightKg, 0);
  const dailyTotalRejectionKg = dailyRecords.reduce((s, p) => s + p.rejectionWeightKg, 0);
  const dailyTotalSlabs = dailyRecords.reduce((s, p) => s + p.slabsCount, 0);
  const dailyVolume = dailyTotalProcessedKg + dailyTotalRejectionKg;
  const dailyYieldPct = dailyVolume > 0 ? (dailyTotalProcessedKg / dailyVolume) * 100 : 0;

  // --------------------------------------------------------------------------
  // 2. DAILY CONSOLIDATED REPORT (Subtotals by Supplier/Product/Grade/Size + Grand Total)
  // --------------------------------------------------------------------------
  // Group by Supplier
  const consolidatedBySupplier = Array.from(
    dailyRecords.reduce((map, p) => {
      const cur = map.get(p.supplierId) || { slabs: 0, processed: 0, rejection: 0, count: 0 };
      map.set(p.supplierId, {
        slabs: cur.slabs + p.slabsCount,
        processed: cur.processed + p.processedWeightKg,
        rejection: cur.rejection + p.rejectionWeightKg,
        count: cur.count + 1
      });
      return map;
    }, new Map<string, { slabs: number; processed: number; rejection: number; count: number }>())
  ).map(([id, data]) => ({
    name: supplierMap.get(id)?.name || 'Unknown',
    ...data
  }));

  // Group by Product
  const consolidatedByProduct = Array.from(
    dailyRecords.reduce((map, p) => {
      const cur = map.get(p.speciesId) || { slabs: 0, processed: 0, rejection: 0, count: 0 };
      map.set(p.speciesId, {
        slabs: cur.slabs + p.slabsCount,
        processed: cur.processed + p.processedWeightKg,
        rejection: cur.rejection + p.rejectionWeightKg,
        count: cur.count + 1
      });
      return map;
    }, new Map<string, { slabs: number; processed: number; rejection: number; count: number }>())
  ).map(([id, data]) => ({
    name: speciesMap.get(id)?.name || 'Unknown',
    ...data
  }));

  // Group by Grade
  const consolidatedByGrade = Array.from(
    dailyRecords.reduce((map, p) => {
      const cur = map.get(p.gradeId) || { slabs: 0, processed: 0, rejection: 0, count: 0 };
      map.set(p.gradeId, {
        slabs: cur.slabs + p.slabsCount,
        processed: cur.processed + p.processedWeightKg,
        rejection: cur.rejection + p.rejectionWeightKg,
        count: cur.count + 1
      });
      return map;
    }, new Map<string, { slabs: number; processed: number; rejection: number; count: number }>())
  ).map(([id, data]) => ({
    name: gradeMap.get(id)?.name || 'Standard',
    ...data
  }));

  // Group by Size / Count
  const consolidatedBySize = Array.from(
    dailyRecords.reduce((map, p) => {
      const key = p.sizeId || p.countId || 'Standard';
      const cur = map.get(key) || { slabs: 0, processed: 0, rejection: 0, count: 0 };
      map.set(key, {
        slabs: cur.slabs + p.slabsCount,
        processed: cur.processed + p.processedWeightKg,
        rejection: cur.rejection + p.rejectionWeightKg,
        count: cur.count + 1
      });
      return map;
    }, new Map<string, { slabs: number; processed: number; rejection: number; count: number }>())
  ).map(([key, data]) => ({
    name: sizeMap.get(key)?.name || countMap.get(key)?.name || 'Standard',
    ...data
  }));

  // --------------------------------------------------------------------------
  // 3. MONTHLY SUMMARY (Date-wise table, highest/lowest/avg day)
  // --------------------------------------------------------------------------
  const monthEntries = activeEntries.filter((p) => p.processingDate.startsWith(selectedMonth));
  const monthTotalProcessedKg = monthEntries.reduce((s, p) => s + p.processedWeightKg, 0);
  const monthTotalRejectionKg = monthEntries.reduce((s, p) => s + p.rejectionWeightKg, 0);
  const monthTotalSlabs = monthEntries.reduce((s, p) => s + p.slabsCount, 0);

  const monthDateMap = new Map<string, { slabs: number; processed: number; rejection: number; batches: number }>();
  monthEntries.forEach((p) => {
    const cur = monthDateMap.get(p.processingDate) || { slabs: 0, processed: 0, rejection: 0, batches: 0 };
    monthDateMap.set(p.processingDate, {
      slabs: cur.slabs + p.slabsCount,
      processed: cur.processed + p.processedWeightKg,
      rejection: cur.rejection + p.rejectionWeightKg,
      batches: cur.batches + 1
    });
  });

  const monthDailyBreakdown = Array.from(monthDateMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const highestDay = monthDailyBreakdown.length > 0
    ? monthDailyBreakdown.reduce((max, d) => (d.processed > max.processed ? d : max), monthDailyBreakdown[0])
    : null;

  const lowestDay = monthDailyBreakdown.length > 0
    ? monthDailyBreakdown.reduce((min, d) => (d.processed < min.processed ? d : min), monthDailyBreakdown[0])
    : null;

  const avgDailyOutput = monthDailyBreakdown.length > 0 ? monthTotalProcessedKg / monthDailyBreakdown.length : 0;

  // --------------------------------------------------------------------------
  // 4. SUPPLIER, GRADE & SIZE ANALYSIS (Monthly)
  // --------------------------------------------------------------------------
  // Supplier Analysis
  const supplierAnalysisData = Array.from(
    monthEntries.reduce((map, p) => {
      const cur = map.get(p.supplierId) || { slabs: 0, processed: 0, rejection: 0, batches: 0 };
      map.set(p.supplierId, {
        slabs: cur.slabs + p.slabsCount,
        processed: cur.processed + p.processedWeightKg,
        rejection: cur.rejection + p.rejectionWeightKg,
        batches: cur.batches + 1
      });
      return map;
    }, new Map<string, { slabs: number; processed: number; rejection: number; batches: number }>())
  ).map(([id, d]) => {
    const totalVol = d.processed + d.rejection;
    return {
      id,
      name: supplierMap.get(id)?.name || 'Unknown',
      slabs: d.slabs,
      processed: d.processed,
      rejection: d.rejection,
      batches: d.batches,
      pctTotal: monthTotalProcessedKg > 0 ? (d.processed / monthTotalProcessedKg) * 100 : 0,
      rejectionRate: totalVol > 0 ? (d.rejection / totalVol) * 100 : 0
    };
  }).sort((a, b) => b.processed - a.processed);

  const topSupplier = supplierAnalysisData[0] || null;
  const lowestSupplier = supplierAnalysisData.length > 1 ? supplierAnalysisData[supplierAnalysisData.length - 1] : null;
  const avgSupplierOutput = supplierAnalysisData.length > 0 ? monthTotalProcessedKg / supplierAnalysisData.length : 0;

  // Grade Analysis
  const gradeAnalysisData = Array.from(
    monthEntries.reduce((map, p) => {
      const cur = map.get(p.gradeId) || { slabs: 0, processed: 0, rejection: 0, batches: 0 };
      map.set(p.gradeId, {
        slabs: cur.slabs + p.slabsCount,
        processed: cur.processed + p.processedWeightKg,
        rejection: cur.rejection + p.rejectionWeightKg,
        batches: cur.batches + 1
      });
      return map;
    }, new Map<string, { slabs: number; processed: number; rejection: number; batches: number }>())
  ).map(([id, d]) => {
    const totalVol = d.processed + d.rejection;
    return {
      id,
      name: gradeMap.get(id)?.name || 'Standard',
      slabs: d.slabs,
      processed: d.processed,
      rejection: d.rejection,
      batches: d.batches,
      pctTotal: monthTotalProcessedKg > 0 ? (d.processed / monthTotalProcessedKg) * 100 : 0,
      rejectionRate: totalVol > 0 ? (d.rejection / totalVol) * 100 : 0
    };
  }).sort((a, b) => b.processed - a.processed);

  const topGrade = gradeAnalysisData[0] || null;
  const lowestGrade = gradeAnalysisData.length > 1 ? gradeAnalysisData[gradeAnalysisData.length - 1] : null;

  // Size Analysis
  const sizeAnalysisData = Array.from(
    monthEntries.reduce((map, p) => {
      const key = p.sizeId || p.countId || 'Standard';
      const cur = map.get(key) || { slabs: 0, processed: 0, rejection: 0, batches: 0 };
      map.set(key, {
        slabs: cur.slabs + p.slabsCount,
        processed: cur.processed + p.processedWeightKg,
        rejection: cur.rejection + p.rejectionWeightKg,
        batches: cur.batches + 1
      });
      return map;
    }, new Map<string, { slabs: number; processed: number; rejection: number; batches: number }>())
  ).map(([key, d]) => ({
    key,
    name: sizeMap.get(key)?.name || countMap.get(key)?.name || 'Standard',
    slabs: d.slabs,
    processed: d.processed,
    rejection: d.rejection,
    batches: d.batches,
    pctTotal: monthTotalProcessedKg > 0 ? (d.processed / monthTotalProcessedKg) * 100 : 0
  })).sort((a, b) => b.processed - a.processed);

  const topSize = sizeAnalysisData[0] || null;
  const lowestSize = sizeAnalysisData.length > 1 ? sizeAnalysisData[sizeAnalysisData.length - 1] : null;

  // --------------------------------------------------------------------------
  // 5. PRODUCTION MATRIX (Product x Grade & Grade x Size/Count Pivot Views)
  // --------------------------------------------------------------------------
  // Pivot 1: Product (rows) x Grade (columns)
  const productGradeMatrix = species.map((sp) => {
    const rowObj: Record<string, any> = { speciesName: sp.name, total: 0 };
    grades.forEach((g) => {
      const matchingEntries = monthEntries.filter((p) => p.speciesId === sp.id && p.gradeId === g.id);
      const wt = matchingEntries.reduce((s, p) => s + p.processedWeightKg, 0);
      rowObj[g.id] = wt;
      rowObj.total += wt;
    });
    return rowObj;
  }).filter((r) => r.total > 0);

  // Column totals for Product x Grade
  const gradeColTotals: Record<string, number> = {};
  grades.forEach((g) => {
    gradeColTotals[g.id] = productGradeMatrix.reduce((s, r) => s + (r[g.id] || 0), 0);
  });
  const matrixTotal1 = productGradeMatrix.reduce((s, r) => s + r.total, 0);

  // Pivot 2: Grade (rows) x Size/Count (columns)
  const allSizeColKeys = [
    ...sizes.map((s) => ({ id: s.id, name: s.name, type: 'Size' })),
    ...counts.map((c) => ({ id: c.id, name: c.name, type: 'Count' }))
  ];

  const gradeSizeMatrix = grades.map((g) => {
    const rowObj: Record<string, any> = { gradeName: g.name, total: 0 };
    allSizeColKeys.forEach((col) => {
      const matchingEntries = monthEntries.filter(
        (p) => p.gradeId === g.id && (p.sizeId === col.id || p.countId === col.id)
      );
      const wt = matchingEntries.reduce((s, p) => s + p.processedWeightKg, 0);
      rowObj[col.id] = wt;
      rowObj.total += wt;
    });
    return rowObj;
  }).filter((r) => r.total > 0);

  const sizeColTotals: Record<string, number> = {};
  allSizeColKeys.forEach((col) => {
    sizeColTotals[col.id] = gradeSizeMatrix.reduce((s, r) => s + (r[col.id] || 0), 0);
  });
  const matrixTotal2 = gradeSizeMatrix.reduce((s, r) => s + r.total, 0);

  // --------------------------------------------------------------------------
  // 6. EXCEPTION REPORT (Missing data, Duplicates, Slab Variance, Negative values, Reconciliation)
  // --------------------------------------------------------------------------
  interface ExceptionItem {
    id: string;
    type: 'Missing Data' | 'Duplicate Entry' | 'Slab Variance' | 'Negative Value';
    severity: 'High' | 'Medium' | 'Low';
    entryNo: string;
    date: string;
    description: string;
    details: string;
  }

  const exceptionItems: ExceptionItem[] = [];

  // Check 1: Missing Data
  activeEntries.forEach((p) => {
    const missing: string[] = [];
    if (!p.supplierBoxId) missing.push('Supplier Box ID');
    if (p.processedWeightKg === 0 && p.slabsCount > 0) missing.push('Processed Weight is 0 with Slabs > 0');
    if (p.slabsCount === 0 && p.processedWeightKg > 0) missing.push('Slabs Count is 0 with Processed Weight > 0');

    if (missing.length > 0) {
      exceptionItems.push({
        id: `exc-md-${p.id}`,
        type: 'Missing Data',
        severity: 'Medium',
        entryNo: p.entryNo,
        date: p.processingDate,
        description: `Incomplete Entry: ${missing.join(', ')}`,
        details: `Supplier: ${supplierMap.get(p.supplierId)?.name || 'N/A'}, Shift: ${p.shift}`
      });
    }
  });

  // Check 2: Duplicate entries (same Supplier + Product + Date + Shift + Box ID)
  const dupMap = new Map<string, DailyProcessingEntry[]>();
  activeEntries.forEach((p) => {
    if (p.supplierBoxId) {
      const key = `${p.supplierId}|${p.speciesId}|${p.processingDate}|${p.shift}|${p.supplierBoxId.toLowerCase().trim()}`;
      const list = dupMap.get(key) || [];
      list.push(p);
      dupMap.set(key, list);
    }
  });

  dupMap.forEach((list) => {
    if (list.length > 1) {
      list.forEach((p) => {
        exceptionItems.push({
          id: `exc-dup-${p.id}`,
          type: 'Duplicate Entry',
          severity: 'High',
          entryNo: p.entryNo,
          date: p.processingDate,
          description: `Duplicate Box ID detected (${list.length} matches): ${p.supplierBoxId}`,
          details: `Supplier: ${supplierMap.get(p.supplierId)?.name || 'N/A'}, Product: ${speciesMap.get(p.speciesId)?.name || 'N/A'}, Shift: ${p.shift}`
        });
      });
    }
  });

  // Check 3: Slab Weight Variance (exceeding tolerance band)
  activeEntries.forEach((p) => {
    if (p.hasSlabVariance) {
      exceptionItems.push({
        id: `exc-var-${p.id}`,
        type: 'Slab Variance',
        severity: Math.abs(p.variancePct) > 15 ? 'High' : 'Medium',
        entryNo: p.entryNo,
        date: p.processingDate,
        description: `Weight divergence of ${p.variancePct > 0 ? `+${p.variancePct}` : p.variancePct}% (Expected: ${p.expectedWeightKg} Kg, Actual: ${p.processedWeightKg} Kg)`,
        details: `${p.slabsCount} slabs × ${p.standardSlabWeightKg} Kg · Diff: ${p.varianceWeightKg > 0 ? `+${p.varianceWeightKg}` : p.varianceWeightKg} Kg`
      });
    }
  });

  // Check 4: Negative Value / Anomalies
  activeEntries.forEach((p) => {
    if (p.processedWeightKg < 0 || p.rejectionWeightKg < 0 || p.slabsCount < 0) {
      exceptionItems.push({
        id: `exc-neg-${p.id}`,
        type: 'Negative Value',
        severity: 'High',
        entryNo: p.entryNo,
        date: p.processingDate,
        description: 'Negative quantity detected in record',
        details: `Processed: ${p.processedWeightKg} Kg, Rejection: ${p.rejectionWeightKg} Kg, Slabs: ${p.slabsCount}`
      });
    }
    if (p.rejectionWeightKg > p.processedWeightKg && p.processedWeightKg > 0) {
      exceptionItems.push({
        id: `exc-rej-${p.id}`,
        type: 'Negative Value',
        severity: 'High',
        entryNo: p.entryNo,
        date: p.processingDate,
        description: `Rejection quantity (${p.rejectionWeightKg} Kg) exceeds processed quantity (${p.processedWeightKg} Kg)`,
        details: `Ratio: ${((p.rejectionWeightKg / p.processedWeightKg) * 100).toFixed(0)}% rejection anomaly`
      });
    }
  });

  // Check 5: Reconciliation Integrity Check
  const rawSumTotal = monthEntries.reduce((s, p) => s + p.processedWeightKg, 0);
  const isReconciled = Math.abs(rawSumTotal - matrixTotal1) < 0.01 && Math.abs(rawSumTotal - monthTotalProcessedKg) < 0.01;

  const filteredExceptions = exceptionItems.filter((e) => {
    if (exceptionTypeFilter === 'all') return true;
    return e.type.toLowerCase().includes(exceptionTypeFilter.toLowerCase());
  });

  // --------------------------------------------------------------------------
  // 7. [CUSTOMIZE, OPTIONAL]: YIELD % RECONCILIATION REPORT
  // --------------------------------------------------------------------------
  // Compares Purchase raw material Weight (Kg) against Production Processed Kg
  // for a matched Supplier + Product for the selected period
  interface YieldReconciliationRow {
    supplierId: string;
    supplierName: string;
    speciesId: string;
    speciesName: string;
    purchaseWeightKg: number;
    productionProcessedKg: number;
    weightLossKg: number;
    yieldPct: number;
    lossPct: number;
    status: 'Optimal' | 'Normal' | 'Low Yield';
  }

  const yieldDataMap = new Map<string, { purchaseKg: number; productionKg: number; supplierId: string; speciesId: string }>();

  // Aggregate Raw Purchases for the month
  purchases
    .filter((pur) => !pur.isVoided && pur.purchaseDate.startsWith(selectedMonth))
    .forEach((pur) => {
      const key = `${pur.supplierId}__${pur.speciesId}`;
      const cur = yieldDataMap.get(key) || { purchaseKg: 0, productionKg: 0, supplierId: pur.supplierId, speciesId: pur.speciesId };
      cur.purchaseKg += pur.weightKg;
      yieldDataMap.set(key, cur);
    });

  // Aggregate Production Output for the month
  monthEntries.forEach((prod) => {
    const key = `${prod.supplierId}__${prod.speciesId}`;
    const cur = yieldDataMap.get(key) || { purchaseKg: 0, productionKg: 0, supplierId: prod.supplierId, speciesId: prod.speciesId };
    cur.productionKg += prod.processedWeightKg;
    yieldDataMap.set(key, cur);
  });

  const yieldRows: YieldReconciliationRow[] = Array.from(yieldDataMap.values())
    .map((item) => {
      const suppName = supplierMap.get(item.supplierId)?.name || 'Unknown';
      const specName = speciesMap.get(item.speciesId)?.name || 'Unknown';
      const weightLossKg = Number((item.purchaseKg - item.productionKg).toFixed(2));
      const yieldPct = item.purchaseKg > 0 ? Number(((item.productionKg / item.purchaseKg) * 100).toFixed(1)) : 0;
      const lossPct = Number((100 - yieldPct).toFixed(1));

      let status: 'Optimal' | 'Normal' | 'Low Yield' = 'Normal';
      if (yieldPct >= 80) status = 'Optimal';
      else if (yieldPct < 70) status = 'Low Yield';

      return {
        supplierId: item.supplierId,
        supplierName: suppName,
        speciesId: item.speciesId,
        speciesName: specName,
        purchaseWeightKg: item.purchaseKg,
        productionProcessedKg: item.productionKg,
        weightLossKg,
        yieldPct,
        lossPct,
        status
      };
    })
    .filter((r) => r.purchaseWeightKg > 0 || r.productionProcessedKg > 0)
    .sort((a, b) => b.purchaseWeightKg - a.purchaseWeightKg);

  const totalRawPurchasedKg = yieldRows.reduce((s, r) => s + r.purchaseWeightKg, 0);
  const totalProductionYieldKg = yieldRows.reduce((s, r) => s + r.productionProcessedKg, 0);
  const overallYieldPct = totalRawPurchasedKg > 0 ? (totalProductionYieldKg / totalRawPurchasedKg) * 100 : 0;

  // Report Tabs Definition
  const tabs: { id: ProductionReportTab; label: string; icon: any }[] = [
    { id: 'daily-processing', label: '1. Daily Processing', icon: Calendar },
    { id: 'daily-consolidated', label: '2. Daily Consolidated', icon: Layers },
    { id: 'monthly-summary', label: '3. Monthly Summary', icon: BarChart3 },
    { id: 'item-analysis', label: '4. Supplier, Grade & Size', icon: Users },
    { id: 'matrix', label: '5. Production Matrix', icon: Grid },
    { id: 'exceptions', label: '6. Exception Report', icon: AlertTriangle },
    { id: 'yield-reconciliation', label: '7. Yield % Reconciliation', icon: Percent }
  ];

  const handleExportCSV = () => {
    let exportData: any[] = [];
    let cols: { key: string; label: string }[] = [];
    const filename = `Production_Report_${activeReport}_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeReport === 'daily-processing') {
      exportData = dailyRecords.map((p) => ({
        EntryNo: p.entryNo,
        Date: p.processingDate,
        Shift: p.shift,
        Supplier: supplierMap.get(p.supplierId)?.name,
        BoxID: p.supplierBoxId,
        Product: speciesMap.get(p.speciesId)?.name,
        Grade: gradeMap.get(p.gradeId)?.name,
        SlabType: slabTypeMap.get(p.slabTypeId)?.name,
        Slabs: p.slabsCount,
        ProcessedKg: p.processedWeightKg,
        RejectionKg: p.rejectionWeightKg,
        VariancePct: p.variancePct
      }));
      cols = [
        { key: 'EntryNo', label: 'Entry #' },
        { key: 'Date', label: 'Date' },
        { key: 'Shift', label: 'Shift' },
        { key: 'Supplier', label: 'Supplier' },
        { key: 'BoxID', label: 'Box ID' },
        { key: 'Product', label: 'Product' },
        { key: 'Grade', label: 'Grade' },
        { key: 'SlabType', label: 'Slab Type' },
        { key: 'Slabs', label: 'Slabs' },
        { key: 'ProcessedKg', label: 'Processed (Kg)' },
        { key: 'RejectionKg', label: 'Rejection (Kg)' },
        { key: 'VariancePct', label: 'Variance %' }
      ];
    } else if (activeReport === 'monthly-summary') {
      exportData = monthDailyBreakdown;
      cols = [
        { key: 'date', label: 'Date' },
        { key: 'batches', label: 'Batches' },
        { key: 'slabs', label: 'Slabs' },
        { key: 'processed', label: 'Processed (Kg)' },
        { key: 'rejection', label: 'Rejection (Kg)' }
      ];
    } else if (activeReport === 'yield-reconciliation') {
      exportData = yieldRows;
      cols = [
        { key: 'supplierName', label: 'Supplier' },
        { key: 'speciesName', label: 'Product' },
        { key: 'purchaseWeightKg', label: 'Raw Purchase (Kg)' },
        { key: 'productionProcessedKg', label: 'Processed Yield (Kg)' },
        { key: 'weightLossKg', label: 'Weight Loss (Kg)' },
        { key: 'yieldPct', label: 'Yield %' },
        { key: 'status', label: 'Status' }
      ];
    } else {
      exportData = monthEntries.map((p) => ({
        EntryNo: p.entryNo,
        Date: p.processingDate,
        Supplier: supplierMap.get(p.supplierId)?.name,
        Product: speciesMap.get(p.speciesId)?.name,
        ProcessedKg: p.processedWeightKg
      }));
      cols = [
        { key: 'EntryNo', label: 'Entry #' },
        { key: 'Date', label: 'Date' },
        { key: 'Supplier', label: 'Supplier' },
        { key: 'Product', label: 'Product' },
        { key: 'ProcessedKg', label: 'Processed (Kg)' }
      ];
    }

    const csvStr = convertToCSV(exportData, cols);
    downloadFile(csvStr, filename);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header and Report Selector Tabs */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink-900">Production Operational Reports</h2>
            <p className="text-xs text-ink-500">
              Live queries directly derived from daily factory line processing entries — zero manual re-entry.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-50 hover:bg-rose-50 text-ink-700 hover:text-rose-700 text-xs font-semibold border border-gray-200 rounded-xl transition"
              title="Export report view to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={triggerPrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100/70 text-rose-700 text-xs font-semibold border border-rose-200 rounded-xl transition"
              title="Print formal report document"
            >
              <Printer className="w-3.5 h-3.5 text-rose-600" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
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
                    : 'bg-gray-50 text-ink-700 hover:bg-rose-50 border border-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* REPORT CONTENT PANELS */}

      {/* 1. DAILY PROCESSING REPORT */}
      {activeReport === 'daily-processing' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Daily Processing Master Record List</h3>
              <p className="text-xs text-ink-500">Pick any processing date for complete lot-by-lot inspection.</p>
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

          {/* Daily KPI Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[10px] font-bold text-rose-800 uppercase block">Total Processed</span>
              <span className="text-lg font-black text-rose-950 mt-0.5 block">{formatKg(dailyTotalProcessedKg)}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Slabs Packed</span>
              <span className="text-lg font-black text-ink-900 mt-0.5 block">{dailyTotalSlabs} Slabs</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Rejection Weight</span>
              <span className="text-lg font-black text-rose-800 mt-0.5 block">{formatKg(dailyTotalRejectionKg)}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Line Yield %</span>
              <span className="text-lg font-black text-emerald-700 mt-0.5 block">{dailyYieldPct.toFixed(1)}%</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Entry #</th>
                  <th className="py-2.5 px-3">Shift</th>
                  <th className="py-2.5 px-3">Supplier &amp; Box ID</th>
                  <th className="py-2.5 px-3">Product &amp; Grade</th>
                  <th className="py-2.5 px-3">Slab Type</th>
                  <th className="py-2.5 px-3 text-right">Slabs</th>
                  <th className="py-2.5 px-3 text-right">Processed (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Rejection (Kg)</th>
                  <th className="py-2.5 px-3 text-center">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {dailyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-ink-500">
                      No processing transactions recorded on {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  dailyRecords.map((p) => (
                    <tr key={p.id} className="hover:bg-rose-50/30">
                      <td className="py-2.5 px-3 font-bold text-rose-700">{p.entryNo}</td>
                      <td className="py-2.5 px-3">{p.shift.split(' ')[0]}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-ink-900">{supplierMap.get(p.supplierId)?.name || 'Unknown'}</div>
                        <div className="text-[10px] text-ink-500">Box: {p.supplierBoxId || 'None'}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold">{speciesMap.get(p.speciesId)?.name}</div>
                        <div className="text-[10px] text-ink-500">{gradeMap.get(p.gradeId)?.name}</div>
                      </td>
                      <td className="py-2.5 px-3 text-ink-700">{slabTypeMap.get(p.slabTypeId)?.name}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{p.slabsCount}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-ink-900">{formatKg(p.processedWeightKg)}</td>
                      <td className="py-2.5 px-3 text-right text-rose-700">{p.rejectionWeightKg > 0 ? formatKg(p.rejectionWeightKg) : '-'}</td>
                      <td className="py-2.5 px-3 text-center">
                        {p.hasSlabVariance ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {p.variancePct > 0 ? `+${p.variancePct}%` : `${p.variancePct}%`}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-bold">OK</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. DAILY CONSOLIDATED REPORT */}
      {activeReport === 'daily-consolidated' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Daily Consolidated Subtotals &amp; Grand Totals</h3>
              <p className="text-xs text-ink-500">Aggregated breakdown by Supplier, Product, Grade, and Size for {selectedDate}.</p>
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

          {/* Grand Total Highlight */}
          <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <span className="font-extrabold text-sm text-rose-950 uppercase tracking-wider">
              Grand Total Output for {selectedDate}
            </span>
            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="text-ink-500 block">Total Slabs</span>
                <span className="text-base font-extrabold text-ink-900">{dailyTotalSlabs}</span>
              </div>
              <div>
                <span className="text-ink-500 block">Processed Kg</span>
                <span className="text-base font-black text-rose-700">{formatKg(dailyTotalProcessedKg)}</span>
              </div>
              <div>
                <span className="text-ink-500 block">Rejection Kg</span>
                <span className="text-base font-bold text-ink-900">{formatKg(dailyTotalRejectionKg)}</span>
              </div>
            </div>
          </div>

          {/* Four Subtotal Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Supplier */}
            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700">Subtotals by Supplier</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-[10px] text-ink-500 uppercase font-bold">
                      <th className="py-2">Supplier</th>
                      <th className="py-2 text-right">Slabs</th>
                      <th className="py-2 text-right">Processed (Kg)</th>
                      <th className="py-2 text-right">Rejection (Kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-medium">
                    {consolidatedBySupplier.map((row, i) => (
                      <tr key={i}>
                        <td className="py-2 font-bold text-ink-900">{row.name}</td>
                        <td className="py-2 text-right">{row.slabs}</td>
                        <td className="py-2 text-right font-extrabold text-rose-700">{formatKg(row.processed)}</td>
                        <td className="py-2 text-right text-ink-500">{formatKg(row.rejection)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Product */}
            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700">Subtotals by Product / Species</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-[10px] text-ink-500 uppercase font-bold">
                      <th className="py-2">Product</th>
                      <th className="py-2 text-right">Slabs</th>
                      <th className="py-2 text-right">Processed (Kg)</th>
                      <th className="py-2 text-right">Rejection (Kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-medium">
                    {consolidatedByProduct.map((row, i) => (
                      <tr key={i}>
                        <td className="py-2 font-bold text-ink-900">{row.name}</td>
                        <td className="py-2 text-right">{row.slabs}</td>
                        <td className="py-2 text-right font-extrabold text-rose-700">{formatKg(row.processed)}</td>
                        <td className="py-2 text-right text-ink-500">{formatKg(row.rejection)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Grade */}
            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700">Subtotals by Quality Grade</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-[10px] text-ink-500 uppercase font-bold">
                      <th className="py-2">Grade</th>
                      <th className="py-2 text-right">Slabs</th>
                      <th className="py-2 text-right">Processed (Kg)</th>
                      <th className="py-2 text-right">Rejection (Kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-medium">
                    {consolidatedByGrade.map((row, i) => (
                      <tr key={i}>
                        <td className="py-2 font-bold text-ink-900">{row.name}</td>
                        <td className="py-2 text-right">{row.slabs}</td>
                        <td className="py-2 text-right font-extrabold text-rose-700">{formatKg(row.processed)}</td>
                        <td className="py-2 text-right text-ink-500">{formatKg(row.rejection)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Size / Count */}
            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700">Subtotals by Size / Count</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-[10px] text-ink-500 uppercase font-bold">
                      <th className="py-2">Size / Count</th>
                      <th className="py-2 text-right">Slabs</th>
                      <th className="py-2 text-right">Processed (Kg)</th>
                      <th className="py-2 text-right">Rejection (Kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-medium">
                    {consolidatedBySize.map((row, i) => (
                      <tr key={i}>
                        <td className="py-2 font-bold text-ink-900">{row.name}</td>
                        <td className="py-2 text-right">{row.slabs}</td>
                        <td className="py-2 text-right font-extrabold text-rose-700">{formatKg(row.processed)}</td>
                        <td className="py-2 text-right text-ink-500">{formatKg(row.rejection)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MONTHLY SUMMARY */}
      {activeReport === 'monthly-summary' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Monthly Consolidated Production Summary</h3>
              <p className="text-xs text-ink-500">Day-by-day factory output schedule and operating milestones.</p>
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

          {/* Stat Cards: Total, Highest, Lowest, Average Day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
              <span className="text-[10px] font-bold text-rose-800 uppercase block tracking-wider">
                Total Month Output
              </span>
              <span className="text-xl font-black text-rose-950 mt-1 block">
                {formatKg(monthTotalProcessedKg)}
              </span>
              <span className="text-[11px] text-rose-800 mt-1 block">
                {monthTotalSlabs} slabs · Rej: {formatKg(monthTotalRejectionKg)}
              </span>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider">
                Highest Production Day
              </span>
              <span className="text-xl font-black text-emerald-950 mt-1 block">
                {highestDay ? formatKg(highestDay.processed) : '-'}
              </span>
              <span className="text-[11px] text-emerald-800 mt-1 block">
                {highestDay ? `Date: ${highestDay.date} (${highestDay.slabs} slabs)` : 'No records'}
              </span>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase block tracking-wider">
                Lowest Production Day
              </span>
              <span className="text-xl font-black text-amber-950 mt-1 block">
                {lowestDay ? formatKg(lowestDay.processed) : '-'}
              </span>
              <span className="text-[11px] text-amber-800 mt-1 block">
                {lowestDay ? `Date: ${lowestDay.date} (${lowestDay.slabs} slabs)` : 'No records'}
              </span>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block tracking-wider">
                Average Daily Production
              </span>
              <span className="text-xl font-black text-ink-900 mt-1 block">
                {formatKg(avgDailyOutput)}
              </span>
              <span className="text-[11px] text-ink-700 mt-1 block">
                Across {monthDailyBreakdown.length} active factory days
              </span>
            </div>
          </div>

          {/* Date-wise Table for every day */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-center">Batches</th>
                  <th className="py-2.5 px-3 text-right">Slabs Packed</th>
                  <th className="py-2.5 px-3 text-right">Processed Weight</th>
                  <th className="py-2.5 px-3 text-right">Rejection Weight</th>
                  <th className="py-2.5 px-3 text-right">% of Month Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {monthDailyBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-ink-500">
                      No records for {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  monthDailyBreakdown.map((row) => (
                    <tr key={row.date} className="hover:bg-rose-50/30">
                      <td className="py-2.5 px-3 font-bold text-ink-900">{row.date}</td>
                      <td className="py-2.5 px-3 text-center">{row.batches}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{row.slabs}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-rose-700">{formatKg(row.processed)}</td>
                      <td className="py-2.5 px-3 text-right text-ink-500">{formatKg(row.rejection)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-ink-800">
                        {monthTotalProcessedKg > 0 ? `${((row.processed / monthTotalProcessedKg) * 100).toFixed(1)}%` : '0%'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. ITEM ANALYSIS: SUPPLIER, GRADE, SIZE */}
      {activeReport === 'item-analysis' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Monthly Item Breakdown Analysis</h3>
              <p className="text-xs text-ink-500">Slabs, volume, rejection %, and rankings per Supplier, Grade &amp; Size.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-700">Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
              />
            </div>
          </div>

          {/* Sub-tab Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setItemAnalysisTab('supplier')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                itemAnalysisTab === 'supplier'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-gray-100 text-ink-700 hover:bg-rose-50'
              }`}
            >
              Supplier Analysis
            </button>
            <button
              onClick={() => setItemAnalysisTab('grade')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                itemAnalysisTab === 'grade'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-gray-100 text-ink-700 hover:bg-rose-50'
              }`}
            >
              Grade Analysis
            </button>
            <button
              onClick={() => setItemAnalysisTab('size')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                itemAnalysisTab === 'size'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-gray-100 text-ink-700 hover:bg-rose-50'
              }`}
            >
              Size / Count Analysis
            </button>
          </div>

          {/* Performer Callout Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider">
                Top Performer
              </span>
              <span className="text-base font-bold text-emerald-950 mt-1 block">
                {itemAnalysisTab === 'supplier' && (topSupplier ? topSupplier.name : '-')}
                {itemAnalysisTab === 'grade' && (topGrade ? topGrade.name : '-')}
                {itemAnalysisTab === 'size' && (topSize ? topSize.name : '-')}
              </span>
              <span className="text-[11px] text-emerald-700 mt-1 block font-semibold">
                {itemAnalysisTab === 'supplier' && topSupplier && `${formatKg(topSupplier.processed)} (${topSupplier.pctTotal.toFixed(1)}%)`}
                {itemAnalysisTab === 'grade' && topGrade && `${formatKg(topGrade.processed)} (${topGrade.pctTotal.toFixed(1)}%)`}
                {itemAnalysisTab === 'size' && topSize && `${formatKg(topSize.processed)} (${topSize.pctTotal.toFixed(1)}%)`}
              </span>
            </div>

            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
              <span className="text-[10px] font-bold text-rose-800 uppercase block tracking-wider">
                Lowest Volume
              </span>
              <span className="text-base font-bold text-rose-950 mt-1 block">
                {itemAnalysisTab === 'supplier' && (lowestSupplier ? lowestSupplier.name : '-')}
                {itemAnalysisTab === 'grade' && (lowestGrade ? lowestGrade.name : '-')}
                {itemAnalysisTab === 'size' && (lowestSize ? lowestSize.name : '-')}
              </span>
              <span className="text-[11px] text-rose-700 mt-1 block font-semibold">
                {itemAnalysisTab === 'supplier' && lowestSupplier && `${formatKg(lowestSupplier.processed)} (${lowestSupplier.pctTotal.toFixed(1)}%)`}
                {itemAnalysisTab === 'grade' && lowestGrade && `${formatKg(lowestGrade.processed)} (${lowestGrade.pctTotal.toFixed(1)}%)`}
                {itemAnalysisTab === 'size' && lowestSize && `${formatKg(lowestSize.processed)} (${lowestSize.pctTotal.toFixed(1)}%)`}
              </span>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block tracking-wider">
                Group Average Output
              </span>
              <span className="text-base font-black text-ink-900 mt-1 block">
                {formatKg(avgSupplierOutput)}
              </span>
              <span className="text-[11px] text-ink-500 mt-1 block">
                Per active registered entity
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3 text-center">Lots</th>
                  <th className="py-2.5 px-3 text-right">Slabs</th>
                  <th className="py-2.5 px-3 text-right">Processed (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Rejection (Kg)</th>
                  <th className="py-2.5 px-3 text-right">% of Month Output</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {itemAnalysisTab === 'supplier' &&
                  supplierAnalysisData.map((row) => (
                    <tr key={row.id} className="hover:bg-rose-50/30">
                      <td className="py-2.5 px-3 font-bold text-ink-900">{row.name}</td>
                      <td className="py-2.5 px-3 text-center">{row.batches}</td>
                      <td className="py-2.5 px-3 text-right">{row.slabs}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-rose-700">{formatKg(row.processed)}</td>
                      <td className="py-2.5 px-3 text-right text-ink-500">{formatKg(row.rejection)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-ink-900">{row.pctTotal.toFixed(1)}%</td>
                    </tr>
                  ))}

                {itemAnalysisTab === 'grade' &&
                  gradeAnalysisData.map((row) => (
                    <tr key={row.id} className="hover:bg-rose-50/30">
                      <td className="py-2.5 px-3 font-bold text-ink-900">{row.name}</td>
                      <td className="py-2.5 px-3 text-center">{row.batches}</td>
                      <td className="py-2.5 px-3 text-right">{row.slabs}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-rose-700">{formatKg(row.processed)}</td>
                      <td className="py-2.5 px-3 text-right text-ink-500">{formatKg(row.rejection)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-ink-900">{row.pctTotal.toFixed(1)}%</td>
                    </tr>
                  ))}

                {itemAnalysisTab === 'size' &&
                  sizeAnalysisData.map((row) => (
                    <tr key={row.key} className="hover:bg-rose-50/30">
                      <td className="py-2.5 px-3 font-bold text-ink-900">{row.name}</td>
                      <td className="py-2.5 px-3 text-center">{row.batches}</td>
                      <td className="py-2.5 px-3 text-right">{row.slabs}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-rose-700">{formatKg(row.processed)}</td>
                      <td className="py-2.5 px-3 text-right text-ink-500">{formatKg(row.rejection)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-ink-900">{row.pctTotal.toFixed(1)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. PRODUCTION MATRIX (PIVOT VIEWS) */}
      {activeReport === 'matrix' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Two-Dimensional Production Matrix</h3>
              <p className="text-xs text-ink-500">
                Dynamic pivot grids for {selectedMonth} with Processed Kg output, auto-extending with new items.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-700">Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
              />
            </div>
          </div>

          {/* Matrix Switcher Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setMatrixView('product-grade')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                matrixView === 'product-grade'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-gray-100 text-ink-700 hover:bg-rose-50'
              }`}
            >
              Pivot A: Product × Quality Grade
            </button>
            <button
              onClick={() => setMatrixView('grade-size')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                matrixView === 'grade-size'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-gray-100 text-ink-700 hover:bg-rose-50'
              }`}
            >
              Pivot B: Grade × Size/Count
            </button>
          </div>

          {/* Pivot A: Product x Grade */}
          {matrixView === 'product-grade' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">Product / Species</th>
                    {grades.map((g) => (
                      <th key={g.id} className="py-2.5 px-3 text-right">
                        {g.name}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right font-black text-rose-700 bg-rose-50/50">
                      Row Total (Kg)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {productGradeMatrix.length === 0 ? (
                    <tr>
                      <td colSpan={grades.length + 2} className="py-8 text-center text-ink-500">
                        No product transactions found for {selectedMonth}.
                      </td>
                    </tr>
                  ) : (
                    productGradeMatrix.map((row, i) => (
                      <tr key={i} className="hover:bg-rose-50/30">
                        <td className="py-2.5 px-3 font-bold text-ink-900">{row.speciesName}</td>
                        {grades.map((g) => (
                          <td key={g.id} className="py-2.5 px-3 text-right text-ink-800">
                            {row[g.id] > 0 ? formatKg(row[g.id]) : '-'}
                          </td>
                        ))}
                        <td className="py-2.5 px-3 text-right font-black text-rose-700 bg-rose-50/40">
                          {formatKg(row.total)}
                        </td>
                      </tr>
                    ))
                  )}
                  {/* Column Totals Row */}
                  {productGradeMatrix.length > 0 && (
                    <tr className="bg-gray-100/80 font-black border-t-2 border-gray-300">
                      <td className="py-3 px-3 uppercase text-ink-900">Grand Total (Kg)</td>
                      {grades.map((g) => (
                        <td key={g.id} className="py-3 px-3 text-right text-ink-900">
                          {formatKg(gradeColTotals[g.id] || 0)}
                        </td>
                      ))}
                      <td className="py-3 px-3 text-right font-black text-rose-800 bg-rose-100/60">
                        {formatKg(matrixTotal1)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pivot B: Grade x Size */}
          {matrixView === 'grade-size' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">Quality Grade</th>
                    {allSizeColKeys.map((col) => (
                      <th key={col.id} className="py-2.5 px-3 text-right">
                        {col.name}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right font-black text-rose-700 bg-rose-50/50">
                      Row Total (Kg)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {gradeSizeMatrix.length === 0 ? (
                    <tr>
                      <td colSpan={allSizeColKeys.length + 2} className="py-8 text-center text-ink-500">
                        No transactions found for {selectedMonth}.
                      </td>
                    </tr>
                  ) : (
                    gradeSizeMatrix.map((row, i) => (
                      <tr key={i} className="hover:bg-rose-50/30">
                        <td className="py-2.5 px-3 font-bold text-ink-900">{row.gradeName}</td>
                        {allSizeColKeys.map((col) => (
                          <td key={col.id} className="py-2.5 px-3 text-right text-ink-800">
                            {row[col.id] > 0 ? formatKg(row[col.id]) : '-'}
                          </td>
                        ))}
                        <td className="py-2.5 px-3 text-right font-black text-rose-700 bg-rose-50/40">
                          {formatKg(row.total)}
                        </td>
                      </tr>
                    ))
                  )}
                  {/* Column Totals Row */}
                  {gradeSizeMatrix.length > 0 && (
                    <tr className="bg-gray-100/80 font-black border-t-2 border-gray-300">
                      <td className="py-3 px-3 uppercase text-ink-900">Grand Total (Kg)</td>
                      {allSizeColKeys.map((col) => (
                        <td key={col.id} className="py-3 px-3 text-right text-ink-900">
                          {formatKg(sizeColTotals[col.id] || 0)}
                        </td>
                      ))}
                      <td className="py-3 px-3 text-right font-black text-rose-800 bg-rose-100/60">
                        {formatKg(matrixTotal2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. EXCEPTION REPORT */}
      {activeReport === 'exceptions' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Production Line Exception &amp; Variance Audit Report
              </h3>
              <p className="text-xs text-ink-500">
                Automated detection of missing box IDs, duplicate lots, slab weight divergences, and reconciliation checks.
              </p>
            </div>

            {/* Reconciliation Check Badge */}
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
              isReconciled ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {isReconciled ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
              <span>{isReconciled ? 'Math Reconciliation: 100% Balanced' : 'Mathematical Drift Detected'}</span>
            </div>
          </div>

          {/* Filter by Exception Type */}
          <div className="flex flex-wrap items-center gap-2">
            {['all', 'Missing Data', 'Duplicate Entry', 'Slab Variance', 'Negative Value'].map((type) => (
              <button
                key={type}
                onClick={() => setExceptionTypeFilter(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  exceptionTypeFilter === type
                    ? 'bg-ink-900 text-white'
                    : 'bg-gray-100 text-ink-700 hover:bg-gray-200'
                }`}
              >
                {type === 'all' ? 'All Exceptions' : type}
              </button>
            ))}
          </div>

          {/* Exceptions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Exception Category</th>
                  <th className="py-2.5 px-3">Entry #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredExceptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-emerald-700">
                      <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                      <span className="font-bold block">Zero Exceptions Detected!</span>
                      <span className="text-xs text-ink-500">All production entries are balanced, non-duplicate, and within tolerance.</span>
                    </td>
                  </tr>
                ) : (
                  filteredExceptions.map((exc) => (
                    <tr key={exc.id} className="hover:bg-rose-50/30">
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            exc.severity === 'High'
                              ? 'bg-rose-100 text-rose-800'
                              : exc.severity === 'Medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {exc.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-ink-900">{exc.type}</td>
                      <td className="py-2.5 px-3 font-semibold text-rose-700">{exc.entryNo}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{exc.date}</td>
                      <td className="py-2.5 px-3 font-medium text-ink-900">{exc.description}</td>
                      <td className="py-2.5 px-3 text-ink-500">{exc.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. YIELD % RECONCILIATION REPORT (Purchase Raw Material vs Production Output) */}
      {activeReport === 'yield-reconciliation' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                <Percent className="w-4 h-4 text-rose-600" />
                Raw Material Purchase vs. Processed Yield % Reconciliation
              </h3>
              <p className="text-xs text-ink-500">
                Period-level reconciliation comparing harbour raw received weight vs packed output by Supplier &amp; Product.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-700">Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
              />
            </div>
          </div>

          {/* Period Summary KPI Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block tracking-wider">
                Total Raw Received
              </span>
              <span className="text-lg font-black text-ink-900 mt-1 block">
                {formatKg(totalRawPurchasedKg)}
              </span>
              <span className="text-[10px] text-ink-500 mt-0.5 block">Purchase intake for {selectedMonth}</span>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block tracking-wider">
                Total Processed Output
              </span>
              <span className="text-lg font-black text-rose-700 mt-1 block">
                {formatKg(totalProductionYieldKg)}
              </span>
              <span className="text-[10px] text-ink-500 mt-0.5 block">Factory packed yield</span>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block tracking-wider">
                Total Weight Shrinkage / Loss
              </span>
              <span className="text-lg font-black text-ink-900 mt-1 block">
                {formatKg(Math.max(0, totalRawPurchasedKg - totalProductionYieldKg))}
              </span>
              <span className="text-[10px] text-ink-500 mt-0.5 block">Heading, peeling &amp; glazing diff</span>
            </div>

            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
              <span className="text-[10px] font-bold text-rose-800 uppercase block tracking-wider">
                Overall Recovery Yield %
              </span>
              <span className="text-lg font-black text-rose-950 mt-1 block">
                {overallYieldPct.toFixed(1)}%
              </span>
              <span className="text-[10px] text-rose-700 mt-0.5 block font-semibold">
                (Production Kg / Raw Purchase Kg)
              </span>
            </div>
          </div>

          {/* Yield Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Seafood Variety</th>
                  <th className="py-2.5 px-3 text-right">Raw Received (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Processed Packed (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Loss / Trim (Kg)</th>
                  <th className="py-2.5 px-3 text-right font-extrabold text-rose-700">Yield %</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {yieldRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-500">
                      No matching purchase and production transactions for {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  yieldRows.map((r, i) => (
                    <tr key={i} className="hover:bg-rose-50/30">
                      <td className="py-2.5 px-3 font-bold text-ink-900">{r.supplierName}</td>
                      <td className="py-2.5 px-3 text-ink-800">{r.speciesName}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{formatKg(r.purchaseWeightKg)}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-rose-700">{formatKg(r.productionProcessedKg)}</td>
                      <td className="py-2.5 px-3 text-right text-ink-500">{formatKg(r.weightLossKg)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-700 text-sm">
                        {r.purchaseWeightKg > 0 ? `${r.yieldPct}%` : 'N/A (No Intake)'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'Optimal'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : r.status === 'Normal'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {r.status}
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
    </div>
  );
};
