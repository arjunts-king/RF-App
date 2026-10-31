import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { RoleBadge } from './RoleBadge';
import { RoleSwitcher } from './RoleSwitcher';
import { Modal } from './Modal';
import { NotificationsPopover } from './NotificationsPopover';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Shield,
  Menu,
  ShoppingBag,
  Factory,
  TrendingUp,
  Search,
  Bell,
  ChevronDown,
  Home,
  PlusCircle,
  Receipt,
  RotateCcw,
  Layers,
  BookOpen,
  Clock,
  BarChart3,
  CheckCircle2,
  Database,
  UserPlus,
  ShieldAlert,
  FileSpreadsheet,
  Settings,
  Boxes,
  FileText,
  BadgeDollarSign,
  Users,
  Anchor
} from 'lucide-react';

export type ActiveModuleType = 'home' | 'purchase' | 'production' | 'sales';

interface NavbarProps {
  activeModule: ActiveModuleType;
  onModuleChange: (module: ActiveModuleType) => void;
  onNavigateTab: (module: 'purchase' | 'production' | 'sales', tab: string) => void;
  onOpenMobileMenu?: () => void;
  onOpenCommandPalette: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeModule,
  onModuleChange,
  onNavigateTab,
  onOpenMobileMenu,
  onOpenCommandPalette
}) => {
  const { currentUser, permissions } = useAuth();
  const { isOnline, offlineQueue, syncOfflineQueue, businessSettings, purchases, processingEntries, salesInvoices } = useData();
  const [showProfile, setShowProfile] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<'purchase' | 'production' | 'sales' | null>(null);

  const megaMenuRef = useRef<HTMLDivElement>(null);

  // Close mega-menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target as Node)) {
        setActiveMegaMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = purchases.filter((p) => !p.isVoided && p.balancePayable > 0 && p.dueDate && p.dueDate < todayStr).length;
  const varianceCount = processingEntries.filter((p) => !p.isVoided && p.hasSlabVariance).length;
  const pendingRealizationCount = salesInvoices.filter((inv) => !inv.isVoided && inv.realizationStatus !== 'Fully Realized').length;
  const totalAlerts = (offlineQueue.length > 0 ? 1 : 0) + (overdueCount > 0 ? 1 : 0) + (varianceCount > 0 ? 1 : 0) + (pendingRealizationCount > 0 ? 1 : 0);

  const purchaseGroups = [
    {
      title: 'CORE PROCUREMENT',
      items: [
        { id: 'dashboard', label: 'Executive Dashboard', icon: BarChart3, desc: 'Volume, landed cost & variance KPIs' },
        { id: 'purchase-entry', label: 'Harbour Purchase Entry', icon: PlusCircle, desc: 'Single-action mobile landing form', show: permissions.canCreateEditPurchases },
        { id: 'purchases', label: 'Purchase Transactions', icon: Receipt, desc: 'Sortable register, CSV & Tally XML' },
        { id: 'purchase-returns', label: 'Purchase Returns (Debit Notes)', icon: RotateCcw, desc: 'Rejection deductions & debit notes' },
        { id: 'batch-expenses', label: 'Shared Batch Expense Pools', icon: Layers, desc: 'Proportional ice & dalali cost distribution' }
      ]
    },
    {
      title: 'ACCOUNTING & LEDGERS',
      items: [
        { id: 'payments', label: 'Supplier Ledger & Payments', icon: BookOpen, desc: 'Running debits/credits & printable A4 statement' },
        { id: 'outstanding', label: 'Outstanding & Ageing (180+d)', icon: Clock, desc: 'Bucket analysis & overdue flags' }
      ]
    },
    {
      title: 'ANALYTICS & CONTROL',
      items: [
        { id: 'reports', label: 'Operational Reports Hub', icon: BarChart3, desc: '8 analytical views with MoM comparisons' },
        { id: 'data-quality', label: 'Data Quality & Reconciliation', icon: CheckCircle2, desc: 'Entry sum vs report sum verification' }
      ]
    },
    {
      title: 'CONFIGURATION & ADMIN',
      items: [
        { id: 'master-data', label: 'Master Reference Data', icon: Database, desc: 'Suppliers, species, grades, sizes & heads', show: permissions.canManageMasterData },
        { id: 'user-mgmt', label: 'Staff & User Management', icon: UserPlus, desc: 'Invite staff & role assignments', show: permissions.canInviteUsers || permissions.canManageStaff },
        { id: 'audit-log', label: 'Surveillance Audit Trail', icon: ShieldAlert, desc: 'Owner surveillance log', show: permissions.canViewAuditLog },
        { id: 'excel-import', label: 'Excel Import & Migration', icon: FileSpreadsheet, desc: 'Bulk purchase data import' },
        { id: 'settings', label: 'Business Settings & Reset', icon: Settings, desc: 'FY tag & company settings' }
      ]
    }
  ];

  const productionGroups = [
    {
      title: 'CORE PRODUCTION',
      items: [
        { id: 'prod-dashboard', label: 'Production Dashboard', icon: Factory, desc: 'Daily throughput, recovery & slab KPIs' },
        { id: 'daily-entry', label: 'Daily Processing Entry', icon: PlusCircle, desc: 'Record shift, weight & standard slabs', show: permissions.canCreateEditPurchases },
        { id: 'processing-log', label: 'Processing Records & Lots', icon: Layers, desc: 'Traceability lot audit trail' }
      ]
    },
    {
      title: 'PACKAGING & MASTERS',
      items: [
        { id: 'slab-types', label: 'Slab Types Master', icon: Boxes, desc: 'Block freezing standard weight (2.0 Kg)', show: permissions.canManageMasterData },
        { id: 'master-data', label: 'Shared Master Data', icon: Database, desc: 'Species, grades & supplier lookups', show: permissions.canManageMasterData }
      ]
    },
    {
      title: 'ANALYTICS & CONTROL',
      items: [
        { id: 'prod-reports', label: 'Production Reports Hub', icon: BarChart3, desc: 'Shift efficiency & recovery logs' },
        { id: 'audit-log', label: 'Surveillance Audit Trail', icon: ShieldAlert, desc: 'Exclusive surveillance view', show: permissions.canViewAuditLog }
      ]
    }
  ];

  const salesGroups = [
    {
      title: 'CORE COMMERCIAL',
      items: [
        { id: 'sales-dashboard', label: 'Commercial Dashboard', icon: TrendingUp, desc: 'Export value in USD & FOB analytics' },
        { id: 'invoice-entry', label: 'Commercial Invoice Entry', icon: PlusCircle, desc: 'Export shipping bills & container lines', show: permissions.canCreateEditSales },
        { id: 'invoices', label: 'Invoices & Shipments', icon: FileText, desc: 'Audit invoices & export status' }
      ]
    },
    {
      title: 'SETTLEMENT & BANKING',
      items: [
        { id: 'realizations', label: 'Realization & Settlement', icon: BadgeDollarSign, desc: 'Foreign exchange credit & FIRC tracking' }
      ]
    },
    {
      title: 'COMMERCIAL MASTERS',
      items: [
        { id: 'customers', label: 'Consignees & Buyers', icon: Users, desc: 'Foreign buyers & export credit terms', show: permissions.canManageSalesMasterData },
        { id: 'ports', label: 'Port Master', icon: Anchor, desc: 'Loading & destination ports', show: permissions.canManageSalesMasterData },
        { id: 'master-data', label: 'Shared Master Data', icon: Database, desc: 'Species & product forms', show: permissions.canManageMasterData }
      ]
    },
    {
      title: 'ANALYTICS & CONTROL',
      items: [
        { id: 'sales-reports', label: 'Commercial Reports Hub', icon: BarChart3, desc: 'Buyer breakdown & realization reports' },
        { id: 'audit-log', label: 'Surveillance Audit Trail', icon: ShieldAlert, desc: 'Surveillance audit trail', show: permissions.canViewAuditLog }
      ]
    }
  ];

  const handleMenuSelect = (module: 'purchase' | 'production' | 'sales', tabId: string) => {
    setActiveMegaMenu(null);
    onNavigateTab(module, tabId);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs px-4 lg:px-6 py-2.5 transition-all">
        <div className="flex items-center justify-between gap-3">
          {/* Brand Logo & Title with Home Link */}
          <div className="flex items-center gap-3">
            {onOpenMobileMenu && (
              <button
                onClick={onOpenMobileMenu}
                className="md:hidden p-1.5 -ml-1 text-ink-700 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                aria-label="Open mobile navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => onModuleChange('home')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
              title="Return to Home Dashboard"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-xs group-hover:bg-rose-700 transition-colors shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M18.5 8C17 6.5 14.5 6 12 7C9.5 8 7 9 4.5 8C3.5 10 3.5 14 4.5 16C7 15 9.5 16 12 17C14.5 18 17 17.5 18.5 16C20.5 14 20.5 10 18.5 8ZM15.5 11C14.95 11 14.5 10.55 14.5 10C14.5 9.45 14.95 9 15.5 9C16.05 9 16.5 9.45 16.5 10C16.5 10.55 16.05 11 15.5 11Z" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-tight text-ink-900 group-hover:text-rose-700 transition">
                    {businessSettings.businessName}
                  </span>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                    {businessSettings.financialYear}
                  </span>
                </div>
                <p className="text-[11px] text-ink-500 font-medium leading-none mt-0.5 truncate max-w-[190px]">
                  {businessSettings.tagline}
                </p>
              </div>
            </button>
          </div>

          {/* Module Switcher with Grouped Mega-Menu Dropdown Buttons */}
          <div ref={megaMenuRef} className="relative hidden md:flex items-center bg-gray-100/80 p-1 rounded-full border border-gray-200/80 text-xs font-semibold">
            {/* Home Pill */}
            <button
              onClick={() => {
                onModuleChange('home');
                setActiveMegaMenu(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                activeModule === 'home'
                  ? 'bg-rose-600 text-white shadow-2xs font-bold'
                  : 'text-ink-700 hover:text-rose-700 hover:bg-white/80'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            {/* Purchase Pill with Dropdown indicator */}
            <div className="relative">
              <button
                onClick={() => {
                  onModuleChange('purchase');
                  setActiveMegaMenu(activeMegaMenu === 'purchase' ? null : 'purchase');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                  activeModule === 'purchase'
                    ? 'bg-rose-600 text-white shadow-2xs font-bold'
                    : 'text-ink-700 hover:text-rose-700 hover:bg-white/80'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Purchase</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${activeMegaMenu === 'purchase' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Production Pill with Dropdown indicator */}
            <div className="relative">
              <button
                onClick={() => {
                  onModuleChange('production');
                  setActiveMegaMenu(activeMegaMenu === 'production' ? null : 'production');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                  activeModule === 'production'
                    ? 'bg-rose-600 text-white shadow-2xs font-bold'
                    : 'text-ink-700 hover:text-rose-700 hover:bg-white/80'
                }`}
              >
                <Factory className="w-3.5 h-3.5" />
                <span>Production</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${activeMegaMenu === 'production' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Sales Pill with Dropdown indicator */}
            <div className="relative">
              <button
                onClick={() => {
                  onModuleChange('sales');
                  setActiveMegaMenu(activeMegaMenu === 'sales' ? null : 'sales');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                  activeModule === 'sales'
                    ? 'bg-rose-600 text-white shadow-2xs font-bold'
                    : 'text-ink-700 hover:text-rose-700 hover:bg-white/80'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Sales</span>
                <span className={`text-[9px] uppercase px-1 py-0.2 rounded font-extrabold ${activeModule === 'sales' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-900'}`}>
                  New
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${activeMegaMenu === 'sales' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* GROUPED MEGA-MENU POPOVER FOR ACTIVE MODULE */}
            {activeMegaMenu && (
              <div className="absolute left-0 top-full mt-2 w-[720px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-ink-900 capitalize">
                      {activeMegaMenu} Workspace Navigation
                    </span>
                    <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      Grouped Mega-Menu
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveMegaMenu(null)}
                    className="text-xs text-ink-500 hover:text-rose-700 font-semibold"
                  >
                    Close Menu
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {(activeMegaMenu === 'purchase'
                    ? purchaseGroups
                    : activeMegaMenu === 'production'
                    ? productionGroups
                    : salesGroups
                  ).map((grp) => {
                    const visibleItems = grp.items.filter((i) => i.show === undefined || i.show);
                    if (visibleItems.length === 0) return null;
                    return (
                      <div key={grp.title} className="space-y-2">
                        <span className="text-[10px] font-bold tracking-wider text-ink-500 uppercase block">
                          {grp.title}
                        </span>
                        <div className="space-y-1">
                          {visibleItems.map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.id}
                                onClick={() => handleMenuSelect(activeMegaMenu, item.id)}
                                className="w-full text-left p-2 rounded-xl hover:bg-rose-50/70 transition flex items-start gap-2.5 group"
                              >
                                <div className="p-1.5 rounded-lg bg-gray-50 group-hover:bg-rose-600 text-ink-600 group-hover:text-white transition-colors shrink-0 mt-0.5">
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-ink-900 group-hover:text-rose-700 transition">
                                    {item.label}
                                  </div>
                                  <div className="text-[11px] text-ink-500 truncate mt-0.5">
                                    {item.desc}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Action Cluster: Search, Notifications, Role Simulator, PWA status, User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Global Search / Command Palette Shortcut */}
            <button
              onClick={onOpenCommandPalette}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-rose-50/50 border border-gray-200 text-ink-600 hover:text-ink-900 text-xs font-medium transition shadow-2xs group"
              title="Open Global Command Palette (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-rose-600 transition-colors" />
              <span className="hidden xl:inline">Search anything...</span>
              <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-white border border-gray-200 rounded text-ink-500 shadow-2xs">
                ⌘K
              </kbd>
            </button>

            {/* Notifications Button with Popover */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 rounded-full bg-gray-50 hover:bg-rose-50 border border-gray-200 text-ink-700 hover:text-rose-600 transition"
                title="System Notifications & Alerts"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {totalAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center shadow-xs animate-pulse">
                    {totalAlerts}
                  </span>
                )}
              </button>

              <NotificationsPopover
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                onNavigate={onNavigateTab}
              />
            </div>

            {/* Role Simulator Component */}
            <div className="hidden lg:block">
              <RoleSwitcher />
            </div>

            {/* Offline sync button if pending records */}
            {offlineQueue.length > 0 && (
              <button
                onClick={syncOfflineQueue}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-full shadow-2xs transition"
                title="Sync locally cached offline records"
              >
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Sync ({offlineQueue.length})</span>
              </button>
            )}

            {/* Network Status Badge */}
            <div
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
              }`}
            >
              {isOnline ? <Wifi className="w-3 h-3 text-emerald-600" /> : <WifiOff className="w-3 h-3 text-amber-700" />}
              <span className="text-[11px] font-semibold">{isOnline ? 'Live' : 'Offline'}</span>
            </div>

            {/* User Profile Pill showing Role as Fixed Read-Only Label */}
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-gray-50 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 transition text-left shrink-0"
              title="Click to view authenticated user credentials"
            >
              <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-bold text-ink-900 leading-tight truncate max-w-[110px]">
                  {currentUser.name}
                </div>
                <div className="text-[10px] font-bold text-rose-700 uppercase tracking-tight">
                  {currentUser.role.replace('_', ' ')}
                </div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* User Profile & Security Credentials Modal */}
      <Modal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        title="User Profile & Security Credentials"
        subtitle="Individual authenticated staff session"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <h4 className="text-base font-bold text-ink-900">{currentUser.name}</h4>
              <p className="text-xs text-ink-500">{currentUser.email}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <RoleBadge role={currentUser.role} size="sm" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-ink-500 block font-medium">Designation (Fixed Read-Only)</span>
              <span className="text-ink-900 font-semibold text-sm mt-0.5 block">{currentUser.designation}</span>
              <span className="text-[11px] text-ink-500 mt-1 block">Role change restricted to Owner/Admin</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-ink-500 block font-medium">Account ID</span>
              <span className="text-ink-900 font-semibold text-sm mt-0.5 block">{currentUser.id}</span>
              <span className="text-[11px] text-ink-500 mt-1 block">Created: {new Date(currentUser.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-xl text-xs space-y-2.5">
            <h5 className="font-bold text-ink-900 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-rose-600" />
              Active System Permissions (RBAC Enforcement):
            </h5>
            <ul className="space-y-1.5 text-ink-700">
              <li className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${currentUser.role === 'admin' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                Permanent Deletion Authority: <strong>{currentUser.role === 'admin' ? 'Granted (Exclusive)' : 'Denied'}</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${currentUser.role === 'admin' || currentUser.role === 'master_accountant' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                Transaction Voiding / Master Data Management: <strong>{currentUser.role === 'admin' || currentUser.role === 'master_accountant' ? 'Granted' : 'Denied'}</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${currentUser.role !== 'viewer' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                Transaction Entry (Purchase &amp; Production): <strong>{currentUser.role !== 'viewer' ? 'Granted' : 'Read-Only'}</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${currentUser.role === 'admin' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                Surveillance Audit Trail Access: <strong>{currentUser.role === 'admin' ? 'Granted (Exclusive)' : 'Denied'}</strong>
              </li>
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
};
