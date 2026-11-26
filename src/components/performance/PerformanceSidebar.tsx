import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { FlyoutSidebar, NavSubHeading } from '../common/FlyoutSidebar';
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  BookOpen,
  ShieldAlert,
} from 'lucide-react';

export type PerformanceNavTab =
  | 'perf-dashboard'
  | 'expense-analysis'
  | 'sales-analysis'
  | 'species-ledger'
  | 'exception-report'
  | 'perf-audit';

interface PerformanceSidebarProps {
  activeTab: PerformanceNavTab;
  onTabChange: (tab: PerformanceNavTab) => void;
}

export const PerformanceSidebar: React.FC<PerformanceSidebarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { currentUser, permissions } = useAuth();

  const subHeadings: NavSubHeading<PerformanceNavTab>[] = [
    {
      id: 'performance-overview',
      title: 'Performance Overview',
      icon: LayoutDashboard,
      items: [
        {
          id: 'perf-dashboard',
          label: 'Profitability Dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      id: 'analysis-tables',
      title: 'Analysis Tables',
      icon: Receipt,
      items: [
        {
          id: 'expense-analysis',
          label: 'Direct Expense Analysis',
          icon: Receipt,
          show: permissions.canViewPerformanceExpenses,
        },
        {
          id: 'sales-analysis',
          label: 'Sales Analysis',
          icon: TrendingUp,
          show: permissions.canViewPerformanceExpenses,
        },
      ],
    },
    {
      id: 'ledgers-pl',
      title: 'Ledgers & P&L',
      icon: BookOpen,
      items: [
        {
          id: 'species-ledger',
          label: 'Species-Head Sales Ledger',
          icon: BookOpen,
          show: permissions.canViewPerformanceLedger,
        },
      ],
    },
    {
      id: 'control-audit',
      title: 'Control & Audit',
      icon: ShieldAlert,
      items: [
        {
          id: 'exception-report',
          label: 'Exception & Reconciliation',
          icon: ShieldAlert,
        },
        {
          id: 'perf-audit',
          label: 'Performance Audit Log',
          icon: ShieldAlert,
          show: permissions.canViewAuditLog,
        },
      ],
    },
  ];

  return (
    <FlyoutSidebar<PerformanceNavTab>
      moduleTitle="Performance Analysis"
      moduleBadge="P&L Suite"
      subHeadings={subHeadings}
      activeTab={activeTab}
      onTabChange={onTabChange}
      activeRole={currentUser.role}
      footerSubtitle="Global Marine Exports · Performance Suite"
    />
  );
};
