import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { formatKg } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
import { BentoCard } from '../common/BentoCard';
import {
  Factory,
  Calendar,
  AlertTriangle,
  PlusCircle
} from 'lucide-react';

export const ProductionDashboard: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { processingEntries, suppliers, species, grades } = useData();

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  const activeEntries = processingEntries.filter(
    (p) => !p.isVoided && p.processingDate.startsWith(selectedMonth)
  );

  // Lookups
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
  const speciesMap = new Map(species.map((sp) => [sp.id, sp]));
  const gradeMap = new Map(grades.map((g) => [g.id, g]));

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

  // Prior month comparison
  const [currY, currM] = selectedMonth.split('-').map(Number);
  const priorMonthStr = `${currM === 1 ? currY - 1 : currY}-${String(currM === 1 ? 12 : currM - 1).padStart(2, '0')}`;
  const priorMonthEntries = processingEntries.filter((p) => !p.isVoided && p.processingDate.startsWith(priorMonthStr));
  const priorMonthTotalKg = priorMonthEntries.reduce((s, p) => s + p.processedWeightKg, 0);
  const momChangePct = priorMonthTotalKg > 0 ? ((totalProcessedKg - priorMonthTotalKg) / priorMonthTotalKg) * 100 : 0;

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
    speciesBreakdownMap.set(p.speciesId, (speciesBreakdownMap.get(p.speciesId) || 0) + p.processedWeightKg);
  });
  const topSpecies = Array.from(speciesBreakdownMap.entries())
    .map(([spId, wt]) => ({
      name: speciesMap.get(spId)?.name || 'Unknown',
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

      {/* STICKY MONTH SELECTOR & SUMMARY BAR (Liquid Glass Surface) */}
      <div className="sticky top-16 z-20 glass-surface-thin p-4 rounded-2xl border border-white/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-ink-900">
          <Factory className="w-4 h-4 text-rose-600" />
          <span>Plant Floor Calendar:</span>
          <span className="font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            {selectedMonth}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl font-semibold">
            <Calendar className="w-3.5 h-3.5 text-rose-600" />
            <span>Select Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-ink-900 outline-none cursor-pointer"
            />
          </div>

          <div className="text-[11px] font-semibold text-ink-500 hidden sm:block">
            Prior month: <strong className="font-mono">{priorMonthStr}</strong> ({formatKg(priorMonthTotalKg)})
          </div>
        </div>
      </div>

      {/* BENTO-STYLE KPI CARDS WITH CAPTIONS & LINKS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <BentoCard
          label="Total Production"
          value={formatKg(totalProcessedKg)}
          caption="Finished packed output"
          linkText="View lot details"
          onLinkClick={() => onNavigate && onNavigate('processing-log')}
          variant="highlight"
          trend={{
            value: `${momChangePct >= 0 ? '+' : ''}${momChangePct.toFixed(1)}% MoM`,
            isPositive: momChangePct >= 0
          }}
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
          caption={`Active in ${selectedMonth}`}
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
              <strong>{varianceCount} processing lot(s)</strong> in {selectedMonth} exceeded the standard slab weight tolerance band.
            </span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('reports')}
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
              <p className="text-[11px] text-ink-500">Processed kilograms landed per date in {selectedMonth}</p>
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
              Peak: {formatKg(maxDailyWeight)}
            </span>
          </div>

          {daysInMonth.length === 0 ? (
            <div className="py-16 text-center text-ink-500 text-xs">
              No processing transactions recorded for {selectedMonth}.
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
            <div className="py-16 text-center text-ink-500 text-xs">No supplier data for this month.</div>
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
            <span className="text-[11px] text-ink-500">{topSpecies.length} varieties</span>
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
            <span className="text-[11px] text-ink-500">{topGrades.length} grades</span>
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
