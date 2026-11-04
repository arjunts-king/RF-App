import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import { LiquidGlassProvider, useLiquidGlass } from './context/LiquidGlassContext';
import { Navbar, ActiveModuleType } from './components/common/Navbar';
import { Sidebar, NavTab } from './components/common/Sidebar';
import { ProductionSidebar, ProductionNavTab } from './components/production/ProductionSidebar';
import { SalesSidebar, SalesNavTab } from './components/sales/SalesSidebar';
import { HomeScreen } from './components/home/HomeScreen';
import { CommandPalette } from './components/common/CommandPalette';
import { RoleSwitcher } from './components/common/RoleSwitcher';
const DashboardOverview = lazy(() => import('./components/dashboard/DashboardOverview').then(m => ({ default: m.DashboardOverview })));
const PurchaseEntryForm = lazy(() => import('./components/purchase/PurchaseEntryForm').then(m => ({ default: m.PurchaseEntryForm })));
const PurchaseList = lazy(() => import('./components/purchase/PurchaseList').then(m => ({ default: m.PurchaseList })));
const PurchaseReturnsView = lazy(() => import('./components/purchase/PurchaseReturnsView').then(m => ({ default: m.PurchaseReturnsView })));
const BatchExpenseView = lazy(() => import('./components/purchase/BatchExpenseView').then(m => ({ default: m.BatchExpenseView })));
const SupplierLedgerView = lazy(() => import('./components/payments/SupplierLedgerView').then(m => ({ default: m.SupplierLedgerView })));
const OutstandingReport = lazy(() => import('./components/payments/OutstandingReport').then(m => ({ default: m.OutstandingReport })));
const OperationalReportsHub = lazy(() => import('./components/reports/OperationalReportsHub').then(m => ({ default: m.OperationalReportsHub })));
const DataQualityPanel = lazy(() => import('./components/dashboard/DataQualityPanel').then(m => ({ default: m.DataQualityPanel })));
const MasterDataManager = lazy(() => import('./components/master/MasterDataManager').then(m => ({ default: m.MasterDataManager })));
const AuditLogView = lazy(() => import('./components/admin/AuditLogView').then(m => ({ default: m.AuditLogView })));
const UserManagementView = lazy(() => import('./components/admin/UserManagementView').then(m => ({ default: m.UserManagementView })));
const BusinessSettingsView = lazy(() => import('./components/settings/BusinessSettingsView').then(m => ({ default: m.BusinessSettingsView })));
const ExcelImportView = lazy(() => import('./components/excel/ExcelImportView').then(m => ({ default: m.ExcelImportView })));

const ProductionDashboard = lazy(() => import('./components/production/ProductionDashboard').then(m => ({ default: m.ProductionDashboard })));
const DailyProcessingEntryForm = lazy(() => import('./components/production/DailyProcessingEntryForm').then(m => ({ default: m.DailyProcessingEntryForm })));
const ProcessingRecordList = lazy(() => import('./components/production/ProcessingRecordList').then(m => ({ default: m.ProcessingRecordList })));
const SlabTypeManager = lazy(() => import('./components/production/SlabTypeManager').then(m => ({ default: m.SlabTypeManager })));
const ProductionReportsHub = lazy(() => import('./components/production/ProductionReportsHub').then(m => ({ default: m.ProductionReportsHub })));

const SalesDashboard = lazy(() => import('./components/sales/SalesDashboard').then(m => ({ default: m.SalesDashboard })));
const FobDashboard = lazy(() => import('./components/sales/FobDashboard').then(m => ({ default: m.FobDashboard })));
const SalesInvoiceEntryForm = lazy(() => import('./components/sales/SalesInvoiceEntryForm').then(m => ({ default: m.SalesInvoiceEntryForm })));
const SalesInvoiceList = lazy(() => import('./components/sales/SalesInvoiceList').then(m => ({ default: m.SalesInvoiceList })));
const CustomerManager = lazy(() => import('./components/sales/CustomerManager').then(m => ({ default: m.CustomerManager })));
const PortManager = lazy(() => import('./components/sales/PortManager').then(m => ({ default: m.PortManager })));
const CommercialSpeciesManager = lazy(() => import('./components/sales/CommercialSpeciesManager').then(m => ({ default: m.CommercialSpeciesManager })));
const SalesReportsHub = lazy(() => import('./components/sales/SalesReportsHub').then(m => ({ default: m.SalesReportsHub })));

