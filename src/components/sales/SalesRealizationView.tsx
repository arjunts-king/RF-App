import React, { useState, useRef, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { SalesInvoice } from '../../types';
import { formatINR, formatKg, formatForwardRate } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
import { BentoCard } from '../common/BentoCard';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { RealizationModal } from './RealizationModal';
import { RealizationStatementModal } from './RealizationStatementModal';
import { FullRealizationStatementModal } from './FullRealizationStatementModal';
import { convertToCSV, downloadFile } from '../../utils/exportUtils';
import { exportInvoiceToWord } from '../../utils/exportWordInvoice';
import { exportRealizationToWord, exportFullRealizationToWord } from '../../utils/exportRealizationStatement';
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
  Users,
  Trash2,
  AlertTriangle,
  Receipt,
  ShieldCheck,
  Printer,
  FileText
} from 'lucide-react';

export const SalesRealizationView: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const {
    salesInvoices,
    customers,
    ports,
    bankAccounts,
    businessSettings,
    bulkImportSalesRealizations,
    bulkDeleteInvoiceRealizations
  } = useData();
  const { permissions } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showVoided, setShowVoided] = useState(false);

  // View mode switcher: Settlement Register vs Receivables Collection Period Analysis vs Shortfall Breakup
  const [activeTab, setActiveTab] = useState<'register' | 'collection-analysis' | 'shortfall-breakup'>('register');

  // Shortfall Breakup Filter & Sort States
  const [shortfallSearch, setShortfallSearch] = useState('');
  const [shortfallLegFilter, setShortfallLegFilter] = useState<'all' | 'advance-only' | 'balance-only' | 'both'>('all');
  const [shortfallCustomerFilter, setShortfallCustomerFilter] = useState('');
  const [shortfallSortBy, setShortfallSortBy] = useState<'total-desc' | 'total-asc' | 'date-desc' | 'inv-asc'>('total-desc');
  const [shortfallPage, setShortfallPage] = useState(1);
  const [shortfallPageSize, setShortfallPageSize] = useState(15);

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
  const [statementTarget, setStatementTarget] = useState<SalesInvoice | null>(null);
  const [isFullStatementOpen, setIsFullStatementOpen] = useState(false);

  // Multi-selection state for bulk realization operations
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [isBulkClearModalOpen, setIsBulkClearModalOpen] = useState(false);

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

  const handleDownloadFullWordStatement = async () => {
    try {
      await exportFullRealizationToWord(activeInvoices, businessSettings, bankAccounts?.[0]);
    } catch (err: any) {
      alert(`Full statement export failed: ${err.message || 'Unknown error'}`);
    }
  };
  const totalInvoicedUSD = activeInvoices.reduce((s, inv) => s + inv.totalAmountCurrency, 0);
  const totalAdvanceUSD = activeInvoices.reduce((s, inv) => s + (inv.advanceReceivedCurrency || 0), 0);
  const totalAdvanceINR = activeInvoices.reduce((s, inv) => {
    const rate = inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5;
    return s + (inv.advanceReceivedINR || (inv.advanceReceivedCurrency || 0) * rate);
  }, 0);
  const totalOutstandingAfterAdvanceUSD = Math.max(0, totalInvoicedUSD - totalAdvanceUSD);
  const totalBalanceUSD = activeInvoices.reduce((s, inv) => s + (inv.balancePaymentAmountCurrency || 0), 0);
  const totalBalanceINR = activeInvoices.reduce((s, inv) => {
    const rate = inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5;
    return s + (inv.balancePaymentINR || (inv.balancePaymentAmountCurrency || 0) * rate);
  }, 0);
  const totalRealizedUSD = activeInvoices.reduce((s, inv) => s + inv.totalRealizedCurrency, 0);
  const totalRealizedINR = activeInvoices.reduce((s, inv) => s + inv.totalRealizedINR, 0);
  const totalUnrealizedUSD = activeInvoices.reduce((s, inv) => {
    if (inv.realizationStatus === 'Fully Realized' || inv.balanceRealizationCurrency <= 0.05) return s;
    return s + inv.balanceRealizationCurrency;
  }, 0);

  const totalAdvanceShortfallUSD = activeInvoices.reduce((s, inv) => {
    if (inv.advanceShortfallUSD !== undefined && inv.advanceShortfallUSD !== null) {
      return s + (inv.advanceShortfallUSD || 0);
    }
    const adv = inv.advanceReceivedCurrency || 0;
    const terms = inv.advanceTermsUSD || 0;
    const sf = adv > 0 && terms > adv ? terms - adv : 0;
    return s + (sf || 0);
  }, 0);

  const totalBalanceShortfallUSD = activeInvoices.reduce((s, inv) => {
    if (inv.balanceShortfallUSD !== undefined && inv.balanceShortfallUSD !== null) {
      return s + (inv.balanceShortfallUSD || 0);
    }
    const bal = inv.balancePaymentAmountCurrency || 0;
    const price = inv.balanceActualPriceUSD || 0;
    const sf = (bal > 0 || inv.realizationStatus === 'Fully Realized') && price > bal ? price - bal : 0;
    return s + (sf || 0);
  }, 0);

  const totalShortfallUSD = activeInvoices.reduce((s, inv) => {
    if (inv.totalShortfallUSD !== undefined && inv.totalShortfallUSD !== null) {
      return s + (inv.totalShortfallUSD || 0);
    }
    const adv = inv.advanceReceivedCurrency || 0;
    const terms = inv.advanceTermsUSD || 0;
    const advSf = inv.advanceShortfallUSD ?? (adv > 0 && terms > adv ? terms - adv : 0);
    const bal = inv.balancePaymentAmountCurrency || 0;
    const price = inv.balanceActualPriceUSD || 0;
    const balSf = inv.balanceShortfallUSD ?? ((bal > 0 || inv.realizationStatus === 'Fully Realized') && price > bal ? price - bal : 0);
    const total = (advSf || 0) + (balSf || 0);
    return s + (total || 0);
  }, 0);

  const totalShortfallINR = activeInvoices.reduce((s, inv) => {
    const rate = inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5;
    const advRate = inv.advanceExchangeRate || rate;
    const balRate = inv.balanceExchangeRate || rate;
    const adv = inv.advanceReceivedCurrency || 0;
    const terms = inv.advanceTermsUSD || 0;
    const advSf = inv.advanceShortfallUSD ?? (adv > 0 && terms > adv ? terms - adv : 0);
    const bal = inv.balancePaymentAmountCurrency || 0;
    const price = inv.balanceActualPriceUSD || 0;
    const balSf = inv.balanceShortfallUSD ?? ((bal > 0 || inv.realizationStatus === 'Fully Realized') && price > bal ? price - bal : 0);
    return s + ((advSf || 0) * advRate) + ((balSf || 0) * balRate);
  }, 0);

  // Shortfall enriched invoices list
  const shortfallInvoicesList = useMemo(() => {
    return activeInvoices
      .map((inv) => {
        const advUSD = inv.advanceReceivedCurrency || 0;
        const termsUSD = inv.advanceTermsUSD ?? (advUSD > 0 ? advUSD : undefined);
        const advShortfall = inv.advanceShortfallUSD ?? (termsUSD && advUSD && termsUSD > advUSD ? Number((termsUSD - advUSD).toFixed(2)) : 0);

        const balUSD = inv.balancePaymentAmountCurrency || 0;
        const priceUSD = inv.balanceActualPriceUSD ?? (balUSD > 0 ? Number((inv.totalAmountCurrency - (termsUSD || advUSD || 0)).toFixed(2)) : undefined);
        const balShortfall = inv.balanceShortfallUSD ?? (priceUSD && balUSD && priceUSD > balUSD ? Number((priceUSD - balUSD).toFixed(2)) : 0);

        const totalShortfall = inv.totalShortfallUSD ?? Number((advShortfall + balShortfall).toFixed(2));

        const bankRate = inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5;
        const advRate = inv.advanceExchangeRate || bankRate;
        const balRate = inv.balanceExchangeRate || bankRate;
        const advShortfallINR = Number((advShortfall * advRate).toFixed(2));
        const balShortfallINR = Number((balShortfall * balRate).toFixed(2));
        const totalShortfallINR = Number((advShortfallINR + balShortfallINR).toFixed(2));

        const consignee = customerMap.get(inv.consigneeId);
        const buyer = inv.buyerId ? customerMap.get(inv.buyerId) : consignee;

        return {
          ...inv,
          termsUSD,
          advUSD,
          advShortfall,
          advRate,
          advShortfallINR,
          priceUSD,
          balUSD,
          balShortfall,
          balRate,
          balShortfallINR,
          totalShortfall,
          totalShortfallINR,
          consigneeNameDisplay: consignee?.name || inv.consigneeName || inv.buyerName || 'Overseas Customer',
          buyerNameDisplay: buyer?.name || '',
          countryDisplay: consignee?.country || 'Export'
        };
      })
      .filter((inv) => inv.totalShortfall > 0);
  }, [activeInvoices, customerMap]);

  const filteredShortfallInvoices = useMemo(() => {
    return shortfallInvoicesList
      .filter((inv) => {
        if (shortfallCustomerFilter && inv.consigneeId !== shortfallCustomerFilter) return false;
        if (shortfallLegFilter === 'advance-only' && (inv.advShortfall <= 0 || inv.balShortfall > 0)) return false;
        if (shortfallLegFilter === 'balance-only' && (inv.balShortfall <= 0 || inv.advShortfall > 0)) return false;
        if (shortfallLegFilter === 'both' && (inv.advShortfall <= 0 || inv.balShortfall <= 0)) return false;

        if (shortfallSearch.trim()) {
          const q = shortfallSearch.toLowerCase().trim();
          const matchNo = inv.invoiceNo.toLowerCase().includes(q);
          const matchCust = inv.consigneeNameDisplay.toLowerCase().includes(q) || inv.buyerNameDisplay.toLowerCase().includes(q);
          const matchOrder = inv.orderNo?.toLowerCase().includes(q) || inv.salesOrderNo?.toLowerCase().includes(q);
          const matchAdvRef = inv.advanceBankRef?.toLowerCase().includes(q);
          const matchBalRef = inv.balanceBankRef?.toLowerCase().includes(q);
          return matchNo || matchCust || matchOrder || matchAdvRef || matchBalRef;
        }
        return true;
      })
      .sort((a, b) => {
        if (shortfallSortBy === 'total-desc') return b.totalShortfall - a.totalShortfall;
        if (shortfallSortBy === 'total-asc') return a.totalShortfall - b.totalShortfall;
        if (shortfallSortBy === 'date-desc') return b.invoiceDate.localeCompare(a.invoiceDate);
        if (shortfallSortBy === 'inv-asc') return a.invoiceNo.localeCompare(b.invoiceNo);
        return 0;
      });
  }, [shortfallInvoicesList, shortfallCustomerFilter, shortfallLegFilter, shortfallSearch, shortfallSortBy]);

  const paginatedShortfallInvoices = useMemo(() => {
    const start = (shortfallPage - 1) * shortfallPageSize;
    return filteredShortfallInvoices.slice(start, start + shortfallPageSize);
  }, [filteredShortfallInvoices, shortfallPage, shortfallPageSize]);

  const overallProgressPct =
    totalInvoicedUSD > 0 ? Math.min(100, Math.round((totalRealizedUSD / totalInvoicedUSD) * 100)) : 0;

  // Selection Computations for Bulk Realization Deletion
  const allFilteredSelected = useMemo(() => {
    return filteredInvoices.length > 0 && filteredInvoices.every((inv) => selectedInvoiceIds.includes(inv.id));
  }, [filteredInvoices, selectedInvoiceIds]);

  const someFilteredSelected = useMemo(() => {
    return filteredInvoices.some((inv) => selectedInvoiceIds.includes(inv.id)) && !allFilteredSelected;
  }, [filteredInvoices, selectedInvoiceIds, allFilteredSelected]);

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredInvoices.map((inv) => inv.id));
      setSelectedInvoiceIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const current = new Set(selectedInvoiceIds);
      filteredInvoices.forEach((inv) => current.add(inv.id));
      setSelectedInvoiceIds(Array.from(current));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedInvoicesList = useMemo(() => {
    const set = new Set(selectedInvoiceIds);
    return salesInvoices.filter((inv) => set.has(inv.id));
  }, [salesInvoices, selectedInvoiceIds]);

  const selectedRealizedCount = useMemo(() => {
    return selectedInvoicesList.filter(
      (inv) =>
        (inv.totalRealizedCurrency && inv.totalRealizedCurrency > 0) ||
        Boolean(inv.advanceReceivedCurrency) ||
        Boolean(inv.balancePaymentAmountCurrency) ||
        inv.realizationStatus !== 'Not Realized'
    ).length;
  }, [selectedInvoicesList]);

  const handleConfirmBulkClearRealizations = () => {
    bulkDeleteInvoiceRealizations(selectedInvoiceIds);
    setIsBulkClearModalOpen(false);
    setSelectedInvoiceIds([]);
  };

  // Export CSV with all settlement parameters including dual forward rates and shortfall tracking
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
        AdvanceTermsUSD: inv.advanceTermsUSD ?? '',
        ActualAdvanceReceivedUSD: advUSD,
        AdvanceShortfallUSD: inv.advanceShortfallUSD ?? 0,
        AdvanceForwardRate: advRate,
        AdvanceDate: inv.advanceReceivedDate || '',
        AdvanceReceivedINR: advINR,
        AdvanceBankRef: inv.advanceBankRef || '',
        OutstandingAfterAdvanceUSD: outstandingAfterAdv.outstandingAfterAdvanceCurrency,
        OutstandingAfterAdvanceINR: outstandingAfterAdv.outstandingAfterAdvanceINR,
        BalanceActualPriceUSD: inv.balanceActualPriceUSD ?? '',
        ActualBalanceReceivedUSD: balUSD,
        BalanceShortfallUSD: inv.balanceShortfallUSD ?? 0,
        BalanceForwardRate: balRate,
        BalanceDate: inv.balancePaymentDate || '',
        BalancePaymentINR: balINR,
        BalanceBankRef: inv.balanceBankRef || '',
        TotalShortfallUSD: inv.totalShortfallUSD ?? 0,
        BankExchangeRate: bankRate,
        TotalRealizedUSD: inv.totalRealizedCurrency,
        TotalRealizedINR: inv.totalRealizedINR,
        UnrealizedBalanceUSD: inv.realizationStatus === 'Fully Realized' || inv.balanceRealizationCurrency <= 0.05 ? 0 : inv.balanceRealizationCurrency,
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
      { key: 'AdvanceTermsUSD', label: 'Advance as per Contract Terms (USD)' },
      { key: 'ActualAdvanceReceivedUSD', label: 'Actual Advance Received (USD)' },
      { key: 'AdvanceShortfallUSD', label: 'Advance Shortfall (USD)' },
      { key: 'AdvanceForwardRate', label: 'Advance Forward Rate (Bank)' },
      { key: 'AdvanceDate', label: 'Date of Receiving Advance' },
      { key: 'AdvanceReceivedINR', label: 'Advance Received (INR)' },
      { key: 'AdvanceBankRef', label: 'Advance Bank Ref / FIRC' },
      { key: 'OutstandingAfterAdvanceUSD', label: 'Outstanding After Advance (USD)' },
      { key: 'OutstandingAfterAdvanceINR', label: 'Outstanding After Advance (INR)' },
      { key: 'BalanceActualPriceUSD', label: 'Balance as per Actual Price (USD)' },
      { key: 'ActualBalanceReceivedUSD', label: 'Actual Balance Received (USD)' },
      { key: 'BalanceShortfallUSD', label: 'Balance Shortfall (USD)' },
      { key: 'BalanceForwardRate', label: 'Balance Forward Rate (Bank)' },
      { key: 'BalanceDate', label: 'Date of Receiving Balance Payment' },
      { key: 'BalancePaymentINR', label: 'Balance Payment Amount (INR)' },
      { key: 'BalanceBankRef', label: 'Balance Bank Ref / FIRC' },
      { key: 'TotalShortfallUSD', label: 'Total Shortfall (USD)' },
      { key: 'BankExchangeRate', label: 'Exchange Rate (Pre-determined with Bank)' },
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

  // Export Shortfall & Deductions Breakup CSV
  const handleExportShortfallCSV = () => {
    const exportData = filteredShortfallInvoices.map((inv) => ({
      InvoiceNo: inv.invoiceNo,
      Date: inv.invoiceDate,
      Consignee: inv.consigneeNameDisplay,
      Buyer: inv.buyerNameDisplay,
      Country: inv.countryDisplay,
      TotalAmountUSD: inv.totalAmountCurrency,
      AdvanceTermsUSD: inv.termsUSD ?? '',
      ActualAdvanceReceivedUSD: inv.advUSD,
      AdvanceShortfallUSD: inv.advShortfall,
      AdvanceForwardRate: inv.advRate,
      AdvanceShortfallINR: inv.advShortfallINR,
      AdvanceDate: inv.advanceReceivedDate || '',
      AdvanceBankRef: inv.advanceBankRef || '',
      BalanceActualPriceUSD: inv.priceUSD ?? '',
      ActualBalanceReceivedUSD: inv.balUSD,
      BalanceShortfallUSD: inv.balShortfall,
      BalanceForwardRate: inv.balRate,
      BalanceShortfallINR: inv.balShortfallINR,
      BalanceDate: inv.balancePaymentDate || '',
      BalanceBankRef: inv.balanceBankRef || '',
      TotalShortfallUSD: inv.totalShortfall,
      TotalShortfallINR: inv.totalShortfallINR,
      TotalRealizedUSD: inv.totalRealizedCurrency,
      TotalRealizedINR: inv.totalRealizedINR,
      UnrealizedBalanceUSD: 0,
      RealizationStatus: 'Fully Realized',
      Notes: inv.realizations?.[0]?.notes || 'Settled with shortfall deductions'
    }));

    const csvStr = convertToCSV(exportData, [
      { key: 'InvoiceNo', label: 'Commercial Invoice No' },
      { key: 'Date', label: 'Invoice Date' },
      { key: 'Consignee', label: 'Consignee / Customer' },
      { key: 'Buyer', label: 'Buyer' },
      { key: 'Country', label: 'Destination Country' },
      { key: 'TotalAmountUSD', label: 'Invoiced Amount (USD)' },
      { key: 'AdvanceTermsUSD', label: 'Advance Contract Terms (USD)' },
      { key: 'ActualAdvanceReceivedUSD', label: 'Actual Advance Received (USD)' },
      { key: 'AdvanceShortfallUSD', label: 'Advance Shortfall (USD)' },
      { key: 'AdvanceForwardRate', label: 'Advance Forward Rate (INR)' },
      { key: 'AdvanceShortfallINR', label: 'Advance Shortfall (INR)' },
      { key: 'AdvanceDate', label: 'Advance Receipt Date' },
      { key: 'AdvanceBankRef', label: 'Advance Bank Ref / FIRC' },
      { key: 'BalanceActualPriceUSD', label: 'Balance Actual Price (USD)' },
      { key: 'ActualBalanceReceivedUSD', label: 'Actual Balance Received (USD)' },
      { key: 'BalanceShortfallUSD', label: 'Balance Shortfall (USD)' },
      { key: 'BalanceForwardRate', label: 'Balance Forward Rate (INR)' },
      { key: 'BalanceShortfallINR', label: 'Balance Shortfall (INR)' },
      { key: 'BalanceDate', label: 'Balance Receipt Date' },
      { key: 'BalanceBankRef', label: 'Balance Bank Ref / FIRC' },
      { key: 'TotalShortfallUSD', label: 'Total Shortfall Deductions (USD)' },
      { key: 'TotalShortfallINR', label: 'Total Shortfall Deductions (INR)' },
      { key: 'TotalRealizedUSD', label: 'Total Realized (USD)' },
      { key: 'TotalRealizedINR', label: 'Total Realized (INR)' },
      { key: 'UnrealizedBalanceUSD', label: 'Pending Outstanding (USD)' },
      { key: 'RealizationStatus', label: 'Realization Status' },
      { key: 'Notes', label: 'Audit Notes' }
    ]);

    downloadFile(csvStr, `Realization_Shortfall_Breakup_${new Date().toISOString().split('T')[0]}.csv`);
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
            label: 'Full Statement (PDF)',
            onClick: () => setIsFullStatementOpen(true),
            icon: Printer,
            title: 'Download or print comprehensive full realization statement in A4 PDF'
          },
          {
            label: 'Full Statement (Word)',
            onClick: handleDownloadFullWordStatement,
            icon: FileDown,
            title: 'Download comprehensive full realization statement in Microsoft Word (.docx)'
          },
          ...(permissions.canManageSalesRealization
            ? [
                {
                  label: selectedInvoiceIds.length > 0 ? `Delete Realizations (${selectedInvoiceIds.length})` : 'Delete Realizations (Bulk)',
                  onClick: () => {
                    if (selectedInvoiceIds.length === 0) {
                      const settled = filteredInvoices
                        .filter(
                          (i) =>
                            (i.totalRealizedCurrency && i.totalRealizedCurrency > 0) ||
                            Boolean(i.advanceReceivedCurrency) ||
                            Boolean(i.balancePaymentAmountCurrency) ||
                            i.realizationStatus !== 'Not Realized'
                        )
                        .map((i) => i.id);
                      setSelectedInvoiceIds(settled.length > 0 ? settled : filteredInvoices.map((i) => i.id));
                    }
                    setIsBulkClearModalOpen(true);
                  },
                  icon: Trash2,
                  title: 'Delete realization and settlement entries in bulk across invoices'
                }
              ]
            : []),
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

          <button
            onClick={() => setActiveTab('shortfall-breakup')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'shortfall-breakup'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-ink-700 hover:bg-amber-50 hover:text-amber-800'
            }`}
          >
            <Receipt className="w-4 h-4 text-amber-500" />
            <span>Shortfall Breakup &amp; Audit</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                activeTab === 'shortfall-breakup' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              ${totalShortfallUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

        {activeTab === 'shortfall-breakup' && (
          <button
            onClick={handleExportShortfallCSV}
            className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-ink-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs mr-1 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>Export Shortfall Breakup CSV</span>
          </button>
        )}

        {activeTab === 'register' && (
          <div className="flex items-center gap-2 mr-1">
            <button
              onClick={() => setIsFullStatementOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
              title="Download or Print Full Realization Statement in A4 PDF"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-100" />
              <span>Full Statement (PDF A4)</span>
            </button>
            <button
              onClick={handleDownloadFullWordStatement}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
              title="Download Full Realization Statement in Microsoft Word Document (.docx)"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-100" />
              <span>Full Statement (Word .docx)</span>
            </button>
          </div>
        )}
      </div>

      {activeTab === 'register' && (
        <div className="space-y-6">
          {/* Executive Top Action Banner on top of Realization Statement */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-sm border border-indigo-900/40 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-black flex items-center gap-2.5 text-white">
                  <span>Full Realization &amp; Settlement Statement (Master Register)</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/20 font-mono">
                    {activeInvoices.length} Invoices · ${totalInvoicedUSD.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Consolidated master realization statement containing all advance and balance remittances, bank forward rates, and statutory EDPMS tie-outs in one document.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsFullStatementOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
                title="Download or Print Comprehensive Full Realization Statement in A4 PDF"
              >
                <Printer className="w-4 h-4 text-indigo-100" />
                <span>Download Full Statement (PDF A4)</span>
              </button>
              <button
                onClick={handleDownloadFullWordStatement}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
                title="Download Comprehensive Full Realization Statement in Microsoft Word Document (.docx)"
              >
                <FileDown className="w-4 h-4 text-blue-100" />
                <span>Download Full Statement (Word .docx)</span>
              </button>
            </div>
          </div>

          {/* Bento Settlement KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3.5">
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
              caption="Awaiting balance remittance"
              variant="default"
            />
            <BentoCard
              label="Balance Received"
              value={`$${totalBalanceUSD.toLocaleString()}`}
              caption={`₹${(totalBalanceINR / 100000).toFixed(2)} L credited`}
              variant="default"
            />
            <BentoCard
              label="Accounted Shortfall"
              value={`$${totalShortfallUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              caption={`₹${(totalShortfallINR / 100000).toFixed(2)} L deductions`}
              variant={totalShortfallUSD > 0 ? 'warning' : 'default'}
              linkText={totalShortfallUSD > 0 ? 'Audit Breakup' : undefined}
              onLinkClick={() => setActiveTab('shortfall-breakup')}
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
          <table className="w-full text-left text-xs border-collapse min-w-[1440px]">
            <thead>
              <tr className="bg-gray-50/90 text-[11px] font-bold text-ink-500 uppercase tracking-wider border-b border-gray-200">
                <th className="py-3 px-3 w-10 text-center whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someFilteredSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-gray-300 cursor-pointer"
                    title="Select All / Deselect All Filtered Invoices"
                  />
                </th>
                <th className="py-3 px-3 w-[135px] whitespace-nowrap">Invoice # &amp; Date</th>
                <th className="py-3 px-3 min-w-[170px] max-w-[210px]">Consignee &amp; Buyer</th>
                <th className="py-3 px-3 w-[120px] text-right whitespace-nowrap">Invoice Value</th>
                <th className="py-3 px-3 w-[130px] text-center whitespace-nowrap bg-rose-50/40">Bank Forward Rates</th>
                <th className="py-3 px-3 w-[140px] text-right whitespace-nowrap bg-blue-50/40">Advance Received</th>
                <th className="py-3 px-3 w-[120px] text-center whitespace-nowrap bg-blue-50/40">Date of Advance</th>
                <th className="py-3 px-3 w-[135px] text-right whitespace-nowrap bg-indigo-50/40">Outstanding Balance</th>
                <th className="py-3 px-3 w-[140px] text-right whitespace-nowrap bg-emerald-50/40">Balance Payment</th>
                <th className="py-3 px-3 w-[120px] text-center whitespace-nowrap bg-emerald-50/40">Date of Balance</th>
                <th className="py-3 px-3 w-[115px] text-right whitespace-nowrap bg-amber-50/50">Shortfall (USD)</th>
                <th className="py-3 px-3 w-[120px] text-right whitespace-nowrap">Net Unrealized</th>
                <th className="py-3 px-3 w-[110px] text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-3 w-[110px] text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-ink-500">
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
                      } ${selectedInvoiceIds.includes(inv.id) ? 'bg-rose-50/60' : ''}`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedInvoiceIds.includes(inv.id)}
                          onChange={() => handleToggleSelect(inv.id)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-gray-300 cursor-pointer"
                          title={`Select invoice ${inv.invoiceNo}`}
                        />
                      </td>

                      {/* Invoice No & Date */}
                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-rose-700">{inv.invoiceNo}</span>
                          {inv.isVoided && <StatusBadge status="Voided" />}
                        </div>
                        <div className="text-[11px] text-ink-600 font-medium whitespace-nowrap mt-0.5">
                          {inv.invoiceDate}
                        </div>
                        {inv.salesOrderNo && (
                          <div className="text-[10px] text-blue-700 font-mono font-semibold">SO: {inv.salesOrderNo}</div>
                        )}
                        {inv.orderNo && inv.orderNo !== inv.salesOrderNo && (
                          <div className="text-[10px] text-ink-500 font-mono">PO: {inv.orderNo}</div>
                        )}
                      </td>

                      {/* Consignee */}
                      <td className="py-3 px-3 align-middle max-w-[220px]">
                        <div className="font-bold text-ink-900 truncate" title={consignee?.name || inv.consigneeName}>
                          {consignee?.name || inv.consigneeName || inv.buyerName || 'Overseas Customer'}
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
                            {inv.advanceExchangeRate || advUSD > 0 ? (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200" title={`Advance Forward Rate: ₹${formatForwardRate(advRate)}`}>
                                Adv: ₹{formatForwardRate(advRate)}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-ink-500 rounded border border-gray-200" title="Advance Forward Rate (Optional — No Advance)">
                                Adv: —
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200" title={`Balance Forward Rate: ₹${formatForwardRate(balRate)}`}>
                              Bal: ₹{formatForwardRate(balRate)}
                            </span>
                          </div>
                          {inv.averageRealizedExchangeRate && inv.totalRealizedCurrency > 0 && (
                            <span className="text-[9px] font-semibold text-rose-700" title={`Weighted Average Realized Rate: ₹${formatForwardRate(inv.averageRealizedExchangeRate)}`}>
                              Avg: ₹{formatForwardRate(inv.averageRealizedExchangeRate)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Advance Received (Contract Terms vs Actual) */}
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap bg-blue-50/30">
                        {advUSD > 0 ? (
                          <div>
                            <div className="font-extrabold text-blue-800 tabular-nums">
                              {inv.currency} {advUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-blue-600 font-medium tabular-nums">
                              {formatINR(advINR)} ({advPct}%)
                            </div>
                            {inv.advanceTermsUSD && inv.advanceTermsUSD !== advUSD && (
                              <div className="text-[9px] text-ink-500 font-medium mt-0.5">
                                Terms: ${(inv.advanceTermsUSD || 0).toLocaleString()}
                              </div>
                            )}
                            {inv.advanceShortfallUSD && inv.advanceShortfallUSD > 0 && (
                              <div className="text-[9px] text-amber-700 font-bold">
                                -${inv.advanceShortfallUSD.toFixed(2)} wire fee
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-[11px] text-ink-400 font-medium italic">No advance</span>
                            {inv.advanceTermsUSD && inv.advanceTermsUSD > 0 && (
                              <div className="text-[9px] text-ink-500">
                                Terms: ${(inv.advanceTermsUSD || 0).toLocaleString()}
                              </div>
                            )}
                          </div>
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
                          {outstandingAfterAdv.outstandingPercentage}% outstanding
                        </div>
                      </td>

                      {/* Balance Payment Amount (Price vs Actual) */}
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap bg-emerald-50/30">
                        {balUSD > 0 ? (
                          <div>
                            <div className="font-extrabold text-emerald-800 tabular-nums">
                              {inv.currency} {balUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-emerald-700 font-medium tabular-nums">
                              {formatINR(balINR)}
                            </div>
                            {inv.balanceActualPriceUSD && inv.balanceActualPriceUSD !== balUSD && (
                              <div className="text-[9px] text-ink-500 font-medium mt-0.5">
                                Price: ${(inv.balanceActualPriceUSD || 0).toLocaleString()}
                              </div>
                            )}
                            {inv.balanceShortfallUSD && inv.balanceShortfallUSD > 0 && (
                              <div className="text-[9px] text-amber-700 font-bold">
                                -${inv.balanceShortfallUSD.toFixed(2)} wire fee
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-[11px] text-amber-700 font-semibold italic">
                              Pending {inv.currency} {(inv.balanceRealizationCurrency || 0).toLocaleString()}
                            </span>
                            {inv.balanceActualPriceUSD && inv.balanceActualPriceUSD > 0 && (
                              <div className="text-[9px] text-ink-500">
                                Price: ${(inv.balanceActualPriceUSD || 0).toLocaleString()}
                              </div>
                            )}
                          </div>
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

                      {/* Realization Shortfall in USD */}
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap bg-amber-50/30">
                        {inv.totalShortfallUSD && inv.totalShortfallUSD > 0 ? (
                          <div>
                            <div className="font-black text-amber-800 tabular-nums">
                              -${inv.totalShortfallUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[9px] text-amber-700 font-semibold">
                              USD Deductions
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-ink-300 font-medium">—</span>
                        )}
                      </td>

                      {/* Unrealized Balance */}
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                        <div
                          className={`font-black tabular-nums ${
                            inv.realizationStatus === 'Fully Realized' || inv.balanceRealizationCurrency <= 0.05
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {inv.currency}{' '}
                          {(inv.realizationStatus === 'Fully Realized' || inv.balanceRealizationCurrency <= 0.05
                            ? 0
                            : inv.balanceRealizationCurrency
                          ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-ink-500">
                          {inv.realizationStatus === 'Fully Realized' || inv.balanceRealizationCurrency <= 0.05
                            ? 'Fully Cleared'
                            : 'Unsettled'}
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
                        {inv.totalShortfallUSD && inv.totalShortfallUSD > 0 ? (
                          <div className="mt-1">
                            <button
                              onClick={() => setActiveTab('shortfall-breakup')}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[9px] font-bold cursor-pointer hover:bg-amber-100 transition"
                              title={`Shortfall Deductions: -$${inv.totalShortfallUSD.toFixed(2)}. Fully cleared from receivables.`}
                            >
                              <Receipt className="w-2.5 h-2.5 text-amber-600" />
                              <span>-${inv.totalShortfallUSD.toFixed(2)} shortfall</span>
                            </button>
                          </div>
                        ) : null}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {!inv.isVoided && (
                            <button
                              onClick={() => setRealizationTarget(inv)}
                              title="Update Settlement: Advance, Balance, Dates & Bank Rate"
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                            >
                              <BadgeDollarSign className="w-3.5 h-3.5" />
                              <span>Settle</span>
                            </button>
                          )}

                          <button
                            onClick={() => setStatementTarget(inv)}
                            title="View & Download Realization & Settlement Statement (A4 PDF & Word)"
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Statement</span>
                          </button>

                          <button
                            onClick={async () => {
                              try {
                                await exportRealizationToWord(inv, businessSettings, bankAccounts?.[0]);
                              } catch (err: any) {
                                alert(`Export failed: ${err.message || 'Unknown error'}`);
                              }
                            }}
                            title="Direct Download Realization Statement in Word (.docx)"
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={async () => {
                              try {
                                await exportInvoiceToWord(inv, businessSettings);
                              } catch (err: any) {
                                alert(`Export failed: ${err.message || 'Unknown error'}`);
                              }
                            }}
                            title="Export Commercial Invoice to Word Document (.docx)"
                            className="p-1.5 text-ink-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
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

      {/* ============================================================== */}
      {/* SHORTFALL & DEDUCTIONS BREAKUP AUDIT VIEW */}
      {/* ============================================================== */}
      {activeTab === 'shortfall-breakup' && (
        <div className="space-y-6">
          {/* Executive Policy Banner */}
          <div className="p-4 bg-gradient-to-r from-amber-50 via-white to-blue-50 border border-amber-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Shortfall Accounting Policy &amp; Breakup Audit</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold">
                  Zero Outstanding · Fully Realized
                </span>
              </div>
              <p className="text-xs text-ink-600 max-w-4xl">
                Remittance shortfalls (arising from overseas intermediary bank charges, wire deductions, or contract discrepancies) are accounted as recognized deductions. These invoices are marked as <strong>Fully Realized</strong> with <strong>$0.00 Outstanding Balance</strong>. Full itemized advance and balance leg breakups are audited below.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportShortfallCSV}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit CSV</span>
              </button>
            </div>
          </div>

          {/* Bento KPI Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
            <BentoCard
              label="Total Shortfall (USD)"
              value={`$${totalShortfallUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              caption={`${shortfallInvoicesList.length} invoices adjusted`}
              variant="warning"
            />
            <BentoCard
              label="Total Shortfall (INR)"
              value={formatINR(totalShortfallINR)}
              caption="Converted at forward rates"
              variant="highlight"
            />
            <BentoCard
              label="Advance Leg Shortfall"
              value={`$${totalAdvanceShortfallUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              caption="Terms vs actual advance"
              variant="default"
            />
            <BentoCard
              label="Balance Leg Shortfall"
              value={`$${totalBalanceShortfallUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              caption="Final price vs wire credit"
              variant="default"
            />
            <BentoCard
              label="Invoices With Shortfall"
              value={shortfallInvoicesList.length}
              caption="All marked Fully Realized"
              variant="info"
            />
            <BentoCard
              label="Net Receivables Balance"
              value="$0.00"
              caption="Zero pending outstanding"
              variant="success"
            />
          </div>

          {/* Search, Filter & Controls */}
          <div className="glass-surface-thin p-4 rounded-2xl border border-white/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by invoice #, consignee, buyer, bank ref..."
                  value={shortfallSearch}
                  onChange={(e) => {
                    setShortfallSearch(e.target.value);
                    setShortfallPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-white/70 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition shadow-2xs font-medium"
                />
              </div>

              {/* Leg Filter */}
              <select
                value={shortfallLegFilter}
                onChange={(e) => {
                  setShortfallLegFilter(e.target.value as any);
                  setShortfallPage(1);
                }}
                className="px-3 py-2 bg-white/70 border border-gray-200 rounded-xl text-xs text-ink-700 font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs"
              >
                <option value="all">All Shortfall Legs</option>
                <option value="advance-only">Advance Shortfall Only</option>
                <option value="balance-only">Balance Shortfall Only</option>
                <option value="both">Both Advance &amp; Balance Shortfall</option>
              </select>

              {/* Customer Filter */}
              <select
                value={shortfallCustomerFilter}
                onChange={(e) => {
                  setShortfallCustomerFilter(e.target.value);
                  setShortfallPage(1);
                }}
                className="px-3 py-2 bg-white/70 border border-gray-200 rounded-xl text-xs text-ink-700 font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs max-w-[200px]"
              >
                <option value="">All Consignees</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Sorting */}
              <select
                value={shortfallSortBy}
                onChange={(e) => setShortfallSortBy(e.target.value as any)}
                className="px-3 py-2 bg-white/70 border border-gray-200 rounded-xl text-xs text-ink-700 font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs"
              >
                <option value="total-desc">Highest Shortfall (USD)</option>
                <option value="total-asc">Lowest Shortfall (USD)</option>
                <option value="date-desc">Latest Invoice Date</option>
                <option value="inv-asc">Invoice No (A-Z)</option>
              </select>
            </div>

            <span className="text-xs font-bold text-ink-500">
              Showing {filteredShortfallInvoices.length} of {shortfallInvoicesList.length} shortfall invoices
            </span>
          </div>

          {/* Shortfall Breakup Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50/80 text-ink-500 uppercase text-[10px] font-bold border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-3 text-center">#</th>
                    <th className="py-3 px-3">Commercial Invoice</th>
                    <th className="py-3 px-3">Consignee &amp; Destination</th>
                    <th className="py-3 px-3 text-right">Invoiced USD</th>
                    <th className="py-3 px-3 text-right bg-blue-50/50">Adv Terms vs Actual</th>
                    <th className="py-3 px-3 text-right bg-blue-50/50">Adv Shortfall</th>
                    <th className="py-3 px-3 text-right bg-emerald-50/50">Bal Price vs Actual</th>
                    <th className="py-3 px-3 text-right bg-emerald-50/50">Bal Shortfall</th>
                    <th className="py-3 px-3 text-right bg-amber-50/60 font-black">Total Shortfall (USD)</th>
                    <th className="py-3 px-3 text-right bg-amber-50/60 font-black">Shortfall (INR)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Outstanding</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredShortfallInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-ink-400">
                        <Receipt className="w-8 h-8 mx-auto text-ink-300 mb-2 opacity-60" />
                        <p className="font-bold text-sm text-ink-800">No shortfall invoices match your filters</p>
                        <p className="text-xs text-ink-500 mt-1">Try clearing search terms or selecting 'All Shortfall Legs'</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedShortfallInvoices.map((inv, idx) => {
                      const globalIdx = (shortfallPage - 1) * shortfallPageSize + idx + 1;
                      return (
                        <tr key={inv.id} className="hover:bg-amber-50/20 transition group">
                          {/* # */}
                          <td className="py-3 px-3 text-center font-mono text-[11px] text-ink-400">
                            {globalIdx}
                          </td>

                          {/* Commercial Invoice */}
                          <td className="py-3 px-3 align-middle">
                            <div className="font-bold text-ink-900 group-hover:text-rose-700 transition">
                              {inv.invoiceNo}
                            </div>
                            <div className="text-[10px] text-ink-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-ink-400" />
                              <span>{inv.invoiceDate}</span>
                            </div>
                            {inv.orderNo && (
                              <div className="text-[9px] text-ink-400 font-mono">PO: {inv.orderNo}</div>
                            )}
                          </td>

                          {/* Consignee */}
                          <td className="py-3 px-3 align-middle max-w-[200px]">
                            <div className="font-bold text-ink-900 truncate" title={inv.consigneeNameDisplay}>
                              {inv.consigneeNameDisplay}
                            </div>
                            <div className="text-[10px] text-ink-500 flex items-center gap-1 mt-0.5 truncate">
                              <Globe className="w-3 h-3 text-ink-400 shrink-0" />
                              <span>{inv.countryDisplay}</span>
                              {inv.buyerNameDisplay && inv.buyerNameDisplay !== inv.consigneeNameDisplay && (
                                <span className="text-ink-400">· {inv.buyerNameDisplay}</span>
                              )}
                            </div>
                          </td>

                          {/* Invoiced USD */}
                          <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                            <div className="font-black text-ink-950 tabular-nums">
                              ${inv.totalAmountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-ink-500">
                              Realized: ${(inv.totalRealizedCurrency || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          </td>

                          {/* Advance Terms vs Actual */}
                          <td className="py-3 px-3 align-middle text-right whitespace-nowrap bg-blue-50/30">
                            <div className="font-bold text-blue-900 tabular-nums">
                              Terms: ${inv.termsUSD ? inv.termsUSD.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                            </div>
                            <div className="text-[10px] text-blue-700 tabular-nums">
                              Actual: ${inv.advUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            {inv.advanceReceivedDate && (
                              <div className="text-[9px] text-ink-400 mt-0.5">
                                Recd: {inv.advanceReceivedDate}
                              </div>
                            )}
                          </td>

                          {/* Advance Shortfall */}
                          <td className="py-3 px-3 align-middle text-right whitespace-nowrap bg-blue-50/30">
                            {inv.advShortfall > 0 ? (
                              <div>
                                <div className="font-black text-rose-700 tabular-nums">
                                  -${inv.advShortfall.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[10px] text-blue-800 font-semibold tabular-nums">
                                  {formatINR(inv.advShortfallINR)}
                                </div>
                                <div className="text-[9px] text-ink-400">
                                  @ ₹{formatForwardRate(inv.advRate)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-bold">Nil Shortfall</span>
                            )}
                          </td>

                          {/* Balance Price vs Actual */}
                          <td className="py-3 px-3 align-middle text-right whitespace-nowrap bg-emerald-50/30">
                            <div className="font-bold text-emerald-900 tabular-nums">
                              Price: ${inv.priceUSD ? inv.priceUSD.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                            </div>
                            <div className="text-[10px] text-emerald-700 tabular-nums">
                              Actual: ${inv.balUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            {inv.balancePaymentDate && (
                              <div className="text-[9px] text-ink-400 mt-0.5">
                                Recd: {inv.balancePaymentDate}
                              </div>
                            )}
                          </td>

                          {/* Balance Shortfall */}
                          <td className="py-3 px-3 align-middle text-right whitespace-nowrap bg-emerald-50/30">
                            {inv.balShortfall > 0 ? (
                              <div>
                                <div className="font-black text-rose-700 tabular-nums">
                                  -${inv.balShortfall.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[10px] text-emerald-800 font-semibold tabular-nums">
                                  {formatINR(inv.balShortfallINR)}
                                </div>
                                <div className="text-[9px] text-ink-400">
                                  @ ₹{formatForwardRate(inv.balRate)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-bold">Nil Shortfall</span>
                            )}
                          </td>

                          {/* Total Shortfall USD */}
                          <td className="py-3 px-3 align-middle text-right whitespace-nowrap bg-amber-50/50">
                            <div className="font-black text-amber-900 text-sm tabular-nums">
                              -${inv.totalShortfall.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[9px] text-amber-700 font-bold uppercase tracking-wider">
                              Deductions Cleared
                            </div>
                          </td>

                          {/* Total Shortfall INR */}
                          <td className="py-3 px-3 align-middle text-right whitespace-nowrap bg-amber-50/50">
                            <div className="font-black text-ink-950 tabular-nums">
                              {formatINR(inv.totalShortfallINR)}
                            </div>
                            <div className="text-[9px] text-ink-500 font-medium">
                              Bank Forward Equiv
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                            <StatusBadge status="Realized" />
                            <div className="mt-1">
                              <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                                Settled w/ Shortfall
                              </span>
                            </div>
                          </td>

                          {/* Outstanding */}
                          <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                            <div className="font-black text-emerald-700 tabular-nums">
                              $0.00
                            </div>
                            <div className="text-[10px] text-emerald-600 font-semibold">
                              Fully Cleared
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setRealizationTarget(inv)}
                                title="Inspect or Edit Settlement Details"
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <BadgeDollarSign className="w-3.5 h-3.5 text-amber-600" />
                                <span>View</span>
                              </button>
                              <button
                                onClick={() => setStatementTarget(inv)}
                                title="View & Download Realization & Settlement Statement (A4 PDF & Word)"
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Statement</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Table Footer Summary */}
                {filteredShortfallInvoices.length > 0 && (
                  <tfoot className="bg-gray-50/95 font-bold text-ink-900 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={3} className="py-3 px-3 text-left font-black uppercase text-xs">
                        Total Shortfall Summary ({filteredShortfallInvoices.length} Invoices)
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums">
                        ${filteredShortfallInvoices.reduce((s, i) => s + i.totalAmountCurrency, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums bg-blue-50/30">
                        ${filteredShortfallInvoices.reduce((s, i) => s + (i.termsUSD || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums text-rose-700 bg-blue-50/30">
                        -${filteredShortfallInvoices.reduce((s, i) => s + i.advShortfall, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums bg-emerald-50/30">
                        ${filteredShortfallInvoices.reduce((s, i) => s + (i.priceUSD || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums text-rose-700 bg-emerald-50/30">
                        -${filteredShortfallInvoices.reduce((s, i) => s + i.balShortfall, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums text-amber-900 bg-amber-50/60 text-sm font-black">
                        -${filteredShortfallInvoices.reduce((s, i) => s + i.totalShortfall, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums bg-amber-50/60 font-black">
                        {formatINR(filteredShortfallInvoices.reduce((s, i) => s + i.totalShortfallINR, 0))}
                      </td>
                      <td className="py-3 px-3 text-center text-[10px] text-emerald-800">
                        All Fully Realized
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-700 tabular-nums">
                        $0.00
                      </td>
                      <td className="py-3 px-3 text-center">
                        —
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredShortfallInvoices.length > 0 && (
              <div className="p-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs bg-gray-50/30">
                <div className="flex items-center gap-2 text-ink-500">
                  <span>Rows per page:</span>
                  <select
                    value={shortfallPageSize}
                    onChange={(e) => {
                      setShortfallPageSize(Number(e.target.value));
                      setShortfallPage(1);
                    }}
                    className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-ink-800 font-bold shadow-2xs"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-ink-600 font-medium">
                    Page {shortfallPage} of {Math.max(1, Math.ceil(filteredShortfallInvoices.length / shortfallPageSize))}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShortfallPage((p) => Math.max(1, p - 1))}
                      disabled={shortfallPage === 1}
                      className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-ink-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 shadow-2xs font-bold"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() =>
                        setShortfallPage((p) =>
                          p < Math.ceil(filteredShortfallInvoices.length / shortfallPageSize) ? p + 1 : p
                        )
                      }
                      disabled={shortfallPage >= Math.ceil(filteredShortfallInvoices.length / shortfallPageSize)}
                      className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-ink-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 shadow-2xs font-bold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
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

      {/* Realization & Settlement Statement Modal */}
      {statementTarget && (
        <RealizationStatementModal
          isOpen={Boolean(statementTarget)}
          onClose={() => setStatementTarget(null)}
          invoice={statementTarget}
          settings={businessSettings}
          bankAccounts={bankAccounts}
          onOpenFull={() => setIsFullStatementOpen(true)}
        />
      )}

      {/* Full Realization & Settlement Statement Modal */}
      {isFullStatementOpen && (
        <FullRealizationStatementModal
          isOpen={isFullStatementOpen}
          onClose={() => setIsFullStatementOpen(false)}
          invoices={salesInvoices}
          settings={businessSettings}
          bankAccounts={bankAccounts}
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
                        <th className="py-2 px-2.5 text-right">Adv Terms</th>
                        <th className="py-2 px-2.5 text-right">Actual Adv</th>
                        <th className="py-2 px-2.5">Adv Date</th>
                        <th className="py-2 px-2.5 text-right">Bal Price</th>
                        <th className="py-2 px-2.5 text-right">Actual Bal</th>
                        <th className="py-2 px-2.5">Bal Date</th>
                        <th className="py-2 px-2.5 text-right">Shortfall</th>
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

                        const rawAdvTerms = parseFloat(
                          getFlexibleValue(row, [
                            'advanceaspercontracttermsusd',
                            'advancecontracttermsusd',
                            'advancetermsusd',
                            'advanceterms',
                            'contractadvanceusd'
                          ]) || ''
                        );
                        const advTerms = !isNaN(rawAdvTerms) && rawAdvTerms > 0 ? rawAdvTerms : (matched?.advanceTermsUSD || 0);

                        const rawAdvUSD = parseFloat(
                          getFlexibleValue(row, ['actualadvancereceivedusd', 'advancereceivedusd', 'advancereceived', 'advanceamount', 'advance']) || ''
                        );
                        const advDate = formatExcelDate(
                          getFlexibleValue(row, ['dateofreceivingtheadvance', 'dateofreceivingadvance', 'advancedate'])
                        );

                        const rawBalPrice = parseFloat(
                          getFlexibleValue(row, [
                            'balanceasperactualpriceusd',
                            'balanceactualpriceusd',
                            'actualpricebalanceusd',
                            'balancepriceusd',
                            'balanceprice'
                          ]) || ''
                        );
                        const balPrice = !isNaN(rawBalPrice) && rawBalPrice > 0 ? rawBalPrice : (matched?.balanceActualPriceUSD || 0);

                        const rawBalUSD = parseFloat(
                          getFlexibleValue(row, ['actualbalancereceivedusd', 'balancepaymentamountusd', 'balancepaymentamount', 'balanceamount', 'balance']) || ''
                        );
                        const balDate = formatExcelDate(
                          getFlexibleValue(row, ['dateofreceivingbalanacepayment', 'dateofreceivingbalancepayment', 'balancedate'])
                        );

                        const advShortfall = advTerms > 0 && !isNaN(rawAdvUSD) && advTerms > rawAdvUSD ? Number((advTerms - rawAdvUSD).toFixed(2)) : 0;
                        const balShortfall = balPrice > 0 && !isNaN(rawBalUSD) && balPrice > rawBalUSD ? Number((balPrice - rawBalUSD).toFixed(2)) : 0;
                        const totalShortfall = Number((advShortfall + balShortfall).toFixed(2));

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
                              ₹{formatForwardRate(advRate)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-800">
                              ₹{formatForwardRate(balRate)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-medium text-ink-700">
                              {advTerms > 0 ? `$${advTerms.toLocaleString()}` : '—'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-bold text-blue-800">
                              {!isNaN(rawAdvUSD) && rawAdvUSD > 0 ? `$${rawAdvUSD.toLocaleString()}` : '—'}
                            </td>
                            <td className="py-1.5 px-2.5 text-ink-600 whitespace-nowrap text-[10px]">
                              {advDate || '—'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-medium text-ink-700">
                              {balPrice > 0 ? `$${balPrice.toLocaleString()}` : '—'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-bold text-emerald-800">
                              {!isNaN(rawBalUSD) && rawBalUSD > 0 ? `$${rawBalUSD.toLocaleString()}` : '—'}
                            </td>
                            <td className="py-1.5 px-2.5 text-ink-600 whitespace-nowrap text-[10px]">
                              {balDate || '—'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-bold text-amber-700">
                              {totalShortfall > 0 ? `-$${totalShortfall.toLocaleString()}` : '—'}
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

      {/* Floating Bulk Actions Bar */}
      {selectedInvoiceIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-ink-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 text-xs font-semibold animate-in fade-in slide-in-from-bottom-4">
          <span className="text-white/80">
            <strong className="text-white font-bold">{selectedInvoiceIds.length}</strong> invoice{selectedInvoiceIds.length > 1 ? 's' : ''} selected
            {selectedRealizedCount > 0 && (
              <span className="text-amber-300 ml-1.5 font-bold">({selectedRealizedCount} with realizations)</span>
            )}
          </span>

          <div className="h-4 w-px bg-white/20" />

          {permissions.canManageSalesRealization && (
            <button
              onClick={() => setIsBulkClearModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition font-bold shadow-xs cursor-pointer"
              title="Delete realization and settlement entries for selected invoices"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Realizations ({selectedInvoiceIds.length})</span>
            </button>
          )}

          <button
            onClick={() => setSelectedInvoiceIds([])}
            className="px-2.5 py-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            Deselect
          </button>
        </div>
      )}

      {/* Bulk Delete / Clear Realizations Confirmation Modal */}
      <Modal
        isOpen={isBulkClearModalOpen}
        onClose={() => setIsBulkClearModalOpen(false)}
        title="Delete Realization & Settlement Entries in Bulk"
        subtitle={`Reset realization data, remittances, and shortfalls across ${selectedInvoiceIds.length} invoice(s)`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Are you sure you want to clear these realization entries?</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                This will reset all advance received, balance payments, bank reference numbers, and realization logs to zero / unremitted for the selected invoices. Commercial invoice records themselves will not be deleted; their realization status will return to <span className="font-bold">"Not Realized"</span>.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2">
            <div className="flex justify-between items-center text-ink-700 font-medium">
              <span>Total Selected Invoices:</span>
              <span className="font-bold text-ink-900">{selectedInvoiceIds.length}</span>
            </div>
            <div className="flex justify-between items-center text-ink-700 font-medium">
              <span>Invoices with Active Realizations / Remittances:</span>
              <span className="font-bold text-rose-700">{selectedRealizedCount}</span>
            </div>
          </div>

          {selectedInvoicesList.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-ink-700 block">Selected Invoices to be Reset:</span>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white shadow-2xs">
                {selectedInvoicesList.map((inv) => (
                  <div key={inv.id} className="p-2.5 flex items-center justify-between text-[11px] hover:bg-gray-50">
                    <div>
                      <span className="font-mono font-bold text-rose-700 mr-2">{inv.invoiceNo}</span>
                      <span className="text-ink-600 truncate max-w-[200px] inline-block align-bottom">{inv.consigneeName || 'Export Customer'}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-ink-900">
                        {inv.currency} {inv.totalAmountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-ink-500">
                        Realized: {inv.currency} {(inv.totalRealizedCurrency || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ({inv.realizationStatus})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsBulkClearModalOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-700 font-bold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmBulkClearRealizations}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Confirm Delete Realizations</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
