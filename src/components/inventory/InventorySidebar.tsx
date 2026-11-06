import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { FlyoutSidebar, NavSubHeading } from '../common/FlyoutSidebar';
import {
  BarChart3,
  BookOpen,
  Boxes,
  Database,
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  ShieldAlert
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
  const { currentUser, permissions } = useAuth();
  const { inventoryCalculation } = useData();

  const exceptionCount = inventoryCalculation.exceptions.length;
  const lowStockCount = inventoryCalculation.stockPositions.filter(
    (p) => p.stockStatus === 'Low Stock' || p.stockStatus === 'Out of Stock' || p.stockStatus === 'Negative Stock'
  ).length;

  const subHeadings: NavSubHeading<InventoryNavTab>[] = [
    {
      id: 'core-inventory',
      title: 'Core Inventory',
      icon: Boxes,
      items: [
        {
          id: 'inv-dashboard',
          label: 'Inventory Dashboard',
          icon: BarChart3,
          desc: 'Weighted average stock value, COGS & margin KPIs'
        },
        {
          id: 'stock-card',
          label: 'Valuation Ledger (Stock Card)',
          icon: BookOpen,
          badge: 'Moving Avg',
          desc: 'Perpetual moving average running ledger with PDF/Excel export'
        },
        {
          id: 'stock-position',
          label: 'Stock Position as on Date',
          icon: Boxes,
          badge: lowStockCount > 0 ? `${lowStockCount} alert` : undefined,
          badgeColor: lowStockCount > 0 ? 'bg-amber-100 text-amber-800' : undefined,
          desc: 'Real-time closing stock balance, unit rates & low stock alerts'
        }
      ]
    },
    {
      id: 'inventory-operations',
      title: 'Inventory Operations',
      icon: RotateCcw,
      items: [
        {
          id: 'item-master',
          label: 'Item Master & Mappings',
          icon: Database,
          badge: 'Mapping',
          desc: 'Items, unit basis (Purchase/Yield), and Purchase/Sales links',
          show: permissions.canManageInventoryItems
        },
        {
          id: 'stock-adjustments',
          label: 'Stock Adjustments & Wastage',
          icon: RotateCcw,
          badge: 'Wastage',
          isQuickAction: true,
          desc: 'Wastage, shrinkage, and write-offs at moving average cost',
          show: permissions.canManageInventoryAdjustments
        },
        {
          id: 'physical-count',
          label: 'Physical Stock Count',
          icon: CheckCircle2,
          badge: 'Audit Count',
          desc: 'Audit physical count variance and post adjusting entries',
          show: permissions.canRecordStockCounts
        }
      ]
    },
    {
      id: 'period-close-audit',
      title: 'Period Close & Audit',
      icon: Layers,
      items: [
        {
          id: 'period-close',
          label: 'Period Close & Lock',
          icon: Layers,
          badge: 'Reconcile',
          desc: 'Month-end reconciliation seal (Unlocked by Owner/Admin only)',
          show: permissions.canPeriodClose
        },
        {
          id: 'audit-log',
          label: 'Surveillance Audit Trail',
          icon: ShieldAlert,
          badge: 'Admin Only',
          desc: 'Inventory audit log & full ledger recalculation engine',
          show: permissions.canViewAuditLog
        }
      ]
    },
    {
      id: 'analytics-reports',
      title: 'Analytics & Reports',
      icon: BarChart3,
      items: [
        {
          id: 'reports-hub',
          label: 'Inventory Reports Hub',
          icon: FileSpreadsheet,
          badge: exceptionCount > 0 ? `${exceptionCount} exp` : 'Reports',
          badgeColor: exceptionCount > 0 ? 'bg-rose-100 text-rose-800' : undefined,
          desc: 'COGS & margins, NRV check, stock days & exception reports'
        }
      ]
    }
  ];

  return (
    <FlyoutSidebar<InventoryNavTab>
      moduleTitle="Stock & Inventory"
      moduleBadge="Live Stock"
      subHeadings={subHeadings}
      activeTab={activeTab}
      onTabChange={onTabChange}
      activeRole={currentUser.role}
      footerSubtitle="Perpetual Moving Average Engine"
    />
  );
};
