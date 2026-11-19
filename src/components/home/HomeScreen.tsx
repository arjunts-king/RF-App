import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Species } from '../../types';
import { RoleSwitcher } from '../common/RoleSwitcher';
import { Carousel } from '../common/Carousel';
import { formatINR, formatKg } from '../../utils/calculations';
import {
  ShoppingBag,
  Boxes,
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
  onNavigate: (module: 'purchase' | 'production' | 'sales' | 'inventory', tab: string) => void;
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
    purchaseSpecies,
    species,
    customers,
    businessSettings,
    inventoryCalculation
  } = useData();

  // Robust species name resolver combining purchaseSpecies and species
  const allSpecies: Species[] = useMemo(() => [...(purchaseSpecies || []), ...(species || [])], [purchaseSpecies, species]);

  const resolveSpeciesName = (spId?: string, fallback = 'Raw Material'): string => {
    if (!spId) return fallback;
    const clean = spId.trim();
    const lower = clean.toLowerCase();
    const found = allSpecies.find(
      (s: Species) =>
        s.id.toLowerCase() === lower ||
        s.code.toLowerCase() === lower ||
        s.name.trim().toLowerCase() === lower ||
        (s.rawSpeciesName && s.rawSpeciesName.trim().toLowerCase() === lower)
    );
    if (found) {
      if (found.rawSpeciesName && !found.rawSpeciesName.toLowerCase().startsWith('sp-auto')) {
        return found.rawSpeciesName.trim();
      }
      if (found.name && !found.name.toLowerCase().startsWith('sp-auto')) {
        return found.name.replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim();
      }
    }
    if (!clean.startsWith('sp-auto') && !clean.startsWith('auto-') && !clean.startsWith('prd-') && !clean.startsWith('sp-')) {
      return clean.replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim();
    }
    return fallback;
  };

  // Lookups
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
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

  // Unified recent entries strip across modules the role can access
  const combinedRecentEntries = [
    ...recentPurchases.map((p) => {
      const supp = supplierMap.get(p.supplierId);
      const spName = resolveSpeciesName(p.speciesId, 'Raw Catch');
      return {
        id: `p-${p.id}`,
        type: 'purchase' as const,
        typeName: 'Harbour Purchase',
        targetTab: 'purchases',
        code: p.purchaseId,
        party: supp?.name || 'Unknown Supplier',
        detail: `${spName} · ${formatKg(p.weightKg)}`,
        metric: formatINR(p.totalCost),
        date: p.purchaseDate,
        badgeText: p.paymentStatus,
        badgeClass:
          p.paymentStatus === 'Fully Paid'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : p.paymentStatus === 'Partially Paid'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-rose-50 text-rose-700 border-rose-200',
        icon: ShoppingBag,
        accentColor: 'text-rose-600'
      };
    }),
    ...recentProcessing.map((proc) => {
      const supp = supplierMap.get(proc.supplierId);
      const spName = resolveSpeciesName(proc.speciesId, 'Seafood');
      return {
        id: `pr-${proc.id}`,
        type: 'production' as const,
        typeName: 'Processing Lot',
        targetTab: 'processing-log',
        code: proc.entryNo,
        party: supp?.name || 'Plant Raw Lot',
        detail: `${spName} · ${proc.slabsCount} Slabs`,
        metric: formatKg(proc.processedWeightKg),
        date: proc.processingDate,
        badgeText: `${proc.slabsCount} Slabs`,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: Factory,
        accentColor: 'text-amber-700'
      };
    }),
    ...recentSales.map((inv) => {
      const buyer = customerMap.get(inv.consigneeId);
      return {
        id: `s-${inv.id}`,
        type: 'sales' as const,
        typeName: 'Export Invoice',
        targetTab: 'invoices',
        code: inv.invoiceNo,
        party: buyer?.name || 'Consignee',
        detail: `${formatKg(inv.totalWeightKg)} · ${inv.orderNo || 'Contract'}`,
        metric: `$${inv.totalAmountCurrency.toLocaleString()}`,
        date: inv.invoiceDate,
        badgeText: inv.realizationStatus,
        badgeClass:
          inv.realizationStatus === 'Fully Realized'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-rose-50 text-rose-700 border-rose-200',
        icon: TrendingUp,
        accentColor: 'text-rose-600'
      };
    })
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

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
              <RoleSwitcher />
              <span className="text-xs text-ink-500 font-medium hidden sm:inline">
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

      {/* 2. ALTERNATING FULL-WIDTH SECTION: CORE MODULE TILES CAROUSEL (Filtered by Role Permissions) */}
      <Carousel
        title="Operational Workspaces"
        subtitle={`Role-authorized modules configured for ${currentUser.designation}.`}
        badge={
          <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
            Role: {currentUser.role.replace('_', ' ').toUpperCase()}
          </span>
        }
        autoPlay={true}
        autoPlayInterval={6500}
        style="peeking"
        depthEffect="subtle"
        cardWidthClass="w-[90%] sm:w-[48%] lg:w-[24.2%]"
        showIndicators={true}
        showArrows={true}
        showCount={true}
        viewAllLink={{
          label: 'Command palette (Ctrl+K)',
          onClick: onOpenCommandPalette,
          showEndCard: true,
          endCardTitle: 'All Workspaces',
          endCardDescription: 'Use the Command Palette to jump to any module or ledger instantly.'
        }}
      >
        {/* PURCHASE MODULE TILE */}
        <div className="h-full group relative glass-surface-regular card-liquid-hover rounded-3xl p-6 sm:p-7 border border-white/80 hover:border-rose-300 shadow-xs flex flex-col justify-between">
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
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold btn-liquid"
            >
              <span>Open Purchase Workspace</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* PRODUCTION MODULE TILE */}
        <div className="h-full group relative glass-surface-regular card-liquid-hover rounded-3xl p-6 sm:p-7 border border-white/80 hover:border-amber-300 shadow-xs flex flex-col justify-between">
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
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-ink-900 hover:bg-black text-white text-xs font-bold btn-liquid"
            >
              <span>Open Production Workspace</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* SALES MODULE TILE */}
        <div className="h-full group relative glass-surface-regular card-liquid-hover rounded-3xl p-6 sm:p-7 border border-white/80 hover:border-rose-300 shadow-xs flex flex-col justify-between">
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
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold btn-liquid"
            >
              <span>Open Commercial Workspace</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* INVENTORY VALUATION MODULE TILE */}
        <div className="h-full group relative glass-surface-regular card-liquid-hover rounded-3xl p-6 sm:p-7 border border-white/80 hover:border-emerald-300 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                <Boxes className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Moving Avg
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-ink-900 group-hover:text-emerald-700 transition">
                Perpetual Inventory
              </h3>
              <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                Moving weighted average cost ledger, finished Vannamei yields, NRV checks and month-end period close.
              </p>
            </div>

            {/* Snapshot metrics */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
              <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                <span className="text-[10px] font-bold text-ink-500 uppercase block">Stock on Hand</span>
                <span className="text-sm font-extrabold text-ink-900 mt-0.5 block">{formatKg(inventoryCalculation.totalClosingQty)}</span>
              </div>
              <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                <span className="text-[10px] font-bold text-ink-500 uppercase block">Stock Valuation</span>
                <span className="text-sm font-extrabold text-emerald-700 mt-0.5 block">{formatINR(inventoryCalculation.totalClosingValue)}</span>
              </div>
            </div>

            {/* Sub-links */}
            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => onNavigate('inventory', 'stock-card')}
                className="font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
              >
                Stock Card
              </button>
              <span className="text-gray-300">·</span>
              <button
                onClick={() => onNavigate('inventory', 'stock-position')}
                className="font-medium text-ink-600 hover:text-emerald-700 hover:underline"
              >
                Position
              </button>
              <span className="text-gray-300">·</span>
              <button
                onClick={() => onNavigate('inventory', 'reports-hub')}
                className="font-medium text-ink-600 hover:text-emerald-700 hover:underline"
              >
                Reports
              </button>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={() => onNavigate('inventory', 'inv-dashboard')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold btn-liquid"
            >
              <span>Open Inventory Workspace</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </Carousel>

      {/* 3. ALTERNATING SECTION: HIGH-FREQUENCY SHORTCUT TILES */}
      <section className="glass-surface-regular rounded-3xl p-6 sm:p-8 border border-white/80 shadow-xs space-y-4">
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
              className="p-4 rounded-2xl glass-surface-blush border border-rose-200 text-left card-liquid-hover flex flex-col justify-between group"
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
              className="p-4 rounded-2xl bg-amber-50/50 backdrop-blur-md hover:bg-amber-100/70 border border-amber-200/80 text-left card-liquid-hover flex flex-col justify-between group"
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
              className="p-4 rounded-2xl bg-emerald-50/50 backdrop-blur-md hover:bg-emerald-100/70 border border-emerald-200/80 text-left card-liquid-hover flex flex-col justify-between group"
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
            className="p-4 rounded-2xl glass-surface-thin hover:border-gray-300 text-left card-liquid-hover flex flex-col justify-between group"
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
            className="p-4 rounded-2xl glass-surface-thin hover:border-gray-300 text-left card-liquid-hover flex flex-col justify-between group"
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

      {/* 4. SCROLLABLE CAROUSEL STRIP OF RECENT ENTRIES (Purchases, Processing Lots, Sales Invoices) */}
      <section className="space-y-6">
        <Carousel
          title="Live Feed of Recent Transactions"
          subtitle="Swipeable audit trail of recent harbour landings, plant floor processing lots, and export shipments."
          icon={Clock}
          badge={
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              {combinedRecentEntries.length} Live Entries
            </span>
          }
          style="peeking"
          depthEffect="subtle"
          cardWidthClass="w-[85%] sm:w-[48%] md:w-[32%] lg:w-[24%]"
          showIndicators={true}
          showArrows={true}
          showCount={true}
          viewAllLink={{
            label: 'View all register',
            onClick: () => onNavigate('purchase', 'purchases'),
            showEndCard: true,
            endCardTitle: 'View Complete Register',
            endCardDescription: 'Scan every single harbour landing, factory batch, and shipping bill.'
          }}
          items={combinedRecentEntries}
          renderItem={(entry) => (
            <div
              onClick={() => onNavigate(entry.type, entry.targetTab)}
              className="h-full min-h-[160px] p-4 sm:p-5 rounded-2xl glass-surface-regular hover:bg-white border border-gray-100 hover:border-rose-200 cursor-pointer transition flex flex-col justify-between group shadow-2xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-ink-700 uppercase tracking-wide">
                    <entry.icon className={`w-3 h-3 ${entry.accentColor}`} />
                    {entry.typeName}
                  </span>
                  <span className="text-[10px] text-ink-400 font-mono">{entry.date}</span>
                </div>

                <div>
                  <div className="font-extrabold text-sm text-ink-900 group-hover:text-rose-700 transition flex items-center justify-between">
                    <span>{entry.code}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-rose-600" />
                  </div>
                  <div className="text-xs font-semibold text-ink-700 mt-0.5 truncate">
                    {entry.party}
                  </div>
                  <div className="text-[11px] text-ink-500 mt-0.5 truncate">
                    {entry.detail}
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                <div className="font-black text-sm text-ink-900 font-mono">
                  {entry.metric}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${entry.badgeClass}`}>
                  {entry.badgeText}
                </span>
              </div>
            </div>
          )}
        />

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
                const spName = resolveSpeciesName(p.speciesId, 'Raw Catch');
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
                      <div className="text-[11px] text-ink-500">{spName} · {formatKg(p.weightKg)}</div>
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
                const spName = resolveSpeciesName(proc.speciesId, 'Seafood');
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
                      <div className="text-[11px] text-ink-500">{spName}</div>
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
