import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { FlyoutSidebar, NavSubHeading } from '../common/FlyoutSidebar';
import {
  TrendingUp,
  FileText,
  BadgeDollarSign,
  Users,
  Anchor,
  Fish,
  FileSpreadsheet,
  BarChart3,
  ShieldAlert,
  PlusCircle,
  Scale
} from 'lucide-react';

export type SalesNavTab =
  | 'sales-dashboard'
  | 'fob-dashboard'
  | 'invoice-entry'
  | 'invoices'
  | 'realizations'
  | 'customers'
  | 'ports'
  | 'species'
  | 'sales-sizes'
  | 'sales-reports'
  | 'audit-log'
  | 'sales-excel-import';

interface SalesSidebarProps {
  activeTab: SalesNavTab;
  onTabChange: (tab: SalesNavTab) => void;
}

export const SalesSidebar: React.FC<SalesSidebarProps> = ({ activeTab, onTabChange }) => {
  const { currentUser, permissions } = useAuth();

  const subHeadings: NavSubHeading<SalesNavTab>[] = [
    {
      id: 'core-commercial',
      title: 'Core Commercial',
      icon: TrendingUp,
      items: [
        {
          id: 'sales-dashboard',
          label: 'Commercial Dashboard',
          icon: TrendingUp,
          desc: 'Export value in USD, volume & FOB analytics'
        },
        {
          id: 'fob-dashboard',
          label: 'FOB Performance Dashboard',
          icon: BadgeDollarSign,
          badge: 'USD / INR',
          desc: 'FOB valuations & turnover in USD and INR'
        }
      ]
    },
    {
      id: 'invoicing-shipments',
      title: 'Invoicing & Shipments',
      icon: FileText,
      items: [
        {
          id: 'invoice-entry',
          label: 'Commercial Invoice Entry',
          icon: PlusCircle,
          badge: 'Export Form',
          isQuickAction: true,
          desc: 'Generate export invoices, dispatches & container lines',
          show: permissions.canCreateEditSales
        },
        {
          id: 'invoices',
          label: 'Invoices & Shipments',
          icon: FileText,
          badge: 'Register',
          desc: 'Audit invoices, status & export documentation'
        }
      ]
    },
    {
      id: 'settlement-banking',
      title: 'Settlement & Banking',
      icon: BadgeDollarSign,
      items: [
        {
          id: 'realizations',
          label: 'Realization & Settlement',
          icon: BadgeDollarSign,
          badge: 'FIRC / BRC',
          desc: 'Foreign remittance realization, advances & collection period (DSO)'
        }
      ]
    },
    {
      id: 'commercial-masters',
      title: 'Commercial Masters',
      icon: Users,
      items: [
        {
          id: 'customers',
          label: 'Consignees & Buyers',
          icon: Users,
          badge: 'Customer',
          desc: 'Foreign buyers & export credit terms',
          show: permissions.canManageSalesMasterData
        },
        {
          id: 'ports',
          label: 'Port Master',
          icon: Anchor,
          badge: 'Port',
          desc: 'Loading & destination ports',
          show: permissions.canManageSalesMasterData
        },
        {
          id: 'species',
          label: 'Product Master',
          icon: Fish,
          badge: 'Export/HSN',
          desc: 'Export-ready products & customs HSN codes',
          show: permissions.canManageSalesMasterData || permissions.canManageMasterData
        },
        {
          id: 'sales-sizes',
          label: 'Grade / Size Master',
          icon: Scale,
          badge: 'Size',
          desc: 'Commercial packaging grades & export count sizes',
          show: permissions.canManageSalesMasterData || permissions.canManageMasterData
        }
      ]
    },
    {
      id: 'data-migration',
      title: 'Data & Migration',
      icon: FileSpreadsheet,
      items: [
        {
          id: 'sales-excel-import',
          label: 'Excel Import & Migration',
          icon: FileSpreadsheet,
          badge: 'Migration',
          desc: 'Bulk export invoices, buyers & port migration'
        }
      ]
    },
    {
      id: 'analytics-control',
      title: 'Analytics & Control',
      icon: BarChart3,
      items: [
        {
          id: 'sales-reports',
          label: 'Commercial Reports Hub',
          icon: BarChart3,
          desc: 'Buyer breakdown, sales velocity & realization reports'
        },
        {
          id: 'audit-log',
          label: 'Surveillance Audit Trail',
          icon: ShieldAlert,
          badge: 'Admin Only',
          desc: 'Surveillance audit trail & transaction history',
          show: permissions.canViewAuditLog
        }
      ]
    }
  ];

  return (
    <FlyoutSidebar<SalesNavTab>
      moduleTitle="Commercial Export"
      moduleBadge="Sales Suite"
      subHeadings={subHeadings}
      activeTab={activeTab}
      onTabChange={onTabChange}
      activeRole={currentUser.role}
      footerSubtitle="Global Marine Exports · Commercial Suite"
    />
  );
};
