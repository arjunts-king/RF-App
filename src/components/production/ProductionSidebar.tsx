import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { FlyoutSidebar, NavSubHeading } from '../common/FlyoutSidebar';
import {
  Factory,
  PlusCircle,
  Layers,
  Boxes,
  BarChart3,
  ShieldAlert,
  FileSpreadsheet
} from 'lucide-react';

export type ProductionNavTab =
  | 'prod-dashboard'
  | 'daily-entry'
  | 'processing-log'
  | 'slab-types'
  | 'prod-reports'
  | 'audit-log'
  | 'prod-excel-import';

interface ProductionSidebarProps {
  activeTab: ProductionNavTab;
  onTabChange: (tab: ProductionNavTab) => void;
}

export const ProductionSidebar: React.FC<ProductionSidebarProps> = ({ activeTab, onTabChange }) => {
  const { currentUser, permissions } = useAuth();

  const subHeadings: NavSubHeading<ProductionNavTab>[] = [
    {
      id: 'core-production',
      title: 'Core Production',
      icon: Factory,
      items: [
        {
          id: 'prod-dashboard',
          label: 'Production Dashboard',
          icon: Factory,
          desc: 'Daily throughput, recovery & slab KPIs'
        },
        {
          id: 'daily-entry',
          label: 'Daily Processing Entry',
          icon: PlusCircle,
          badge: 'Plant Entry',
          isQuickAction: true,
          desc: 'Record shift, weight & standard slabs',
          show: permissions.canCreateEditPurchases
        },
        {
          id: 'processing-log',
          label: 'Processing Records & Lots',
          icon: Layers,
          badge: 'Traceability',
          desc: 'Traceability lot audit trail & shift logs'
        }
      ]
    },
    {
      id: 'production-masters',
      title: 'Production Masters',
      icon: Boxes,
      items: [
        {
          id: 'slab-types',
          label: 'Slab Types Master',
          icon: Boxes,
          badge: 'Standard 2kg',
          desc: 'Block freezing standard weight (2.0 Kg)',
          show: permissions.canManageMasterData
        }
      ]
    },
    {
      id: 'data-migration',
      title: 'Data & Migration',
      icon: FileSpreadsheet,
      items: [
        {
          id: 'prod-excel-import',
          label: 'Excel Import & Migration',
          icon: FileSpreadsheet,
          badge: 'Migration',
          desc: 'Bulk processing entries, slabs & lot migration'
        }
      ]
    },
    {
      id: 'analytics-control',
      title: 'Analytics & Control',
      icon: BarChart3,
      items: [
        {
          id: 'prod-reports',
          label: 'Production Reports Hub',
          icon: BarChart3,
          desc: 'Shift efficiency, recovery & yield logs'
        },
        {
          id: 'audit-log',
          label: 'Surveillance Audit Trail',
          icon: ShieldAlert,
          badge: 'Admin Only',
          desc: 'Exclusive surveillance view & action logs',
          show: permissions.canViewAuditLog
        }
      ]
    }
  ];

  return (
    <FlyoutSidebar<ProductionNavTab>
      moduleTitle="Factory Production"
      moduleBadge="Plant Suite"
      subHeadings={subHeadings}
      activeTab={activeTab}
      onTabChange={onTabChange}
      activeRole={currentUser.role}
      footerSubtitle="Factory Floor & Yield Management"
    />
  );
};
