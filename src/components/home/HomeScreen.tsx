import React from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatKg } from '../../utils/calculations';
import {
  ShoppingBag,
  Factory,
  TrendingUp,
  PlusCircle,
  Receipt,
  BookOpen,
  Clock,
  Sparkles,
  ArrowRight,
  Command,
  AlertTriangle,
  Scale,
  Calendar,
  Layers
} from 'lucide-react';

interface HomeScreenProps {
  onNavigate: (module: 'purchase' | 'production' | 'sales' | 'home', tab: string) => void;
  onOpenCommandPalette: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onOpenCommandPalette
}) => {
  const { currentUser, permissions } = useAuth();
  const {
    purchases,
    processingEntries,
    salesInvoices,
    suppliers,
    species,
    customers,
    businessSettings
  } = useData();

  // Lookups
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
  const speciesMap = new Map(species.map((sp) => [sp.id, sp]));
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  // Active records
  const activePurchases = purchases.filter((p) => !p.isVoided);
  const totalPurchaseVolume = activePurchases.reduce((s, p) => s + p.weightKg, 0);
  const totalPurchaseCost = activePurchases.reduce((s, p) => s + p.totalCost, 0);

  const activeProcessing = processingEntries.filter((p) => !p.isVoided);
  const totalProcessedKg = activeProcessing.reduce((s, p) => s + p.processedWeightKg, 0);
  const totalSlabs = activeProcessing.reduce((s, p) => s + p.slabsCount, 0);

  const activeSales = salesInvoices.filter((s) => !s.isVoided);
  const totalExportKg = activeSales.reduce((s, inv) => s + inv.totalWeightKg, 0);
  const totalExportUSD = activeSales.reduce((s, inv) => s + inv.totalAmountCurrency, 0);

  // Accounting & Variance Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const totalOutstandingPayable = activePurchases.reduce((s, p) => s + (p.balancePayable || 0), 0);
  const overduePurchases = activePurchases.filter((p) => p.balancePayable > 0 && p.dueDate && p.dueDate < todayStr);
  const overdueCount = overduePurchases.length;
  const varianceLots = activeProcessing.filter((p) => p.hasSlabVariance);
  const varianceLotsCount = varianceLots.length;
  const pendingRealizations = activeSales.filter((inv) => inv.realizationStatus !== 'Fully Realized');
  const pendingRealizationCount = pendingRealizations.length;

  // Recent transactions
  const recentPurchases = [...activePurchases]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  const recentProcessing = [...activeProcessing]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  const recentSales = [...activeSales]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* 1. COMPACT GREETING & OPERATIONAL OVERVIEW HEADER */}
      <section className="glass-surface-thin rounded-3xl p-5 sm:p-6 border border-white/25 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                FY {businessSettings.financialYear} Active Accounting Period
              </span>
              <span className="text-xs text-rose-200/90 font-medium hidden sm:inline">
                {businessSettings.businessName} · Coastal Trading Suite
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              Welcome back, {currentUser.name.split(' ')[0]}
            </h1>

            <p className="text-xs sm:text-sm text-rose-100/90 font-normal leading-relaxed">
              Marine procurement, factory floor freezing, and foreign export compliance overview.
              Choose an operational action or inspect the integrated flow below.
            </p>
          </div>

          {/* Action Row: Prominent Primary Action + Quieter Secondary Search */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={onOpenCommandPalette}
              className="btn-secondary-liquid inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full text-xs font-semibold"
              title="Command search (Ctrl+K)"
            >
              <Command className="w-3.5 h-3.5 text-white/80" />
              <span>Search</span>
              <kbd className="text-[10px] font-mono bg-white/20 text-white px-1.5 py-0.5 rounded">
                Ctrl+K
              </kbd>
            </button>

            {permissions.canCreateEditPurchases && (
              <button
                onClick={() => onNavigate('purchase', 'purchase-entry')}
                className="btn-liquid inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold"
              >
                <PlusCircle className="w-4 h-4 text-rose-900" />
                <span>New Harbour Purchase</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. OPERATIONAL PRIORITY METRICS (Harbour Purchases, Production Output, Export Sales, Outstanding Payments) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-rose-300" />
              <span>Key Operational Indicators</span>
            </h2>
            <p className="text-xs text-rose-200/80 mt-0.5">
              Live figures aggregated for the current active financial period (FY {businessSettings.financialYear}).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Harbour Purchases */}
          <div className="glass-surface-regular card-liquid-hover p-5 rounded-2xl border border-white/25 shadow-md flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-200">
                  Harbour Purchases
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  {activePurchases.length} Batches
                </span>
              </div>
              <div className="text-2xl font-black text-white font-mono mt-1">
                {formatKg(totalPurchaseVolume)}
              </div>
              <p className="text-[11px] text-rose-100/80">
                Landed cost: <strong className="text-white">{formatINR(totalPurchaseCost)}</strong>
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-white/15">
              <button
                onClick={() => onNavigate('purchase', 'purchases')}
                className="text-xs font-bold text-white hover:text-rose-200 inline-flex items-center gap-1 group transition-colors"
              >
                <span>View purchase transactions</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* 2. Production Output */}
          <div className="glass-surface-regular card-liquid-hover p-5 rounded-2xl border border-white/25 shadow-md flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-200">
                  Production Output
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  {activeProcessing.length} Lots
                </span>
              </div>
              <div className="text-2xl font-black text-white font-mono mt-1">
                {formatKg(totalProcessedKg)}
              </div>
              <p className="text-[11px] text-rose-100/80">
                Packaged slabs: <strong className="text-white">{totalSlabs.toLocaleString()} Slabs</strong> (2.0 Kg)
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-white/15">
              <button
                onClick={() => onNavigate('production', 'processing-log')}
                className="text-xs font-bold text-white hover:text-rose-200 inline-flex items-center gap-1 group transition-colors"
              >
                <span>View processing log</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* 3. Export Sales */}
          <div className="glass-surface-regular card-liquid-hover p-5 rounded-2xl border border-white/25 shadow-md flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-200">
                  Export Sales
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  {activeSales.length} Invoices
                </span>
              </div>
              <div className="text-2xl font-black text-white font-mono mt-1">
                ${totalExportUSD.toLocaleString()} USD
              </div>
              <p className="text-[11px] text-rose-100/80">
                Commercial shipping: <strong className="text-white">{formatKg(totalExportKg)}</strong>
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-white/15">
              <button
                onClick={() => onNavigate('sales', 'invoices')}
                className="text-xs font-bold text-white hover:text-rose-200 inline-flex items-center gap-1 group transition-colors"
              >
                <span>View export shipments</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* 4. Outstanding Payments */}
          <div className="glass-surface-blush card-liquid-hover p-5 rounded-2xl border border-white/40 shadow-md flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-100">
                  Outstanding Payables
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  overdueCount > 0
                    ? 'bg-amber-400/30 text-amber-100 border-amber-300/40'
                    : 'bg-emerald-400/30 text-emerald-100 border-emerald-300/40'
                }`}>
                  {overdueCount > 0 ? `${overdueCount} Overdue` : 'Current'}
                </span>
              </div>
              <div className="text-2xl font-black text-white font-mono mt-1">
                {formatINR(totalOutstandingPayable)}
              </div>
              <p className="text-[11px] text-rose-100/90">
                {overdueCount > 0 ? `${overdueCount} invoices past due date` : 'All supplier invoices within terms'}
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-white/20">
              <button
                onClick={() => onNavigate('purchase', 'payments')}
                className="text-xs font-bold text-white hover:text-rose-200 inline-flex items-center gap-1 group transition-colors"
              >
                <span>View supplier ledger</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THREE CONNECTED BUSINESS MODULES (Purchase → Production → Sales as a Connected Operational Flow) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-rose-300" />
              <span>Connected Operational Flow</span>
            </h2>
            <p className="text-xs text-rose-200/80 mt-0.5">
              Traceability lifecycle: Vessel Landing Weighment → Plate Freezing Yield → Commercial Export Shipping Bill.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-md">
            <span>Purchase</span>
            <span className="text-rose-300">→</span>
            <span>Production</span>
            <span className="text-rose-300">→</span>
            <span>Sales</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* MODULE 1: PURCHASE */}
          <div className="group relative glass-surface-regular card-liquid-hover rounded-3xl p-6 border border-white/30 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 text-white border border-white/30 flex items-center justify-center shadow-sm group-hover:bg-white group-hover:text-rose-900 transition-all duration-200">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-300 tracking-wider uppercase block">
                      Stage 01 · Inbound
                    </span>
                    <h3 className="text-base font-bold text-white group-hover:text-rose-100 transition">
                      Harbour Procurement
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-md">
                  {activePurchases.length} Batches
                </span>
              </div>

              {/* Primary Metric */}
              <div className="bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/25">
                <span className="text-[10px] font-bold text-rose-200 uppercase block">Total Landed Cost</span>
                <span className="text-xl font-black text-white mt-0.5 block font-mono">
                  {formatINR(totalPurchaseCost)}
                </span>
              </div>

              {/* Two Supporting Figures */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/15">
                  <span className="text-[10px] text-rose-200 font-semibold block uppercase">Total Volume</span>
                  <span className="font-extrabold text-white mt-0.5 block font-mono">{formatKg(totalPurchaseVolume)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/15">
                  <span className="text-[10px] text-rose-200 font-semibold block uppercase">Active Batches</span>
                  <span className="font-extrabold text-white mt-0.5 block font-mono">{activePurchases.length} Recorded</span>
                </div>
              </div>

              {/* Pending Items or Alerts */}
              <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 text-[11px] flex items-center gap-2">
                {overdueCount > 0 ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="text-amber-200 font-medium">{overdueCount} supplier payments pending due date</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-rose-100/90 font-medium">All harbour purchases reconciled within terms</span>
                  </>
                )}
              </div>

              {/* Sub-links */}
              <div className="pt-1 flex flex-wrap gap-2 text-xs">
                {permissions.canCreateEditPurchases && (
                  <button
                    onClick={() => onNavigate('purchase', 'purchase-entry')}
                    className="font-semibold text-white hover:text-rose-200 hover:underline flex items-center gap-1"
                  >
                    + Harbour Entry
                  </button>
                )}
                <span className="text-white/40">·</span>
                <button
                  onClick={() => onNavigate('purchase', 'purchases')}
                  className="font-medium text-white/90 hover:text-white hover:underline"
                >
                  Transactions
                </button>
                <span className="text-white/40">·</span>
                <button
                  onClick={() => onNavigate('purchase', 'payments')}
                  className="font-medium text-white/90 hover:text-white hover:underline"
                >
                  Ledgers
                </button>
              </div>
            </div>

            <div className="pt-5">
              <button
                onClick={() => onNavigate('purchase', 'dashboard')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold btn-liquid"
              >
                <span>Open Purchase Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* MODULE 2: PRODUCTION */}
          <div className="group relative glass-surface-regular card-liquid-hover rounded-3xl p-6 border border-white/30 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 text-white border border-white/30 flex items-center justify-center shadow-sm group-hover:bg-white group-hover:text-rose-900 transition-all duration-200">
                    <Factory className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-300 tracking-wider uppercase block">
                      Stage 02 · Factory
                    </span>
                    <h3 className="text-base font-bold text-white group-hover:text-rose-100 transition">
                      Plant Freezing &amp; Slabs
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-md">
                  {activeProcessing.length} Lots
                </span>
              </div>

              {/* Primary Metric */}
              <div className="bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/25">
                <span className="text-[10px] font-bold text-rose-200 uppercase block">Processed Output</span>
                <span className="text-xl font-black text-white mt-0.5 block font-mono">
                  {formatKg(totalProcessedKg)}
                </span>
              </div>

              {/* Two Supporting Figures */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/15">
                  <span className="text-[10px] text-rose-200 font-semibold block uppercase">Slabs Packed</span>
                  <span className="font-extrabold text-white mt-0.5 block font-mono">{totalSlabs.toLocaleString()} (2.0 Kg)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/15">
                  <span className="text-[10px] text-rose-200 font-semibold block uppercase">Shift Lots</span>
                  <span className="font-extrabold text-white mt-0.5 block font-mono">{activeProcessing.length} Lots</span>
                </div>
              </div>

              {/* Pending Items or Alerts */}
              <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 text-[11px] flex items-center gap-2">
                {varianceLotsCount > 0 ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="text-amber-200 font-medium">{varianceLotsCount} lot(s) exceeded slab weight variance</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-rose-100/90 font-medium">Standard 2.0 Kg slab tolerances maintained</span>
                  </>
                )}
              </div>

              {/* Sub-links */}
              <div className="pt-1 flex flex-wrap gap-2 text-xs">
                {permissions.canCreateEditPurchases && (
                  <button
                    onClick={() => onNavigate('production', 'daily-entry')}
                    className="font-semibold text-white hover:text-rose-200 hover:underline flex items-center gap-1"
                  >
                    + Plant Entry
                  </button>
                )}
                <span className="text-white/40">·</span>
                <button
                  onClick={() => onNavigate('production', 'processing-log')}
                  className="font-medium text-white/90 hover:text-white hover:underline"
                >
                  Lot Log
                </button>
                <span className="text-white/40">·</span>
                <button
                  onClick={() => onNavigate('production', 'slab-types')}
                  className="font-medium text-white/90 hover:text-white hover:underline"
                >
                  Slab Master
                </button>
              </div>
            </div>

            <div className="pt-5">
              <button
                onClick={() => onNavigate('production', 'prod-dashboard')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold btn-liquid"
              >
                <span>Open Production Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* MODULE 3: SALES */}
          <div className="group relative glass-surface-regular card-liquid-hover rounded-3xl p-6 border border-white/30 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 text-white border border-white/30 flex items-center justify-center shadow-sm group-hover:bg-white group-hover:text-rose-900 transition-all duration-200">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-300 tracking-wider uppercase block">
                      Stage 03 · Export
                    </span>
                    <h3 className="text-base font-bold text-white group-hover:text-rose-100 transition">
                      Commercial Export
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-md">
                  {activeSales.length} Invoices
                </span>
              </div>

              {/* Primary Metric */}
              <div className="bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/25">
                <span className="text-[10px] font-bold text-rose-200 uppercase block">Export Turnover</span>
                <span className="text-xl font-black text-white mt-0.5 block font-mono">
                  ${totalExportUSD.toLocaleString()} USD
                </span>
              </div>

              {/* Two Supporting Figures */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/15">
                  <span className="text-[10px] text-rose-200 font-semibold block uppercase">Export Volume</span>
                  <span className="font-extrabold text-white mt-0.5 block font-mono">{formatKg(totalExportKg)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/15">
                  <span className="text-[10px] text-rose-200 font-semibold block uppercase">Shipments</span>
                  <span className="font-extrabold text-white mt-0.5 block font-mono">{activeSales.length} Invoices</span>
                </div>
              </div>

              {/* Pending Items or Alerts */}
              <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 text-[11px] flex items-center gap-2">
                {pendingRealizationCount > 0 ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="text-amber-200 font-medium">{pendingRealizationCount} invoice(s) pending foreign realization</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-rose-100/90 font-medium">All foreign commercial shipping bills realized</span>
                  </>
                )}
              </div>

              {/* Sub-links */}
              <div className="pt-1 flex flex-wrap gap-2 text-xs">
                {permissions.canCreateEditSales && (
                  <button
                    onClick={() => onNavigate('sales', 'invoice-entry')}
                    className="font-semibold text-white hover:text-rose-200 hover:underline flex items-center gap-1"
                  >
                    + New Invoice
                  </button>
                )}
                <span className="text-white/40">·</span>
                <button
                  onClick={() => onNavigate('sales', 'invoices')}
                  className="font-medium text-white/90 hover:text-white hover:underline"
                >
                  Shipments
                </button>
                <span className="text-white/40">·</span>
                <button
                  onClick={() => onNavigate('sales', 'realizations')}
                  className="font-medium text-white/90 hover:text-white hover:underline"
                >
                  Settlement
                </button>
              </div>
            </div>

            <div className="pt-5">
              <button
                onClick={() => onNavigate('sales', 'sales-dashboard')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold btn-liquid"
              >
                <span>Open Commercial Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRESERVED QUICK ACTIONS WITH CLEAR VISUAL HIERARCHY */}
      <section className="glass-surface-regular rounded-3xl p-6 sm:p-7 border border-white/30 shadow-lg space-y-4">
        <div>
          <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-300" />
            <span>High-Frequency Shortcuts</span>
          </h2>
          <p className="text-xs text-rose-200/80 mt-0.5">
            Two-click shortcuts for primary operational tasks.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Prominent Primary Shortcut */}
          {permissions.canCreateEditPurchases && (
            <button
              onClick={() => onNavigate('purchase', 'purchase-entry')}
              className="p-4 rounded-2xl bg-white text-rose-900 border border-white shadow-xl text-left card-liquid-hover flex flex-col justify-between group transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <PlusCircle className="w-4 h-4" />
              </div>
              <div className="mt-3">
                <span className="text-xs font-black text-rose-950 block leading-tight">
                  New Purchase
                </span>
                <span className="text-[11px] text-rose-800 font-semibold mt-0.5 block">Harbour landing</span>
              </div>
            </button>
          )}

          {/* Secondary Shortcut: Plant Entry */}
          {permissions.canCreateEditPurchases && (
            <button
              onClick={() => onNavigate('production', 'daily-entry')}
              className="p-4 rounded-2xl glass-surface-thin hover:glass-surface-blush border border-white/25 text-left card-liquid-hover flex flex-col justify-between group transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs border border-white/30 group-hover:bg-white group-hover:text-rose-900 transition-all">
                <Factory className="w-4 h-4" />
              </div>
              <div className="mt-3">
                <span className="text-xs font-bold text-white group-hover:text-white block leading-tight">
                  New Plant Entry
                </span>
                <span className="text-[11px] text-rose-200/80 mt-0.5 block">Processing &amp; slabs</span>
              </div>
            </button>
          )}

          {/* Secondary Shortcut: Export Invoice */}
          {permissions.canCreateEditSales && (
            <button
              onClick={() => onNavigate('sales', 'invoice-entry')}
              className="p-4 rounded-2xl glass-surface-thin hover:glass-surface-blush border border-white/25 text-left card-liquid-hover flex flex-col justify-between group transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs border border-white/30 group-hover:bg-white group-hover:text-rose-900 transition-all">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="mt-3">
                <span className="text-xs font-bold text-white group-hover:text-white block leading-tight">
                  New Export Invoice
                </span>
                <span className="text-[11px] text-rose-200/80 mt-0.5 block">Commercial bill</span>
              </div>
            </button>
          )}

          {/* Secondary Shortcut: Supplier Ledger */}
          <button
            onClick={() => onNavigate('purchase', 'payments')}
            className="p-4 rounded-2xl glass-surface-thin hover:glass-surface-blush border border-white/25 text-left card-liquid-hover flex flex-col justify-between group transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs border border-white/30 group-hover:bg-white group-hover:text-rose-900 transition-all">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-bold text-white block leading-tight">
                Supplier Ledger
              </span>
              <span className="text-[11px] text-rose-200/80 mt-0.5 block">A4 Statement</span>
            </div>
          </button>

          {/* Secondary Shortcut: Outstanding Ageing */}
          <button
            onClick={() => onNavigate('purchase', 'outstanding')}
            className="p-4 rounded-2xl glass-surface-thin hover:glass-surface-blush border border-white/25 text-left card-liquid-hover flex flex-col justify-between group transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs border border-white/30 group-hover:bg-white group-hover:text-rose-900 transition-all">
              <Clock className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-bold text-white block leading-tight">
                Outstanding Ageing
              </span>
              <span className="text-[11px] text-rose-200/80 mt-0.5 block">180+ Days</span>
            </div>
          </button>

          {/* Secondary Shortcut: Reports Hub */}
          <button
            onClick={() => onNavigate('purchase', 'reports')}
            className="p-4 rounded-2xl glass-surface-thin hover:glass-surface-blush border border-white/25 text-left card-liquid-hover flex flex-col justify-between group transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs border border-white/30 group-hover:bg-white group-hover:text-rose-900 transition-all">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-bold text-white block leading-tight">
                Reports Hub
              </span>
              <span className="text-[11px] text-rose-200/80 mt-0.5 block">8 Analysis views</span>
            </div>
          </button>
        </div>
      </section>

      {/* 5. LIVE RECENT TRANSACTIONS FEED (Purchases, Processing Lots, Sales Invoices) WITH HELPFUL EMPTY STATES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-300" />
              <span>Live Feed of Recent Transactions</span>
            </h2>
            <p className="text-xs text-rose-200/80 mt-0.5">
              Instant audit trail of recent harbour purchases, plant floor lots, and export shipments.
            </p>
          </div>
          <button
            onClick={() => onNavigate('purchase', 'purchases')}
            className="text-xs font-bold text-white hover:text-rose-200 hover:underline flex items-center gap-1"
          >
            <span>View all register</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Recent Purchases */}
          <div className="glass-surface-regular rounded-2xl p-5 border border-white/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
              <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-rose-300" />
                Latest Landings
              </span>
              <span className="text-[11px] font-semibold text-rose-200">Procurement</span>
            </div>

            {recentPurchases.length === 0 ? (
              <div className="py-8 text-center text-xs text-rose-200/90 space-y-2">
                <p>No harbour purchases recorded yet.</p>
                {permissions.canCreateEditPurchases && (
                  <button
                    onClick={() => onNavigate('purchase', 'purchase-entry')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-rose-900 font-bold text-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Record First Landing</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentPurchases.map((p) => {
                  const supp = supplierMap.get(p.supplierId);
                  const sp = speciesMap.get(p.speciesId);
                  return (
                    <div
                      key={p.id}
                      onClick={() => onNavigate('purchase', 'purchases')}
                      className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 cursor-pointer transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{p.purchaseId}</div>
                        <div className="text-rose-100 font-semibold mt-0.5 truncate max-w-[130px]">
                          {supp?.name || 'Unknown Supplier'}
                        </div>
                        <div className="text-[11px] text-rose-200/80 truncate">{sp?.name} · {formatKg(p.weightKg)}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-white font-mono">{formatINR(p.totalCost)}</div>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.paymentStatus === 'Fully Paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                              : p.paymentStatus === 'Partially Paid'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                              : 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                          }`}
                        >
                          {p.paymentStatus}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 2: Recent Processing Lots */}
          <div className="glass-surface-regular rounded-2xl p-5 border border-white/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
              <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5 text-amber-300" />
                Latest Plant Lots
              </span>
              <span className="text-[11px] font-semibold text-rose-200">Production</span>
            </div>

            {recentProcessing.length === 0 ? (
              <div className="py-8 text-center text-xs text-rose-200/90 space-y-2">
                <p>No production lots recorded yet.</p>
                {permissions.canCreateEditPurchases && (
                  <button
                    onClick={() => onNavigate('production', 'daily-entry')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-amber-900 font-bold text-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Create Plant Entry</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentProcessing.map((proc) => {
                  const supp = supplierMap.get(proc.supplierId);
                  const sp = speciesMap.get(proc.speciesId);
                  return (
                    <div
                      key={proc.id}
                      onClick={() => onNavigate('production', 'processing-log')}
                      className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 cursor-pointer transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{proc.entryNo}</div>
                        <div className="text-rose-100 font-semibold mt-0.5 truncate max-w-[130px]">
                          {supp?.name || 'Raw Lot'}
                        </div>
                        <div className="text-[11px] text-rose-200/80 truncate">{sp?.name}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-white font-mono">{formatKg(proc.processedWeightKg)}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
                          {proc.slabsCount} Slabs
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 3: Recent Commercial Invoices */}
          <div className="glass-surface-regular rounded-2xl p-5 border border-white/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
              <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-rose-300" />
                Latest Export Shipments
              </span>
              <span className="text-[11px] font-semibold text-rose-200">Commercial</span>
            </div>

            {recentSales.length === 0 ? (
              <div className="py-8 text-center text-xs text-rose-200/90 space-y-2">
                <p>No export invoices recorded yet.</p>
                {permissions.canCreateEditSales && (
                  <button
                    onClick={() => onNavigate('sales', 'invoice-entry')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-rose-900 font-bold text-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Prepare First Invoice</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentSales.map((inv) => {
                  const buyer = customerMap.get(inv.consigneeId);
                  return (
                    <div
                      key={inv.id}
                      onClick={() => onNavigate('sales', 'invoices')}
                      className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 cursor-pointer transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{inv.invoiceNo}</div>
                        <div className="text-rose-100 font-semibold mt-0.5 truncate max-w-[130px]">
                          {buyer?.name || 'Consignee'}
                        </div>
                        <div className="text-[11px] text-rose-200/80 truncate">{formatKg(inv.totalWeightKg)} · {inv.orderNo || 'Contract'}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-white font-mono">${inv.totalAmountCurrency.toLocaleString()}</div>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.realizationStatus === 'Fully Realized'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                              : 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                          }`}
                        >
                          {inv.realizationStatus}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
