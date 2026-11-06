import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { FlyoutSidebar, NavSubHeading } from './FlyoutSidebar';
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
  RotateCcw,
  CreditCard
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'purchase-entry'
  | 'purchases'
  | 'purchase-returns'
  | 'purchase-payments'
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

  const subHeadings: NavSubHeading<NavTab>[] = [
    {
      id: 'core-procurement',
      title: 'Core Procurement',
      icon: Receipt,
      items: [
        {
          id: 'dashboard',
          label: 'Executive Dashboard',
          icon: LayoutDashboard,
          desc: 'Procurement volume, landed cost & variance KPIs'
        },
        {
          id: 'purchase-entry',
          label: 'Harbour Purchase Entry',
          icon: PlusCircle,
          badge: 'Field Form',
          isQuickAction: true,
          desc: 'Single-action landing purchase entry form',
          show: permissions.canCreateEditPurchases
        },
        {
          id: 'purchases',
          label: 'Purchase Transactions',
          icon: Receipt,
          badge: 'Register',
          desc: 'Sortable landing register & payment tracking'
        },
        {
          id: 'purchase-returns',
          label: 'Purchase Returns (Debit Notes)',
          icon: RotateCcw,
          badge: 'Debit Note',
          desc: 'Rejection deductions, supplier credits & debit notes'
        },
        {
          id: 'batch-expenses',
          label: 'Batch Expenses & Yields',
          icon: Layers,
          badge: 'Yield Engine',
          desc: 'Landing expense allocation & lot yield distribution'
        }
      ]
    },
    {
      id: 'accounting-ledgers',
      title: 'Accounting & Ledgers',
      icon: BookOpen,
      items: [
        {
          id: 'purchase-payments',
          label: 'Purchase Payments (Disbursals)',
          icon: CreditCard,
          badge: 'Disburse',
          desc: 'Record supplier payments, settlement vouchers & history',
          show: permissions.canManagePayments
        },
        {
          id: 'payments',
          label: 'Supplier Ledger & Statement',
          icon: BookOpen,
          desc: 'Running debits/credits & printable A4 statement'
        },
        {
          id: 'outstanding',
          label: 'Outstanding & Ageing (180+d)',
          icon: Clock,
          badge: 'Ageing',
          desc: 'Bucket analysis, overdue tags & payment planning'
        }
      ]
    },
    {
      id: 'procurement-masters',
      title: 'Procurement Masters',
      icon: Database,
      items: [
        {
          id: 'master-data',
          label: 'Master Reference Data',
          icon: Database,
          desc: 'Suppliers, species, grades, sizes & landing centres',
          show: permissions.canManageMasterData
        },
        {
          id: 'excel-import',
          label: 'Excel Import & Migration',
          icon: FileSpreadsheet,
          badge: 'Migration',
          desc: 'Bulk purchase data, supplier & species migration'
        }
      ]
    },
    {
      id: 'analytics-control',
      title: 'Analytics & Control',
      icon: BarChart3,
      items: [
        {
          id: 'reports',
          label: 'Operational Reports (8 Views)',
          icon: BarChart3,
          badge: '8 Views',
          desc: 'Harbour, supplier, species & batch analytics'
        },
        {
          id: 'data-quality',
          label: 'Data Quality & Reconciliation',
          icon: CheckCircle2,
          badge: 'Audit',
          desc: 'Transaction sum vs ledger verification'
        }
      ]
    },
    {
      id: 'configuration-admin',
      title: 'Configuration & Admin',
      icon: Settings,
      items: [
        {
          id: 'user-mgmt',
          label: 'Staff & User Management',
          icon: UserPlus,
          desc: 'Role permissions & user credentials',
          show: permissions.canInviteUsers || permissions.canManageStaff
        },
        {
          id: 'audit-log',
          label: 'Surveillance Audit Trail',
          icon: ShieldAlert,
          badge: 'Admin Only',
          desc: 'Forensic audit trail & action logs',
          show: permissions.canViewAuditLog
        },
        {
          id: 'settings',
          label: 'Business Settings & Data Reset',
          icon: Settings,
          desc: 'Company profile, FY configuration & data reset'
        }
      ]
    }
  ];

  return (
    <FlyoutSidebar<NavTab>
      moduleTitle="Purchase & Procurement"
      moduleBadge="Procure Suite"
      subHeadings={subHeadings}
      activeTab={activeTab}
      onTabChange={onTabChange}
      activeRole={currentUser.role}
      footerSubtitle="Harbour Procurement & Landings"
    />
  );
};
