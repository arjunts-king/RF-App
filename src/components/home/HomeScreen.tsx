import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { RoleSwitcher } from '../common/RoleSwitcher';
import { formatINR, formatKg } from '../../utils/calculations';
import {
  ShoppingBag,
  Factory,
  TrendingUp,
  PlusCircle,
  Receipt,
  BookOpen,
  ArrowRight,
  Clock,
  Sparkles,
  Command
} from 'lucide-react';

interface HomeScreenProps {
  onNavigate: (module: 'purchase' | 'production' | 'sales', tab: string) => void;
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

  // Metrics for tiles
  const activePurchases = purchases.filter((p) => !p.isVoided);
  const totalPurchaseVolume = activePurchases.reduce((s, p) => s + p.weightKg, 0);
  const totalPurchaseCost = activePurchases.reduce((s, p) => s + p.totalCost, 0);

  const activeProcessing = processingEntries.filter((p) => !p.isVoided);
  const totalProcessedKg = activeProcessing.reduce((s, p) => s + p.processedWeightKg, 0);
  const totalSlabs = activeProcessing.reduce((s, p) => s + p.slabsCount, 0);

  const activeSales = salesInvoices.filter((s) => !s.isVoided);
  const totalExportKg = activeSales.reduce((s, inv) => s + inv.totalWeightKg, 0);
  const totalExportUSD = activeSales.reduce((s, inv) => s + inv.totalAmountCurrency, 0);

  // Recent purchases
  const recentPurchases = [...activePurchases]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  // Recent processing entries
  const recentProcessing = [...activeProcessing]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  // Recent sales invoices
  const recentSales = [...activeSales]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-12">
      {/* 1. WELCOMING HERO SECTION (Headline-First Screen with Generous Whitespace) */}
      <section className="pt-2 sm:pt-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pb-6 border-b border-white/20">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {businessSettings.financialYear} Active Session
              </span>
              <RoleSwitcher />
              <span className="text-xs text-rose-200 font-medium hidden sm:inline">
                {businessSettings.businessName} · {businessSettings.tagline}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Welcome back, {currentUser.name.split(' ')[0]}
            </h1>

            <p className="text-base sm:text-lg text-rose-100/90 font-normal leading-relaxed">
              Unified marine procurement, factory floor freezing, and export trade compliance.
              Choose an operational workspace below or use quick shortcuts.
            </p>
          </div>

