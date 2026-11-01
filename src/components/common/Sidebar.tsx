import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  LayoutDashboard,
  ShoppingBag,
  Factory,
  TrendingUp,
  BarChart3,
  PlusCircle,
  Receipt,
  RotateCcw,
  Layers,
  BookOpen,
  Clock,
  CheckCircle2,
  Database,
  ShieldAlert,
  UserPlus,
  FileSpreadsheet,
  Settings,
  Boxes,
  FileText,
  BadgeDollarSign,
  Users,
  Anchor,
  Compass
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'purchase-entry'
  | 'purchases'
  | 'purchase-returns'
  | 'batch-expenses'
  | 'payments'
  | 'outstanding'
  | 'reports'
  | 'data-quality'
  | 'excel-import'
  | 'master-data'
  | 'audit-log'
  | 'user-mgmt'
  | 'settings';

export type ActiveModuleType = 'home' | 'purchase' | 'production' | 'sales' | 'reports';

interface SidebarProps {
  activeModule?: ActiveModuleType;
  onModuleChange?: (module: ActiveModuleType) => void;
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
  productionTab?: string;
  onProductionTabChange?: (tab: any) => void;
  salesTab?: string;
  onSalesTabChange?: (tab: any) => void;
  onNavigateDirect?: (module: 'purchase' | 'production' | 'sales' | 'home', tab: string) => void;
  onCloseMobileMenu?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule = 'purchase',
  onModuleChange,
  activeTab = 'dashboard',
  onTabChange,
  productionTab = 'prod-dashboard',
  onProductionTabChange,
  salesTab = 'sales-dashboard',
  onSalesTabChange,
  onNavigateDirect,
  onCloseMobileMenu
}) => {
  const { currentUser, permissions } = useAuth();
  const { businessSettings, purchases, processingEntries, salesInvoices } = useData();

  const activePurchases = purchases.filter((p) => !p.isVoided);
  const activeProcessing = processingEntries.filter((p) => !p.isVoided);
  const activeSales = salesInvoices.filter((s) => !s.isVoided);

  // 1. Primary Workspace Switching Items
  const workspaceItems: {
    id: ActiveModuleType;
    label: string;
    icon: any;
    badge?: string;
  }[] = [
    {
      id: 'home',
      label: 'Overview',
      icon: LayoutDashboard
    },
    {
      id: 'purchase',
      label: 'Purchase',
      icon: ShoppingBag,
      badge: `${activePurchases.length}`
    },
    {
      id: 'production',
      label: 'Production',
      icon: Factory,
      badge: `${activeProcessing.length}`
    },
    {
      id: 'sales',
      label: 'Sales',
      icon: TrendingUp,
      badge: `${activeSales.length}`
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      badge: 'Hub'
    }
  ];

  const handleWorkspaceClick = (modId: ActiveModuleType) => {
    if (onModuleChange) {
      onModuleChange(modId);
    } else if (onNavigateDirect) {
      if (modId === 'home') onNavigateDirect('home', '');
      else if (modId === 'purchase') onNavigateDirect('purchase', 'dashboard');
      else if (modId === 'production') onNavigateDirect('production', 'prod-dashboard');
      else if (modId === 'sales') onNavigateDirect('sales', 'sales-dashboard');
      else if (modId === 'reports') onNavigateDirect('purchase', 'reports');
    }
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  // 2. Sub-navigation definitions for each workspace
  const purchaseGroups = [
    {
      title: 'CORE PROCUREMENT',
      items: [
        { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, show: true },
        {
          id: 'purchase-entry',
          label: 'Harbour Purchase Entry',
          icon: PlusCircle,
          show: permissions.canCreateEditPurchases,
          badge: 'Field Form'
        },
        { id: 'purchases', label: 'Purchase Transactions', icon: Receipt, show: true },
        { id: 'purchase-returns', label: 'Purchase Returns (Debit Notes)', icon: RotateCcw, show: true },
        { id: 'batch-expenses', label: 'Batch Expenses & Yields', icon: Layers, show: true }
      ]
    },
    {
      title: 'ACCOUNTING & LEDGERS',
      items: [
        { id: 'payments', label: 'Supplier Ledger & Payments', icon: BookOpen, show: true },
        { id: 'outstanding', label: 'Outstanding & Ageing (180+d)', icon: Clock, show: true }
      ]
    },
    {
      title: 'ANALYTICS & CONTROL',
      items: [
        { id: 'reports', label: 'Operational Reports Hub', icon: BarChart3, show: true },
        { id: 'data-quality', label: 'Data Quality & Reconciliation', icon: CheckCircle2, show: true }
      ]
    },
    {
      title: 'CONFIGURATION & ADMIN',
      items: [
        {
          id: 'master-data',
          label: 'Master Reference Data',
          icon: Database,
          show: permissions.canManageMasterData
        },
        {
          id: 'excel-import',
          label: 'Excel Import & Migration',
          icon: FileSpreadsheet,
          show: true,
          badge: 'Import'
        },
        {
          id: 'user-mgmt',
          label: 'Staff & User Management',
          icon: UserPlus,
          show: permissions.canInviteUsers || permissions.canManageStaff
        },
        {
          id: 'audit-log',
          label: 'Surveillance Audit Trail',
          icon: ShieldAlert,
          show: permissions.canViewAuditLog,
          badge: 'Admin Only'
        },
        {
          id: 'settings',
          label: 'Business Settings & Data Reset',
          icon: Settings,
          show: true
        }
      ]
    }
  ];

  const productionGroups = [
    {
      title: 'CORE PRODUCTION',
      items: [
        { id: 'prod-dashboard', label: 'Production Dashboard', icon: Factory, show: true },
        {
          id: 'daily-entry',
          label: 'Daily Processing Entry',
          icon: PlusCircle,
          show: permissions.canCreateEditPurchases,
          badge: 'Shift Entry'
        },
        { id: 'processing-log', label: 'Processing Records & Lots', icon: Layers, show: true }
      ]
    },
    {
      title: 'PACKAGING & MASTERS',
      items: [
        { id: 'slab-types', label: 'Slab Types Master', icon: Boxes, show: permissions.canManageMasterData },
        { id: 'master-data', label: 'Shared Master Data', icon: Database, show: permissions.canManageMasterData }
      ]
    },
    {
      title: 'ANALYTICS & CONTROL',
      items: [
        { id: 'prod-reports', label: 'Production Reports Hub', icon: BarChart3, show: true },
        { id: 'audit-log', label: 'Surveillance Audit Trail', icon: ShieldAlert, show: permissions.canViewAuditLog, badge: 'Admin Only' }
      ]
    }
  ];

  const salesGroups = [
    {
      title: 'CORE COMMERCIAL',
      items: [
        { id: 'sales-dashboard', label: 'Commercial Dashboard', icon: TrendingUp, show: true },
        {
          id: 'invoice-entry',
          label: 'Commercial Invoice Entry',
          icon: PlusCircle,
          show: permissions.canCreateEditSales,
          badge: 'Export Bill'
        },
        { id: 'invoices', label: 'Invoices & Shipments', icon: FileText, show: true }
      ]
    },
    {
      title: 'SETTLEMENT & BANKING',
      items: [
        { id: 'realizations', label: 'Realization & Settlement', icon: BadgeDollarSign, show: true }
      ]
    },
    {
      title: 'COMMERCIAL MASTERS',
      items: [
        { id: 'customers', label: 'Consignees & Buyers', icon: Users, show: permissions.canManageSalesMasterData },
        { id: 'ports', label: 'Port Master', icon: Anchor, show: permissions.canManageSalesMasterData },
        { id: 'master-data', label: 'Shared Master Data', icon: Database, show: permissions.canManageMasterData }
      ]
    },
    {
      title: 'ANALYTICS & CONTROL',
      items: [
        { id: 'sales-reports', label: 'Commercial Reports Hub', icon: BarChart3, show: true },
        { id: 'audit-log', label: 'Surveillance Audit Trail', icon: ShieldAlert, show: permissions.canViewAuditLog, badge: 'Admin Only' }
      ]
    }
  ];

  const overviewQuickActions = [
    {
      label: 'New Harbour Purchase',
      desc: 'Mobile weighment form',
      icon: PlusCircle,
      onClick: () => {
        if (onNavigateDirect) onNavigateDirect('purchase', 'purchase-entry');
        if (onCloseMobileMenu) onCloseMobileMenu();
      },
      show: permissions.canCreateEditPurchases,
      isPrimary: true
    },
    {
      label: 'New Plant Entry',
      desc: 'Freezing & slab lot log',
      icon: Factory,
      onClick: () => {
        if (onNavigateDirect) onNavigateDirect('production', 'daily-entry');
        if (onCloseMobileMenu) onCloseMobileMenu();
      },
      show: permissions.canCreateEditPurchases
    },
    {
      label: 'New Export Invoice',
      desc: 'Commercial shipping bill',
      icon: FileText,
      onClick: () => {
        if (onNavigateDirect) onNavigateDirect('sales', 'invoice-entry');
        if (onCloseMobileMenu) onCloseMobileMenu();
      },
      show: permissions.canCreateEditSales
    },
    {
      label: 'Supplier Ledger',
      desc: 'Running statement & balance',
      icon: BookOpen,
      onClick: () => {
        if (onNavigateDirect) onNavigateDirect('purchase', 'payments');
        if (onCloseMobileMenu) onCloseMobileMenu();
      },
      show: true
    },
    {
      label: 'Outstanding Ageing',
      desc: '180+ Days bucket review',
      icon: Clock,
      onClick: () => {
        if (onNavigateDirect) onNavigateDirect('purchase', 'outstanding');
        if (onCloseMobileMenu) onCloseMobileMenu();
      },
      show: true
    },
    {
      label: 'Consolidated Reports',
      desc: '8 Cross-module analytics',
      icon: BarChart3,
      onClick: () => {
        if (onNavigateDirect) onNavigateDirect('purchase', 'reports');
        if (onCloseMobileMenu) onCloseMobileMenu();
      },
      show: true
    }
  ];

  return (
    <aside className="w-full md:w-64 lg:w-72 glass-surface-thin border-r border-white/20 flex flex-col shrink-0 h-full text-white select-none overflow-hidden backdrop-blur-2xl">
      {/* 1. COMPANY IDENTITY */}
      <div className="p-4 sm:p-5 border-b border-white/15 bg-white/5">
        <button
          onClick={() => handleWorkspaceClick('home')}
          className="flex items-center gap-3 text-left w-full group focus:outline-none"
          title="Return to Overview"
        >
          <div className="w-10 h-10 rounded-2xl bg-white text-rose-900 flex items-center justify-center shadow-md group-hover:scale-105 transition-all shrink-0 border border-white/90">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-rose-900">
              <path d="M18.5 8C17 6.5 14.5 6 12 7C9.5 8 7 9 4.5 8C3.5 10 3.5 14 4.5 16C7 15 9.5 16 12 17C14.5 18 17 17.5 18.5 16C20.5 14 20.5 10 18.5 8ZM15.5 11C14.95 11 14.5 10.55 14.5 10C14.5 9.45 14.95 9 15.5 9C16.05 9 16.5 9.45 16.5 10C16.5 10.55 16.05 11 15.5 11Z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-tight text-white group-hover:text-rose-100 transition truncate">
                {businessSettings.businessName}
              </span>
            </div>
            <p className="text-[11px] text-rose-100/80 font-medium leading-none mt-1 truncate">
              {businessSettings.tagline}
            </p>
          </div>
        </button>
      </div>

      {/* 2. PRIMARY WORKSPACES SECTION */}
      <div className="px-3 pt-4 pb-2">
        <div className="text-[10px] font-bold tracking-wider text-rose-200/90 uppercase px-3 mb-2 flex items-center justify-between">
          <span>Workspaces</span>
          <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.2 rounded font-mono">
            {businessSettings.financialYear}
          </span>
        </div>

        <nav className="space-y-1">
          {workspaceItems.map((item) => {
            const Icon = item.icon;
            const isWorkspaceActive =
              activeModule === item.id ||
              (item.id === 'reports' && activeModule === 'purchase' && activeTab === 'reports');

            return (
              <button
                key={item.id}
                onClick={() => handleWorkspaceClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isWorkspaceActive
                    ? 'bg-white text-rose-900 shadow-md font-bold border border-white/90'
                    : 'text-white/80 hover:bg-white/15 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isWorkspaceActive ? 'text-rose-900' : 'text-rose-200'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight shrink-0 ${
                      isWorkspaceActive
                        ? 'bg-rose-100 text-rose-900'
                        : 'bg-white/15 text-white border border-white/20'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. CONTEXT-AWARE SUB-NAVIGATION FOR ACTIVE WORKSPACE */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5 border-t border-white/10">
        {activeModule === 'home' ? (
          <div>
            <div className="text-[10px] font-bold tracking-wider text-rose-200/90 uppercase px-3 mb-2.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-rose-300" />
              <span>Quick Workflows</span>
            </div>
            <div className="space-y-1">
              {overviewQuickActions.filter(a => a.show).map((action, idx) => {
                const Icon = action.icon;
                return (
                  <button
                    key={idx}
                    onClick={action.onClick}
                    className={`w-full text-left p-2.5 rounded-xl transition flex items-start gap-2.5 group ${
                      action.isPrimary
                        ? 'bg-white text-rose-900 font-bold shadow-md hover:bg-white/95'
                        : 'hover:bg-white/15 text-white/90'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      action.isPrimary ? 'bg-rose-50 text-rose-900' : 'bg-white/15 text-white group-hover:bg-white group-hover:text-rose-900'
                    } transition-colors`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold leading-tight truncate ${action.isPrimary ? 'text-rose-900' : 'text-white'}`}>
                        {action.label}
                      </div>
                      <div className={`text-[10px] truncate mt-0.5 ${action.isPrimary ? 'text-rose-800' : 'text-rose-200/80'}`}>
                        {action.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : activeModule === 'purchase' ? (
          purchaseGroups.map((group) => {
            const visibleItems = group.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title}>
                <div className="text-[10px] font-bold tracking-wider text-rose-200/80 uppercase px-3 mb-1.5">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (onTabChange) onTabChange(item.id as NavTab);
                          if (onCloseMobileMenu) onCloseMobileMenu();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-white/25 text-white font-bold border border-white/30 backdrop-blur-md'
                            : 'text-white/75 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-rose-200/90'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-tight bg-white/20 text-white border border-white/30 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : activeModule === 'production' ? (
          productionGroups.map((group) => {
            const visibleItems = group.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title}>
                <div className="text-[10px] font-bold tracking-wider text-rose-200/80 uppercase px-3 mb-1.5">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = productionTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (onProductionTabChange) onProductionTabChange(item.id);
                          if (onCloseMobileMenu) onCloseMobileMenu();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-white/25 text-white font-bold border border-white/30 backdrop-blur-md'
                            : 'text-white/75 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-rose-200/90'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-tight bg-white/20 text-white border border-white/30 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : activeModule === 'sales' ? (
          salesGroups.map((group) => {
            const visibleItems = group.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title}>
                <div className="text-[10px] font-bold tracking-wider text-rose-200/80 uppercase px-3 mb-1.5">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = salesTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (onSalesTabChange) onSalesTabChange(item.id);
                          if (onCloseMobileMenu) onCloseMobileMenu();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-white/25 text-white font-bold border border-white/30 backdrop-blur-md'
                            : 'text-white/75 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-rose-200/90'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-tight bg-white/20 text-white border border-white/30 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          /* Reports Hub Workspace Navigation */
          <div className="space-y-4">
            <div className="text-[10px] font-bold tracking-wider text-rose-200/80 uppercase px-3 mb-1.5">
              ANALYTICAL HUBS
            </div>
            <div className="space-y-1">
              <button
                onClick={() => {
                  if (onNavigateDirect) onNavigateDirect('purchase', 'reports');
                  if (onCloseMobileMenu) onCloseMobileMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:bg-white/15"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-rose-300" />
                <span>Purchase Reports Hub</span>
              </button>
              <button
                onClick={() => {
                  if (onNavigateDirect) onNavigateDirect('production', 'prod-reports');
                  if (onCloseMobileMenu) onCloseMobileMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:bg-white/15"
              >
                <Factory className="w-3.5 h-3.5 text-amber-300" />
                <span>Production Reports Hub</span>
              </button>
              <button
                onClick={() => {
                  if (onNavigateDirect) onNavigateDirect('sales', 'sales-reports');
                  if (onCloseMobileMenu) onCloseMobileMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:bg-white/15"
              >
                <TrendingUp className="w-3.5 h-3.5 text-rose-300" />
                <span>Commercial Reports Hub</span>
              </button>
              <button
                onClick={() => {
                  if (onNavigateDirect) onNavigateDirect('purchase', 'data-quality');
                  if (onCloseMobileMenu) onCloseMobileMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:bg-white/15"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Data Quality & Reconciliation</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. FOOTER INFO */}
      <div className="p-3.5 border-t border-white/15 bg-white/5 text-xs text-white/90 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-rose-200">Session Role:</span>
          <span className="font-bold text-white text-[11px] px-2 py-0.5 rounded-full bg-white/20 border border-white/30 backdrop-blur-md">
            {currentUser.role.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <div className="text-[10px] text-rose-200/80 mt-1.5 flex items-center justify-between">
          <span>Coastal Marine Suite</span>
          <span className="font-mono">{businessSettings.financialYear}</span>
        </div>
      </div>
    </aside>
  );
};
