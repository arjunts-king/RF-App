import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
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
  Factory,
  Boxes,
  TrendingUp,
  FileText,
  BadgeDollarSign,
  Users,
  Anchor,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: 'purchase' | 'production' | 'sales' | 'home', tab: string) => void;
}

interface PaletteItem {
  id: string;
  title: string;
  subtitle: string;
  module: 'purchase' | 'production' | 'sales' | 'home';
  tab: string;
  icon: any;
  category: string;
  permission?: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { permissions } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const allItems: PaletteItem[] = [
    // Core Quick Actions
    {
      id: 'quick-harbour-entry',
      title: 'New Harbour Purchase Entry',
      subtitle: 'Record raw seafood landing, weighment, rate & expenses',
      module: 'purchase',
      tab: 'purchase-entry',
      icon: PlusCircle,
      category: 'Quick Actions',
      permission: permissions.canCreateEditPurchases
    },
    {
      id: 'quick-plant-entry',
      title: 'New Daily Processing Entry',
      subtitle: 'Record plant processing lot, shift, slabs & recovery',
      module: 'production',
      tab: 'daily-entry',
      icon: Factory,
      category: 'Quick Actions',
      permission: permissions.canCreateEditPurchases
    },
    {
      id: 'quick-invoice-entry',
      title: 'New Commercial Sales Invoice',
      subtitle: 'Create export invoice, shipping details & container lines',
      module: 'sales',
      tab: 'invoice-entry',
      icon: TrendingUp,
      category: 'Quick Actions',
      permission: permissions.canCreateEditSales
    },

    // Purchase Screens
    {
      id: 'pur-dash',
      title: 'Procurement Executive Dashboard',
      subtitle: 'Overview of purchase volume, landed cost & variance KPIs',
      module: 'purchase',
      tab: 'dashboard',
      icon: BarChart3,
      category: 'Purchase Module'
    },
    {
      id: 'pur-txns',
      title: 'Purchase Transactions Register',
      subtitle: 'Search, filter, view and export landing transactions',
      module: 'purchase',
      tab: 'purchases',
      icon: Receipt,
      category: 'Purchase Module'
    },
    {
      id: 'pur-returns',
      title: 'Purchase Returns (Debit Notes)',
      subtitle: 'Record product returns and supplier debit notes',
      module: 'purchase',
      tab: 'purchase-returns',
      icon: RotateCcw,
      category: 'Purchase Module'
    },
    {
      id: 'pur-batch',
      title: 'Shared Batch Expense Allocation Pools',
      subtitle: 'Distribute joint ice and dalali costs across batch items',
      module: 'purchase',
      tab: 'batch-expenses',
      icon: Layers,
      category: 'Purchase Module'
    },
    {
      id: 'pur-ledger',
      title: 'Supplier Ledgers & Payments',
      subtitle: 'Record payments and print clean A4 supplier statements',
      module: 'purchase',
      tab: 'payments',
      icon: BookOpen,
      category: 'Purchase Module'
    },
    {
      id: 'pur-outstanding',
      title: 'Outstanding Payables & Ageing (180+d)',
      subtitle: 'Ageing buckets, credit risk alerts & overdue dues',
      module: 'purchase',
      tab: 'outstanding',
      icon: Clock,
      category: 'Purchase Module'
    },
    {
      id: 'pur-reports',
      title: 'Operational Reports Hub (8 Views)',
      subtitle: 'Daily, Monthly MoM, Species, Grade x Size, Price variance',
      module: 'purchase',
      tab: 'reports',
      icon: BarChart3,
      category: 'Purchase Module'
    },
    {
      id: 'pur-quality',
      title: 'Data Quality & Reconciliation',
      subtitle: 'Automated entry sum vs report sum verification',
      module: 'purchase',
      tab: 'data-quality',
      icon: CheckCircle2,
      category: 'Purchase Module'
    },
    {
      id: 'pur-excel',
      title: 'Excel Import & Migration',
      subtitle: 'Bulk upload historical transactions with field mapping',
      module: 'purchase',
      tab: 'excel-import',
      icon: FileSpreadsheet,
      category: 'Purchase Module'
    },
    {
      id: 'pur-masters',
      title: 'Master Reference Data',
      subtitle: 'Suppliers, species, grades, sizes, accounts & expense heads',
      module: 'purchase',
      tab: 'master-data',
      icon: Database,
      category: 'Purchase Module',
      permission: permissions.canManageMasterData
    },
    {
      id: 'pur-users',
      title: 'Staff & Role Management',
      subtitle: 'Provision user accounts and assign security roles',
      module: 'purchase',
      tab: 'user-mgmt',
      icon: UserPlus,
      category: 'Administration',
      permission: permissions.canInviteUsers || permissions.canManageStaff
    },
    {
      id: 'pur-audit',
      title: 'Surveillance Audit Trail',
      subtitle: 'Tamper-proof surveillance log of edits, voids & deletes',
      module: 'purchase',
      tab: 'audit-log',
      icon: ShieldAlert,
      category: 'Administration',
      permission: permissions.canViewAuditLog
    },
    {
      id: 'pur-settings',
      title: 'Business Settings & Data Reset',
      subtitle: 'Company profile, financial year and demo seed data',
      module: 'purchase',
      tab: 'settings',
      icon: Settings,
      category: 'Administration'
    },

    // Production Screens
    {
      id: 'prod-dash',
      title: 'Production Plant Dashboard',
      subtitle: 'Processed output, slab counts, rejection & recovery trends',
      module: 'production',
      tab: 'prod-dashboard',
      icon: Factory,
      category: 'Production Module'
    },
    {
      id: 'prod-log',
      title: 'Processing Records & Factory Lots',
      subtitle: 'Audit processing log, lot numbers & slab packaging',
      module: 'production',
      tab: 'processing-log',
      icon: Layers,
      category: 'Production Module'
    },
    {
      id: 'prod-slabs',
      title: 'Slab Types Master',
      subtitle: 'Define block freezing packaging standards (2.0 Kg etc)',
      module: 'production',
      tab: 'slab-types',
      icon: Boxes,
      category: 'Production Module',
      permission: permissions.canManageMasterData
    },
    {
      id: 'prod-reports',
      title: 'Production Reports Hub',
      subtitle: 'Shift analysis, yield recovery and supplier grade reports',
      module: 'production',
      tab: 'prod-reports',
      icon: BarChart3,
      category: 'Production Module'
    },

    // Sales Screens
    {
      id: 'sales-dash',
      title: 'Commercial Export Dashboard',
      subtitle: 'Export turnover in USD, FOB valuation & realization rates',
      module: 'sales',
      tab: 'sales-dashboard',
      icon: TrendingUp,
      category: 'Sales Module'
    },
    {
      id: 'sales-invoices',
      title: 'Commercial Invoices & Shipments',
      subtitle: 'View export invoices, shipping bills and packing lists',
      module: 'sales',
      tab: 'invoices',
      icon: FileText,
      category: 'Sales Module'
    },
    {
      id: 'sales-realizations',
      title: 'Realization & Settlement Register',
      subtitle: 'Bank credit realization, FIRC & exchange rate settlements',
      module: 'sales',
      tab: 'realizations',
      icon: BadgeDollarSign,
      category: 'Sales Module'
    },
    {
      id: 'sales-customers',
      title: 'Consignees & Buyers Master',
      subtitle: 'Manage overseas export buyers and payment terms',
      module: 'sales',
      tab: 'customers',
      icon: Users,
      category: 'Sales Module',
      permission: permissions.canManageSalesMasterData
    },
    {
      id: 'sales-ports',
      title: 'Loading & Discharge Port Master',
      subtitle: 'Manage ports of loading and destination discharge ports',
      module: 'sales',
      tab: 'ports',
      icon: Anchor,
      category: 'Sales Module',
      permission: permissions.canManageSalesMasterData
    },
    {
      id: 'sales-reports',
      title: 'Commercial Reports Hub',
      subtitle: 'Realization tracker, buyer analysis and country turnover',
      module: 'sales',
      tab: 'sales-reports',
      icon: BarChart3,
      category: 'Sales Module'
    }
  ];

