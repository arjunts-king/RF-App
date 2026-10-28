import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  Layers,
  BookOpen,
  Clock,
  BarChart3,
  CheckCircle2,
  Database,
  ShieldAlert,
  UserPlus,
  Settings,
  FileSpreadsheet,
  RotateCcw
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

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { currentUser, permissions } = useAuth();

  const navGroups: {
    title: string;
    items: {
      id: NavTab;
      label: string;
      icon: any;
      show: boolean;
      badge?: string;
    }[];
  }[] = [
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
        { id: 'batch-expenses', label: 'Shared Batch Expense Pools', icon: Layers, show: true }
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
        { id: 'reports', label: 'Operational Reports (7 Views)', icon: BarChart3, show: true },
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
          show: permissions.canManageMasterData // Hidden from Junior Accountant & Viewer
        },
        {
          id: 'user-mgmt',
          label: 'Staff & User Management',
          icon: UserPlus,
          show: permissions.canInviteUsers || permissions.canManageStaff // Exclusive to Owner/Admin
        },
        {
          id: 'audit-log',
          label: 'Surveillance Audit Trail',
          icon: ShieldAlert,
          show: permissions.canViewAuditLog, // EXCLUSIVE to Owner/Admin as specified
          badge: 'Admin Only'
        },
        {
          id: 'excel-import',
          label: 'Excel Import & Migration',
          icon: FileSpreadsheet,
          show: true,
          badge: 'Import'
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

  return (
    <aside className="w-full md:w-64 bg-white md:border-r border-gray-100 flex flex-col shrink-0 h-full">
      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title}>
              <div className="text-[11px] font-bold tracking-wider text-ink-500 uppercase px-3 mb-2">
                {group.title}
              </div>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-rose-600 text-white shadow-xs font-bold'
                          : 'text-ink-700 hover:bg-rose-50 hover:text-rose-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-ink-500 group-hover:text-rose-600'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-xs">
        <div className="flex items-center justify-between text-ink-500">
          <span>Active Role:</span>
          <span className="font-semibold text-rose-700 capitalize">
            {currentUser.role.replace('_', ' ')}
          </span>
        </div>
        <div className="text-[10px] text-ink-500 mt-1">
          Indian FY 2026-27 · Coastal Trading Suite
        </div>
      </div>
    </aside>
  );
};
