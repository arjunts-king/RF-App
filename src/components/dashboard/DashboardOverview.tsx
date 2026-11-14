import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, formatKg, formatCroreINR } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
import { MultiSelectFilter } from '../common/MultiSelectFilter';
import { NavTab } from '../common/Sidebar';
import {
  Scale,
  DollarSign,
  TrendingUp,
  Layers,
  Clock,
  Users,
  Filter,
  PieChart,
  BarChart3,
  X,
  ArrowRight,
  PlusCircle,
  Fish,
  Anchor
} from 'lucide-react';

interface DashboardOverviewProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigateTab }) => {
  const { purchases, suppliers, purchaseSpecies, locations, expenseTypes } = useData();

  // Dashboard Multiple Filters (all combinable)
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState<string[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState('');

  const speciesMap = useMemo(() => new Map(purchaseSpecies.map((sp) => [sp.id, sp])), [purchaseSpecies]);

  // Robust species resolver across ID, code, name, rawSpeciesName, scientificName
  const findSpecies = useMemo(() => {
    const byId = new Map(purchaseSpecies.map((sp) => [sp.id.toLowerCase(), sp]));
    const byCode = new Map(purchaseSpecies.map((sp) => [sp.code.toLowerCase(), sp]));
    const byName = new Map(purchaseSpecies.map((sp) => [sp.name.trim().toLowerCase(), sp]));
    const byRaw = new Map<string, (typeof purchaseSpecies)[0]>();
    purchaseSpecies.forEach((sp) => {
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
        purchaseSpecies.find(
          (sp) =>
            sp.id.toLowerCase() === lower ||
            sp.code.toLowerCase() === lower ||
            sp.name.toLowerCase() === lower ||
            (sp.rawSpeciesName && sp.rawSpeciesName.toLowerCase() === lower) ||
            (sp.scientificName && sp.scientificName.toLowerCase() === lower)
        )
      );
    };
  }, [purchaseSpecies]);

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

  // Purchase-Only Species Options for MultiSelectFilter:
  // Strictly includes ONLY species that have been purchased / uploaded through Excel.
  // Displays authentic purchase/raw species names (e.g. "Mackerel", "Ribbonfish Net") rather than export sales product names.
  // Replaces any auto-generated IDs/labels ("auto uploaded", "sp-auto-...") with the genuine species name.
  const speciesOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { id: string; label: string; subLabel?: string }[] = [];

    // When purchases exist, strictly derive options from purchases uploaded through Excel
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
      // In initial state before any purchases are recorded/uploaded, show registered raw purchase species (never sales products)
      purchaseSpecies.forEach((sp) => {
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

  const resolveSpeciesName = (spId: string): string => {
    if (!spId) return 'Unspecified Species';
    const opt = speciesOptions.find((o) => o.id === spId || o.label.toLowerCase() === spId.toLowerCase());
    if (opt) return opt.label;
    const direct = speciesMap.get(spId);
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
    if (!isAutoString(spId) && !spId.startsWith('prd-') && !spId.startsWith('sp-')) {
      return spId.replace(/^Frozen\s+/i, '').trim();
    }
    return 'Raw Material';
  };

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (p.isVoided) return false;

      // Robust Supplier Filter
      if (selectedSupplierIds.length > 0) {
        const rawSuppId = (p.supplierId || '').trim().toLowerCase();
        const matchesSupplier = selectedSupplierIds.some((selId) => {
          if (rawSuppId === selId.toLowerCase()) return true;
          const supp = suppliers.find((s) => s.id === selId || s.code === selId);
          if (supp) {
            if (rawSuppId === supp.id.toLowerCase()) return true;
            if (rawSuppId === supp.code.toLowerCase()) return true;
            if (rawSuppId === supp.name.trim().toLowerCase()) return true;
          }
          return false;
        });
        if (!matchesSupplier) return false;
      }

      // Robust Species Filter: Multi-key matching supporting direct ID, code, name, rawSpeciesName, scientificName
      if (selectedSpeciesIds.length > 0) {
        const rawEntrySpId = (p.speciesId || '').trim();
        const entrySp = findSpecies(rawEntrySpId);
        const entrySpName = (entrySp?.name || rawEntrySpId).trim().toLowerCase();
        const entrySpCode = (entrySp?.code || '').trim().toLowerCase();
        const entrySpRaw = (entrySp?.rawSpeciesName || '').trim().toLowerCase();
        const entrySpSci = (entrySp?.scientificName || '').trim().toLowerCase();

        const entryRawName = getRawPurchaseSpeciesName(rawEntrySpId, p).label.trim().toLowerCase();

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
            if (selSp.scientificName && rawEntrySpId.toLowerCase() === selSp.scientificName.trim().toLowerCase()) return true;

            if (entrySpName && entrySpName === selSp.name.trim().toLowerCase()) return true;
            if (entrySpCode && entrySpCode === selSp.code.toLowerCase()) return true;
            if (entrySpRaw && selSp.rawSpeciesName && entrySpRaw === selSp.rawSpeciesName.trim().toLowerCase()) return true;

            const selRawName = (selSp.rawSpeciesName || selSp.name).replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim().toLowerCase();
            if (entryRawName && entryRawName === selRawName) return true;
          }

          // Match selected ID against entry species object properties
          if (entrySp) {
            const selLower = selectedId.trim().toLowerCase();
            if (selLower === entrySp.id.toLowerCase()) return true;
            if (selLower === entrySpCode) return true;
            if (selLower === entrySpName) return true;
            if (entrySpRaw && selLower === entrySpRaw) return true;
            if (entrySpSci && selLower === entrySpSci) return true;
          }

          // Check selected option label
          const selOpt = speciesOptions.find((o) => o.id === selectedId);
          if (selOpt) {
            const optLabel = selOpt.label.trim().toLowerCase();
            if (optLabel === entrySpName || optLabel === rawEntrySpId.toLowerCase()) return true;
            if (optLabel === entryRawName) return true;
            if (entrySpRaw && optLabel.includes(entrySpRaw)) return true;
          }

          return false;
        });

        if (!matchesSpecies) return false;
      }