          {/* Action Row: Confident white glass buttons on red canvas */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={onOpenCommandPalette}
              className="btn-secondary-liquid inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold"
            >
              <Command className="w-3.5 h-3.5 text-white/80" />
              <span>Command palette</span>
              <kbd className="text-[10px] font-mono bg-white/20 text-white px-1.5 py-0.5 rounded">
                Ctrl+K
              </kbd>
            </button>

            {permissions.canCreateEditPurchases && (
              <button
                onClick={() => onNavigate('purchase', 'purchase-entry')}
                className="btn-liquid inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New harbour purchase</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. ALTERNATING FULL-WIDTH SECTION: CORE MODULE TILES (Filtered by Role Permissions) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Operational Workspaces
            </h2>
            <p className="text-xs text-rose-200/90 mt-0.5">
              Role-authorized modules configured for {currentUser.designation}.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-md">
            Role: {currentUser.role.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* PURCHASE MODULE TILE */}
          <div className="group relative glass-surface-regular card-liquid-hover rounded-3xl p-6 sm:p-7 border border-white/30 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white/20 text-white border border-white/30 flex items-center justify-center shadow-sm group-hover:bg-white group-hover:text-[#8C1C2C] transition-all duration-200">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-md">
                  {activePurchases.length} Batches
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-rose-100 transition">
                  Procurement &amp; Purchase
                </h3>
                <p className="text-xs text-rose-100/80 mt-1 leading-relaxed">
                  Harbour weighments, dynamic landing expenses, joint batch cost pools and supplier ledgers.
                </p>
              </div>

              {/* Snapshot metrics */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20">
                <div className="bg-white/15 backdrop-blur-md p-3 rounded-xl border border-white/25">
                  <span className="text-[10px] font-bold text-rose-200 uppercase block">Total Volume</span>
                  <span className="text-sm font-extrabold text-white mt-0.5 block">{formatKg(totalPurchaseVolume)}</span>
                </div>
                <div className="bg-white/15 backdrop-blur-md p-3 rounded-xl border border-white/25">
                  <span className="text-[10px] font-bold text-rose-200 uppercase block">Landed Cost</span>
                  <span className="text-sm font-extrabold text-white mt-0.5 block">{formatINR(totalPurchaseCost)}</span>
                </div>
              </div>

              {/* Sub-links */}
              <div className="pt-2 flex flex-wrap gap-2 text-xs">
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

            <div className="pt-6">
              <button
                onClick={() => onNavigate('purchase', 'dashboard')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold btn-liquid"
              >
                <span>Open Purchase Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* PRODUCTION MODULE TILE */}
          <div className="group relative glass-surface-regular card-liquid-hover rounded-3xl p-6 sm:p-7 border border-white/30 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white/20 text-white border border-white/30 flex items-center justify-center shadow-sm group-hover:bg-white group-hover:text-[#8C1C2C] transition-all duration-200">
                  <Factory className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-md">
                  {activeProcessing.length} Lots
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-rose-100 transition">
                  Factory Floor &amp; Production
                </h3>
                <p className="text-xs text-rose-100/80 mt-1 leading-relaxed">
                  Daily shift processing, standard slab freezing (2.0 Kg), yield recovery and variance alarms.
                </p>
              </div>

              {/* Snapshot metrics */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20">
                <div className="bg-white/15 backdrop-blur-md p-3 rounded-xl border border-white/25">
                  <span className="text-[10px] font-bold text-rose-200 uppercase block">Processed Output</span>
                  <span className="text-sm font-extrabold text-white mt-0.5 block">{formatKg(totalProcessedKg)}</span>
                </div>
                <div className="bg-white/15 backdrop-blur-md p-3 rounded-xl border border-white/25">
                  <span className="text-[10px] font-bold text-rose-200 uppercase block">Total Slabs</span>
                  <span className="text-sm font-extrabold text-white mt-0.5 block">{totalSlabs.toLocaleString()} Slabs</span>
                </div>
              </div>

              {/* Sub-links */}
              <div className="pt-2 flex flex-wrap gap-2 text-xs">
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

            <div className="pt-6">
              <button
                onClick={() => onNavigate('production', 'prod-dashboard')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold btn-liquid"
              >
                <span>Open Production Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* SALES MODULE TILE */}
          <div className="group relative glass-surface-regular card-liquid-hover rounded-3xl p-6 sm:p-7 border border-white/30 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white/20 text-white border border-white/30 flex items-center justify-center shadow-sm group-hover:bg-white group-hover:text-[#8C1C2C] transition-all duration-200">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-md">
                  {activeSales.length} Invoices
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-rose-100 transition">
                  Commercial Export &amp; Sales
                </h3>
                <p className="text-xs text-rose-100/80 mt-1 leading-relaxed">
                  Foreign buyer orders, commercial shipping bills, container lines and FIRC foreign realizations.
                </p>
              </div>

              {/* Snapshot metrics */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20">
                <div className="bg-white/15 backdrop-blur-md p-3 rounded-xl border border-white/25">
                  <span className="text-[10px] font-bold text-rose-200 uppercase block">Export Volume</span>
                  <span className="text-sm font-extrabold text-white mt-0.5 block">{formatKg(totalExportKg)}</span>
                </div>
                <div className="bg-white/15 backdrop-blur-md p-3 rounded-xl border border-white/25">
                  <span className="text-[10px] font-bold text-rose-200 uppercase block">Export Turnover</span>
                  <span className="text-sm font-extrabold text-white mt-0.5 block">${totalExportUSD.toLocaleString()} USD</span>
                </div>
              </div>

              {/* Sub-links */}
              <div className="pt-2 flex flex-wrap gap-2 text-xs">
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

            <div className="pt-6">
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

      {/* 3. ALTERNATING SECTION: HIGH-FREQUENCY SHORTCUT TILES */}
      <section className="glass-surface-regular rounded-3xl p-6 sm:p-8 border border-white/30 shadow-lg space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white">
            High-Frequency Actions
          </h2>
          <p className="text-xs text-rose-200/90 mt-0.5">
            Two-click shortcuts for primary tasks permitted for your authenticated credentials.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {permissions.canCreateEditPurchases && (
            <button
              onClick={() => onNavigate('purchase', 'purchase-entry')}
              className="p-4 rounded-2xl glass-surface-thin hover:glass-surface-blush border border-white/25 text-left card-liquid-hover flex flex-col justify-between group transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs border border-white/30 group-hover:bg-white group-hover:text-[#8C1C2C] transition-all">
                <PlusCircle className="w-4 h-4" />
              </div>
              <div className="mt-3">
                <span className="text-xs font-bold text-white group-hover:text-white block leading-tight">
                  New Purchase
                </span>
                <span className="text-[11px] text-rose-200/80 mt-0.5 block">Harbour landing</span>
              </div>
            </button>
          )}

          {permissions.canCreateEditPurchases && (
            <button
              onClick={() => onNavigate('production', 'daily-entry')}
              className="p-4 rounded-2xl glass-surface-thin hover:glass-surface-blush border border-white/25 text-left card-liquid-hover flex flex-col justify-between group transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs border border-white/30 group-hover:bg-white group-hover:text-[#8C1C2C] transition-all">
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

          {permissions.canCreateEditSales && (
            <button
              onClick={() => onNavigate('sales', 'invoice-entry')}
              className="p-4 rounded-2xl glass-surface-thin hover:glass-surface-blush border border-white/25 text-left card-liquid-hover flex flex-col justify-between group transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs border border-white/30 group-hover:bg-white group-hover:text-[#8C1C2C] transition-all">
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

          <button
            onClick={() => onNavigate('purchase', 'payments')}
            className="p-4 rounded-2xl glass-surface-thin hover:glass-surface-blush border border-white/25 text-left card-liquid-hover flex flex-col justify-between group transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs border border-white/30 group-hover:bg-white group-hover:text-[#8C1C2C] transition-all">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-bold text-white block leading-tight">
                Supplier Ledger
              </span>
              <span className="text-[11px] text-rose-200/80 mt-0.5 block">A4 Statement</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('purchase', 'outstanding')}
            className="p-4 rounded-2xl glass-surface-thin hover:glass-surface-blush border border-white/25 text-left card-liquid-hover flex flex-col justify-between group transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs border border-white/30 group-hover:bg-white group-hover:text-[#8C1C2C] transition-all">
              <Clock className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-bold text-white block leading-tight">
                Outstanding Ageing
              </span>
              <span className="text-[11px] text-rose-200/80 mt-0.5 block">180+ Days</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('purchase', 'reports')}
            className="p-4 rounded-2xl glass-surface-thin hover:glass-surface-blush border border-white/25 text-left card-liquid-hover flex flex-col justify-between group transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs border border-white/30 group-hover:bg-white group-hover:text-[#8C1C2C] transition-all">
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

      {/* 4. SCROLLABLE STRIP OF RECENT ENTRIES (Purchases, Processing Lots, Sales Invoices) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">
              Live Feed of Recent Transactions
            </h2>
            <p className="text-xs text-rose-200/90 mt-0.5">
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
          {/* Recent Purchases Column */}
          <div className="glass-surface-regular rounded-2xl p-5 border border-white/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
              <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-rose-300" />
                Latest Landings
              </span>
              <span className="text-[11px] font-semibold text-rose-200">Procurement</span>
            </div>

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
                    <div>
                      <div className="font-bold text-white">{p.purchaseId}</div>
                      <div className="text-rose-100 font-semibold mt-0.5 truncate max-w-[140px]">
                        {supp?.name || 'Unknown Supplier'}
                      </div>
                      <div className="text-[11px] text-rose-200/80">{sp?.name} · {formatKg(p.weightKg)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-white">{formatINR(p.totalCost)}</div>
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
          </div>

          {/* Recent Processing Lots Column */}
          <div className="glass-surface-regular rounded-2xl p-5 border border-white/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
              <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5 text-amber-300" />
                Latest Plant Lots
              </span>
              <span className="text-[11px] font-semibold text-rose-200">Production</span>
            </div>

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
                    <div>
                      <div className="font-bold text-white">{proc.entryNo}</div>
                      <div className="text-rose-100 font-semibold mt-0.5 truncate max-w-[140px]">
                        {supp?.name || 'Raw Lot'}
                      </div>
                      <div className="text-[11px] text-rose-200/80">{sp?.name}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-white">{formatKg(proc.processedWeightKg)}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
                        {proc.slabsCount} Slabs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Commercial Invoices Column */}
          <div className="glass-surface-regular rounded-2xl p-5 border border-white/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
              <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-rose-300" />
                Latest Export Shipments
              </span>
              <span className="text-[11px] font-semibold text-rose-200">Commercial</span>
            </div>

            <div className="space-y-2.5">
              {recentSales.map((inv) => {
                const buyer = customerMap.get(inv.consigneeId);
                return (
                  <div
                    key={inv.id}
                    onClick={() => onNavigate('sales', 'invoices')}
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 cursor-pointer transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{inv.invoiceNo}</div>
                      <div className="text-rose-100 font-semibold mt-0.5 truncate max-w-[140px]">
                        {buyer?.name || 'Consignee'}
                      </div>
                      <div className="text-[11px] text-rose-200/80">{formatKg(inv.totalWeightKg)} · {inv.orderNo || 'Contract'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-white">${inv.totalAmountCurrency.toLocaleString()}</div>
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
          </div>
        </div>
      </section>
    </div>
  );
};
