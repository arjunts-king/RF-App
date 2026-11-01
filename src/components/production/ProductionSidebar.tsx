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
    <aside className="w-full md:w-64 bg-white/10 backdrop-blur-2xl md:border-r border-white/20 flex flex-col shrink-0 h-full text-white">
      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title}>
              <div className="text-[11px] font-bold tracking-wider text-amber-200 uppercase px-3 mb-2">
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
                        <Icon className={`w-4 h-4 ${isActive ? 'text-amber-800' : 'text-amber-200 group-hover:text-white'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight ${
                            isActive
                              ? 'bg-amber-100 text-amber-900'
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
        <div className="text-[10px] text-amber-200/80 mt-1">
          Processing Facility · Plant Floor Suite
        </div>
      </div>
    </aside>
  );
};
