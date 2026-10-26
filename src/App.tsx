import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar, NavTab } from './components/common/Sidebar';
import { ProductionSidebar, ProductionNavTab } from './components/production/ProductionSidebar';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { PurchaseEntryForm } from './components/purchase/PurchaseEntryForm';
import { PurchaseList } from './components/purchase/PurchaseList';
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
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  BookOpen,
  Menu,
  X,
  Factory,
  Layers,
  BarChart3
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'purchase' | 'production'>('purchase');
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [productionTab, setProductionTab] = useState<ProductionNavTab>('prod-dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { permissions } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFB]">
      <Navbar
        activeModule={activeModule}
        onModuleChange={(mod) => {
          setActiveModule(mod);
          setIsMobileMenuOpen(false);
        }}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (Switched dynamically per active module) */}
        <div className="hidden md:block">
          {activeModule === 'purchase' ? (
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          ) : (
            <ProductionSidebar activeTab={productionTab} onTabChange={setProductionTab} />
          )}
        </div>

        {/* Mobile Drawer Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden bg-black/40 backdrop-blur-xs flex">
            <div className="w-72 bg-white h-full shadow-2xl flex flex-col">
              <div className="p-4 border-b flex justify-between items-center bg-rose-50/50">
                <span className="font-bold text-ink-900 text-sm">
                  {activeModule === 'purchase' ? 'Procurement Menu' : 'Production Menu'}
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-ink-500 hover:text-rose-600"
                >
                  <X className="w-5 h-5" />
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
                ) : (
                  <ProductionSidebar
                    activeTab={productionTab}
                    onTabChange={(tab) => {
                      setProductionTab(tab);
                      setIsMobileMenuOpen(false);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
          {activeModule === 'purchase' ? (
            <>
              {activeTab === 'dashboard' && <DashboardOverview />}
              {activeTab === 'purchase-entry' && (
                <PurchaseEntryForm onSuccess={() => setActiveTab('purchases')} />
              )}
              {activeTab === 'purchases' && <PurchaseList onNavigate={setActiveTab} />}
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
          ) : (
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
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Context aware) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 flex items-center justify-around py-2 px-1 shadow-lg print:hidden">
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
        ) : (
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
