import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Factory,
  PlusCircle,
  Layers,
  Boxes,
  Database,
  BarChart3,
  ShieldAlert
} from 'lucide-react';

export type ProductionNavTab =
  | 'prod-dashboard'
  | 'daily-entry'
  | 'processing-log'
  | 'slab-types'
  | 'prod-reports'
  | 'master-data'
  | 'audit-log';

interface ProductionSidebarProps {
  activeTab: ProductionNavTab;
  onTabChange: (tab: ProductionNavTab) => void;
}

export const ProductionSidebar: React.FC<ProductionSidebarProps> = ({ activeTab, onTabChange }) => {
  const { currentUser, permissions } = useAuth();

  const navGroups: {
    title: string;
    items: {
      id: ProductionNavTab;
      label: string;
      icon: any;
      show: boolean;
      badge?: string;
    }[];
  }[] = [
    {
      title: 'CORE PRODUCTION',
      items: [
        { id: 'prod-dashboard', label: 'Production Dashboard', icon: Factory, show: true },
        {
          id: 'daily-entry',
          label: 'Daily Processing Entry',
          icon: PlusCircle,
          show: permissions.canCreateEditPurchases,
          badge: 'Plant Entry'
        },
        { id: 'processing-log', label: 'Processing Records & Lots', icon: Layers, show: true }
      ]
    },
    {
      title: 'PACKAGING & MASTERS',
      items: [
        {
          id: 'slab-types',
          label: 'Slab Types Master',
          icon: Boxes,
          show: permissions.canManageMasterData,
          badge: 'Standard'
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
        { id: 'prod-reports', label: 'Production Reports Hub', icon: BarChart3, show: true },
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
          Processing Facility · Plant Floor Suite
        </div>
      </div>
    </aside>
  );
};
