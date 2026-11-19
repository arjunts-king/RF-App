import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatKg } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
import { BentoCard } from '../common/BentoCard';
import { MultiSelectFilter } from '../common/MultiSelectFilter';
import { Carousel } from '../common/Carousel';
import { ChartSlideCard } from '../common/ChartSlideCard';
import {
  Calendar,
  AlertTriangle,
  PlusCircle,
  Fish,
  Users,
  Layers,
  Filter,
  X,
  ArrowUpRight,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Factory
} from 'lucide-react';

export const ProductionDashboard: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { processingEntries, suppliers, species, grades, sizes } = useData();

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState<string[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);
  const [kpiViewMode, setKpiViewMode] = useState<'carousel' | 'grid'>('carousel');

  // Master Lookups
  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);
  const speciesMap = useMemo(() => new Map(species.map((sp) => [sp.id, sp])), [species]);
  const gradeMap = useMemo(() => new Map(grades.map((g) => [g.id, g])), [grades]);

  // Robust species resolver across ID, code, name, and rawSpeciesName
  const findSpecies = useMemo(() => {
    const byId = new Map(species.map((sp) => [sp.id.toLowerCase(), sp]));
    const byCode = new Map(species.map((sp) => [sp.code.toLowerCase(), sp]));
    const byName = new Map(species.map((sp) => [sp.name.trim().toLowerCase(), sp]));
    const byRaw = new Map<string, (typeof species)[0]>();
    for (const sp of species) {
      if (sp.rawSpeciesName) {
        byRaw.set(sp.rawSpeciesName.trim().toLowerCase(), sp);
      }
    }

    return (idOrKey: string) => {
      if (!idOrKey) return undefined;
      const clean = idOrKey.trim();
      const lower = clean.toLowerCase();
      return (
        byId.get(lower) ||
        byCode.get(lower) ||
        byName.get(lower) ||
        byRaw.get(lower) ||
        species.find(
          (sp) =>
            sp.id.toLowerCase() === lower ||
            sp.code.toLowerCase() === lower ||
            sp.name.toLowerCase() === lower ||
            (sp.rawSpeciesName && sp.rawSpeciesName.toLowerCase() === lower) ||
            (sp.scientificName && sp.scientificName.toLowerCase() === lower)
        )
      );
    };
  }, [species]);

  // Helper to obtain clean production species name (isolated from sales export products)
  const getProductionSpeciesLabel = (rawId: string): { id: string; label: string; subLabel?: string } => {
    const sp = findSpecies(rawId);
    let label = '';
    let subLabel = sp?.scientificName || undefined;

    if (sp) {
      if (sp.rawSpeciesName) {
        label = sp.rawSpeciesName.trim();
      } else if (sp.name) {
        label = sp.name.replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim();
      } else if (sp.code) {
        label = sp.code.trim();
      }
    }

    if (!label) {
      label = rawId.replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim();
    }

    return {
      id: sp ? sp.id : rawId,
      label,
      subLabel
    };
  };

  // Production-Only Species Options for MultiSelectFilter:
  // Strictly includes ONLY products/species that have been recorded in processingEntries.
  // Completely isolated from Sales Dashboard export products.
  const speciesOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { id: string; label: string; subLabel?: string }[] = [];

    // Derive strictly from factory processingEntries (never from sales export catalog)
    processingEntries.forEach((p) => {
      if (p.isVoided) return;
      const rawId = (p.speciesId || '').trim();
      if (!rawId) return;

      const info = getProductionSpeciesLabel(rawId);
      const lowerLabel = info.label.toLowerCase();

      if (!seen.has(lowerLabel)) {
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

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [processingEntries, findSpecies]);

  const resolveSpeciesName = (spId: string): string => {
    if (!spId) return 'Unspecified Product';
    const opt = speciesOptions.find((o) => o.id === spId || o.label.toLowerCase() === spId.toLowerCase());
    if (opt) return opt.label;
    const direct = speciesMap.get(spId);
    if (direct) {
      if (direct.rawSpeciesName) return direct.rawSpeciesName;
      return direct.name.replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim();
    }
    const found = findSpecies(spId);
    if (found) {
      if (found.rawSpeciesName) return found.rawSpeciesName;
      return found.name.replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim();
    }
    return spId.replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim();
  };

  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ id: s.id, label: s.name, subLabel: s.district ? `${s.district}, ${s.state}` : s.state || s.code || undefined })),
    [suppliers]
  );

  const gradeOptions = useMemo(
    () => grades.map((g) => ({ id: g.id, label: g.name, subLabel: g.code || undefined })),
    [grades]
  );

  const hasActiveFilters = Boolean(
    selectedSpeciesIds.length > 0 ||
    selectedSupplierIds.length > 0 ||
    selectedGradeIds.length > 0
  );

  const clearAllFilters = () => {
    setSelectedSpeciesIds([]);
    setSelectedSupplierIds([]);
    setSelectedGradeIds([]);
  };

  const activeEntries = useMemo(() => {
    return processingEntries.filter((p) => {
      if (p.isVoided) return false;
      if (selectedMonth && !p.processingDate.startsWith(selectedMonth)) return false;

      // Species Filter: Robust matching supporting direct ID, code, name, rawSpeciesName, and option label
      if (selectedSpeciesIds.length > 0) {
        const rawEntrySpId = (p.speciesId || '').trim();
        const entrySp = findSpecies(rawEntrySpId);
        const entrySpName = (entrySp?.name || rawEntrySpId).trim().toLowerCase();
        const entrySpCode = (entrySp?.code || '').trim().toLowerCase();
        const entrySpRaw = (entrySp?.rawSpeciesName || '').trim().toLowerCase();
        const entrySpSci = (entrySp?.scientificName || '').trim().toLowerCase();
        const entryProdLabel = getProductionSpeciesLabel(rawEntrySpId).label.trim().toLowerCase();

        const matchesSpecies = selectedSpeciesIds.some((selectedId) => {
          // Direct ID match
          if (rawEntrySpId === selectedId) return true;
          if (rawEntrySpId.toLowerCase() === selectedId.toLowerCase()) return true;

          // Match by production label
          if (entryProdLabel === selectedId.toLowerCase()) return true;

          // Match by resolved species objects
          const selSp = findSpecies(selectedId);
          if (entrySp && selSp && entrySp.id === selSp.id) return true;

          // Match entry raw ID against selected species object properties
          if (selSp) {
            if (rawEntrySpId.toLowerCase() === selSp.id.toLowerCase()) return true;
            if (rawEntrySpId.toLowerCase() === selSp.code.toLowerCase()) return true;
            if (rawEntrySpId.toLowerCase() === selSp.name.trim().toLowerCase()) return true;
            if (selSp.rawSpeciesName && rawEntrySpId.toLowerCase() === selSp.rawSpeciesName.trim().toLowerCase()) return true;
          }

          // Match selected ID against entry species object properties
          if (entrySp) {
            if (selectedId.toLowerCase() === entrySp.id.toLowerCase()) return true;
            if (selectedId.toLowerCase() === entrySpCode) return true;
            if (selectedId.toLowerCase() === entrySpName) return true;
            if (entrySpRaw && selectedId.toLowerCase() === entrySpRaw) return true;
          }

          // Option label match
          const selOpt = speciesOptions.find((o) => o.id === selectedId);
          if (selOpt) {
            const optLabel = selOpt.label.trim().toLowerCase();
            if (optLabel === entrySpName || optLabel === rawEntrySpId.toLowerCase() || optLabel === entryProdLabel) return true;
            if (entrySpRaw && optLabel.includes(entrySpRaw)) return true;
            if (entrySpName && optLabel.includes(entrySpName)) return true;
            if (entrySpName && entrySpName.includes(optLabel)) return true;
          }

          // Normalized name match
          if (selSp && entrySp) {
            if (entrySpRaw && selSp.rawSpeciesName && entrySpRaw === selSp.rawSpeciesName.trim().toLowerCase()) return true;
            if (selSp.name.trim().toLowerCase() === entrySpName) return true;
            if (entrySpSci && selSp.scientificName && entrySpSci === selSp.scientificName.trim().toLowerCase()) return true;
          }

          return false;
        });

        if (!matchesSpecies) return false;
      }

      // Supplier Filter
      if (selectedSupplierIds.length > 0) {
        const matchesSupplier = selectedSupplierIds.some((sId) => {
          if (p.supplierId === sId) return true;
          const sObj = supplierMap.get(p.supplierId);
          return sObj && (sObj.id === sId || sObj.code === sId || sObj.name.toLowerCase() === sId.toLowerCase());
        });
        if (!matchesSupplier) return false;
      }

      // Grade Filter
      if (selectedGradeIds.length > 0) {
        const matchesGrade = selectedGradeIds.some((gId) => {
          if (p.gradeId === gId) return true;
          const gObj = gradeMap.get(p.gradeId);
          return gObj && (gObj.id === gId || gObj.code === gId || gObj.name.toLowerCase() === gId.toLowerCase());
        });
        if (!matchesGrade) return false;
      }

      return true;
    });
  }, [
    processingEntries,
    selectedMonth,
    selectedSpeciesIds,
    selectedSupplierIds,
    selectedGradeIds,
    findSpecies,
    speciesOptions,
    supplierMap,
    gradeMap
  ]);

  // KPI Calculations
  const totalProcessedKg = activeEntries.reduce((s, p) => s + p.processedWeightKg, 0);
  const totalRejectionKg = activeEntries.reduce((s, p) => s + p.rejectionWeightKg, 0);
  const totalSlabs = activeEntries.reduce((s, p) => s + p.slabsCount, 0);
  const uniqueSuppliers = new Set(activeEntries.map((p) => p.supplierId)).size;
  const uniqueDays = new Set(activeEntries.map((p) => p.processingDate)).size;
  const avgDailyProductionKg = uniqueDays > 0 ? totalProcessedKg / uniqueDays : 0;
  const totalVolumeInput = totalProcessedKg + totalRejectionKg;
  const rejectionRatePct = totalVolumeInput > 0 ? (totalRejectionKg / totalVolumeInput) * 100 : 0;
  const varianceCount = activeEntries.filter((p) => p.hasSlabVariance).length;

  // Prior month comparison with like-for-like species filtering
  const momChangePct = useMemo(() => {
    if (!selectedMonth) return 0;
    const [currY, currM] = selectedMonth.split('-').map(Number);
    if (!currY || !currM) return 0;
    const priorMonthStr = `${currM === 1 ? currY - 1 : currY}-${String(currM === 1 ? 12 : currM - 1).padStart(2, '0')}`;
    const priorMonthEntries = processingEntries.filter((p) => {
      if (p.isVoided) return false;
      if (!p.processingDate.startsWith(priorMonthStr)) return false;
      if (selectedSpeciesIds.length > 0) {
        const rawEntrySpId = (p.speciesId || '').trim();
        const entrySp = findSpecies(rawEntrySpId);
        const entrySpName = (entrySp?.name || rawEntrySpId).trim().toLowerCase();
        const entrySpCode = (entrySp?.code || '').trim().toLowerCase();
        const entrySpRaw = (entrySp?.rawSpeciesName || '').trim().toLowerCase();
        const entryProdLabel = getProductionSpeciesLabel(rawEntrySpId).label.trim().toLowerCase();
        const matchesSpecies = selectedSpeciesIds.some((selectedId) => {
          if (rawEntrySpId === selectedId || rawEntrySpId.toLowerCase() === selectedId.toLowerCase()) return true;
          if (entryProdLabel === selectedId.toLowerCase()) return true;
          const selSp = findSpecies(selectedId);
          if (entrySp && selSp && entrySp.id === selSp.id) return true;
          if (selSp) {
            if (rawEntrySpId.toLowerCase() === selSp.id.toLowerCase() || rawEntrySpId.toLowerCase() === selSp.code.toLowerCase() || rawEntrySpId.toLowerCase() === selSp.name.trim().toLowerCase()) return true;
            if (selSp.rawSpeciesName && rawEntrySpId.toLowerCase() === selSp.rawSpeciesName.trim().toLowerCase()) return true;
          }
          if (entrySp) {
            if (selectedId.toLowerCase() === entrySp.id.toLowerCase() || selectedId.toLowerCase() === entrySpCode || selectedId.toLowerCase() === entrySpName) return true;
            if (entrySpRaw && selectedId.toLowerCase() === entrySpRaw) return true;
          }
          const selOpt = speciesOptions.find((o) => o.id === selectedId);
          if (selOpt) {
            const optLabel = selOpt.label.trim().toLowerCase();
            if (optLabel === entrySpName || optLabel === rawEntrySpId.toLowerCase() || optLabel === entryProdLabel) return true;
          }
          return false;
        });
        if (!matchesSpecies) return false;
      }
      return true;
    });
    const priorMonthTotalKg = priorMonthEntries.reduce((s, p) => s + p.processedWeightKg, 0);
    return priorMonthTotalKg > 0 ? ((totalProcessedKg - priorMonthTotalKg) / priorMonthTotalKg) * 100 : 0;
  }, [selectedMonth, processingEntries, selectedSpeciesIds, totalProcessedKg, findSpecies]);

  // Daily Trend Grouping
  const daysInMonth: { day: string; date: string; weight: number; slabs: number; rejection: number }[] = [];
  const dateMap = new Map<string, { weight: number; slabs: number; rejection: number }>();
  activeEntries.forEach((p) => {
    const cur = dateMap.get(p.processingDate) || { weight: 0, slabs: 0, rejection: 0 };
    dateMap.set(p.processingDate, {
      weight: cur.weight + p.processedWeightKg,
      slabs: cur.slabs,
      rejection: cur.rejection + p.rejectionWeightKg
    });
  });

  const sortedDates = Array.from(dateMap.keys()).sort();
  sortedDates.forEach((date) => {
    const data = dateMap.get(date)!;
    daysInMonth.push({
      day: date.slice(8), // DD
      date,
      weight: data.weight,
      slabs: data.slabs,
      rejection: data.rejection
    });
  });

  // Max daily weight for scaling chart
  const maxDailyWeight = Math.max(...daysInMonth.map((d) => d.weight), 100);

  // Supplier Breakdown
  const supplierBreakdownMap = new Map<string, number>();
  activeEntries.forEach((p) => {
    supplierBreakdownMap.set(p.supplierId, (supplierBreakdownMap.get(p.supplierId) || 0) + p.processedWeightKg);
  });
  const topSuppliers = Array.from(supplierBreakdownMap.entries())
    .map(([suppId, wt]) => ({
      name: supplierMap.get(suppId)?.name || 'Unknown',
      weight: wt,
      pct: totalProcessedKg > 0 ? (wt / totalProcessedKg) * 100 : 0
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  // Product / Species Breakdown
  const speciesBreakdownMap = new Map<string, number>();
  activeEntries.forEach((p) => {
    const rawId = (p.speciesId || '').trim();
    speciesBreakdownMap.set(rawId, (speciesBreakdownMap.get(rawId) || 0) + p.processedWeightKg);
  });
  const topSpecies = Array.from(speciesBreakdownMap.entries())
    .map(([spId, wt]) => ({
      name: resolveSpeciesName(spId),
      weight: wt,
      pct: totalProcessedKg > 0 ? (wt / totalProcessedKg) * 100 : 0
    }))
    .sort((a, b) => b.weight - a.weight);

  // Grade Breakdown
  const gradeBreakdownMap = new Map<string, number>();
  activeEntries.forEach((p) => {
    gradeBreakdownMap.set(p.gradeId, (gradeBreakdownMap.get(p.gradeId) || 0) + p.processedWeightKg);
  });
  const topGrades = Array.from(gradeBreakdownMap.entries())
    .map(([grdId, wt]) => ({
      name: gradeMap.get(grdId)?.name || 'Standard',
      weight: wt,
      pct: totalProcessedKg > 0 ? (wt / totalProcessedKg) * 100 : 0
    }))
    .sort((a, b) => b.weight - a.weight);

  // Size Breakdown
  const sizeBreakdownMap = new Map<string, number>();
  activeEntries.forEach((p) => {
    if (p.sizeId) {
      sizeBreakdownMap.set(p.sizeId, (sizeBreakdownMap.get(p.sizeId) || 0) + p.processedWeightKg);
    }
  });
  const topSizes = Array.from(sizeBreakdownMap.entries())
    .map(([szId, wt]) => {
      const matchSize = sizes.find((s) => s.id === szId);
      return {
        id: szId,
        name: matchSize?.code || matchSize?.name || szId,
        weight: wt,
        pct: totalProcessedKg > 0 ? (wt / totalProcessedKg) * 100 : 0
      };
    })
    .sort((a, b) => b.weight - a.weight);

  // Recent operating processing days (reversed chronological)
  const recentDaysList = useMemo(() => {
    return [...daysInMonth].reverse().slice(0, 10);
  }, [daysInMonth]);

  // Active filter tags for display inside chart cards
  const activeFilterTags = useMemo(() => {
    const tags: { label: string; value: string; color?: 'rose' | 'blue' | 'emerald' | 'amber' | 'purple' | 'gray' }[] = [];
    if (selectedMonth) tags.push({ label: 'Month', value: selectedMonth, color: 'gray' });
    if (selectedSpeciesIds.length > 0) tags.push({ label: 'Species', value: `${selectedSpeciesIds.length} selected`, color: 'blue' });
    if (selectedSupplierIds.length > 0) tags.push({ label: 'Suppliers', value: `${selectedSupplierIds.length} selected`, color: 'rose' });
    if (selectedGradeIds.length > 0) tags.push({ label: 'Grades', value: `${selectedGradeIds.length} selected`, color: 'emerald' });
    return tags;
  }, [selectedMonth, selectedSpeciesIds, selectedSupplierIds, selectedGradeIds]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* FIGMA-STYLE HEADLINE-FIRST HEADER */}
      <PageHeader
        title="Production plant dashboard"
        description="Daily throughput, shift performance, slab packaging counts, and freezing weight variance monitoring."
        badge={`${formatKg(totalProcessedKg)} Produced`}
        primaryAction={
          onNavigate
            ? {
                label: 'Record daily processing',
                icon: PlusCircle,
                onClick: () => onNavigate('daily-entry')
              }
            : undefined
        }
        secondaryActions={
          onNavigate
            ? [
                {
                  label: 'Processing log',
                  onClick: () => onNavigate('processing-log')
                },
                {
                  label: 'Slab master',
                  onClick: () => onNavigate('slab-types')
                },
                {
                  label: 'Excel import',
                  onClick: () => onNavigate('prod-excel-import')
                }
              ]
            : undefined
        }
      />

      {/* STICKY MULTI-FILTER & MONTH SELECTOR BAR (Liquid Glass Surface) */}
      <div className="sticky top-16 z-30 glass-surface-thin p-4 rounded-2xl border border-white/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-ink-900">
            <Filter className="w-4 h-4 text-rose-600" />
            <span>Production Multi-Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl font-semibold">
              <Calendar className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold text-ink-900 outline-none cursor-pointer text-xs"
                title="Filter by Production Month"
              />
              {selectedMonth ? (
                <button
                  type="button"
                  onClick={() => setSelectedMonth('')}
                  className="ml-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline"
                  title="Clear month filter to show all months"
                >
                  All Months
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedMonth(currentMonthStr)}
                  className="ml-1 text-[11px] font-bold text-ink-600 hover:text-rose-600 hover:underline"
                  title="Filter to current month"
                >
                  This Month
                </button>
              )}
            </div>

            <MultiSelectFilter
              label="Species"
              options={speciesOptions}
              selectedIds={selectedSpeciesIds}
              onChange={setSelectedSpeciesIds}
              icon={Fish}
              badgeColor="blue"
              placeholder="Search production species..."
            />

            <MultiSelectFilter
              label="Suppliers"
              options={supplierOptions}
              selectedIds={selectedSupplierIds}
              onChange={setSelectedSupplierIds}
              icon={Users}
              badgeColor="rose"
              placeholder="Search suppliers..."
            />

            <MultiSelectFilter
              label="Grades"
              options={gradeOptions}
              selectedIds={selectedGradeIds}
              onChange={setSelectedGradeIds}
              icon={Layers}
              badgeColor="emerald"
              placeholder="Search grades..."
              align="right"
            />

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

            {selectedSpeciesIds.map((id) => {
              const displayName = resolveSpeciesName(id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200"
                >
                  <span>Species: {displayName}</span>
                  <button
                    onClick={() => setSelectedSpeciesIds(selectedSpeciesIds.filter((item) => item !== id))}
                    className="hover:text-blue-950"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {selectedSupplierIds.map((id) => {
              const supp = suppliers.find((s) => s.id === id);
              const displayName = supp?.name || id;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200"
                >
                  <span>Supplier: {displayName}</span>
                  <button
                    onClick={() => setSelectedSupplierIds(selectedSupplierIds.filter((item) => item !== id))}
                    className="hover:text-rose-950"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {selectedGradeIds.map((id) => {
              const grd = grades.find((g) => g.id === id);
              const displayName = grd?.name || id;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  <span>Grade: {displayName}</span>
                  <button
                    onClick={() => setSelectedGradeIds(selectedGradeIds.filter((item) => item !== id))}
                    className="hover:text-emerald-950"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* BENTO-STYLE KPI CARDS WITH CAPTIONS & LINKS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory className="w-4 h-4 text-amber-700" />
            <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wide">Production Floor Key Metrics</h3>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              {activeEntries.length} Lots
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setKpiViewMode('carousel')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  kpiViewMode === 'carousel' ? 'bg-white text-rose-700 shadow-2xs font-bold' : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                Carousel
              </button>
              <button
                type="button"
                onClick={() => setKpiViewMode('grid')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  kpiViewMode === 'grid' ? 'bg-white text-rose-700 shadow-2xs font-bold' : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                Grid
              </button>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('prod-reports')}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 hover:underline flex items-center gap-1"
              >
                <span>Reports hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {kpiViewMode === 'carousel' ? (
          <Carousel
            ariaLabel="Production Floor Key Metrics"
            style="peeking"
            depthEffect="subtle"
            cardWidthClass="w-[85%] sm:w-[48%] md:w-[32%] lg:w-[24%]"
            showIndicators={true}
            showArrows={true}
            showCount={true}
            className="relative z-10"
            viewAllLink={{
              label: 'View shift performance',
              onClick: () => onNavigate && onNavigate('prod-reports'),
              showEndCard: true,
              endCardTitle: 'Production Reports Hub',
              endCardDescription: 'Inspect daily shift outputs, standard slab freezing variance, and yield recovery.'
            }}
          >
            <BentoCard
              label="Total Production"
              value={formatKg(totalProcessedKg)}
              caption="Finished packed output"
              linkText="View lot details"
              onLinkClick={() => onNavigate && onNavigate('processing-log')}
              variant="highlight"
              trend={
                selectedMonth
                  ? {
                      value: `${momChangePct >= 0 ? '+' : ''}${momChangePct.toFixed(1)}% MoM`,
                      isPositive: momChangePct >= 0
                    }
                  : undefined
              }
            />

            <BentoCard
              label="Slabs Packed"
              value={totalSlabs.toLocaleString('en-IN')}
              caption={`${activeEntries.length} lots processed`}
              linkText="View slab standards"
              onLinkClick={() => onNavigate && onNavigate('slab-types')}
            />

            <BentoCard
              label="Raw Suppliers"
              value={uniqueSuppliers}
              caption={selectedMonth ? `Active in ${selectedMonth}` : 'All active suppliers'}
              linkText="View supplier lots"
              onLinkClick={() => onNavigate && onNavigate('processing-log')}
            />

            <BentoCard
              label="Active Days"
              value={`${uniqueDays} Days`}
              caption="Factory operating days"
              linkText="View daily trend"
              onLinkClick={() => onNavigate && onNavigate('prod-reports')}
            />

            <BentoCard
              label="Avg Daily Output"
              value={formatKg(avgDailyProductionKg)}
              caption="Per operating day"
              linkText="View shift performance"
              onLinkClick={() => onNavigate && onNavigate('prod-reports')}
            />

            <BentoCard
              label="Total Rejection"
              value={formatKg(totalRejectionKg)}
              caption={`${rejectionRatePct.toFixed(1)}% rejection rate`}
              linkText="Audit exceptions"
              onLinkClick={() => onNavigate && onNavigate('processing-log')}
              variant={rejectionRatePct > 5 ? 'warning' : 'default'}
            />
          </Carousel>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 relative z-10">
            <BentoCard
              label="Total Production"
              value={formatKg(totalProcessedKg)}
              caption="Finished packed output"
              linkText="View lot details"
              onLinkClick={() => onNavigate && onNavigate('processing-log')}
              variant="highlight"
              trend={
                selectedMonth
                  ? {
                      value: `${momChangePct >= 0 ? '+' : ''}${momChangePct.toFixed(1)}% MoM`,
                      isPositive: momChangePct >= 0
                    }
                  : undefined
              }
            />

            <BentoCard
              label="Slabs Packed"
              value={totalSlabs.toLocaleString('en-IN')}
              caption={`${activeEntries.length} lots processed`}
              linkText="View slab standards"
              onLinkClick={() => onNavigate && onNavigate('slab-types')}
            />

            <BentoCard
              label="Raw Suppliers"
              value={uniqueSuppliers}
              caption={selectedMonth ? `Active in ${selectedMonth}` : 'All active suppliers'}
              linkText="View supplier lots"
              onLinkClick={() => onNavigate && onNavigate('processing-log')}
            />

            <BentoCard
              label="Active Days"
              value={`${uniqueDays} Days`}
              caption="Factory operating days"
              linkText="View daily trend"
              onLinkClick={() => onNavigate && onNavigate('prod-reports')}
            />

            <BentoCard
              label="Avg Daily Output"
              value={formatKg(avgDailyProductionKg)}
              caption="Per operating day"
              linkText="View shift performance"
              onLinkClick={() => onNavigate && onNavigate('prod-reports')}
            />

            <BentoCard
              label="Total Rejection"
              value={formatKg(totalRejectionKg)}
              caption={`${rejectionRatePct.toFixed(1)}% rejection rate`}
              linkText="Audit exceptions"
              onLinkClick={() => onNavigate && onNavigate('processing-log')}
              variant={rejectionRatePct > 5 ? 'warning' : 'default'}
            />
          </div>
        )}
      </div>

      {/* Variance Alert Banner if any */}
      {varianceCount > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{varianceCount} processing lot(s)</strong> {selectedMonth ? `in ${selectedMonth}` : 'recorded'} exceeded the standard slab weight tolerance band.
            </span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('prod-reports')}
              className="text-xs font-bold text-amber-800 underline hover:text-amber-950 shrink-0"
            >
              View in Exception Report →
            </button>
          )}
        </div>
      )}

      {/* 2. RECENT PROCESSING DAYS CAROUSEL (Strict Requirement 2: recent processing days) */}
      <Carousel
        title="Recent Processing Days"
        subtitle="Daily factory operations with processed weights, slab packaging numbers, and rejection rates."
        icon={Calendar}
        badge={
          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
            {recentDaysList.length} Operating Days
          </span>
        }
        style="peeking"
        depthEffect="subtle"
        cardWidthClass="w-[85%] sm:w-[48%] md:w-[32%] lg:w-[24%]"
        showIndicators={true}
        showArrows={true}
        showCount={true}
        emptyMessage="No processing days recorded for the selected period."
        viewAllLink={{
          label: 'View processing log',
          onClick: () => onNavigate && onNavigate('processing-log'),
          showEndCard: true,
          endCardTitle: 'Full Processing Log',
          endCardDescription: 'Search and audit all daily shifts, raw supplier batches, and finished frozen slabs.'
        }}
        items={recentDaysList}
        renderItem={(d) => {
          const dayTotal = d.weight + d.rejection;
          const rejRate = dayTotal > 0 ? (d.rejection / dayTotal) * 100 : 0;
          return (
            <div
              onClick={() => onNavigate && onNavigate('processing-log')}
              className="h-full min-h-[160px] p-4 sm:p-5 rounded-2xl glass-surface-regular hover:bg-white border border-gray-100 hover:border-amber-300 cursor-pointer transition flex flex-col justify-between group shadow-2xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink-900 bg-gray-100 px-2.5 py-0.5 rounded-md">
                    <Calendar className="w-3 h-3 text-amber-700" />
                    {d.date}
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Day {d.day}
                  </span>
                </div>
                <div>
                  <h5 className="font-extrabold text-sm text-ink-900 group-hover:text-amber-800 transition">
                    {formatKg(d.weight)}
                  </h5>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Finished packed: <strong className="text-ink-800">{d.slabs.toLocaleString()} Slabs</strong>
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                <span className="text-ink-500 text-[11px]">Rejection: {formatKg(d.rejection)}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    rejRate > 5
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {rejRate.toFixed(1)}% Rej
                </span>
              </div>
            </div>
          );
        }}
      />

      {/* 3. GRADE AND SIZE SUMMARY CARDS CAROUSEL (Strict Requirement 3: Grade and Size summary cards) */}
      <Carousel
        title="Grade &amp; Commercial Size Summary"
        subtitle="Proportional output split across quality sorting grades and size classifications."
        icon={Layers}
        badge={
          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
            {topGrades.length + topSizes.length} Classes
          </span>
        }
        style="peeking"
        depthEffect="subtle"
        cardWidthClass="w-[85%] sm:w-[48%] md:w-[32%] lg:w-[24%]"
        showIndicators={true}
        showArrows={true}
        showCount={true}
        emptyMessage="No grade or size output recorded for this selection."
        viewAllLink={{
          label: 'View grade breakdown in reports',
          onClick: () => onNavigate && onNavigate('prod-reports'),
          showEndCard: true,
          endCardTitle: 'Grade & Size Analysis',
          endCardDescription: 'Inspect quality classifications, slab count tolerances, and recovery yields.'
        }}
        items={[
          ...topGrades.map((g) => ({ ...g, type: 'Quality Grade' as const })),
          ...topSizes.map((s) => ({ ...s, type: 'Commercial Size' as const }))
        ]}
        renderItem={(item) => (
          <div
            onClick={() => onNavigate && onNavigate('prod-reports')}
            className="h-full min-h-[160px] p-4 sm:p-5 rounded-2xl glass-surface-regular hover:bg-white border border-gray-100 hover:border-rose-200 cursor-pointer transition flex flex-col justify-between group shadow-2xs"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    item.type === 'Quality Grade'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {item.type}
                </span>
                <span className="font-extrabold text-xs text-rose-700 font-mono">
                  {item.pct.toFixed(1)}%
                </span>
              </div>
              <div>
                <h5 className="font-extrabold text-sm text-ink-900 group-hover:text-rose-700 transition truncate">
                  {item.name}
                </h5>
                <p className="text-xs text-ink-500 mt-0.5">
                  Processed output: <strong className="text-ink-800">{formatKg(item.weight)}</strong>
                </p>
              </div>
            </div>

            <div className="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between gap-2">
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    item.type === 'Quality Grade' ? 'bg-rose-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, item.pct)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      />

      {/* 4. DASHBOARD CHARTS AS SLIDES (Strict Requirement 4: dashboard charts as slides) */}
      <Carousel
        title="Production Analytics &amp; Yield Intelligence"
        subtitle="Swipe through graphical throughput trends, supplier shares, species recovery, and grade spreads."
        icon={BarChart3}
        badge={
          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
            4 Interactive Slides
          </span>
        }
        style="peeking"
        depthEffect="subtle"
        cardWidthClass="w-[96%] sm:w-[78%] lg:w-[48.5%]"
        showIndicators={true}
        showArrows={true}
        showCount={true}
        viewAllLink={{
          label: 'Open production reports hub',
          onClick: () => onNavigate && onNavigate('prod-reports'),
          showEndCard: true,
          endCardTitle: 'Production Reports Hub',
          endCardDescription: 'Dive into all factory floor logs, yield recovery percentages, and exception tracking.'
        }}
      >
        {/* Slide 1: Daily Production Volume Trend */}
        <ChartSlideCard
          title="Daily Output Trend (Kg)"
          subtitle={selectedMonth ? `Kilograms processed per day in ${selectedMonth}` : 'Kilograms processed across all operating days'}
          icon={TrendingUp}
          activeFilters={activeFilterTags}
          badge={
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
              Peak: {formatKg(maxDailyWeight)}
            </span>
          }
          viewAllLink={{
            label: 'View shift performance',
            onClick: () => onNavigate && onNavigate('prod-reports')
          }}
        >
          {daysInMonth.length === 0 ? (
            <div className="py-12 text-center text-ink-500 text-xs">No records available for this selection.</div>
          ) : (
            <div className="h-44 flex items-end gap-2 pt-4 border-b border-gray-100 overflow-x-auto">
              {daysInMonth.map((d) => {
                const heightPct = Math.max(8, (d.weight / maxDailyWeight) * 100);
                return (
                  <div key={d.date} className="flex-1 min-w-[24px] flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-ink-900 text-white text-[10px] py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap transition-opacity z-10 font-mono">
                      {d.date}: {formatKg(d.weight)}
                    </div>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-md hover:brightness-110 transition cursor-pointer"
                    />
                    <span className="text-[10px] text-ink-500 font-semibold">{d.day}</span>
                  </div>
                );
              })}
            </div>
          )}
        </ChartSlideCard>

        {/* Slide 2: Top Raw Suppliers */}
        <ChartSlideCard
          title="Top Raw Material Suppliers"
          subtitle="Processed volume distribution across suppliers"
          icon={Users}
          activeFilters={activeFilterTags}
          viewAllLink={{
            label: 'View supplier processing log',
            onClick: () => onNavigate && onNavigate('processing-log')
          }}
        >
          {topSuppliers.length === 0 ? (
            <div className="py-12 text-center text-ink-500 text-xs">No supplier records available.</div>
          ) : (
            <div className="space-y-3">
              {topSuppliers.slice(0, 5).map((supp, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-ink-900">
                    <span className="truncate max-w-[220px]">{supp.name}</span>
                    <span className="text-rose-700 font-mono font-bold">{supp.pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-600 h-full rounded-full" style={{ width: `${supp.pct}%` }} />
                  </div>
                  <div className="text-[10px] text-ink-500 text-right">{formatKg(supp.weight)}</div>
                </div>
              ))}
            </div>
          )}
        </ChartSlideCard>

        {/* Slide 3: Product / Species Output Share */}
        <ChartSlideCard
          title="Product / Species Output Share"
          subtitle="Variety breakdown of finished packed seafood"
          icon={Fish}
          activeFilters={activeFilterTags}
          badge={<span className="text-[11px] font-semibold text-ink-500">{topSpecies.length} varieties</span>}
          viewAllLink={{
            label: 'View product reports',
            onClick: () => onNavigate && onNavigate('prod-reports')
          }}
        >
          {topSpecies.length === 0 ? (
            <div className="py-12 text-center text-ink-500 text-xs">No varieties recorded.</div>
          ) : (
            <div className="space-y-2.5">
              {topSpecies.slice(0, 5).map((sp, idx) => (
                <div key={idx} className="p-2.5 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-ink-900 block truncate max-w-[220px]">{sp.name}</span>
                    <span className="text-[10px] text-ink-500">{formatKg(sp.weight)}</span>
                  </div>
                  <span className="font-extrabold text-rose-700 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                    {sp.pct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartSlideCard>

        {/* Slide 4: Quality Grade Distribution */}
        <ChartSlideCard
          title="Quality Grade Distribution"
          subtitle="Factory output grouped by quality standards"
          icon={Layers}
          activeFilters={activeFilterTags}
          badge={<span className="text-[11px] font-semibold text-ink-500">{topGrades.length} grades</span>}
          viewAllLink={{
            label: 'View grade reports',
            onClick: () => onNavigate && onNavigate('prod-reports')
          }}
        >
          {topGrades.length === 0 ? (
            <div className="py-12 text-center text-ink-500 text-xs">No grades recorded.</div>
          ) : (
            <div className="space-y-2.5">
              {topGrades.slice(0, 5).map((g, idx) => (
                <div key={idx} className="p-2.5 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-ink-900 block truncate max-w-[220px]">{g.name}</span>
                    <span className="text-[10px] text-ink-500">{formatKg(g.weight)}</span>
                  </div>
                  <span className="font-extrabold text-rose-700 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                    {g.pct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartSlideCard>
      </Carousel>

      {/* INTERACTIVE VISUAL CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Daily Production Output Trend (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-xs border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900">Daily Production Volume (Kg)</h3>
              <p className="text-[11px] text-ink-500">
                {selectedMonth ? `Processed kilograms landed per date in ${selectedMonth}` : 'Processed kilograms landed across all dates'}
              </p>
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
              Peak: {formatKg(maxDailyWeight)}
            </span>
          </div>

          {daysInMonth.length === 0 ? (
            <div className="py-16 text-center text-ink-500 text-xs">
              {selectedMonth ? `No processing transactions recorded for ${selectedMonth}.` : 'No processing transactions match the selected filters.'}
            </div>
          ) : (
            <div className="h-52 flex items-end gap-2 pt-6 pb-2 border-b border-gray-100 overflow-x-auto">
              {daysInMonth.map((d) => {
                const heightPct = Math.max(8, (d.weight / maxDailyWeight) * 100);
                return (
                  <div key={d.date} className="flex-1 min-w-[28px] flex flex-col items-center gap-1 group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 bg-ink-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap transition-opacity z-10 shadow-lg">
                      {d.date}: {formatKg(d.weight)}
                    </div>
                    {/* Bar */}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-md hover:brightness-110 transition cursor-pointer"
                    />
                    {/* Date label */}
                    <span className="text-[10px] text-ink-500 font-semibold">{d.day}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 2: Top Raw Material Suppliers */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900">Top Raw Suppliers</h3>
            <p className="text-[11px] text-ink-500">By share of total processed volume</p>
          </div>

          {topSuppliers.length === 0 ? (
            <div className="py-16 text-center text-ink-500 text-xs">
              {selectedMonth ? 'No supplier data for this month.' : 'No supplier data recorded.'}
            </div>
          ) : (
            <div className="space-y-3">
              {topSuppliers.map((supp, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-ink-900">
                    <span className="line-clamp-1">{supp.name}</span>
                    <span className="text-rose-700">{supp.pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-600 h-full rounded-full"
                      style={{ width: `${supp.pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-ink-500 text-right">{formatKg(supp.weight)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECOND ROW OF CHARTS: Species & Grade Distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Product / Species Share */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900">Product / Species Share</h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-500">{topSpecies.length} varieties</span>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('prod-reports')}
                  className="text-[11px] font-bold text-rose-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                  title="View detailed product breakdown in Production Reports"
                >
                  <span>Reports</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {topSpecies.length === 0 ? (
            <div className="py-8 text-center text-ink-500 text-xs">No records available.</div>
          ) : (
            <div className="space-y-2.5">
              {topSpecies.map((sp, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-ink-900 block">{sp.name}</span>
                    <span className="text-[10px] text-ink-500">{formatKg(sp.weight)}</span>
                  </div>
                  <span className="font-extrabold text-rose-700 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                    {sp.pct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quality Grade Distribution */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900">Quality Grade Distribution</h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-500">{topGrades.length} grades</span>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('prod-reports')}
                  className="text-[11px] font-bold text-rose-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                  title="View detailed grade breakdown in Production Reports"
                >
                  <span>Reports</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {topGrades.length === 0 ? (
            <div className="py-8 text-center text-ink-500 text-xs">No records available.</div>
          ) : (
            <div className="space-y-2.5">
              {topGrades.map((g, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-ink-900 block">{g.name}</span>
                    <span className="text-[10px] text-ink-500">{formatKg(g.weight)}</span>
                  </div>
                  <span className="font-extrabold text-rose-700 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                    {g.pct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