  // Filter out items user has no permission for
  const allowedItems = allItems.filter((item) => item.permission === undefined || item.permission);

  // Search filter
  const filtered = query.trim()
    ? allowedItems.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      })
    : allowedItems;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(filtered.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        const item = filtered[selectedIndex];
        onNavigate(item.module, item.tab);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center p-4 sm:p-6 md:p-20 overflow-y-auto animate-in fade-in duration-100">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
          <Search className="w-5 h-5 text-rose-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a screen, action, or keyword (e.g. 'Harbour', 'Slabs', 'Invoice', 'Ledger')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm font-medium text-ink-900 placeholder:text-ink-400 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono bg-white border border-gray-200 rounded text-ink-500 shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-500">
              <Sparkles className="w-6 h-6 text-rose-400 mx-auto mb-2" />
              <p className="font-semibold text-ink-900">No matching screens or actions found</p>
              <p className="text-[11px] mt-0.5">Try searching for &quot;Purchase&quot;, &quot;Production&quot;, &quot;Export&quot;, or &quot;Master&quot;.</p>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.module, item.tab);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl cursor-pointer text-left transition-all ${
                    isSelected
                      ? 'bg-rose-50 text-rose-900'
                      : 'hover:bg-gray-50 text-ink-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-gray-100 text-ink-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold leading-tight truncate">
                          {item.title}
                        </span>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold tracking-wider shrink-0 ${
                            isSelected
                              ? 'bg-rose-200 text-rose-900'
                              : 'bg-gray-100 text-ink-500'
                          }`}
                        >
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-500 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? 'text-rose-600 translate-x-1' : 'text-gray-300'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-ink-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border rounded">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border rounded">↵</kbd>
              <span>to select</span>
            </span>
          </div>
          <div className="font-medium text-rose-700">Quick Command Palette</div>
        </div>
      </div>
    </div>
  );
};