import { InventorySidebar, InventoryNavTab } from './components/inventory/InventorySidebar';
const InventoryDashboard = lazy(() => import('./components/inventory/InventoryDashboard').then(m => ({ default: m.InventoryDashboard })));
const InventoryLedgerView = lazy(() => import('./components/inventory/InventoryLedgerView').then(m => ({ default: m.InventoryLedgerView })));
const InventoryPositionView = lazy(() => import('./components/inventory/InventoryPositionView').then(m => ({ default: m.InventoryPositionView })));
const InventoryItemManager = lazy(() => import('./components/inventory/InventoryItemManager').then(m => ({ default: m.InventoryItemManager })));
const StockAdjustmentView = lazy(() => import('./components/inventory/StockAdjustmentView').then(m => ({ default: m.StockAdjustmentView })));
const PhysicalStockCountView = lazy(() => import('./components/inventory/PhysicalStockCountView').then(m => ({ default: m.PhysicalStockCountView })));
const PeriodCloseView = lazy(() => import('./components/inventory/PeriodCloseView').then(m => ({ default: m.PeriodCloseView })));
const InventoryReportsHub = lazy(() => import('./components/inventory/InventoryReportsHub').then(m => ({ default: m.InventoryReportsHub })));
const InventoryAuditView = lazy(() => import('./components/inventory/InventoryAuditView').then(m => ({ default: m.InventoryAuditView })));

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
  ShoppingBag,
  Boxes
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ActiveModuleType>('home');
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [returnPurchaseId, setReturnPurchaseId] = useState<string | undefined>();
  const [productionTab, setProductionTab] = useState<ProductionNavTab>('prod-dashboard');
  const [salesTab, setSalesTab] = useState<SalesNavTab>('sales-dashboard');
  const [inventoryTab, setInventoryTab] = useState<InventoryNavTab>('inv-dashboard');
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

  const handleNavigateDirect = (module: 'purchase' | 'production' | 'sales' | 'inventory' | 'home', tab: string) => {
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
    } else if (module === 'inventory') {
      setInventoryTab(tab as InventoryNavTab);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFB] text-[#1E1E24] relative overflow-x-hidden">
      {/* Ambient Fluid Glow Orbs (Soft Blush Light Refraction) */}
      {ambientGlow && (
        <div className="liquid-ambient-backdrop" aria-hidden="true">
          <div className="liquid-orb-1" />
          <div className="liquid-orb-2" />
        </div>
      )}

      {/* Figma-Inspired Global Shell Sticky Top Bar with Liquid Glass */}
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

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Desktop Sidebar (Rendered when in Purchase, Production or Sales modules) */}
        {activeModule !== 'home' && (
          <div className="hidden md:block">
            {activeModule === 'purchase' ? (
              <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
            ) : activeModule === 'production' ? (
              <ProductionSidebar activeTab={productionTab} onTabChange={setProductionTab} />
            ) : activeModule === 'sales' ? (
              <SalesSidebar activeTab={salesTab} onTabChange={setSalesTab} />
            ) : (
              <InventorySidebar activeTab={inventoryTab} onTabChange={setInventoryTab} />
            )}
          </div>
        )}

        {/* Mobile Slide-in Drawer Menu with Thick Liquid Glass */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-ink-900/40 backdrop-blur-md flex">
            <div className="w-80 max-w-[85%] glass-surface-thick h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
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
              <div className="p-3 bg-gray-50 border-b border-gray-100 grid grid-cols-5 gap-1 text-[10px] font-bold text-center">
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
                <button
                  onClick={() => {
                    setActiveModule('inventory');
                  }}
                  className={`py-1.5 rounded-lg transition ${activeModule === 'inventory' ? 'bg-rose-600 text-white' : 'text-ink-700 hover:bg-white'}`}
                >
                  Stock
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
                ) : activeModule === 'inventory' ? (
                  <InventorySidebar
                    activeTab={inventoryTab}
                    onTabChange={(tab) => {
                      setInventoryTab(tab);
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

              {/* Mobile Drawer Role Switcher */}
              <div className="p-3.5 bg-rose-50/40 border-t border-gray-200">
                <RoleSwitcher
                  variant="inline"
                  onRoleChanged={() => setIsMobileMenuOpen(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-12">
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-rose-600">
                <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
                <span className="text-sm font-medium text-ink-600">Loading module...</span>
              </div>
            }
          >
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
              {activeTab === 'excel-import' && <ExcelImportView defaultModule="purchase" onNavigate={setActiveTab} />}
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

              {productionTab === 'audit-log' && <AuditLogView />}
              {productionTab === 'prod-excel-import' && (
                <ExcelImportView defaultModule="production" onNavigate={(tab) => setProductionTab(tab as ProductionNavTab)} />
              )}
            </>
          ) : activeModule === 'sales' ? (
            <>
              {salesTab === 'sales-dashboard' && (
                <SalesDashboard onNavigate={(tab) => setSalesTab(tab as SalesNavTab)} />
              )}
              {salesTab === 'fob-dashboard' && (
                <FobDashboard onNavigate={(tab) => setSalesTab(tab as SalesNavTab)} />
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
              {salesTab === 'species' && <CommercialSpeciesManager />}

              {salesTab === 'sales-reports' && <SalesReportsHub />}
              {salesTab === 'audit-log' && <AuditLogView />}
              {salesTab === 'sales-excel-import' && (
                <ExcelImportView defaultModule="sales" onNavigate={(tab) => setSalesTab(tab as SalesNavTab)} />
              )}
            </>
          ) : (
            <>
              {inventoryTab === 'inv-dashboard' && (
                <InventoryDashboard onNavigateTab={(tab) => setInventoryTab(tab as InventoryNavTab)} />
              )}
              {inventoryTab === 'stock-card' && <InventoryLedgerView />}
              {inventoryTab === 'stock-position' && <InventoryPositionView />}
              {inventoryTab === 'item-master' && <InventoryItemManager />}
              {inventoryTab === 'stock-adjustments' && <StockAdjustmentView />}
              {inventoryTab === 'physical-count' && <PhysicalStockCountView />}
              {inventoryTab === 'reports-hub' && (
                <InventoryReportsHub onNavigateTab={(tab) => setInventoryTab(tab as InventoryNavTab)} />
              )}
              {inventoryTab === 'period-close' && <PeriodCloseView />}
              {inventoryTab === 'audit-log' && <InventoryAuditView />}
            </>
          )}
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Liquid Glass Surface) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-surface-thin border-t border-white/80 z-30 flex items-center justify-around py-2 px-1 shadow-[0_-4px_20px_rgba(178,58,72,0.06)] print:hidden">
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
          onClick={() => setActiveModule('inventory')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            activeModule === 'inventory' ? 'text-rose-600' : 'text-ink-500'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Stock</span>
        </button>

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
    <LiquidGlassProvider>
      <AuthProvider>
        <ToastProvider>
          <DataProvider>
            <MainLayout />
          </DataProvider>
        </ToastProvider>
      </AuthProvider>
    </LiquidGlassProvider>
  );
}
