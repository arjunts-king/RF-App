import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
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
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pb-6 border-b border-gray-100">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100/80 text-rose-800 border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                {businessSettings.financialYear} Active Session
              </span>
              <span className="text-xs text-ink-500 font-medium">
                {businessSettings.businessName} · {businessSettings.tagline}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-ink-900 leading-tight">
              Welcome back, {currentUser.name.split(' ')[0]}
            </h1>

            <p className="text-base sm:text-lg text-ink-500 font-normal leading-relaxed">
              Unified marine procurement, factory floor freezing, and export trade compliance.
              Choose an operational workspace below or use quick shortcuts.
            </p>
          </div>

          {/* Action Row: One confident primary button with quieter secondary actions */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={onOpenCommandPalette}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-ink-700 text-xs font-semibold shadow-2xs hover:border-gray-300 transition-all"
            >
              <Command className="w-3.5 h-3.5 text-ink-500" />
              <span>Command palette</span>
              <kbd className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-ink-500">
                Ctrl+K
              </kbd>
            </button>

            {permissions.canCreateEditPurchases && (
              <button
                onClick={() => onNavigate('purchase', 'purchase-entry')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all"
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
            <h2 className="text-xl font-bold tracking-tight text-ink-900">
              Operational Workspaces
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Role-authorized modules configured for {currentUser.designation}.
            </p>
          </div>
          <span className="text-xs font-semibold text-rose-700">
            Role: {currentUser.role.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* PURCHASE MODULE TILE */}
          <div className="group relative bg-white hover:bg-rose-50/20 rounded-3xl p-6 sm:p-7 border border-gray-200/80 hover:border-rose-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shadow-2xs group-hover:bg-rose-600 group-hover:text-white transition-colors duration-200">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  {activePurchases.length} Batches
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-ink-900 group-hover:text-rose-700 transition">
                  Procurement &amp; Purchase
                </h3>
                <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                  Harbour weighments, dynamic landing expenses, joint batch cost pools and supplier ledgers.
                </p>
              </div>

              {/* Snapshot metrics */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-ink-500 uppercase block">Total Volume</span>
                  <span className="text-sm font-extrabold text-ink-900 mt-0.5 block">{formatKg(totalPurchaseVolume)}</span>
                </div>
                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-ink-500 uppercase block">Landed Cost</span>
                  <span className="text-sm font-extrabold text-rose-700 mt-0.5 block">{formatINR(totalPurchaseCost)}</span>
                </div>
              </div>

              {/* Sub-links */}
              <div className="pt-2 flex flex-wrap gap-2 text-xs">
                {permissions.canCreateEditPurchases && (
                  <button
                    onClick={() => onNavigate('purchase', 'purchase-entry')}
                    className="font-semibold text-rose-700 hover:text-rose-900 hover:underline flex items-center gap-1"
                  >
                    + Harbour Entry
                  </button>
                )}
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => onNavigate('purchase', 'purchases')}
                  className="font-medium text-ink-600 hover:text-rose-700 hover:underline"
                >
                  Transactions
                </button>
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => onNavigate('purchase', 'payments')}
                  className="font-medium text-ink-600 hover:text-rose-700 hover:underline"
                >
                  Ledgers
                </button>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => onNavigate('purchase', 'dashboard')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs group-hover:shadow-xs transition"
              >
                <span>Open Purchase Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* PRODUCTION MODULE TILE */}
          <div className="group relative bg-white hover:bg-amber-50/20 rounded-3xl p-6 sm:p-7 border border-gray-200/80 hover:border-amber-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-2xs group-hover:bg-amber-700 group-hover:text-white transition-colors duration-200">
                  <Factory className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                  {activeProcessing.length} Lots
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-ink-900 group-hover:text-amber-800 transition">
                  Factory Floor &amp; Production
                </h3>
                <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                  Daily shift processing, standard slab freezing (2.0 Kg), yield recovery and variance alarms.
                </p>
              </div>

              {/* Snapshot metrics */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-ink-500 uppercase block">Processed Output</span>
                  <span className="text-sm font-extrabold text-ink-900 mt-0.5 block">{formatKg(totalProcessedKg)}</span>
                </div>
                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-ink-500 uppercase block">Total Slabs</span>
                  <span className="text-sm font-extrabold text-amber-800 mt-0.5 block">{totalSlabs.toLocaleString()} Slabs</span>
                </div>
              </div>

              {/* Sub-links */}
              <div className="pt-2 flex flex-wrap gap-2 text-xs">
                {permissions.canCreateEditPurchases && (
                  <button
                    onClick={() => onNavigate('production', 'daily-entry')}
                    className="font-semibold text-amber-800 hover:text-amber-950 hover:underline flex items-center gap-1"
                  >
                    + Plant Entry
                  </button>
                )}
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => onNavigate('production', 'processing-log')}
                  className="font-medium text-ink-600 hover:text-amber-800 hover:underline"
                >
                  Lot Log
                </button>
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => onNavigate('production', 'slab-types')}
                  className="font-medium text-ink-600 hover:text-amber-800 hover:underline"
                >
                  Slab Master
                </button>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => onNavigate('production', 'prod-dashboard')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-ink-900 hover:bg-black text-white text-xs font-bold shadow-2xs group-hover:shadow-xs transition"
              >
                <span>Open Production Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* SALES MODULE TILE */}
          <div className="group relative bg-white hover:bg-rose-50/20 rounded-3xl p-6 sm:p-7 border border-gray-200/80 hover:border-rose-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shadow-2xs group-hover:bg-rose-600 group-hover:text-white transition-colors duration-200">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {activeSales.length} Invoices
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-ink-900 group-hover:text-rose-700 transition">
                  Commercial Export &amp; Sales
                </h3>
                <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                  Foreign buyer orders, commercial shipping bills, container lines and FIRC foreign realizations.
                </p>
              </div>

              {/* Snapshot metrics */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-ink-500 uppercase block">Export Volume</span>
                  <span className="text-sm font-extrabold text-ink-900 mt-0.5 block">{formatKg(totalExportKg)}</span>
                </div>
                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-ink-500 uppercase block">Export Turnover</span>
                  <span className="text-sm font-extrabold text-emerald-700 mt-0.5 block">${totalExportUSD.toLocaleString()} USD</span>
                </div>
              </div>

              {/* Sub-links */}
              <div className="pt-2 flex flex-wrap gap-2 text-xs">
                {permissions.canCreateEditSales && (
                  <button
                    onClick={() => onNavigate('sales', 'invoice-entry')}
                    className="font-semibold text-rose-700 hover:text-rose-900 hover:underline flex items-center gap-1"
                  >
                    + New Invoice
                  </button>
                )}
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => onNavigate('sales', 'invoices')}
                  className="font-medium text-ink-600 hover:text-rose-700 hover:underline"
                >
                  Shipments
                </button>
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => onNavigate('sales', 'realizations')}
                  className="font-medium text-ink-600 hover:text-rose-700 hover:underline"
                >
                  Settlement
                </button>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => onNavigate('sales', 'sales-dashboard')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs group-hover:shadow-xs transition"
              >
                <span>Open Commercial Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ALTERNATING SECTION: HIGH-FREQUENCY SHORTCUT TILES */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink-900">
            High-Frequency Actions
          </h2>
          <p className="text-xs text-ink-500 mt-0.5">
            Two-click shortcuts for primary tasks permitted for your authenticated credentials.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {permissions.canCreateEditPurchases && (
            <button
              onClick={() => onNavigate('purchase', 'purchase-entry')}
              className="p-4 rounded-2xl bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200 text-left transition flex flex-col justify-between group"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <PlusCircle className="w-4 h-4" />
              </div>
              <div className="mt-3">
                <span className="text-xs font-bold text-ink-900 group-hover:text-rose-900 block leading-tight">
                  New Purchase
                </span>
                <span className="text-[11px] text-ink-500 mt-0.5 block">Harbour landing</span>
              </div>
            </button>
          )}

          {permissions.canCreateEditPurchases && (
            <button
              onClick={() => onNavigate('production', 'daily-entry')}
              className="p-4 rounded-2xl bg-amber-50/60 hover:bg-amber-100/70 border border-amber-200 text-left transition flex flex-col justify-between group"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <Factory className="w-4 h-4" />
              </div>
              <div className="mt-3">
                <span className="text-xs font-bold text-ink-900 group-hover:text-amber-900 block leading-tight">
                  New Plant Entry
                </span>
                <span className="text-[11px] text-ink-500 mt-0.5 block">Processing &amp; slabs</span>
              </div>
            </button>
          )}

          {permissions.canCreateEditSales && (
            <button
              onClick={() => onNavigate('sales', 'invoice-entry')}
              className="p-4 rounded-2xl bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200 text-left transition flex flex-col justify-between group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="mt-3">
                <span className="text-xs font-bold text-ink-900 group-hover:text-emerald-900 block leading-tight">
                  New Export Invoice
                </span>
                <span className="text-[11px] text-ink-500 mt-0.5 block">Commercial bill</span>
              </div>
            </button>
          )}

          <button
            onClick={() => onNavigate('purchase', 'payments')}
            className="p-4 rounded-2xl bg-gray-50 hover:bg-gray-100/80 border border-gray-200 text-left transition flex flex-col justify-between group"
          >
            <div className="w-9 h-9 rounded-xl bg-ink-900 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-bold text-ink-900 block leading-tight">
                Supplier Ledger
              </span>
              <span className="text-[11px] text-ink-500 mt-0.5 block">A4 Statement</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('purchase', 'outstanding')}
            className="p-4 rounded-2xl bg-gray-50 hover:bg-gray-100/80 border border-gray-200 text-left transition flex flex-col justify-between group"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-bold text-ink-900 block leading-tight">
                Outstanding Ageing
              </span>
              <span className="text-[11px] text-ink-500 mt-0.5 block">180+ Days</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('purchase', 'reports')}
            className="p-4 rounded-2xl bg-gray-50 hover:bg-gray-100/80 border border-gray-200 text-left transition flex flex-col justify-between group"
          >
            <div className="w-9 h-9 rounded-xl bg-ink-700 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-bold text-ink-900 block leading-tight">
                Reports Hub
              </span>
              <span className="text-[11px] text-ink-500 mt-0.5 block">8 Analysis views</span>
            </div>
          </button>
        </div>
      </section>

      {/* 4. SCROLLABLE STRIP OF RECENT ENTRIES (Purchases, Processing Lots, Sales Invoices) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink-900">
              Live Feed of Recent Transactions
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Instant audit trail of recent harbour purchases, plant floor lots, and export shipments.
            </p>
          </div>
          <button
            onClick={() => onNavigate('purchase', 'purchases')}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 hover:underline flex items-center gap-1"
          >
            <span>View all register</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Recent Purchases Column */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <span className="text-xs font-bold text-ink-900 uppercase tracking-wide flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-rose-600" />
                Latest Landings
              </span>
              <span className="text-[11px] font-semibold text-rose-700">Procurement</span>
            </div>

            <div className="space-y-2.5">
              {recentPurchases.map((p) => {
                const supp = supplierMap.get(p.supplierId);
                const sp = speciesMap.get(p.speciesId);
                return (
                  <div
                    key={p.id}
                    onClick={() => onNavigate('purchase', 'purchases')}
                    className="p-3 rounded-xl bg-gray-50/70 hover:bg-rose-50/50 border border-gray-100 hover:border-rose-200 cursor-pointer transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-rose-700">{p.purchaseId}</div>
                      <div className="text-ink-900 font-semibold mt-0.5 truncate max-w-[140px]">
                        {supp?.name || 'Unknown Supplier'}
                      </div>
                      <div className="text-[11px] text-ink-500">{sp?.name} · {formatKg(p.weightKg)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-ink-900">{formatINR(p.totalCost)}</div>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.paymentStatus === 'Fully Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : p.paymentStatus === 'Partially Paid'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
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
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <span className="text-xs font-bold text-ink-900 uppercase tracking-wide flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5 text-amber-700" />
                Latest Plant Lots
              </span>
              <span className="text-[11px] font-semibold text-amber-800">Production</span>
            </div>

            <div className="space-y-2.5">
              {recentProcessing.map((proc) => {
                const supp = supplierMap.get(proc.supplierId);
                const sp = speciesMap.get(proc.speciesId);
                return (
                  <div
                    key={proc.id}
                    onClick={() => onNavigate('production', 'processing-log')}
                    className="p-3 rounded-xl bg-gray-50/70 hover:bg-amber-50/50 border border-gray-100 hover:border-amber-200 cursor-pointer transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-ink-900">{proc.entryNo}</div>
                      <div className="text-ink-900 font-semibold mt-0.5 truncate max-w-[140px]">
                        {supp?.name || 'Raw Lot'}
                      </div>
                      <div className="text-[11px] text-ink-500">{sp?.name}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-amber-900">{formatKg(proc.processedWeightKg)}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {proc.slabsCount} Slabs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Commercial Invoices Column */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <span className="text-xs font-bold text-ink-900 uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                Latest Export Shipments
              </span>
              <span className="text-[11px] font-semibold text-rose-700">Commercial</span>
            </div>

            <div className="space-y-2.5">
              {recentSales.map((inv) => {
                const buyer = customerMap.get(inv.consigneeId);
                return (
                  <div
                    key={inv.id}
                    onClick={() => onNavigate('sales', 'invoices')}
                    className="p-3 rounded-xl bg-gray-50/70 hover:bg-rose-50/50 border border-gray-100 hover:border-rose-200 cursor-pointer transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-rose-700">{inv.invoiceNo}</div>
                      <div className="text-ink-900 font-semibold mt-0.5 truncate max-w-[140px]">
                        {buyer?.name || 'Consignee'}
                      </div>
                      <div className="text-[11px] text-ink-500">{formatKg(inv.totalWeightKg)} · {inv.orderNo || 'Contract'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-ink-900">${inv.totalAmountCurrency.toLocaleString()}</div>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.realizationStatus === 'Fully Realized'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
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
