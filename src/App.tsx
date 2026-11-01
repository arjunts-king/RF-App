import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import { LiquidGlassProvider, useLiquidGlass } from './context/LiquidGlassContext';
import { Navbar, ActiveModuleType } from './components/common/Navbar';
import { Sidebar, NavTab } from './components/common/Sidebar';
import { ProductionNavTab } from './components/production/ProductionSidebar';
import { SalesNavTab } from './components/sales/SalesSidebar';
import { HomeScreen } from './components/home/HomeScreen';
import { CommandPalette } from './components/common/CommandPalette';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { PurchaseEntryForm } from './components/purchase/PurchaseEntryForm';
import { PurchaseList } from './components/purchase/PurchaseList';
import { PurchaseReturnsView } from './components/purchase/PurchaseReturnsView';
import { BatchExpenseView } from './components/purchase/BatchExpenseView';
import { SupplierLedgerView } from './components/payments/SupplierLedgerView';
import { OutstandingReport } from './components/payments/OutstandingReport';
import { OperationalReportsHub } from './components/reports/OperationalReportsHub';
import { DataQualityPanel } from './components/dashboard/DataQualityPanel';
import { MasterDataManager } from './components/master/MasterDataManager';
import { AuditLogView } from './components/admin/AuditLogView';
import { UserManagementView } from './components/admin/UserManagementView';
import { BusinessSettingsView } from './components/settings/BusinessSettingsView';
import { ExcelImportView } from './components/excel/ExcelImportView';
import { ProductionDashboard } from './components/production/ProductionDashboard';
import { DailyProcessingEntryForm } from './components/production/DailyProcessingEntryForm';
import { ProcessingRecordList } from './components/production/ProcessingRecordList';
import { SlabTypeManager } from './components/production/SlabTypeManager';
import { ProductionReportsHub } from './components/production/ProductionReportsHub';
import { SalesDashboard } from './components/sales/SalesDashboard';
import { SalesInvoiceEntryForm } from './components/sales/SalesInvoiceEntryForm';
import { SalesInvoiceList } from './components/sales/SalesInvoiceList';
import { CustomerManager } from './components/sales/CustomerManager';
import { PortManager } from './components/sales/PortManager';
import { SalesReportsHub } from './components/sales/SalesReportsHub';
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  BookOpen,
  Factory,
  Layers,
  BarChart3,
  TrendingUp,
  FileText,
  Home
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ActiveModuleType>('home');
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [returnPurchaseId, setReturnPurchaseId] = useState<string | undefined>();
  const [productionTab, setProductionTab] = useState<ProductionNavTab>('prod-dashboard');
  const [salesTab, setSalesTab] = useState<SalesNavTab>('sales-dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { permissions } = useAuth();
  const { ambientGlow } = useLiquidGlass();

  // Global Command Palette Shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigateDirect = (module: 'purchase' | 'production' | 'sales' | 'home', tab: string) => {
    if (module === 'home') {
      setActiveModule('home');
      setIsMobileMenuOpen(false);
      return;
    }
    setActiveModule(module);
    if (module === 'purchase') {
      setActiveTab(tab as NavTab);
    } else if (module === 'production') {
      setProductionTab(tab as ProductionNavTab);
    } else if (module === 'sales') {
      setSalesTab(tab as SalesNavTab);
    }
    setIsMobileMenuOpen(false);
  };

  const getCurrentBreadcrumb = (): string => {
    if (activeModule === 'home') return 'Operational Overview';
    if (activeModule === 'purchase') {
      const tabNames: Record<NavTab, string> = {
        'dashboard': 'Executive Dashboard',
        'purchase-entry': 'Harbour Purchase Entry',
        'purchases': 'Purchase Transactions',
        'purchase-returns': 'Debit Notes & Returns',
        'batch-expenses': 'Batch Expenses & Yield Engine',
        'payments': 'Supplier Ledger & Statements',
        'outstanding': 'Outstanding & Ageing',
        'reports': 'Operational Reports Hub',
        'data-quality': 'Data Quality & Reconciliation',
        'master-data': 'Master Reference Data',
        'excel-import': 'Excel Import & Migration',
        'user-mgmt': 'Staff & User Management',
        'audit-log': 'Surveillance Audit Trail',
        'settings': 'Business Settings'
      };
      return tabNames[activeTab] || 'Procurement';
    }
    if (activeModule === 'production') {
      const prodNames: Record<ProductionNavTab, string> = {
        'prod-dashboard': 'Production Dashboard',
        'daily-entry': 'Daily Processing Entry',
        'processing-log': 'Processing Records & Lots',
        'slab-types': 'Slab Types Master',
        'prod-reports': 'Production Reports Hub',
        'master-data': 'Shared Master Data',
        'audit-log': 'Surveillance Audit Trail'
      };
      return prodNames[productionTab] || 'Production';
    }
    if (activeModule === 'sales') {
      const salesNames: Record<SalesNavTab, string> = {
        'sales-dashboard': 'Commercial Dashboard',
        'invoice-entry': 'Commercial Invoice Entry',
        'invoices': 'Invoices & Shipments',
        'realizations': 'Realization & Settlement',
        'customers': 'Consignees & Buyers',
        'ports': 'Port Master',
        'master-data': 'Shared Master Data',
        'sales-reports': 'Commercial Reports Hub',
        'audit-log': 'Surveillance Audit Trail'
      };
      return salesNames[salesTab] || 'Commercial Export';
    }
    return '';
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-white relative overflow-x-hidden">
      {/* Ambient Fluid Glow Orbs on Crimson Canvas */}
      {ambientGlow && (
        <div className="liquid-ambient-backdrop" aria-hidden="true">
          <div className="liquid-orb-1" />
          <div className="liquid-orb-2" />
          <div className="liquid-orb-3" />
        </div>
      )}

      {/* Clean Top Utility Bar with Liquid Glass */}
      <Navbar
        activeModule={activeModule}
        onModuleChange={(mod) => {
          if (mod === 'reports') {
            setActiveModule('purchase');
            setActiveTab('reports');
          } else {
            setActiveModule(mod);
          }
          setIsMobileMenuOpen(false);
        }}
        onNavigateTab={(mod, tab) => handleNavigateDirect(mod, tab)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        currentBreadcrumb={getCurrentBreadcrumb()}
      />

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleNavigateDirect}
      />

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Persistent Desktop Sidebar */}
        <div className="hidden md:block h-full shrink-0">
          <Sidebar
            activeModule={activeModule}
            onModuleChange={(mod) => {
              if (mod === 'reports') {
                setActiveModule('purchase');
                setActiveTab('reports');
              } else {
                setActiveModule(mod);
              }
            }}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            productionTab={productionTab}
            onProductionTabChange={setProductionTab}
            salesTab={salesTab}
            onSalesTabChange={setSalesTab}
            onNavigateDirect={handleNavigateDirect}
          />
        </div>

        {/* Mobile Slide-in Drawer Menu with Persistent Sidebar Navigation */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-md flex">
            <div className="w-80 max-w-[85%] h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
              <Sidebar
                activeModule={activeModule}
                onModuleChange={(mod) => {
                  if (mod === 'reports') {
                    setActiveModule('purchase');
                    setActiveTab('reports');
                  } else {
                    setActiveModule(mod);
                  }
                  setIsMobileMenuOpen(false);
                }}
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  setIsMobileMenuOpen(false);
                }}
                productionTab={productionTab}
                onProductionTabChange={(tab) => {
                  setProductionTab(tab);
                  setIsMobileMenuOpen(false);
                }}
                salesTab={salesTab}
                onSalesTabChange={(tab) => {
                  setSalesTab(tab);
                  setIsMobileMenuOpen(false);
                }}
                onNavigateDirect={handleNavigateDirect}
                onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
              />
            </div>
            <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-12">
          {activeModule === 'home' ? (
            <HomeScreen
              onNavigate={handleNavigateDirect}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            />
          ) : activeModule === 'purchase' ? (
            <>
              {activeTab === 'dashboard' && <DashboardOverview onNavigateTab={(tab) => setActiveTab(tab as NavTab)} />}
              {activeTab === 'purchase-entry' && (
                <PurchaseEntryForm onSuccess={() => setActiveTab('purchases')} />
              )}
              {activeTab === 'purchases' && (
                <PurchaseList
                  onNavigate={setActiveTab}
                  onSelectForReturn={(pId) => {
                    setReturnPurchaseId(pId);
                    setActiveTab('purchase-returns');
                  }}
                />
              )}
              {activeTab === 'purchase-returns' && (
                <PurchaseReturnsView
                  onNavigate={setActiveTab}
                  preselectedPurchaseId={returnPurchaseId}
                  onClearPreselectedPurchase={() => setReturnPurchaseId(undefined)}
                />
              )}
              {activeTab === 'batch-expenses' && <BatchExpenseView />}
              {activeTab === 'payments' && <SupplierLedgerView />}
              {activeTab === 'outstanding' && <OutstandingReport />}
              {activeTab === 'reports' && <OperationalReportsHub />}
              {activeTab === 'data-quality' && <DataQualityPanel />}
              {activeTab === 'master-data' && <MasterDataManager onNavigate={setActiveTab} />}
              {activeTab === 'audit-log' && <AuditLogView />}
              {activeTab === 'user-mgmt' && <UserManagementView />}
              {activeTab === 'excel-import' && <ExcelImportView onNavigate={setActiveTab} />}
              {activeTab === 'settings' && <BusinessSettingsView />}
            </>
          ) : activeModule === 'production' ? (
            <>
              {productionTab === 'prod-dashboard' && (
                <ProductionDashboard onNavigate={(tab) => setProductionTab(tab as ProductionNavTab)} />
              )}
              {productionTab === 'daily-entry' && (
                <DailyProcessingEntryForm onSuccess={() => setProductionTab('processing-log')} />
              )}
              {productionTab === 'processing-log' && (
                <ProcessingRecordList onNavigate={(tab) => setProductionTab(tab as ProductionNavTab)} />
              )}
              {productionTab === 'slab-types' && <SlabTypeManager />}
              {productionTab === 'prod-reports' && <ProductionReportsHub />}
              {productionTab === 'master-data' && <MasterDataManager onNavigate={setActiveTab} />}
              {productionTab === 'audit-log' && <AuditLogView />}
            </>
          ) : (
            <>
              {salesTab === 'sales-dashboard' && (
                <SalesDashboard onNavigate={(tab) => setSalesTab(tab as SalesNavTab)} />
              )}
              {salesTab === 'invoice-entry' && (
                <SalesInvoiceEntryForm onSuccess={() => setSalesTab('invoices')} />
              )}
              {salesTab === 'invoices' && (
                <SalesInvoiceList onNavigate={(tab) => setSalesTab(tab as SalesNavTab)} />
              )}
              {salesTab === 'realizations' && (
                <SalesInvoiceList onNavigate={(tab) => setSalesTab(tab as SalesNavTab)} />
              )}
              {salesTab === 'customers' && <CustomerManager />}
              {salesTab === 'ports' && <PortManager />}
              {salesTab === 'master-data' && <MasterDataManager onNavigate={setActiveTab} />}
              {salesTab === 'sales-reports' && <SalesReportsHub />}
              {salesTab === 'audit-log' && <AuditLogView />}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (White Glass Surface on Red Canvas) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-surface-thin border-t border-white/30 z-30 flex items-center justify-around py-2 px-1 shadow-[0_-4px_25px_rgba(0,0,0,0.4)] print:hidden text-white">
        <button
          onClick={() => setActiveModule('home')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
            activeModule === 'home' ? 'text-white font-black' : 'text-white/60 hover:text-white'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Overview</span>
        </button>

        {activeModule === 'purchase' ? (
          <>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
                activeTab === 'dashboard' ? 'text-white font-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            {permissions.canCreateEditPurchases && (
              <button
                onClick={() => setActiveTab('purchase-entry')}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
                  activeTab === 'purchase-entry' ? 'text-white font-black' : 'text-white/60 hover:text-white'
                }`}
              >
                <PlusCircle className="w-5 h-5 text-rose-300 animate-pulse" />
                <span>Harbour Entry</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('purchases')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
                activeTab === 'purchases' ? 'text-white font-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Purchases</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
                activeTab === 'payments' ? 'text-white font-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Ledgers</span>
            </button>
          </>
        ) : activeModule === 'production' ? (
          <>
            <button
              onClick={() => setProductionTab('prod-dashboard')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
                productionTab === 'prod-dashboard' ? 'text-white font-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <Factory className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            {permissions.canCreateEditPurchases && (
              <button
                onClick={() => setProductionTab('daily-entry')}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
                  productionTab === 'daily-entry' ? 'text-white font-black' : 'text-white/60 hover:text-white'
                }`}
              >
                <PlusCircle className="w-5 h-5 text-amber-300 animate-pulse" />
                <span>Plant Entry</span>
              </button>
            )}

            <button
              onClick={() => setProductionTab('processing-log')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
                productionTab === 'processing-log' ? 'text-white font-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Lots</span>
            </button>

            <button
              onClick={() => setProductionTab('prod-reports')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
                productionTab === 'prod-reports' ? 'text-white font-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reports</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setSalesTab('sales-dashboard')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
                salesTab === 'sales-dashboard' ? 'text-white font-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            {permissions.canCreateEditSales && (
              <button
                onClick={() => setSalesTab('invoice-entry')}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
                  salesTab === 'invoice-entry' ? 'text-white font-black' : 'text-white/60 hover:text-white'
                }`}
              >
                <PlusCircle className="w-5 h-5 text-rose-300 animate-pulse" />
                <span>New Invoice</span>
              </button>
            )}

            <button
              onClick={() => setSalesTab('invoices')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
                salesTab === 'invoices' ? 'text-white font-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Shipments</span>
            </button>

            <button
              onClick={() => setSalesTab('sales-reports')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
                salesTab === 'sales-reports' ? 'text-white font-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reports</span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DataProvider>
          <LiquidGlassProvider>
            <MainLayout />
          </LiquidGlassProvider>
        </DataProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
