import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatKg } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
import { BentoCard } from '../common/BentoCard';
import { MultiSelectFilter } from '../common/MultiSelectFilter';
import {
  Calendar,
  AlertTriangle,
  PlusCircle,
  Fish,
  Users,
  Layers,
  Filter,
  X,
  ArrowUpRight
} from 'lucide-react';

export const ProductionDashboard: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { processingEntries, suppliers, species, grades } = useData();

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState<string[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);

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
    species.forEach((sp) => {
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

  // Comprehensive Options for MultiSelectFilter (Registered Master + Distinct Historical Entry Species)
  const speciesOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { id: string; label: string; subLabel?: string; badge?: string }[] = [];

    // 1. Registered Master Species
    species.forEach((sp) => {
      seen.add(sp.id.toLowerCase());
      seen.add(sp.name.trim().toLowerCase());
      if (sp.code) seen.add(sp.code.trim().toLowerCase());
      options.push({
        id: sp.id,
        label: sp.name,
        subLabel: sp.scientificName || (sp.category ? sp.category : undefined),
        badge: sp.code || (sp.rawSpeciesName ? sp.rawSpeciesName : undefined)
      });
    });

    // 2. Any additional distinct species found in existing processingEntries
    processingEntries.forEach((p) => {
      const rawId = (p.speciesId || '').trim();
      if (!rawId) return;
      const lower = rawId.toLowerCase();
      if (!seen.has(lower)) {
        const matched = findSpecies(rawId);
        if (matched) {
          seen.add(matched.id.toLowerCase());
          seen.add(matched.name.trim().toLowerCase());
          if (!options.some((o) => o.id === matched.id)) {
            options.push({
              id: matched.id,
              label: matched.name,
              subLabel: matched.scientificName || undefined,
              badge: matched.code || undefined
            });
          }
        } else {
          seen.add(lower);
          options.push({
            id: rawId,
            label: rawId,
            badge: 'Recorded'
          });
        }
      }
    });

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [species, processingEntries, findSpecies]);

  const resolveSpeciesName = (spId: string): string => {
    if (!spId) return 'Unspecified Product';
    const direct = speciesMap.get(spId);
    if (direct) return direct.name;
    const found = findSpecies(spId);
    if (found) return found.name;
    const opt = speciesOptions.find((o) => o.id === spId);
    if (opt) return opt.label;
    return spId;
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

        const matchesSpecies = selectedSpeciesIds.some((selectedId) => {
          // Direct ID match
          if (rawEntrySpId === selectedId) return true;
          if (rawEntrySpId.toLowerCase() === selectedId.toLowerCase()) return true;

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
            if (optLabel === entrySpName || optLabel === rawEntrySpId.toLowerCase()) return true;
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
        const matchesSpecies = selectedSpeciesIds.some((selectedId) => {
          if (rawEntrySpId === selectedId || rawEntrySpId.toLowerCase() === selectedId.toLowerCase()) return true;
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
              placeholder="Search species..."
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
