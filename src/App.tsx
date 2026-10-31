import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar, ActiveModuleType } from './components/common/Navbar';
import { Sidebar, NavTab } from './components/common/Sidebar';
import { ProductionSidebar, ProductionNavTab } from './components/production/ProductionSidebar';
import { SalesSidebar, SalesNavTab } from './components/sales/SalesSidebar';
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
  Menu,
  X,
  Factory,
  Layers,
  BarChart3,
  TrendingUp,
  FileText,
  Home,
  ShoppingBag
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

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFB] text-[#1E1E24]">
      {/* Figma-Inspired Global Shell Sticky Top Bar */}
      <Navbar
        activeModule={activeModule}
        onModuleChange={(mod) => {
          setActiveModule(mod);
          setIsMobileMenuOpen(false);
        }}
        onNavigateTab={(mod, tab) => handleNavigateDirect(mod, tab)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleNavigateDirect}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (Rendered when in Purchase, Production or Sales modules) */}
        {activeModule !== 'home' && (
          <div className="hidden md:block">
            {activeModule === 'purchase' ? (
              <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
            ) : activeModule === 'production' ? (
              <ProductionSidebar activeTab={productionTab} onTabChange={setProductionTab} />
            ) : (
              <SalesSidebar activeTab={salesTab} onTabChange={setSalesTab} />
            )}
          </div>
        )}

        {/* Mobile Slide-in Drawer Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-black/40 backdrop-blur-xs flex">
            <div className="w-80 max-w-[85%] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
              <div className="p-4 border-b flex justify-between items-center bg-rose-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                    CM
                  </div>
                  <span className="font-bold text-ink-900 text-sm">
                    {activeModule === 'home'
                      ? 'Global Navigation'
                      : activeModule === 'purchase'
                      ? 'Procurement Menu'
                      : activeModule === 'production'
                      ? 'Production Menu'
                      : 'Commercial Export Menu'}
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-ink-500 hover:text-rose-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Module Switcher in mobile drawer */}
              <div className="p-3 bg-gray-50 border-b border-gray-100 grid grid-cols-4 gap-1 text-[11px] font-bold text-center">
                <button
                  onClick={() => {
                    setActiveModule('home');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`py-1.5 rounded-lg transition ${activeModule === 'home' ? 'bg-rose-600 text-white' : 'text-ink-700 hover:bg-white'}`}
                >
                  Home
                </button>
                <button
                  onClick={() => {
                    setActiveModule('purchase');
                  }}
                  className={`py-1.5 rounded-lg transition ${activeModule === 'purchase' ? 'bg-rose-600 text-white' : 'text-ink-700 hover:bg-white'}`}
                >
                  Buy
                </button>
                <button
                  onClick={() => {
                    setActiveModule('production');
                  }}
                  className={`py-1.5 rounded-lg transition ${activeModule === 'production' ? 'bg-rose-600 text-white' : 'text-ink-700 hover:bg-white'}`}
                >
                  Plant
                </button>
                <button
                  onClick={() => {
                    setActiveModule('sales');
                  }}
                  className={`py-1.5 rounded-lg transition ${activeModule === 'sales' ? 'bg-rose-600 text-white' : 'text-ink-700 hover:bg-white'}`}
                >
                  Sales
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {activeModule === 'purchase' ? (
                  <Sidebar
                    activeTab={activeTab}
                    onTabChange={(tab) => {
                      setActiveTab(tab);
                      setIsMobileMenuOpen(false);
                    }}
                  />
                ) : activeModule === 'production' ? (
                  <ProductionSidebar
                    activeTab={productionTab}
                    onTabChange={(tab) => {
                      setProductionTab(tab);
                      setIsMobileMenuOpen(false);
                    }}
                  />
                ) : activeModule === 'sales' ? (
                  <SalesSidebar
                    activeTab={salesTab}
                    onTabChange={(tab) => {
                      setSalesTab(tab);
                      setIsMobileMenuOpen(false);
                    }}
                  />
                ) : (
                  <div className="p-4 space-y-3 text-xs">
                    <p className="text-ink-500 font-medium">Select an operational module to open screen list:</p>
                    <button
                      onClick={() => {
                        setActiveModule('purchase');
                        setActiveTab('dashboard');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left p-3 rounded-xl bg-gray-50 font-bold text-ink-900 hover:bg-rose-50 hover:text-rose-700 flex items-center justify-between"
                    >
                      <span>Purchase &amp; Procurement</span>
                      <Receipt className="w-4 h-4 text-rose-600" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveModule('production');
                        setProductionTab('prod-dashboard');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left p-3 rounded-xl bg-gray-50 font-bold text-ink-900 hover:bg-amber-50 hover:text-amber-800 flex items-center justify-between"
                    >
                      <span>Factory Floor &amp; Production</span>
                      <Factory className="w-4 h-4 text-amber-700" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveModule('sales');
                        setSalesTab('sales-dashboard');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left p-3 rounded-xl bg-gray-50 font-bold text-ink-900 hover:bg-rose-50 hover:text-rose-700 flex items-center justify-between"
                    >
                      <span>Commercial Sales &amp; Export</span>
                      <TrendingUp className="w-4 h-4 text-rose-600" />
                    </button>
                  </div>
                )}
              </div>
            </div>
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

      {/* Mobile Bottom Navigation Bar (Context aware with Home) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 flex items-center justify-around py-2 px-1 shadow-lg print:hidden">
        <button
          onClick={() => setActiveModule('home')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            activeModule === 'home' ? 'text-rose-600' : 'text-ink-500'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>

        {activeModule === 'purchase' ? (
          <>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                activeTab === 'dashboard' ? 'text-rose-600' : 'text-ink-500'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            {permissions.canCreateEditPurchases && (
              <button
                onClick={() => setActiveTab('purchase-entry')}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  activeTab === 'purchase-entry' ? 'text-rose-600' : 'text-ink-500'
                }`}
              >
                <PlusCircle className="w-5 h-5 text-rose-600 animate-pulse" />
                <span>Harbour Entry</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('purchases')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                activeTab === 'purchases' ? 'text-rose-600' : 'text-ink-500'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Purchases</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                activeTab === 'payments' ? 'text-rose-600' : 'text-ink-500'
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
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                productionTab === 'prod-dashboard' ? 'text-rose-600' : 'text-ink-500'
              }`}
            >
              <Factory className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            {permissions.canCreateEditPurchases && (
              <button
                onClick={() => setProductionTab('daily-entry')}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  productionTab === 'daily-entry' ? 'text-rose-600' : 'text-ink-500'
                }`}
              >
                <PlusCircle className="w-5 h-5 text-rose-600 animate-pulse" />
                <span>Plant Entry</span>
              </button>
            )}

            <button
              onClick={() => setProductionTab('processing-log')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                productionTab === 'processing-log' ? 'text-rose-600' : 'text-ink-500'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Lots</span>
            </button>

            <button
              onClick={() => setProductionTab('prod-reports')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                productionTab === 'prod-reports' ? 'text-rose-600' : 'text-ink-500'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reports</span>
            </button>
          </>
        ) : activeModule === 'sales' ? (
          <>
            <button
              onClick={() => setSalesTab('sales-dashboard')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                salesTab === 'sales-dashboard' ? 'text-rose-600' : 'text-ink-500'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            {permissions.canCreateEditSales && (
              <button
                onClick={() => setSalesTab('invoice-entry')}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  salesTab === 'invoice-entry' ? 'text-rose-600' : 'text-ink-500'
                }`}
              >
                <PlusCircle className="w-5 h-5 text-rose-600 animate-pulse" />
                <span>New Invoice</span>
              </button>
            )}

            <button
              onClick={() => setSalesTab('invoices')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                salesTab === 'invoices' ? 'text-rose-600' : 'text-ink-500'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Invoices</span>
            </button>

            <button
              onClick={() => setSalesTab('sales-reports')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                salesTab === 'sales-reports' ? 'text-rose-600' : 'text-ink-500'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reports</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => setActiveModule('purchase')}
            className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-ink-500"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Procurement</span>
          </button>
        )}

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-ink-500 hover:text-rose-600"
        >
          <Menu className="w-4 h-4" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DataProvider>
          <MainLayout />
        </DataProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
