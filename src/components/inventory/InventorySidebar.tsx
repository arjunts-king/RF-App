import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  BarChart3,
  BookOpen,
  Boxes,
  Database,
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  ShieldAlert,
  } from 'lucide-react';

export type InventoryNavTab =
  | 'inv-dashboard'
  | 'stock-card'
  | 'stock-position'
  | 'item-master'
  | 'stock-adjustments'
  | 'physical-count'
  | 'reports-hub'
  | 'period-close'
  | 'audit-log';

interface InventorySidebarProps {
  activeTab: InventoryNavTab;
  onTabChange: (tab: InventoryNavTab) => void;
}

export const InventorySidebar: React.FC<InventorySidebarProps> = ({ activeTab, onTabChange }) => {
  const { permissions } = useAuth();
  const { inventoryCalculation } = useData();

  const exceptionCount = inventoryCalculation.exceptions.length;
  const lowStockCount = inventoryCalculation.stockPositions.filter(
    (p) => p.stockStatus === 'Low Stock' || p.stockStatus === 'Out of Stock' || p.stockStatus === 'Negative Stock'
  ).length;

  const navGroups: {
    title: string;
    items: {
      id: InventoryNavTab;
      label: string;
      icon: any;
      show: boolean;
      badge?: string;
      badgeColor?: string;
    }[];
  }[] = [
    {
      title: 'CORE INVENTORY',
      items: [
        { id: 'inv-dashboard', label: 'Inventory Dashboard', icon: BarChart3, show: true },
        {
          id: 'stock-card',
          label: 'Valuation Ledger (Stock Card)',
          icon: BookOpen,
          show: true,
          badge: 'Moving Avg'
        },
        {
          id: 'stock-position',
          label: 'Stock Position as on Date',
          icon: Boxes,
          show: true,
          badge: lowStockCount > 0 ? `${lowStockCount} alert` : undefined,
          badgeColor: lowStockCount > 0 ? 'bg-amber-100 text-amber-800' : undefined
        }
      ]
    },
    {
      title: 'INVENTORY OPERATIONS',
      items: [
        {
          id: 'item-master',
          label: 'Item Master & Mappings',
          icon: Database,
          show: permissions.canManageInventoryItems
        },
        {
          id: 'stock-adjustments',
          label: 'Stock Adjustments & Wastage',
          icon: RotateCcw,
          show: permissions.canManageInventoryAdjustments
        },
        {
          id: 'physical-count',
          label: 'Physical Stock Count',
          icon: CheckCircle2,
          show: permissions.canRecordStockCounts
        }
      ]
    },
    {
      title: 'ANALYTICS & CONTROL',
      items: [
        {
          id: 'reports-hub',
          label: 'Inventory Reports Hub',
          icon: FileSpreadsheet,
          show: true,
          badge: exceptionCount > 0 ? `${exceptionCount} exp` : undefined,
          badgeColor: exceptionCount > 0 ? 'bg-rose-100 text-rose-800' : undefined
        },
        {
          id: 'period-close',
          label: 'Period Close & Lock',
          icon: Layers,
          show: permissions.canPeriodClose
        },
        {
          id: 'audit-log',
          label: 'Surveillance Audit Trail',
          icon: ShieldAlert,
          show: permissions.canViewAuditLog
        }
      ]
    }
  ];

  return (
    <aside className="w-64 glass-surface flex flex-col shrink-0 border-r border-white/70 py-4 px-3 select-none">
      <div className="px-3 pb-3 mb-2 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-ink-900">
              Inventory Ledger
            </h2>
            <p className="text-[10px] text-ink-500 font-medium">Weighted Average Cost</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto pr-1">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                {group.title}
              </span>
              <div className="space-y-0.5 mt-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-rose-600 text-white shadow-xs font-bold'
                          : 'text-ink-700 hover:text-ink-900 hover:bg-rose-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-ink-500'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide shrink-0 ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : item.badgeColor || 'bg-gray-100 text-ink-600'
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
      </nav>

      <div className="pt-3 border-t border-gray-100 px-3">
        <div className="p-2.5 rounded-xl bg-gray-50/80 border border-gray-200/60 text-[11px] text-ink-600 space-y-1">
          <div className="flex items-center justify-between font-bold text-ink-800 text-[10px] uppercase">
            <span>Valuation Method</span>
            <span className="text-emerald-700">Perpetual</span>
          </div>
          <p className="text-[10px] text-ink-500 leading-tight">
            Moving weighted average recalculated automatically on every receipt and issue.
          </p>
        </div>
      </div>
    </aside>
  );
};
