import React, { useState, useRef, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { SalesInvoice } from '../../types';
import { formatINR, formatKg } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
import { BentoCard } from '../common/BentoCard';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { RealizationModal } from './RealizationModal';
import { convertToCSV, downloadFile } from '../../utils/exportUtils';
import { exportInvoiceToWord } from '../../utils/exportWordInvoice';
import {
  downloadExcelTemplate,
  downloadActiveInvoicesSettlementTemplate,
  parseExcelWorkbook,
  getFlexibleValue,
  formatExcelDate
} from '../../utils/excelImport';
import {
  computeOutstandingFromAdvance,
  calculateReceivablesCollectionAnalysis
} from '../../utils/collectionAnalysis';
import {
  Search,
  Download,
  Upload,
  BadgeDollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Globe,
  Plus,
  ArrowRight,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  FileCheck,
  Clock,
  Timer,
  BarChart3,
  Users
} from 'lucide-react';

export const SalesRealizationView: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { salesInvoices, customers, ports, businessSettings, bulkImportSalesRealizations } = useData();
  const { permissions } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showVoided, setShowVoided] = useState(false);

  // View mode switcher: Settlement Register vs Receivables Collection Period Analysis
  const [activeTab, setActiveTab] = useState<'register' | 'collection-analysis'>('register');

  // Collection Analysis Filter State
  const [consigneeSearchTerm, setConsigneeSearchTerm] = useState('');
  const [consigneeHealthFilter, setConsigneeHealthFilter] = useState<string>('');
  const [invoiceCollectionStatusFilter, setInvoiceCollectionStatusFilter] = useState<string>('');

  // Compute Receivables Collection Period Analysis
  const collectionAnalysis = useMemo(
    () => calculateReceivablesCollectionAnalysis(salesInvoices, customers),
    [salesInvoices, customers]
  );

  const [realizationTarget, setRealizationTarget] = useState<SalesInvoice | null>(null);

  // Bulk Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [importSummary, setImportSummary] = useState<{ updated: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lookups
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const portMap = new Map(ports.map((p) => [p.id, p]));

  // Filtered Invoices
  const filteredInvoices = salesInvoices.filter((inv) => {
    if (!showVoided && inv.isVoided) return false;
    if (showVoided && !inv.isVoided) return false;

    if (customerFilter && inv.consigneeId !== customerFilter) return false;
    if (statusFilter && inv.realizationStatus !== statusFilter) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNo = inv.invoiceNo.toLowerCase().includes(q);
      const matchOrder = inv.orderNo?.toLowerCase().includes(q);
      const consigneeName = customerMap.get(inv.consigneeId)?.name.toLowerCase() || '';
      const buyerName = inv.buyerId ? customerMap.get(inv.buyerId)?.name.toLowerCase() || '' : '';
      const matchCust = consigneeName.includes(q) || buyerName.includes(q);
      const matchAdvRef = inv.advanceBankRef?.toLowerCase().includes(q);
      const matchBalRef = inv.balanceBankRef?.toLowerCase().includes(q);
      const matchFirc = inv.realizations?.some((r) => r.bankRefNo.toLowerCase().includes(q));
      return matchNo || matchOrder || matchCust || matchAdvRef || matchBalRef || matchFirc;
    }

    return true;
  });

  // Filtered Consignees for Collection Period Analysis
  const filteredConsignees = useMemo(() => {
    return collectionAnalysis.consigneeBreakdown.filter((c) => {
      if (consigneeHealthFilter && c.collectionHealth !== consigneeHealthFilter) return false;
      if (consigneeSearchTerm) {
        const q = consigneeSearchTerm.toLowerCase();
        return c.consigneeName.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);
      }
      return true;
    });
  }, [collectionAnalysis.consigneeBreakdown, consigneeSearchTerm, consigneeHealthFilter]);

  // Filtered Invoices for Collection Period Analysis
  const filteredInvoiceMetrics = useMemo(() => {
    return collectionAnalysis.invoiceMetrics.filter((m) => {
      if (invoiceCollectionStatusFilter && m.realizationStatus !== invoiceCollectionStatusFilter) {
        return false;
      }
      return true;
    });
  }, [collectionAnalysis.invoiceMetrics, invoiceCollectionStatusFilter]);

  // Aggregates
  const activeInvoices = salesInvoices.filter((inv) => !inv.isVoided);
  const totalInvoicedUSD = activeInvoices.reduce((s, inv) => s + inv.totalAmountCurrency, 0);
  const totalAdvanceUSD = activeInvoices.reduce((s, inv) => s + (inv.advanceReceivedCurrency || 0), 0);
  const totalAdvanceINR = activeInvoices.reduce((s, inv) => {
    const rate = inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5;
    return s + (inv.advanceReceivedINR || (inv.advanceReceivedCurrency || 0) * rate);
  }, 0);
  const totalOutstandingAfterAdvanceUSD = Math.max(0, totalInvoicedUSD - totalAdvanceUSD);
  const totalOutstandingAfterAdvanceINR = activeInvoices.reduce((s, inv) => {
    const rate = inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5;
    const adv = inv.advanceReceivedCurrency || 0;
    const out = Math.max(0, inv.totalAmountCurrency - adv);
    return s + out * rate;
  }, 0);
  const totalBalanceUSD = activeInvoices.reduce((s, inv) => s + (inv.balancePaymentAmountCurrency || 0), 0);
  const totalBalanceINR = activeInvoices.reduce((s, inv) => {
    const rate = inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5;
    return s + (inv.balancePaymentINR || (inv.balancePaymentAmountCurrency || 0) * rate);
  }, 0);
  const totalRealizedUSD = activeInvoices.reduce((s, inv) => s + inv.totalRealizedCurrency, 0);
  const totalRealizedINR = activeInvoices.reduce((s, inv) => s + inv.totalRealizedINR, 0);
  const totalUnrealizedUSD = activeInvoices.reduce((s, inv) => s + inv.balanceRealizationCurrency, 0);

  const overallProgressPct =
    totalInvoicedUSD > 0 ? Math.min(100, Math.round((totalRealizedUSD / totalInvoicedUSD) * 100)) : 0;

  // Export CSV with all settlement parameters including dual forward rates
  const handleExportCSV = () => {
    const exportData = filteredInvoices.map((inv) => {
      const consignee = customerMap.get(inv.consigneeId);
      const buyer = inv.buyerId ? customerMap.get(inv.buyerId) : consignee;
      const pod = portMap.get(inv.portOfDischargeId);
      const bankRate = inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5;
      const advRate = inv.advanceExchangeRate || bankRate;
      const balRate = inv.balanceExchangeRate || bankRate;
      const advUSD = inv.advanceReceivedCurrency || 0;
      const advINR = inv.advanceReceivedINR || Number((advUSD * advRate).toFixed(2));
      const balUSD = inv.balancePaymentAmountCurrency || 0;
      const balINR = inv.balancePaymentINR || Number((balUSD * balRate).toFixed(2));
      const outstandingAfterAdv = computeOutstandingFromAdvance(inv.totalAmountCurrency, advUSD, balRate);

      return {
        InvoiceNo: inv.invoiceNo,
        Date: inv.invoiceDate,
        Consignee: consignee?.name || '',
        Buyer: buyer?.name || '',
        Country: consignee?.country || '',
        POD: pod?.name || '',
        Currency: inv.currency,
        TotalAmount: inv.totalAmountCurrency,
        AdvanceForwardRate: advRate,
        BalanceForwardRate: balRate,
        BankExchangeRate: bankRate,
        AdvanceReceivedUSD: advUSD,
        AdvanceDate: inv.advanceReceivedDate || '',
        AdvanceReceivedINR: advINR,
        AdvanceBankRef: inv.advanceBankRef || '',
        OutstandingAfterAdvanceUSD: outstandingAfterAdv.outstandingAfterAdvanceCurrency,
        OutstandingAfterAdvanceINR: outstandingAfterAdv.outstandingAfterAdvanceINR,
        BalancePaymentUSD: balUSD,
        BalanceDate: inv.balancePaymentDate || '',
        BalancePaymentINR: balINR,
        BalanceBankRef: inv.balanceBankRef || '',
        TotalRealizedUSD: inv.totalRealizedCurrency,
        TotalRealizedINR: inv.totalRealizedINR,
        UnrealizedBalanceUSD: inv.balanceRealizationCurrency,
        Status: inv.realizationStatus,
        Voided: inv.isVoided ? 'Yes' : 'No'
      };
    });

    const csvStr = convertToCSV(exportData, [
      { key: 'InvoiceNo', label: 'Invoice No' },
      { key: 'Date', label: 'Invoice Date' },
      { key: 'Consignee', label: 'Consignee / Customer' },
      { key: 'Buyer', label: 'Buyer' },
      { key: 'Country', label: 'Country' },
      { key: 'POD', label: 'Port of Discharge' },
      { key: 'Currency', label: 'Currency' },
      { key: 'TotalAmount', label: 'Total Invoiced (USD)' },
      { key: 'AdvanceForwardRate', label: 'Advance Forward Rate (Bank)' },
      { key: 'BalanceForwardRate', label: 'Balance Forward Rate (Bank)' },
      { key: 'BankExchangeRate', label: 'Exchange Rate (Pre-determined with Bank)' },
      { key: 'AdvanceReceivedUSD', label: 'Advance Received (USD)' },
      { key: 'AdvanceDate', label: 'Date of Receiving Advance' },
      { key: 'AdvanceReceivedINR', label: 'Advance Received (INR)' },
      { key: 'AdvanceBankRef', label: 'Advance Bank Ref / FIRC' },
      { key: 'OutstandingAfterAdvanceUSD', label: 'Outstanding After Advance (USD)' },
      { key: 'OutstandingAfterAdvanceINR', label: 'Outstanding After Advance (INR)' },
      { key: 'BalancePaymentUSD', label: 'Balance Payment Amount (USD)' },
      { key: 'BalanceDate', label: 'Date of Receiving Balance Payment' },
      { key: 'BalancePaymentINR', label: 'Balance Payment Amount (INR)' },
      { key: 'BalanceBankRef', label: 'Balance Bank Ref / FIRC' },
      { key: 'TotalRealizedUSD', label: 'Total Realized (USD)' },
      { key: 'TotalRealizedINR', label: 'Total Realized (INR)' },
      { key: 'UnrealizedBalanceUSD', label: 'Unrealized Balance (USD)' },
      { key: 'Status', label: 'Realization Status' },
      { key: 'Voided', label: 'Voided' }
    ]);

    downloadFile(csvStr, `Export_Realization_Settlement_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Export Comprehensive Receivables Collection Period Analysis CSV
  const handleExportCollectionAnalysisCSV = () => {
    const rows: any[] = [];
    collectionAnalysis.consigneeBreakdown.forEach((c) => {
      rows.push({
        Type: 'Consignee Summary',
        Consignee: c.consigneeName,
        Country: c.country,
        TotalInvoices: c.totalInvoicesCount,
        RealizedInvoices: c.realizedInvoicesCount,
        OutstandingInvoices: c.outstandingInvoicesCount,
        InvoicedUSD: c.totalInvoicedUSD,
        AdvanceCollectedUSD: c.totalAdvanceUSD,
        OutstandingAfterAdvanceUSD: c.totalOutstandingAfterAdvanceUSD,
        BalanceCollectedUSD: c.totalBalanceUSD,
        TotalCollectedUSD: c.totalCollectedUSD,
        TotalOutstandingUSD: c.totalOutstandingUSD,
        TotalOutstandingINR: c.totalOutstandingINR,
        AvgDaysToAdvance: c.avgDaysToAdvance !== null ? c.avgDaysToAdvance : 'N/A',
        AvgDaysAdvanceToBalance: c.avgDaysAdvanceToBalance !== null ? c.avgDaysAdvanceToBalance : 'N/A',
        AverageCollectionPeriodDSO: c.avgCollectionDays !== null ? c.avgCollectionDays : 'N/A',
        WeightedDSO: c.weightedAvgCollectionDays !== null ? c.weightedAvgCollectionDays : 'N/A',
        CollectionEfficiencyPct: `${c.collectionEfficiencyPct}%`,
        HealthStatus: c.collectionHealth
      });
    });

    const csvStr = convertToCSV(rows, [
      { key: 'Type', label: 'Record Type' },
      { key: 'Consignee', label: 'Consignee / Foreign Buyer' },
      { key: 'Country', label: 'Country' },
      { key: 'TotalInvoices', label: 'Total Invoices' },
      { key: 'RealizedInvoices', label: 'Realized Invoices' },
      { key: 'OutstandingInvoices', label: 'Outstanding Invoices' },
      { key: 'InvoicedUSD', label: 'Total Invoiced (USD)' },
      { key: 'AdvanceCollectedUSD', label: 'Advance Collected (USD)' },
      { key: 'OutstandingAfterAdvanceUSD', label: 'Outstanding After Advance (USD)' },
      { key: 'BalanceCollectedUSD', label: 'Balance Payment (USD)' },
      { key: 'TotalCollectedUSD', label: 'Total Collected (USD)' },
      { key: 'TotalOutstandingUSD', label: 'Total Outstanding (USD)' },
      { key: 'TotalOutstandingINR', label: 'Total Outstanding (INR)' },
      { key: 'AvgDaysToAdvance', label: 'Avg Days to Pay Advance' },
      { key: 'AvgDaysAdvanceToBalance', label: 'Avg Turnaround: Advance to Balance (Days)' },
      { key: 'AverageCollectionPeriodDSO', label: 'Avg Collection Period / DSO (Days)' },
      { key: 'WeightedDSO', label: 'Amount-Weighted DSO (Days)' },
      { key: 'CollectionEfficiencyPct', label: 'Collection Efficiency (%)' },
      { key: 'HealthStatus', label: 'Collection Health Rating' }
    ]);

    downloadFile(csvStr, `Receivables_Collection_Period_Analysis_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Handle File Selection for Settlement Import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsingFile(true);
    setImportSummary(null);

    try {
      const parsed = await parseExcelWorkbook(file);
      if (parsed.sheets && parsed.sheets.length > 0) {
        // Pick sheet with rows
        const targetSheet = parsed.sheets.find((s) => s.rows && s.rows.length > 0) || parsed.sheets[0];
        setParsedRows(targetSheet.rows || []);
      } else {
        alert('Could not find any data rows in the uploaded spreadsheet.');
        setParsedRows([]);
      }
    } catch (err: any) {
      alert(`Failed to parse Excel file: ${err.message || 'Unknown error'}`);
      setParsedRows([]);
    } finally {
      setIsParsingFile(false);
    }
  };

  // Apply Bulk Settlement Import
  const handleApplySettlementImport = () => {
    if (parsedRows.length === 0) return;
    const res = bulkImportSalesRealizations(parsedRows);
    setImportSummary(res);
  };

  const handleResetImportModal = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setImportSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Figma Header Block */}
      <PageHeader
        title="Realization & Settlement"
        subtitle="Manage advance payments received, outstanding balances, balance remittances, bank exchange rates, and collection period (DSO) velocity."
        breadcrumbs={['Sales', 'Settlement & Banking', 'Realization & Settlement']}
        primaryAction={
          permissions.canManageSalesRealization
            ? {
                label: 'Import Settlement Excel',
                onClick: () => {
                  handleResetImportModal();
                  setIsImportModalOpen(true);
                },
                icon: Upload
              }
            : permissions.canCreateEditSales && onNavigate
            ? {
                label: 'New commercial invoice',
                onClick: () => onNavigate('invoice-entry'),
                icon: Plus
              }
            : undefined
        }
        secondaryActions={[
          {
            label: 'Invoices Template',
            onClick: () => downloadActiveInvoicesSettlementTemplate(activeInvoices, customers),
            icon: FileSpreadsheet,
            title: 'Download Excel sheet with active invoices pre-filled'
          },
          {
            label: 'Blank Template',
            onClick: () => downloadExcelTemplate('sales-realizations'),
            icon: Download,
            title: 'Download blank sample template'
          },
          {
            label: 'Export CSV',
            onClick: handleExportCSV,
            icon: Download,
            title: 'Export realization register as CSV'
          },
          ...(onNavigate
            ? [
                {
                  label: 'Invoices Register',
                  onClick: () => onNavigate('invoices'),
                  icon: ArrowRight,
                  title: 'Navigate to Invoices Register'
                }
              ]
            : [])
        ]}
      />

      {/* Navigation View Switcher */}
      <div className="glass-surface-thin p-1.5 rounded-2xl border border-white/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'register'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-ink-700 hover:bg-rose-50 hover:text-rose-800'
            }`}
          >
            <BadgeDollarSign className="w-4 h-4" />
            <span>Realization &amp; Settlement Register</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                activeTab === 'register' ? 'bg-white/20 text-white' : 'bg-gray-100 text-ink-600'
              }`}
            >
              {activeInvoices.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('collection-analysis')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'collection-analysis'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-ink-700 hover:bg-blue-50 hover:text-blue-800'
            }`}
          >
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Receivables Collection Period Analysis</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                activeTab === 'collection-analysis' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
              }`}
            >
              {collectionAnalysis.averageCollectionPeriodDays !== null
                ? `${collectionAnalysis.averageCollectionPeriodDays}d DSO`
                : 'DSO'}
            </span>
          </button>
        </div>

        {activeTab === 'collection-analysis' && (
          <button
            onClick={handleExportCollectionAnalysisCSV}
            className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-ink-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs mr-1 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export Collection Analysis CSV</span>
          </button>
        )}
      </div>

      {activeTab === 'register' && (
        <div className="space-y-6">
          {/* Bento Settlement KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
            <BentoCard
              label="Total Invoiced (USD)"
              value={`$${totalInvoicedUSD.toLocaleString()}`}
              caption={`${activeInvoices.length} active invoices`}
              variant="highlight"
            />
            <BentoCard
              label="Advance Received"
              value={`$${totalAdvanceUSD.toLocaleString()}`}
              caption={`₹${(totalAdvanceINR / 100000).toFixed(2)} L credited`}
              variant="default"
            />
            <BentoCard
              label="Outstanding Post-Adv"
              value={`$${totalOutstandingAfterAdvanceUSD.toLocaleString()}`}
              caption={`₹${(totalOutstandingAfterAdvanceINR / 100000).toFixed(2)} L remaining`}
              variant="default"
            />
            <BentoCard
              label="Balance Received"
              value={`$${totalBalanceUSD.toLocaleString()}`}
              caption={`₹${(totalBalanceINR / 100000).toFixed(2)} L credited`}
              variant="default"
            />
            <BentoCard
              label="Total Realized (INR)"
              value={formatINR(totalRealizedINR)}
              caption={`${overallProgressPct}% proceeds realized`}
              variant="success"
            />
            <BentoCard
              label="Unrealized Balance"
              value={`$${totalUnrealizedUSD.toLocaleString()}`}
              caption={totalUnrealizedUSD > 0 ? 'Pending foreign wire' : 'All invoices settled'}
              variant={totalUnrealizedUSD > 0 ? 'warning' : 'success'}
            />
          </div>

      {/* Import Realization Callout Banner */}
      <div className="p-4 bg-gradient-to-r from-rose-50 via-white to-blue-50 border border-rose-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-950 font-bold text-xs uppercase tracking-wider">
            <Upload className="w-4 h-4 text-rose-600" />
            <span>Bulk Import Realization &amp; Settlement from Excel</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold">
              Automated Matching
            </span>
          </div>
          <p className="text-xs text-ink-600">
            Import advance received, date of advance, balance payment amount, date of balance payment, and pre-determined bank exchange rates for all invoices at once.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadActiveInvoicesSettlementTemplate(activeInvoices, customers)}
            className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-ink-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            title="Download Excel spreadsheet pre-filled with current invoice numbers"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download Active Sheet</span>
          </button>

          {permissions.canManageSalesRealization && (
            <button
              onClick={() => {
                handleResetImportModal();
                setIsImportModalOpen(true);
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Settlement Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Sticky Search & Multi-Filter Bar */}
      <div className="glass-surface-thin p-4 rounded-2xl border border-white/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              placeholder="Search invoice #, customer, order #, FIRC advice ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
            />
          </div>

          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
          >
            <option value="">All Consignees / Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.country})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
          >
            <option value="">All Settlement Statuses</option>
            <option value="Fully Realized">Fully Realized (100% Settled)</option>
            <option value="Partially Realized">Partially Realized (Advance Received)</option>
            <option value="Not Realized">Not Realized (Pending Wire)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-ink-600 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={showVoided}
              onChange={(e) => setShowVoided(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500 border-gray-300"
            />
            <span>Show Voided</span>
          </label>
        </div>
      </div>

      {/* Realization & Settlement Schedule Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1360px]">
            <thead>
              <tr className="bg-gray-50/90 text-[11px] font-bold text-ink-500 uppercase tracking-wider border-b border-gray-200">
                <th className="py-3 px-3 w-[140px] whitespace-nowrap">Invoice # &amp; Date</th>
                <th className="py-3 px-3 min-w-[180px] max-w-[220px]">Consignee &amp; Buyer</th>
                <th className="py-3 px-3 w-[125px] text-right whitespace-nowrap">Invoice Value</th>
                <th className="py-3 px-3 w-[130px] text-center whitespace-nowrap bg-rose-50/40">Bank Forward Rates</th>
                <th className="py-3 px-3 w-[130px] text-right whitespace-nowrap bg-blue-50/40">Advance Received</th>
                <th className="py-3 px-3 w-[125px] text-center whitespace-nowrap bg-blue-50/40">Date of Advance</th>
                <th className="py-3 px-3 w-[140px] text-right whitespace-nowrap bg-indigo-50/40">Outstanding Balance</th>
                <th className="py-3 px-3 w-[130px] text-right whitespace-nowrap bg-emerald-50/40">Balance Payment</th>
                <th className="py-3 px-3 w-[125px] text-center whitespace-nowrap bg-emerald-50/40">Date of Balance</th>
                <th className="py-3 px-3 w-[120px] text-right whitespace-nowrap">Net Unrealized</th>
                <th className="py-3 px-3 w-[110px] text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-3 w-[115px] text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-ink-500">
                    <BadgeDollarSign className="w-8 h-8 mx-auto mb-2 text-ink-400" />
                    <p className="font-semibold text-sm text-ink-700">No export invoices match the selected criteria</p>
                    <p className="text-xs text-ink-500 mt-1">
                      Create a new commercial invoice or import realization details using the buttons above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const consignee = customerMap.get(inv.consigneeId);
                  const buyer = inv.buyerId ? customerMap.get(inv.buyerId) : consignee;
                  const bankRate = inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5;
                  const advRate = inv.advanceExchangeRate || bankRate;
                  const balRate = inv.balanceExchangeRate || bankRate;
                  const advUSD = inv.advanceReceivedCurrency || 0;
                  const advINR = inv.advanceReceivedINR || (advUSD > 0 ? Number((advUSD * advRate).toFixed(2)) : 0);
                  const balUSD = inv.balancePaymentAmountCurrency || 0;
                  const balINR = inv.balancePaymentINR || (balUSD > 0 ? Number((balUSD * balRate).toFixed(2)) : 0);

                  const advPct = inv.totalAmountCurrency > 0 ? ((advUSD / inv.totalAmountCurrency) * 100).toFixed(0) : '0';
                  const outstandingAfterAdv = computeOutstandingFromAdvance(inv.totalAmountCurrency, advUSD, balRate);

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-rose-50/25 transition-colors ${
                        inv.isVoided ? 'bg-rose-50/40 text-ink-400' : ''
                      }`}
                    >
                      {/* Invoice No & Date */}
                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-rose-700">{inv.invoiceNo}</span>
                          {inv.isVoided && <StatusBadge status="Voided" />}
                        </div>
                        <div className="text-[11px] text-ink-600 font-medium whitespace-nowrap mt-0.5">
                          {inv.invoiceDate}
                        </div>
                        {inv.orderNo && (
                          <div className="text-[10px] text-ink-500 font-mono">PO: {inv.orderNo}</div>
                        )}
                      </td>

                      {/* Consignee */}
                      <td className="py-3 px-3 align-middle max-w-[220px]">
                        <div className="font-bold text-ink-900 truncate" title={consignee?.name}>
                          {consignee?.name || 'Unknown Consignee'}
                        </div>
                        <div className="text-[10px] text-ink-500 flex items-center gap-1 mt-0.5 truncate">
                          <Globe className="w-3 h-3 text-ink-400 shrink-0" />
                          <span>{consignee?.country || 'Export'}</span>
                          {buyer && buyer.id !== consignee?.id && (
                            <span className="text-ink-400">· Buyer: {buyer.name}</span>
                          )}
                        </div>
                      </td>

                      {/* Total Invoiced Value */}
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                        <div className="font-black text-ink-950 tabular-nums">
                          {inv.currency} {inv.totalAmountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-ink-500 font-medium tabular-nums">
                          {formatKg(inv.totalWeightKg)}
                        </div>
                      </td>

                      {/* Pre-determined Bank Forward Rates */}
                      <td className="py-3 px-3 align-middle text-center whitespace-nowrap bg-rose-50/30">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center justify-center gap-1 font-mono text-[10px] font-bold">
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200" title="Advance Forward Rate">
                              Adv: ₹{advRate.toFixed(2)}
                            </span>
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200" title="Balance Forward Rate">
                              Bal: ₹{balRate.toFixed(2)}
                            </span>
                          </div>
                          {inv.averageRealizedExchangeRate && inv.totalRealizedCurrency > 0 && (
                            <span className="text-[9px] font-semibold text-rose-700">
                              Avg: ₹{inv.averageRealizedExchangeRate.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Advance Received */}
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap bg-blue-50/30">
                        {advUSD > 0 ? (
                          <div>
                            <div className="font-extrabold text-blue-800 tabular-nums">
                              {inv.currency} {advUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-blue-600 font-medium tabular-nums">
                              {formatINR(advINR)} ({advPct}%)
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-ink-400 font-medium italic">No advance</span>
                        )}
                      </td>

                      {/* Date of Receiving Advance */}
                      <td className="py-3 px-3 align-middle text-center whitespace-nowrap bg-blue-50/30">
                        {inv.advanceReceivedDate ? (
                          <div className="inline-flex items-center justify-center gap-1 text-ink-800 font-semibold text-xs">
                            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{inv.advanceReceivedDate}</span>
                          </div>
                        ) : advUSD > 0 ? (
                          <span className="text-[11px] text-amber-700 font-medium">Date pending</span>
                        ) : (
                          <span className="text-[11px] text-ink-400">—</span>
                        )}
                        {inv.advanceBankRef && (
                          <div className="text-[9px] text-blue-600 font-mono truncate max-w-[120px] mx-auto" title={inv.advanceBankRef}>
                            {inv.advanceBankRef}
                          </div>
                        )}
                      </td>

                      {/* Outstanding After Advance (Direct Calculation) */}
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap bg-indigo-50/25">
                        <div className="font-extrabold text-ink-950 tabular-nums">
                          {inv.currency} {outstandingAfterAdv.outstandingAfterAdvanceCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-ink-500 font-medium tabular-nums">
                          {formatINR(outstandingAfterAdv.outstandingAfterAdvanceINR)} ({outstandingAfterAdv.outstandingPercentage}%)
                        </div>
                      </td>

                      {/* Balance Payment Amount */}
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap bg-emerald-50/30">
                        {balUSD > 0 ? (
                          <div>
                            <div className="font-extrabold text-emerald-800 tabular-nums">
                              {inv.currency} {balUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-emerald-700 font-medium tabular-nums">
                              {formatINR(balINR)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 font-semibold italic">
                            Pending {inv.currency} {inv.balanceRealizationCurrency.toLocaleString()}
                          </span>
                        )}
                      </td>

                      {/* Date of Receiving Balance Payment */}
                      <td className="py-3 px-3 align-middle text-center whitespace-nowrap bg-emerald-50/30">
                        {inv.balancePaymentDate ? (
                          <div className="inline-flex items-center justify-center gap-1 text-ink-800 font-semibold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{inv.balancePaymentDate}</span>
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[10px] font-bold">
                            Awaiting wire
                          </span>
                        )}
                        {inv.balanceBankRef && (
                          <div className="text-[9px] text-emerald-700 font-mono truncate max-w-[120px] mx-auto" title={inv.balanceBankRef}>
                            {inv.balanceBankRef}
                          </div>
                        )}
                      </td>

                      {/* Unrealized Balance */}
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                        <div
                          className={`font-black tabular-nums ${
                            inv.balanceRealizationCurrency > 0.05 ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {inv.currency} {inv.balanceRealizationCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-ink-500">
                          {inv.balanceRealizationCurrency > 0.05 ? 'Unsettled' : 'Fully Cleared'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                        <StatusBadge
                          status={
                            inv.realizationStatus === 'Fully Realized'
                              ? 'Realized'
                              : inv.realizationStatus === 'Partially Realized'
                              ? 'Partially realized'
                              : 'Not realized'
                          }
                        />
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {!inv.isVoided && (
                            <button
                              onClick={() => setRealizationTarget(inv)}
                              title="Update Settlement: Advance, Balance, Dates & Bank Rate"
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition"
                            >
                              <BadgeDollarSign className="w-3.5 h-3.5" />
                              <span>Settle</span>
                            </button>
                          )}

                          <button
                            onClick={async () => {
                              try {
                                await exportInvoiceToWord(inv, businessSettings);
                              } catch (err: any) {
                                alert(`Export failed: ${err.message || 'Unknown error'}`);
                              }
                            }}
                            title="Export to Word Document (.docx)"
                            className="p-1.5 text-ink-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          >
                            <FileDown className="w-3.5 h-3.5 text-rose-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

  {/* ============================================================== */}
  {/* RECEIVABLES COLLECTION PERIOD ANALYSIS VIEW */}
  {/* ============================================================== */}
  {activeTab === 'collection-analysis' && (
    <div className="space-y-6">
      {/* Executive Collection Period KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <BentoCard
          label="Avg Collection (DSO)"
          value={collectionAnalysis.averageCollectionPeriodDays !== null ? `${collectionAnalysis.averageCollectionPeriodDays} Days` : 'N/A'}
          caption={`Unweighted DSO (${collectionAnalysis.totalRealizedInvoices} realized)`}
          variant={
            collectionAnalysis.averageCollectionPeriodDays === null
              ? 'default'
              : collectionAnalysis.averageCollectionPeriodDays <= 30
              ? 'success'
              : collectionAnalysis.averageCollectionPeriodDays <= 45
              ? 'default'
              : 'warning'
          }
        />
        <BentoCard
          label="Weighted DSO"
          value={collectionAnalysis.weightedCollectionPeriodDays !== null ? `${collectionAnalysis.weightedCollectionPeriodDays} Days` : 'N/A'}
          caption="Weighted by USD volume"
          variant="highlight"
        />
        <BentoCard
          label="Advance Receipt Lag"
          value={collectionAnalysis.averageDaysToAdvance !== null ? `${collectionAnalysis.averageDaysToAdvance} Days` : 'N/A'}
          caption="Invoice to advance receipt"
          variant="default"
        />
        <BentoCard
          label="Advance to Balance Lag"
          value={collectionAnalysis.averageDaysAdvanceToBalance !== null ? `${collectionAnalysis.averageDaysAdvanceToBalance} Days` : 'N/A'}
          caption="Advance to balance clearance"
          variant="default"
        />
        <BentoCard
          label="Collection Efficiency"
          value={`${collectionAnalysis.collectionEfficiencyIndex}%`}
          caption={`$${collectionAnalysis.totalCollectedUSD.toLocaleString()} of $${collectionAnalysis.totalInvoicedUSD.toLocaleString()}`}
          variant={collectionAnalysis.collectionEfficiencyIndex >= 80 ? 'success' : 'default'}
        />
        <BentoCard
          label="Outstanding Receivables"
          value={`$${collectionAnalysis.totalOutstandingUSD.toLocaleString()}`}
          caption={`${formatINR(collectionAnalysis.totalOutstandingINR)} pending`}
          variant={collectionAnalysis.totalOutstandingUSD > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Ageing Distribution of Outstanding Receivables */}
      <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-rose-600" />
              Receivables Ageing Distribution (Unsettled Export Portfolios)
            </h3>
            <p className="text-[11px] text-ink-500 mt-0.5">
              Age analysis of open invoices from invoice issue date to today
            </p>
          </div>
          <span className="text-xs font-bold text-ink-700 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
            Total Unsettled: ${collectionAnalysis.totalOutstandingUSD.toLocaleString()} ({formatINR(collectionAnalysis.totalOutstandingINR)})
          </span>
        </div>

        {/* Visual Ageing Bar */}
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
          {collectionAnalysis.ageingBuckets['0-30 Days'].pct > 0 && (
            <div
              style={{ width: `${collectionAnalysis.ageingBuckets['0-30 Days'].pct}%` }}
              className="bg-emerald-500 h-full transition-all duration-300"
              title={`0-30 Days: ${collectionAnalysis.ageingBuckets['0-30 Days'].pct}%`}
            />
          )}
          {collectionAnalysis.ageingBuckets['31-60 Days'].pct > 0 && (
            <div
              style={{ width: `${collectionAnalysis.ageingBuckets['31-60 Days'].pct}%` }}
              className="bg-blue-500 h-full transition-all duration-300"
              title={`31-60 Days: ${collectionAnalysis.ageingBuckets['31-60 Days'].pct}%`}
            />
          )}
          {collectionAnalysis.ageingBuckets['61-90 Days'].pct > 0 && (
            <div
              style={{ width: `${collectionAnalysis.ageingBuckets['61-90 Days'].pct}%` }}
              className="bg-amber-500 h-full transition-all duration-300"
              title={`61-90 Days: ${collectionAnalysis.ageingBuckets['61-90 Days'].pct}%`}
            />
          )}
          {collectionAnalysis.ageingBuckets['90+ Days'].pct > 0 && (
            <div
              style={{ width: `${collectionAnalysis.ageingBuckets['90+ Days'].pct}%` }}
              className="bg-rose-500 h-full transition-all duration-300"
              title={`90+ Days: ${collectionAnalysis.ageingBuckets['90+ Days'].pct}%`}
            />
          )}
        </div>

        {/* 4 Bucket Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
            <div className="flex items-center justify-between text-emerald-900 font-bold text-[11px]">
              <span>0 - 30 Days (Current)</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 rounded text-emerald-800">
                {collectionAnalysis.ageingBuckets['0-30 Days'].pct}%
              </span>
            </div>
            <div className="text-base font-black text-emerald-950 mt-1 tabular-nums">
              ${collectionAnalysis.ageingBuckets['0-30 Days'].balanceUSD.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-700 mt-0.5">
              {collectionAnalysis.ageingBuckets['0-30 Days'].count} invoices · {formatINR(collectionAnalysis.ageingBuckets['0-30 Days'].balanceINR)}
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between text-blue-900 font-bold text-[11px]">
              <span>31 - 60 Days (Grace)</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 rounded text-blue-800">
                {collectionAnalysis.ageingBuckets['31-60 Days'].pct}%
              </span>
            </div>
            <div className="text-base font-black text-blue-950 mt-1 tabular-nums">
              ${collectionAnalysis.ageingBuckets['31-60 Days'].balanceUSD.toLocaleString()}
            </div>
            <div className="text-[10px] text-blue-700 mt-0.5">
              {collectionAnalysis.ageingBuckets['31-60 Days'].count} invoices · {formatINR(collectionAnalysis.ageingBuckets['31-60 Days'].balanceINR)}
            </div>
          </div>

          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between text-amber-900 font-bold text-[11px]">
              <span>61 - 90 Days (Delayed)</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 rounded text-amber-800">
                {collectionAnalysis.ageingBuckets['61-90 Days'].pct}%
              </span>
            </div>
            <div className="text-base font-black text-amber-950 mt-1 tabular-nums">
              ${collectionAnalysis.ageingBuckets['61-90 Days'].balanceUSD.toLocaleString()}
            </div>
            <div className="text-[10px] text-amber-700 mt-0.5">
              {collectionAnalysis.ageingBuckets['61-90 Days'].count} invoices · {formatINR(collectionAnalysis.ageingBuckets['61-90 Days'].balanceINR)}
            </div>
          </div>

          <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200">
            <div className="flex items-center justify-between text-rose-900 font-bold text-[11px]">
              <span>90+ Days (Critical)</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 rounded text-rose-800">
                {collectionAnalysis.ageingBuckets['90+ Days'].pct}%
              </span>
            </div>
            <div className="text-base font-black text-rose-950 mt-1 tabular-nums">
              ${collectionAnalysis.ageingBuckets['90+ Days'].balanceUSD.toLocaleString()}
            </div>
            <div className="text-[10px] text-rose-700 mt-0.5">
              {collectionAnalysis.ageingBuckets['90+ Days'].count} invoices · {formatINR(collectionAnalysis.ageingBuckets['90+ Days'].balanceINR)}
            </div>
          </div>
        </div>
      </div>

      {/* Consignee / Foreign Buyer Collection Velocity Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              Consignee &amp; Buyer Collection Velocity &amp; Efficiency
            </h3>
            <p className="text-[11px] text-ink-500 mt-0.5">
              Average turnaround for advance payment, balance payment, and overall DSO per foreign buyer
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                type="text"
                placeholder="Filter buyer or country..."
                value={consigneeSearchTerm}
                onChange={(e) => setConsigneeSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-rose-400"
              />
            </div>

            <select
              value={consigneeHealthFilter}
              onChange={(e) => setConsigneeHealthFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-rose-400 font-medium"
            >
              <option value="">All Health Ratings</option>
              <option value="Prompt">Prompt (&le; 20 Days)</option>
              <option value="Standard">Standard (21 - 40 Days)</option>
              <option value="Delayed">Delayed (41 - 60 Days)</option>
              <option value="Critical">Critical (&gt; 60 Days)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1180px]">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase tracking-wider border-b border-gray-200">
                <th className="py-2.5 px-3 w-[180px] whitespace-nowrap">Consignee &amp; Buyer</th>
                <th className="py-2.5 px-3 w-[110px] whitespace-nowrap">Country</th>
                <th className="py-2.5 px-3 w-[110px] text-center whitespace-nowrap">Invoices</th>
                <th className="py-2.5 px-3 w-[130px] text-right whitespace-nowrap">Invoiced (USD)</th>
                <th className="py-2.5 px-3 w-[130px] text-right whitespace-nowrap">Collected (USD)</th>
                <th className="py-2.5 px-3 w-[140px] text-right whitespace-nowrap">Outstanding (USD)</th>
                <th className="py-2.5 px-3 w-[130px] text-center whitespace-nowrap bg-blue-50/50">Avg Days to Advance</th>
                <th className="py-2.5 px-3 w-[140px] text-center whitespace-nowrap bg-indigo-50/50">Advance &rarr; Balance Lag</th>
                <th className="py-2.5 px-3 w-[150px] text-center whitespace-nowrap bg-rose-50/50">Avg Collection (DSO)</th>
                <th className="py-2.5 px-3 w-[110px] text-center whitespace-nowrap">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredConsignees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-ink-500">
                    No buyers match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredConsignees.map((c) => (
                  <tr key={c.consigneeId} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-3 font-bold text-ink-900 align-middle whitespace-nowrap">{c.consigneeName}</td>
                    <td className="py-3 px-3 text-ink-600 font-medium align-middle whitespace-nowrap">{c.country}</td>
                    <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                      <span className="font-semibold text-ink-800">{c.totalInvoicesCount}</span>
                      <span className="text-[10px] text-ink-500 block">
                        {c.realizedInvoicesCount} settled / {c.outstandingInvoicesCount} open
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-ink-950 tabular-nums align-middle whitespace-nowrap">
                      ${c.totalInvoicedUSD.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-800 tabular-nums align-middle whitespace-nowrap">
                      <div>${c.totalCollectedUSD.toLocaleString()}</div>
                      <div className="text-[10px] text-emerald-600 font-semibold">{c.collectionEfficiencyPct}%</div>
                    </td>
                    <td className="py-3 px-3 text-right font-black tabular-nums align-middle whitespace-nowrap">
                      <div className={c.totalOutstandingUSD > 0.05 ? 'text-rose-700' : 'text-emerald-700'}>
                        ${c.totalOutstandingUSD.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-ink-500">
                        {formatINR(c.totalOutstandingINR)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center bg-blue-50/30 align-middle whitespace-nowrap">
                      {c.avgDaysToAdvance !== null ? (
                        <span className="font-bold text-blue-900">{c.avgDaysToAdvance} Days</span>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center bg-indigo-50/30 align-middle whitespace-nowrap">
                      {c.avgDaysAdvanceToBalance !== null ? (
                        <span className="font-bold text-indigo-900">{c.avgDaysAdvanceToBalance} Days</span>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center bg-rose-50/30 align-middle whitespace-nowrap">
                      {c.avgCollectionDays !== null ? (
                        <div className="font-black text-rose-900">
                          {c.avgCollectionDays} Days
                          {c.weightedAvgCollectionDays !== null && (
                            <span className="text-[10px] text-ink-500 block font-normal">
                              Weighted: {c.weightedAvgCollectionDays}d
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-ink-400 italic">Pending collection</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.collectionHealth === 'Prompt'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : c.collectionHealth === 'Standard'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : c.collectionHealth === 'Delayed'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {c.collectionHealth}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice-Level Collection Velocity & Turnaround Log */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-emerald-600" />
              Invoice Collection Timelines &amp; Turnaround Turn
            </h3>
            <p className="text-[11px] text-ink-500 mt-0.5">
              Full lifecycle timeline from invoice creation to advance receipt and final balance settlement
            </p>
          </div>

          <select
            value={invoiceCollectionStatusFilter}
            onChange={(e) => setInvoiceCollectionStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-rose-400 font-medium"
          >
            <option value="">All Invoices</option>
            <option value="Fully Realized">Fully Realized Invoices</option>
            <option value="Partially Realized">Partially Realized (Advance Paid)</option>
            <option value="Not Realized">Not Realized (Pending)</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1260px]">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase tracking-wider border-b border-gray-200">
                <th className="py-2.5 px-3 w-[140px] whitespace-nowrap">Invoice # &amp; Date</th>
                <th className="py-2.5 px-3 w-[160px] whitespace-nowrap">Consignee</th>
                <th className="py-2.5 px-3 w-[130px] text-right whitespace-nowrap">Invoice Value</th>
                <th className="py-2.5 px-3 w-[140px] text-right whitespace-nowrap bg-blue-50/40">Advance Received</th>
                <th className="py-2.5 px-3 w-[110px] text-center whitespace-nowrap bg-blue-50/40">Days to Advance</th>
                <th className="py-2.5 px-3 w-[140px] text-right whitespace-nowrap bg-indigo-50/40">Outstanding Post-Adv</th>
                <th className="py-2.5 px-3 w-[140px] text-right whitespace-nowrap bg-emerald-50/40">Balance Payment</th>
                <th className="py-2.5 px-3 w-[130px] text-center whitespace-nowrap bg-emerald-50/40">Adv &rarr; Bal Turn</th>
                <th className="py-2.5 px-3 w-[130px] text-center whitespace-nowrap bg-rose-50/40">Total DSO Turn</th>
                <th className="py-2.5 px-3 w-[120px] text-center whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoiceMetrics.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-ink-500">
                    No invoices match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoiceMetrics.map((m) => (
                  <tr key={m.invoiceId} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-3 align-middle whitespace-nowrap">
                      <div className="font-mono font-bold text-rose-700">{m.invoiceNo}</div>
                      <div className="text-[11px] text-ink-500">{m.invoiceDate}</div>
                    </td>
                    <td className="py-3 px-3 align-middle whitespace-nowrap">
                      <div className="font-bold text-ink-900">{m.consigneeName}</div>
                      <div className="text-[10px] text-ink-500">{m.country}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-black tabular-nums align-middle whitespace-nowrap">
                      {m.currency} {m.totalAmountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right bg-blue-50/20 align-middle whitespace-nowrap">
                      {m.advanceReceivedCurrency > 0 ? (
                        <div>
                          <div className="font-bold text-blue-800 tabular-nums">
                            {m.currency} {m.advanceReceivedCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-blue-600">{m.advanceReceivedDate}</div>
                        </div>
                      ) : (
                        <span className="text-ink-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center bg-blue-50/20 font-bold align-middle whitespace-nowrap">
                      {m.daysToAdvance !== null ? (
                        <span className="text-blue-900">{m.daysToAdvance} Days</span>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right bg-indigo-50/20 font-bold tabular-nums align-middle whitespace-nowrap">
                      <div className="text-ink-900">
                        {m.currency} {m.outstandingAfterAdvanceCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-ink-500 font-normal">
                        {m.outstandingAfterAdvancePct}% remaining
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right bg-emerald-50/20 align-middle whitespace-nowrap">
                      {m.balancePaymentAmountCurrency > 0 ? (
                        <div>
                          <div className="font-bold text-emerald-800 tabular-nums">
                            {m.currency} {m.balancePaymentAmountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-emerald-600">{m.balancePaymentDate}</div>
                        </div>
                      ) : (
                        <span className="text-amber-700 italic font-semibold">Unsettled</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center bg-emerald-50/20 font-bold align-middle whitespace-nowrap">
                      {m.daysAdvanceToBalance !== null ? (
                        <span className="text-emerald-900">{m.daysAdvanceToBalance} Days</span>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center bg-rose-50/20 font-black align-middle whitespace-nowrap">
                      {m.totalCollectionDays !== null ? (
                        <span className="text-rose-900">{m.totalCollectionDays} Days DSO</span>
                      ) : (
                        <span className="text-amber-700 font-semibold">{m.ageDays}d Ageing</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                      <StatusBadge
                        status={
                          m.realizationStatus === 'Fully Realized'
                            ? 'Realized'
                            : m.realizationStatus === 'Partially Realized'
                            ? 'Partially realized'
                            : 'Not realized'
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

      {/* Manual Realization & Settlement Modal */}
      {realizationTarget && (
        <RealizationModal
          isOpen={!!realizationTarget}
          onClose={() => setRealizationTarget(null)}
          invoice={realizationTarget}
        />
      )}

      {/* ============================================================== */}
      {/* BULK EXCEL IMPORT REALIZATION & SETTLEMENT MODAL */}
      {/* ============================================================== */}
      {isImportModalOpen && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title="Import Realization & Settlement of Invoices"
          subtitle="Upload an Excel spreadsheet (.xlsx, .xls, .csv) to bulk-update advance received, balance payments, receipt dates, and bank exchange rates"
          maxWidth="max-w-4xl"
        >
          <div className="space-y-6">
            {/* Step 1: Download Template Helpers */}
            <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Step 1: Download Template or Active Invoices Sheet
                </span>
                <span className="text-[11px] font-semibold text-ink-500">Formats: .xlsx, .xls, .csv</span>
              </div>
              <p className="text-xs text-ink-600">
                You can download an Excel sheet with your current active invoices already pre-filled with Invoice # and Consignee, or download a clean blank template with sample rows.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => downloadActiveInvoicesSettlementTemplate(activeInvoices, customers)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Active Invoices Sheet ({activeInvoices.length} Invoices)</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadExcelTemplate('sales-realizations')}
                  className="px-3.5 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-ink-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-ink-600" />
                  <span>Download Blank Sample Template</span>
                </button>
              </div>
            </div>

            {/* Step 2: Upload Dropzone */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-rose-600" />
                Step 2: Choose Completed File to Upload
              </span>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition ${
                  selectedFile
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : 'border-gray-300 hover:border-rose-400 bg-gray-50/50 hover:bg-rose-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {isParsingFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
                    <span className="text-xs font-bold text-ink-700">Reading and analyzing spreadsheet...</span>
                  </div>
                ) : selectedFile ? (
                  <div className="flex flex-col items-center gap-1">
                    <FileCheck className="w-8 h-8 text-emerald-600" />
                    <span className="text-xs font-bold text-ink-900">{selectedFile.name}</span>
                    <span className="text-[11px] text-ink-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB · {parsedRows.length} rows loaded
                    </span>
                    <span className="text-[11px] text-rose-600 underline font-semibold mt-1">
                      Click to choose another file
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-ink-400" />
                    <div>
                      <span className="text-xs font-bold text-ink-900 block">
                        Click or drag and drop your completed settlement file here
                      </span>
                      <span className="text-[11px] text-ink-500 mt-0.5 block">
                        Supports Excel Workbooks (.xlsx, .xls) and CSV files
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Live Verification & Match Preview Table */}
            {parsedRows.length > 0 && !importSummary && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Step 3: Verification Preview ({parsedRows.length} Rows)
                  </span>
                  <span className="text-[11px] text-ink-500">Previewing first 10 rows</span>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-gray-100 text-[10px] font-bold text-ink-600 uppercase border-b border-gray-200">
                      <tr>
                        <th className="py-2 px-2.5">Row</th>
                        <th className="py-2 px-2.5">Invoice #</th>
                        <th className="py-2 px-2.5">Match Status</th>
                        <th className="py-2 px-2.5 text-right">Adv Rate</th>
                        <th className="py-2 px-2.5 text-right">Bal Rate</th>
                        <th className="py-2 px-2.5 text-right">Advance (USD)</th>
                        <th className="py-2 px-2.5">Advance Date</th>
                        <th className="py-2 px-2.5 text-right">Balance (USD)</th>
                        <th className="py-2 px-2.5">Balance Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {parsedRows.slice(0, 10).map((row, idx) => {
                        const rawInvNo = String(
                          getFlexibleValue(row, ['invoiceno', 'invoice', 'billno', 'invoicenumber']) || ''
                        ).trim();

                        const matched = salesInvoices.find(
                          (inv) => !inv.isVoided && inv.invoiceNo.toLowerCase() === rawInvNo.toLowerCase()
                        );

                        const rawBankRate = parseFloat(
                          getFlexibleValue(row, [
                            'predeterminedexchangerate',
                            'bankexchangerate',
                            'predeterminedrate',
                            'bankrate',
                            'exchangerate'
                          ]) || ''
                        );
                        const fallbackRate = !isNaN(rawBankRate) && rawBankRate > 0 ? rawBankRate : (matched?.bankPreDeterminedExchangeRate || matched?.exchangeRate || 84.5);

                        const rawAdvRate = parseFloat(
                          getFlexibleValue(row, [
                            'advanceforwardratebank',
                            'advanceforwardrate',
                            'advanceexchangerate',
                            'advancerate',
                            'forwardrateadvance',
                            'advrate'
                          ]) || ''
                        );
                        const advRate = !isNaN(rawAdvRate) && rawAdvRate > 0 ? rawAdvRate : (matched?.advanceExchangeRate || fallbackRate);

                        const rawBalRate = parseFloat(
                          getFlexibleValue(row, [
                            'balanceforwardratebank',
                            'balanceforwardrate',
                            'balanceexchangerate',
                            'balancerate',
                            'forwardratebalance',
                            'balrate'
                          ]) || ''
                        );
                        const balRate = !isNaN(rawBalRate) && rawBalRate > 0 ? rawBalRate : (matched?.balanceExchangeRate || fallbackRate);

                        const rawAdvUSD = parseFloat(
                          getFlexibleValue(row, ['advancereceivedusd', 'advancereceived', 'advanceamount', 'advance']) || ''
                        );
                        const advDate = formatExcelDate(
                          getFlexibleValue(row, ['dateofreceivingtheadvance', 'dateofreceivingadvance', 'advancedate'])
                        );

                        const rawBalUSD = parseFloat(
                          getFlexibleValue(row, ['balancepaymentamountusd', 'balancepaymentamount', 'balanceamount', 'balance']) || ''
                        );
                        const balDate = formatExcelDate(
                          getFlexibleValue(row, ['dateofreceivingbalanacepayment', 'dateofreceivingbalancepayment', 'balancedate'])
                        );

                        return (
                          <tr key={idx} className={matched ? 'hover:bg-gray-50' : 'bg-rose-50/40 text-rose-900'}>
                            <td className="py-1.5 px-2.5 text-ink-400 font-mono text-[10px]">{idx + 1}</td>
                            <td className="py-1.5 px-2.5 font-bold font-mono text-ink-900">
                              {rawInvNo || <span className="text-rose-600 italic">Empty</span>}
                            </td>
                            <td className="py-1.5 px-2.5">
                              {matched ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Matched
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  Not Found
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-blue-800">
                              ₹{advRate.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-800">
                              ₹{balRate.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-bold text-blue-800">
                              {!isNaN(rawAdvUSD) && rawAdvUSD > 0 ? `$${rawAdvUSD.toLocaleString()}` : '—'}
                            </td>
                            <td className="py-1.5 px-2.5 text-ink-600 whitespace-nowrap text-[10px]">
                              {advDate || '—'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-bold text-emerald-800">
                              {!isNaN(rawBalUSD) && rawBalUSD > 0 ? `$${rawBalUSD.toLocaleString()}` : '—'}
                            </td>
                            <td className="py-1.5 px-2.5 text-ink-600 whitespace-nowrap text-[10px]">
                              {balDate || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Summary Result Banner */}
            {importSummary && (
              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  importSummary.updated > 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  {importSummary.updated > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                  )}
                  <span>
                    Import Complete: {importSummary.updated} invoices successfully updated with realization and settlement details!
                  </span>
                </div>

                {importSummary.errors.length > 0 && (
                  <div className="mt-2 p-2.5 bg-white/80 rounded-xl border border-rose-200 text-[11px] space-y-1">
                    <span className="font-bold text-rose-800 block">Notice / Unmatched Rows ({importSummary.errors.length}):</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-rose-700 max-h-32 overflow-y-auto">
                      {importSummary.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-800 rounded-xl text-xs font-bold transition"
              >
                {importSummary ? 'Close' : 'Cancel'}
              </button>

              {!importSummary && parsedRows.length > 0 && permissions.canManageSalesRealization && (
                <button
                  type="button"
                  onClick={handleApplySettlementImport}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Apply Settlements to {parsedRows.length} Invoices</span>
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
