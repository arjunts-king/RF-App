import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp,
  PlusCircle,
  FileText,
  BadgeDollarSign,
  Users,
  Anchor,
  Database,
  BarChart3,
  ShieldAlert
} from 'lucide-react';

export type SalesNavTab =
  | 'sales-dashboard'
  | 'invoice-entry'
  | 'invoices'
  | 'realizations'
  | 'customers'
  | 'ports'
  | 'master-data'
  | 'sales-reports'
  | 'audit-log';

interface SalesSidebarProps {
  activeTab: SalesNavTab;
  onTabChange: (tab: SalesNavTab) => void;
}

export const SalesSidebar: React.FC<SalesSidebarProps> = ({ activeTab, onTabChange }) => {
  const { currentUser, permissions } = useAuth();

  const navGroups: {
    title: string;
    items: {
      id: SalesNavTab;
      label: string;
      icon: any;
      show: boolean;
      badge?: string;
    }[];
  }[] = [
    {
      title: 'CORE COMMERCIAL',
      items: [
        { id: 'sales-dashboard', label: 'Commercial Dashboard', icon: TrendingUp, show: true },
        {
          id: 'invoice-entry',
          label: 'Commercial Invoice Entry',
          icon: PlusCircle,
          show: permissions.canCreateEditSales,
          badge: 'Export Form'
        },
        { id: 'invoices', label: 'Invoices & Shipments', icon: FileText, show: true }
      ]
    },
    {
      title: 'SETTLEMENT & BANKING',
      items: [
        {
          id: 'realizations',
          label: 'Realization & Settlement',
          icon: BadgeDollarSign,
          show: true,
          badge: 'FIRC/BRC'
        }
      ]
    },
    {
      title: 'COMMERCIAL MASTERS',
      items: [
        {
          id: 'customers',
          label: 'Consignees & Buyers',
          icon: Users,
          show: permissions.canManageSalesMasterData,
          badge: 'Customer'
        },
        {
          id: 'ports',
          label: 'Port Master',
          icon: Anchor,
          show: permissions.canManageSalesMasterData,
          badge: 'Port'
        },
        {
          id: 'master-data',
          label: 'Shared Master Data',
          icon: Database,
          show: permissions.canManageMasterData
        }
      ]
    },
    {
      title: 'ANALYTICS & CONTROL',
      items: [
        { id: 'sales-reports', label: 'Commercial Reports Hub', icon: BarChart3, show: true },
        {
          id: 'audit-log',
          label: 'Surveillance Audit Trail',
          icon: ShieldAlert,
          show: permissions.canViewAuditLog,
          badge: 'Admin Only'
        }
      ]
    }
  ];

  return (
    <aside className="w-full md:w-64 bg-white/10 backdrop-blur-2xl md:border-r border-white/20 flex flex-col shrink-0 h-full text-white">
      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title}>
              <div className="text-[11px] font-bold tracking-wider text-rose-200 uppercase px-3 mb-2">
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
                          ? 'bg-white text-rose-900 shadow-md font-bold border border-white/90'
                          : 'text-white/80 hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-rose-900' : 'text-rose-200 group-hover:text-white'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight ${
                            isActive
                              ? 'bg-rose-100 text-rose-900'
                              : 'bg-white/20 text-white border border-white/30'
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
      <div className="p-4 border-t border-white/15 bg-white/5 text-xs text-white/80">
        <div className="flex items-center justify-between">
          <span>Active Role:</span>
          <span className="font-semibold text-white capitalize">
            {currentUser.role.replace('_', ' ')}
          </span>
        </div>
        <div className="text-[10px] text-rose-200/80 mt-1">
          Global Marine Exports · Commercial Suite
        </div>
      </div>
    </aside>
  );
};