      // Robust Location Filter
      if (selectedLocationIds.length > 0) {
        const rawLocId = (p.locationId || '').trim().toLowerCase();
        const matchesLoc = selectedLocationIds.some((selId) => {
          if (rawLocId === selId.toLowerCase()) return true;
          const loc = locations.find((l) => l.id === selId || l.code === selId);
          if (loc) {
            if (rawLocId === loc.id.toLowerCase()) return true;
            if (rawLocId === loc.code.toLowerCase()) return true;
            if (rawLocId === loc.name.trim().toLowerCase()) return true;
          }
          return false;
        });
        if (!matchesLoc) return false;
      }

      // Date / Month Filter
      if (dateFilter) {
        if (p.purchaseDate !== dateFilter && !p.purchaseDate.startsWith(dateFilter)) return false;
      }

      return true;
    });
  }, [purchases, selectedSupplierIds, selectedSpeciesIds, selectedLocationIds, dateFilter, findSpecies, speciesOptions, suppliers, locations]);

  // Memoized KPI Calculations
  const kpis = useMemo(() => {
    const totalWeight = filteredPurchases.reduce((s, p) => s + p.weightKg, 0);
    const totalPurchaseValue = filteredPurchases.reduce((s, p) => s + p.purchaseValue, 0);
    const totalCost = filteredPurchases.reduce((s, p) => s + p.totalCost, 0);
    const totalExpenses = filteredPurchases.reduce((s, p) => s + p.totalExpenses, 0);
    const totalOutstanding = filteredPurchases.reduce((s, p) => s + p.balancePayable, 0);

    const avgRate = totalWeight > 0 ? totalPurchaseValue / totalWeight : 0;
    const effectiveCostPerKg = totalWeight > 0 ? totalCost / totalWeight : 0;
    const activeSupplierCount = new Set(filteredPurchases.map((p) => p.supplierId)).size;

    return {
      totalWeight,
      totalPurchaseValue,
      totalCost,
      totalExpenses,
      totalOutstanding,
      avgRate,
      effectiveCostPerKg,
      activeSupplierCount
    };
  }, [filteredPurchases]);

  const {
    totalWeight,
    totalPurchaseValue,
    totalCost,
    totalExpenses,
    totalOutstanding,
    avgRate,
    effectiveCostPerKg,
    activeSupplierCount
  } = kpis;

  // Charts 1, 2, 3: Single-pass O(P) grouping accumulator instead of repeated O(N * M) filtering
  const { speciesData, expenseBreakdownData, supplierOutstandingData } = useMemo(() => {
    const spAccumulator = new Map<string, { name: string; weight: number; cost: number }>();
    const expMap = new Map<string, number>();
    const suppMap = new Map<string, number>();

    for (const p of filteredPurchases) {
      if (p.speciesId) {
        const resolvedName = resolveSpeciesName(p.speciesId);
        const cur = spAccumulator.get(resolvedName) || { name: resolvedName, weight: 0, cost: 0 };
        cur.weight += p.weightKg || 0;
        cur.cost += p.totalCost || 0;
        spAccumulator.set(resolvedName, cur);
      }
      if (p.expenseBreakdown) {
        for (const [expId, amt] of Object.entries(p.expenseBreakdown)) {
          if (amt) {
            expMap.set(expId, (expMap.get(expId) || 0) + amt);
          }
        }
      }
      if (p.supplierId && (p.balancePayable || 0) > 0) {
        suppMap.set(p.supplierId, (suppMap.get(p.supplierId) || 0) + (p.balancePayable || 0));
      }
    }

    const speciesList = Array.from(spAccumulator.values())
      .filter((d) => d.weight > 0)
      .sort((a, b) => b.weight - a.weight);

    const expenseList = expenseTypes
      .map((exp) => ({ name: exp.name, total: expMap.get(exp.id) || 0 }))
      .filter((d) => d.total > 0);

    const supplierList = suppliers
      .map((supp) => ({ name: supp.name, outstanding: suppMap.get(supp.id) || 0 }))
      .filter((d) => d.outstanding > 0);

    return {
      speciesData: speciesList,
      expenseBreakdownData: expenseList,
      supplierOutstandingData: supplierList
    };
  }, [filteredPurchases, expenseTypes, suppliers, speciesMap, findSpecies, speciesOptions]);

  const hasActiveFilters = Boolean(
    dateFilter ||
    selectedSupplierIds.length > 0 ||
    selectedSpeciesIds.length > 0 ||
    selectedLocationIds.length > 0
  );

  const clearAllFilters = () => {
    setDateFilter('');
    setSelectedSupplierIds([]);
    setSelectedSpeciesIds([]);
    setSelectedLocationIds([]);
  };

  // Options for MultiSelectFilter
  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ id: s.id, label: s.name, subLabel: s.district ? `${s.district}, ${s.state}` : s.state || s.code || undefined })),
    [suppliers]
  );

  const locationOptions = useMemo(
    () => locations.map((l) => ({ id: l.id, label: l.name, subLabel: l.state || undefined })),
    [locations]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. FIGMA-STYLE HEADLINE-FIRST PAGE OPENING */}
      <PageHeader
        title="Procurement dashboard"
        description="Real-time operational intelligence across harbour landings, weighments, direct landing expenses, and outstanding supplier payables."
        badge={`${filteredPurchases.length} Batches`}
        primaryAction={
          onNavigateTab
            ? {
                label: 'New harbour purchase',
                icon: PlusCircle,
                onClick: () => onNavigateTab('purchase-entry')
              }
            : undefined
        }
        secondaryActions={[
          {
            label: 'View transactions',
            onClick: () => onNavigateTab && onNavigateTab('purchases')
          },
          {
            label: 'Supplier ledger',
            onClick: () => onNavigateTab && onNavigateTab('payments')
          }
        ]}
      />

      {/* 2. CLEAN STICKY FILTER BAR WITH MULTI-SELECT FILTERS & REMOVABLE FILTER CHIPS (Liquid Glass Surface) */}
      <div className="sticky top-16 z-30 glass-surface-thin p-4 rounded-2xl border border-white/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-ink-900 font-bold">
            <Filter className="w-4 h-4 text-rose-600" />
            <span>Dashboard Multi-Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-rose-600 transition text-xs"
                title="Filter by Purchase Date"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-ink-700 transition"
                  title="View all dates"
                >
                  All Dates
                </button>
              )}
            </div>

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
              label="Species"
              options={speciesOptions}
              selectedIds={selectedSpeciesIds}
              onChange={setSelectedSpeciesIds}
              icon={Fish}
              badgeColor="blue"
              placeholder="Search species..."
            />

            <MultiSelectFilter
              label="Harbours"
              options={locationOptions}
              selectedIds={selectedLocationIds}
              onChange={setSelectedLocationIds}
              icon={Anchor}
              badgeColor="emerald"
              placeholder="Search harbours..."
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

            {dateFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-ink-800 border border-gray-200">
                <span>Date: {dateFilter}</span>
                <button onClick={() => setDateFilter('')} className="hover:text-rose-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedSupplierIds.map((id) => {
              const supp = suppliers.find((s) => s.id === id);
              if (!supp) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200"
                >
                  <span>Supplier: {supp.name}</span>
                  <button
                    onClick={() => setSelectedSupplierIds(selectedSupplierIds.filter((item) => item !== id))}
                    className="hover:text-rose-950"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

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
                    title="Remove species filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {selectedLocationIds.map((id) => {
              const loc = locations.find((l) => l.id === id);
              if (!loc) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  <span>Harbour: {loc.name}</span>
                  <button
                    onClick={() => setSelectedLocationIds(selectedLocationIds.filter((item) => item !== id))}
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

      {/* 3. BENTO-STYLE GRID OF ROUNDED KPI CARDS WITH CAPTIONS & REPORT LINKS (Liquid Glass Polish, 100-Crore Aligned) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {/* KPI 1: Total Volume */}
        <div className="glass-surface-regular card-liquid-hover p-4 sm:p-5 rounded-2xl border border-white/80 shadow-xs flex flex-col justify-between h-full min-w-0 overflow-hidden">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-ink-500 block truncate min-w-0" title="Total Volume">
                Total Volume
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                <span
                  className={`font-black font-mono tracking-tight whitespace-nowrap tabular-nums block truncate max-w-full ${
                    formatKg(totalWeight).length > 18 ? 'text-base sm:text-lg' : formatKg(totalWeight).length > 14 ? 'text-lg sm:text-xl' : formatKg(totalWeight).length > 10 ? 'text-xl sm:text-2xl' : 'text-2xl'
                  } text-ink-900`}
                  title={formatKg(totalWeight)}
                >
                  {formatKg(totalWeight)}
                </span>
              </div>
              <p className="text-[11px] text-ink-500 leading-snug line-clamp-1" title="Weighed landings across all centres">
                Weighed landings across all centres
              </p>
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-gray-50">
            <button
              onClick={() => onNavigateTab && onNavigateTab('reports')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 group truncate max-w-full"
            >
              <span className="truncate">View daily landing report</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </div>

        {/* KPI 2: Raw Purchase Value */}
        <div className="glass-surface-regular card-liquid-hover p-4 sm:p-5 rounded-2xl border border-white/80 shadow-xs flex flex-col justify-between h-full min-w-0 overflow-hidden">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-ink-500 block truncate min-w-0" title="Raw Purchase Value">
                Raw Purchase Value
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                <span
                  className={`font-black font-mono tracking-tight whitespace-nowrap tabular-nums block truncate max-w-full ${
                    formatINR(totalPurchaseValue).length > 18 ? 'text-base sm:text-lg' : formatINR(totalPurchaseValue).length > 14 ? 'text-lg sm:text-xl' : formatINR(totalPurchaseValue).length > 10 ? 'text-xl sm:text-2xl' : 'text-2xl'
                  } text-ink-900`}
                  title={formatINR(totalPurchaseValue)}
                >
                  {formatINR(totalPurchaseValue)}
                </span>
                {totalPurchaseValue >= 10000000 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    {formatCroreINR(totalPurchaseValue)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-500 leading-snug line-clamp-1" title="Pre-expense base procurement cost">
                Pre-expense base procurement cost
              </p>
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-gray-50">
            <button
              onClick={() => onNavigateTab && onNavigateTab('purchases')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 group truncate max-w-full"
            >
              <span className="truncate">View purchase transactions</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </div>

        {/* KPI 3: Final Landed Cost */}
        <div className="glass-surface-blush card-liquid-hover p-4 sm:p-5 rounded-2xl border border-rose-200/80 shadow-xs flex flex-col justify-between h-full min-w-0 overflow-hidden">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-800 block truncate min-w-0" title="Final Landed Cost">
                Final Landed Cost
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                <span
                  className={`font-black font-mono tracking-tight whitespace-nowrap tabular-nums block truncate max-w-full ${
                    formatINR(totalCost).length > 18 ? 'text-base sm:text-lg' : formatINR(totalCost).length > 14 ? 'text-lg sm:text-xl' : formatINR(totalCost).length > 10 ? 'text-xl sm:text-2xl' : 'text-2xl'
                  } text-rose-700`}
                  title={formatINR(totalCost)}
                >
                  {formatINR(totalCost)}
                </span>
                {totalCost >= 10000000 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                    {formatCroreINR(totalCost)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-rose-900/70 leading-snug line-clamp-1" title="Includes base cost minus damage + all expenses">
                Includes base cost minus damage + all expenses
              </p>
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-rose-100">
            <button
              onClick={() => onNavigateTab && onNavigateTab('reports')}
              className="text-xs font-bold text-rose-800 hover:text-rose-950 inline-flex items-center gap-1 group truncate max-w-full"
            >
              <span className="truncate">View consolidated monthly audit</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </div>

        {/* KPI 4: Direct Expenses */}
        <div className="glass-surface-regular card-liquid-hover p-4 sm:p-5 rounded-2xl border border-white/80 shadow-xs flex flex-col justify-between h-full min-w-0 overflow-hidden">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-ink-500 block truncate min-w-0" title="Direct Expenses">
                Direct Expenses
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                <span
                  className={`font-black font-mono tracking-tight whitespace-nowrap tabular-nums block truncate max-w-full ${
                    formatINR(totalExpenses).length > 18 ? 'text-base sm:text-lg' : formatINR(totalExpenses).length > 14 ? 'text-lg sm:text-xl' : formatINR(totalExpenses).length > 10 ? 'text-xl sm:text-2xl' : 'text-2xl'
                  } text-ink-900`}
                  title={formatINR(totalExpenses)}
                >
                  {formatINR(totalExpenses)}
                </span>
                {totalExpenses >= 10000000 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    {formatCroreINR(totalExpenses)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-500 leading-snug line-clamp-1" title="Ice, transport, dalali & harbour labour">
                Ice, transport, dalali &amp; harbour labour
              </p>
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-gray-50">
            <button
              onClick={() => onNavigateTab && onNavigateTab('batch-expenses')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 group truncate max-w-full"
            >
              <span className="truncate">View shared batch expense pools</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </div>

        {/* KPI 5: Average Buy Rate */}
        <div className="glass-surface-regular card-liquid-hover p-4 sm:p-5 rounded-2xl border border-white/80 shadow-xs flex flex-col justify-between h-full min-w-0 overflow-hidden">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-ink-500 block truncate min-w-0" title="Average Buy Rate">
                Average Buy Rate
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                <span
                  className="text-xl sm:text-2xl font-black text-ink-900 font-mono tracking-tight whitespace-nowrap tabular-nums block truncate max-w-full"
                  title={`₹${avgRate.toFixed(2)} / Kg`}
                >
                  ₹{avgRate.toFixed(2)} <span className="text-sm font-semibold text-ink-500">/ Kg</span>
                </span>
              </div>
              <p className="text-[11px] text-ink-500 leading-snug line-clamp-1" title="Volume-weighted raw buy rate">
                Volume-weighted raw buy rate
              </p>
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-gray-50">
            <button
              onClick={() => onNavigateTab && onNavigateTab('reports')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 group truncate max-w-full"
            >
              <span className="truncate">View species &amp; grade price variance</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </div>

        {/* KPI 6: Effective Landed Rate */}
        <div className="glass-surface-regular card-liquid-hover p-4 sm:p-5 rounded-2xl border border-white/80 shadow-xs flex flex-col justify-between h-full min-w-0 overflow-hidden">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-ink-500 block truncate min-w-0" title="Effective Landed Rate">
                Effective Landed Rate
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                <span
                  className="text-xl sm:text-2xl font-black text-rose-900 font-mono tracking-tight whitespace-nowrap tabular-nums block truncate max-w-full"
                  title={`₹${effectiveCostPerKg.toFixed(2)} / Kg`}
                >
                  ₹{effectiveCostPerKg.toFixed(2)} <span className="text-sm font-semibold text-ink-500">/ Kg</span>
                </span>
              </div>
              <p className="text-[11px] text-ink-500 leading-snug line-clamp-1" title="True landed unit cost per raw Kg">
                True landed unit cost per raw Kg
              </p>
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-gray-50">
            <button
              onClick={() => onNavigateTab && onNavigateTab('reports')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 group truncate max-w-full"
            >
              <span className="truncate">View cost matrix analysis</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </div>

        {/* KPI 7: Outstanding Payables */}
        <div className="glass-surface-regular card-liquid-hover p-4 sm:p-5 rounded-2xl border border-white/80 shadow-xs flex flex-col justify-between h-full min-w-0 overflow-hidden">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-ink-500 block truncate min-w-0" title="Outstanding Payables">
                Outstanding Payables
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                <span
                  className={`font-black font-mono tracking-tight whitespace-nowrap tabular-nums block truncate max-w-full ${
                    formatINR(totalOutstanding).length > 18 ? 'text-base sm:text-lg' : formatINR(totalOutstanding).length > 14 ? 'text-lg sm:text-xl' : formatINR(totalOutstanding).length > 10 ? 'text-xl sm:text-2xl' : 'text-2xl'
                  } text-rose-700`}
                  title={formatINR(totalOutstanding)}
                >
                  {formatINR(totalOutstanding)}
                </span>
                {totalOutstanding >= 10000000 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                    {formatCroreINR(totalOutstanding)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-500 leading-snug line-clamp-1" title="Unsettled dues to suppliers & boats">
                Unsettled dues to suppliers &amp; boats
              </p>
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-gray-50">
            <button
              onClick={() => onNavigateTab && onNavigateTab('outstanding')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 group truncate max-w-full"
            >
              <span className="truncate">View ageing buckets (180+d)</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </div>

        {/* KPI 8: Active Suppliers */}
        <div className="glass-surface-regular card-liquid-hover p-4 sm:p-5 rounded-2xl border border-white/80 shadow-xs flex flex-col justify-between h-full min-w-0 overflow-hidden">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-ink-500 block truncate min-w-0" title="Active Suppliers">
                Active Suppliers
              </span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                <span
                  className="text-xl sm:text-2xl font-black text-ink-900 font-mono tracking-tight whitespace-nowrap tabular-nums block truncate max-w-full"
                  title={String(activeSupplierCount)}
                >
                  {activeSupplierCount}
                </span>
              </div>
              <p className="text-[11px] text-ink-500 leading-snug line-clamp-1" title="Supplying boats, agents & farms">
                Supplying boats, agents &amp; farms
              </p>
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-gray-50">
            <button
              onClick={() => onNavigateTab && onNavigateTab('payments')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 group truncate max-w-full"
            >
              <span className="truncate">Open supplier ledger statement</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. CHARTS SITTING IN WHITE CARDS WITH CLEAR TITLES, SOFT SHADOWS & PALETTE COLORS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Species Volume Split */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-rose-600" />
              Species Volume Share
            </h3>
            <span className="text-[11px] font-semibold text-ink-500">Live Catch</span>
          </div>

          <div className="space-y-3 pt-2">
            {speciesData.length === 0 ? (
              <p className="text-xs text-ink-500 py-8 text-center italic">
                No purchase transactions recorded yet. Entries will show up here live.
              </p>
            ) : (
              speciesData.map((item) => {
                const weightPct = totalWeight > 0 ? (item.weight / totalWeight) * 100 : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="font-bold text-ink-900 line-clamp-1">{item.name}</span>
                      <span className="text-ink-500 text-[11px] font-mono whitespace-nowrap">
                        {formatKg(item.weight)} ({weightPct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${weightPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chart 2: Direct Expense Heads Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              Expense Head Breakdown
            </h3>
            <span className="text-[11px] font-bold text-ink-900 font-mono">Total: {formatINR(totalExpenses)}</span>
          </div>

          <div className="space-y-3 pt-2">
            {expenseBreakdownData.length === 0 ? (
              <p className="text-xs text-ink-500 py-8 text-center italic">
                No landing expenses recorded yet.
              </p>
            ) : (
              expenseBreakdownData.map((item) => {
                const expensePct = totalExpenses > 0 ? (item.total / totalExpenses) * 100 : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="font-bold text-ink-900 line-clamp-1">{item.name}</span>
                      <span className="text-ink-500 text-[11px] font-mono whitespace-nowrap">
                        {formatINR(item.total)} ({expensePct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${expensePct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chart 3: Outstanding Payables by Supplier */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-600" />
              Supplier Outstanding
            </h3>
            <span className="text-[11px] font-bold text-rose-700 font-mono">Total: {formatINR(totalOutstanding)}</span>
          </div>

          <div className="space-y-3 pt-2">
            {supplierOutstandingData.length === 0 ? (
              <p className="text-xs text-ink-500 py-8 text-center italic">
                All supplier purchase accounts are fully settled.
              </p>
            ) : (
              supplierOutstandingData.map((item) => {
                const outPct = totalOutstanding > 0 ? (item.outstanding / totalOutstanding) * 100 : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="font-bold text-ink-900 line-clamp-1">{item.name}</span>
                      <span className="text-rose-700 font-bold text-[11px] font-mono whitespace-nowrap">
                        {formatINR(item.outstanding)} ({outPct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-700 h-full rounded-full transition-all duration-300"
                        style={{ width: `${outPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
