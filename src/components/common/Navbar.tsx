import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useLiquidGlass } from '../../context/LiquidGlassContext';
import { RoleBadge } from './RoleBadge';
import { RoleSwitcher } from './RoleSwitcher';
import { Modal } from './Modal';
import { NotificationsPopover } from './NotificationsPopover';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Menu,
  Search,
  Bell,
  ChevronDown,
  Calendar,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export type ActiveModuleType = 'home' | 'purchase' | 'production' | 'sales' | 'reports';

interface NavbarProps {
  activeModule: ActiveModuleType;
  onModuleChange: (module: ActiveModuleType) => void;
  onNavigateTab: (module: 'purchase' | 'production' | 'sales', tab: string) => void;
  onOpenMobileMenu?: () => void;
  onOpenCommandPalette: () => void;
  currentBreadcrumb?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeModule,
  onModuleChange,
  onNavigateTab,
  onOpenMobileMenu,
  onOpenCommandPalette,
  currentBreadcrumb
}) => {
  const { currentUser } = useAuth();
  const { isOnline, offlineQueue, syncOfflineQueue, businessSettings, updateBusinessSettings, purchases, processingEntries, salesInvoices } = useData();
  const { showToast } = useToast();
  const { reduceTransparency, setReduceTransparency, reduceMotion, setReduceMotion, ambientGlow, setAmbientGlow } = useLiquidGlass();
  const [showProfile, setShowProfile] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isFYDropdownOpen, setIsFYDropdownOpen] = useState(false);

  const fyDropdownRef = useRef<HTMLDivElement>(null);

  // Close FY dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fyDropdownRef.current && !fyDropdownRef.current.contains(e.target as Node)) {
        setIsFYDropdownOpen(false);
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

  const availableFinancialYears = ['2026-27', '2025-26', '2024-25'];

  const handleSelectFY = (fy: string) => {
    updateBusinessSettings({ financialYear: fy });
    setIsFYDropdownOpen(false);
    showToast(`Accounting reporting period changed to FY ${fy}`, 'info');
  };

  const getModuleLabel = () => {
    switch (activeModule) {
      case 'home':
        return 'Overview';
      case 'purchase':
        return 'Purchase';
      case 'production':
        return 'Production';
      case 'sales':
        return 'Sales';
      case 'reports':
        return 'Reports';
      default:
        return 'Overview';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 glass-surface-thin border-b border-white/20 px-3 sm:px-5 py-2.5 transition-all text-white backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Mobile Toggle & Active Context / Workspace Breadcrumb */}
          <div className="flex items-center gap-3">
            {onOpenMobileMenu && (
              <button
                onClick={onOpenMobileMenu}
                className="md:hidden p-1.5 -ml-1 text-white hover:text-rose-200 hover:bg-white/10 rounded-xl transition"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Mobile Brand Tile */}
            <div className="md:hidden flex items-center gap-2" onClick={() => onModuleChange('home')}>
              <div className="w-8 h-8 rounded-xl bg-white text-rose-900 flex items-center justify-center font-bold text-xs shadow-md shrink-0">
                CM
              </div>
              <span className="font-bold text-white text-xs truncate max-w-[120px]">
                {businessSettings.businessName}
              </span>
            </div>

            {/* Desktop Context Breadcrumb & Workspace Indicator */}
            <div className="hidden md:flex items-center gap-2 text-xs">
              <button
                onClick={() => onModuleChange('home')}
                className="font-bold text-white/80 hover:text-white transition flex items-center gap-1.5"
              >
                <span>Workspace</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-white/40" />
              <span className="font-extrabold text-white px-2 py-0.5 rounded-lg bg-white/15 border border-white/20 capitalize">
                {getModuleLabel()}
              </span>
              {currentBreadcrumb && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-rose-100/90 font-medium truncate max-w-[200px]">
                    {currentBreadcrumb}
                  </span>
                </>
              )}
            </div>

            {/* Top Bar Financial-Year Selection Dropdown */}
            <div ref={fyDropdownRef} className="relative hidden sm:block">
              <button
                onClick={() => setIsFYDropdownOpen(!isFYDropdownOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold glass-surface-thin hover:glass-surface-regular border border-white/30 text-white transition-all shadow-xs"
                title="Select active financial year"
              >
                <Calendar className="w-3.5 h-3.5 text-rose-200" />
                <span>FY {businessSettings.financialYear}</span>
                <ChevronDown className={`w-3 h-3 text-white/70 transition-transform ${isFYDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isFYDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-48 glass-surface-dense rounded-2xl border border-white/80 p-2 z-50 shadow-2xl animate-liquid-pop text-ink-900">
                  <div className="text-[10px] font-bold text-ink-500 uppercase tracking-wider px-2 py-1 border-b border-gray-100 mb-1">
                    Select Financial Year
                  </div>
                  {availableFinancialYears.map((fy) => {
                    const isSelected = businessSettings.financialYear === fy;
                    return (
                      <button
                        key={fy}
                        onClick={() => handleSelectFY(fy)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-rose-50 text-rose-900 font-bold'
                            : 'hover:bg-gray-100 text-ink-700'
                        }`}
                      >
                        <span>FY {fy}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-rose-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Utility Cluster: Search, Notifications, Connection, Role & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Command Search (Ctrl+K) */}
            <button
              onClick={onOpenCommandPalette}
              className="btn-secondary-liquid flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-medium transition group"
              title="Open Global Command Palette (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-white/80 group-hover:text-white transition-colors" />
              <span className="hidden lg:inline text-xs">Search...</span>
              <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-white/20 border border-white/30 rounded text-white shadow-2xs">
                ⌘K
              </kbd>
            </button>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="btn-secondary-liquid relative p-2 rounded-full text-white transition"
                title="System Notifications & Alerts"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {totalAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-rose-900 font-bold text-[9px] flex items-center justify-center shadow-md animate-pulse">
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

            {/* Offline sync button if pending records */}
            {offlineQueue.length > 0 && (
              <button
                onClick={syncOfflineQueue}
                className="btn-liquid flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-full shadow-2xs transition"
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
                  ? 'bg-white/15 text-white border-white/30'
                  : 'bg-amber-500/20 text-amber-200 border-amber-400/40 animate-pulse'
              }`}
            >
              {isOnline ? <Wifi className="w-3 h-3 text-emerald-300" /> : <WifiOff className="w-3 h-3 text-amber-300" />}
              <span className="text-[11px] font-semibold">{isOnline ? 'Live' : 'Offline'}</span>
            </div>

            {/* Role Switcher Pill */}
            <div className="hidden md:block">
              <RoleSwitcher />
            </div>

            {/* User Profile Pill */}
            <button
              onClick={() => setShowProfile(true)}
              className="btn-secondary-liquid flex items-center gap-2 pl-1.5 pr-2.5 sm:pr-3 py-1 rounded-full text-left shrink-0 text-white"
              title="Click to view authenticated user credentials"
            >
              <div className="w-7 h-7 rounded-full bg-white text-rose-900 flex items-center justify-center font-bold text-xs shadow-md">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-bold text-white leading-tight truncate max-w-[110px]">
                  {currentUser.name}
                </div>
                <div className="text-[10px] font-bold text-rose-200 uppercase tracking-tight">
                  {currentUser.role.replace('_', ' ')}
                </div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* User Profile & Role Selector Modal */}
      <Modal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        title="User Profile & Role Selection"
        subtitle="Manage your session, credentials, and choose active role"
      >
        <div className="space-y-5">
          {/* Active Session Info */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <h4 className="text-base font-bold text-ink-900">{currentUser.name}</h4>
              <p className="text-xs text-ink-500">{currentUser.email}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <RoleBadge role={currentUser.role} size="sm" />
                <span className="text-[11px] text-ink-500">• {currentUser.designation}</span>
              </div>
            </div>
          </div>

          {/* Interactive Role Switcher */}
          <div className="p-4 bg-white border border-gray-200 rounded-xl text-xs space-y-2">
            <h5 className="font-bold text-ink-900">Switch Operational Role Simulator:</h5>
            <RoleSwitcher variant="inline" />
          </div>

          {/* Display & Glass Polish Preferences (iOS Liquid Glass System) */}
          <div className="p-4 bg-white border border-gray-200 rounded-xl text-xs space-y-3">
            <h5 className="font-bold text-ink-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-600" />
              Liquid Glass &amp; Motion Polish Preferences:
            </h5>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-rose-50/40 cursor-pointer transition">
                <div>
                  <span className="font-bold text-ink-900 block">Reduce Transparency</span>
                  <span className="text-[11px] text-ink-500">Replaces translucent frosted-glass with solid white surfaces</span>
                </div>
                <input
                  type="checkbox"
                  checked={reduceTransparency}
                  onChange={(e) => setReduceTransparency(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-rose-50/40 cursor-pointer transition">
                <div>
                  <span className="font-bold text-ink-900 block">Reduce Motion</span>
                  <span className="text-[11px] text-ink-500">Disables spring entrance animations and floating ambient refraction</span>
                </div>
                <input
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={(e) => setReduceMotion(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-rose-50/40 cursor-pointer transition">
                <div>
                  <span className="font-bold text-ink-900 block">Ambient Fluid Glow</span>
                  <span className="text-[11px] text-ink-500">Soft blush ambient refraction behind hero &amp; dashboard headers</span>
                </div>
                <input
                  type="checkbox"
                  checked={ambientGlow}
                  onChange={(e) => setAmbientGlow(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
              </label>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
