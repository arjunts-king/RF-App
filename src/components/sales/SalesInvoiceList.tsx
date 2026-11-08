import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { SalesInvoice } from '../../types';
import { formatINR, formatKg } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
import { BentoCard } from '../common/BentoCard';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { RealizationModal } from './RealizationModal';
import { ExportInvoicePreviewModal } from './ExportInvoicePreviewModal';
import { PaginationControls } from '../common/PaginationControls';
import { convertToCSV, downloadFile } from '../../utils/exportUtils';
import { exportInvoiceToWord } from '../../utils/exportWordInvoice';
import {
  Search,
  Download,
  Eye,
  Pencil,
  Trash2,
  Ban,
  BadgeDollarSign,
  FileText,
  Globe,
  Plus,
  FileSpreadsheet,
  FileDown,
  ChevronDown,
  Layers
} from 'lucide-react';

export const SalesInvoiceList: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const {
    salesInvoices,
    customers,
    ports,
    businessSettings,
    updateSalesInvoice,
    voidSalesInvoice,
    deleteSalesInvoicePermanently
  } = useData();
  const { permissions } = useAuth();
  const { showToast } = useToast();

  // Expanded row state for item breakdown
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [podFilter, setPodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showVoided, setShowVoided] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkVoidModalOpen, setIsBulkVoidModalOpen] = useState(false);
  const [bulkVoidReason, setBulkVoidReason] = useState('');
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [realizationTarget, setRealizationTarget] = useState<SalesInvoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<SalesInvoice | null>(null);
  const [voidTarget, setVoidTarget] = useState<SalesInvoice | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SalesInvoice | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<{
    invoiceDate: string;
    orderNo: string;
    remarks: string;
    exchangeRate: number;
    editReason: string;
  }>({
    invoiceDate: '',
    orderNo: '',
    remarks: '',
    exchangeRate: 84.5,
    editReason: ''
  });

  // Lookups
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const portMap = new Map(ports.map((p) => [p.id, p]));

  // Filtered List
  const filteredInvoices = salesInvoices.filter((inv) => {
    if (!showVoided && inv.isVoided) return false;
    if (showVoided && !inv.isVoided) return false;

    if (customerFilter && inv.consigneeId !== customerFilter) return false;
    if (podFilter && inv.portOfDischargeId !== podFilter) return false;
    if (statusFilter && inv.realizationStatus !== statusFilter) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNo = inv.invoiceNo.toLowerCase().includes(q);
      const matchOrder = inv.orderNo?.toLowerCase().includes(q);
      const consigneeName = customerMap.get(inv.consigneeId)?.name.toLowerCase() || '';
      const buyerName = inv.buyerId ? customerMap.get(inv.buyerId)?.name.toLowerCase() || '' : '';
      const matchCust = consigneeName.includes(q) || buyerName.includes(q);
      const matchPort = portMap.get(inv.portOfDischargeId)?.name.toLowerCase().includes(q);
      const matchRemarks = inv.remarks?.toLowerCase().includes(q);
      return matchNo || matchOrder || matchCust || matchPort || matchRemarks;
    }

    return true;
  });

  // Client-side pagination state for smooth DOM performance
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, customerFilter, podFilter, statusFilter, showVoided]);

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  // Top Metrics
  const activeInvoices = salesInvoices.filter((inv) => !inv.isVoided);
  const totalWeightAll = activeInvoices.reduce((s, inv) => s + inv.totalWeightKg, 0);
  const totalValueUSDAll = activeInvoices.reduce((s, inv) => s + inv.totalAmountCurrency, 0);
  const totalRealizedINRAll = activeInvoices.reduce((s, inv) => s + inv.totalRealizedINR, 0);
  const totalBalanceUSDAll = activeInvoices.reduce((s, inv) => s + inv.balanceRealizationCurrency, 0);

  const handleStartEdit = (inv: SalesInvoice) => {
    setEditingInvoice(inv);
    setEditForm({
      invoiceDate: inv.invoiceDate,
      orderNo: inv.orderNo || '',
      remarks: inv.remarks || '',
      exchangeRate: inv.exchangeRate,
      editReason: ''
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    updateSalesInvoice(
      editingInvoice.id,
      {
        invoiceDate: editForm.invoiceDate,
        orderNo: editForm.orderNo,
        remarks: editForm.remarks,
        exchangeRate: Number(editForm.exchangeRate)
      },
      editForm.editReason || 'Administrative update'
    );
    setEditingInvoice(null);
  };

  const handleConfirmVoid = () => {
    if (!voidTarget || !voidReason.trim()) return;
    voidSalesInvoice(voidTarget.id, voidReason.trim());
    setVoidTarget(null);
    setVoidReason('');
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteSalesInvoicePermanently(deleteTarget.id);
    setDeleteTarget(null);
  };

  // Bulk Selection Helpers & Actions
  const allFilteredSelected =
    filteredInvoices.length > 0 &&
    filteredInvoices.every((inv) => selectedIds.includes(inv.id));
  const someFilteredSelected =
    filteredInvoices.some((inv) => selectedIds.includes(inv.id)) && !allFilteredSelected;

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredInvoices.map((inv) => inv.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...filteredInvoices.map((inv) => inv.id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkExportCSV = () => {
    const selectedInvoices = filteredInvoices.filter((inv) => selectedIds.includes(inv.id));
    if (selectedInvoices.length === 0) return;
    const exportData = selectedInvoices.map((inv) => {
      const consignee = customerMap.get(inv.consigneeId);
      const buyer = inv.buyerId ? customerMap.get(inv.buyerId) : consignee;
      const pod = portMap.get(inv.portOfDischargeId);
      const pol = portMap.get(inv.portOfLoadingId);

      return {
        InvoiceNo: inv.invoiceNo,
        Date: inv.invoiceDate,
        Consignee: consignee?.name || '',
        Buyer: buyer?.name || '',
        Country: consignee?.country || '',
        POL: pol?.name || '',
        POD: pod?.name || '',
        Currency: inv.currency,
        TotalWeightKg: inv.totalWeightKg,
        TotalAmount: inv.totalAmountCurrency,
        FOBValueUSD: inv.totalFobValueCurrency,
        FOBValueINR: (inv.realizationStatus === 'Fully Realized' || (inv.totalRealizedINR && inv.totalRealizedINR > 0))
          ? (inv.totalFobValueINR || inv.totalRealizedINR)
          : '',
        RealizedAmount: inv.totalRealizedCurrency,
        BalanceUSD: inv.balanceRealizationCurrency,
        RealizedINR: (inv.realizationStatus === 'Fully Realized' || (inv.totalRealizedINR && inv.totalRealizedINR > 0)) ? inv.totalRealizedINR : '',
        BankExchangeRate: inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5,
        AdvanceReceivedUSD: inv.advanceReceivedCurrency || 0,
        AdvanceReceivedDate: inv.advanceReceivedDate || '',
        BalancePaymentUSD: inv.balancePaymentAmountCurrency || 0,
        BalancePaymentDate: inv.balancePaymentDate || '',
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
      { key: 'POL', label: 'Port of Loading' },
      { key: 'POD', label: 'Port of Discharge' },
      { key: 'Currency', label: 'Currency' },
      { key: 'TotalWeightKg', label: 'Total Weight (Kg)' },
      { key: 'TotalAmount', label: 'Total Sales Value (USD)' },
      { key: 'FOBValueUSD', label: 'FOB Value (USD)' },
      { key: 'FOBValueINR', label: 'Realized FOB (INR)' },
      { key: 'BankExchangeRate', label: 'Exchange Rate (Pre-determined with Bank)' },
      { key: 'AdvanceReceivedUSD', label: 'Advance Received (USD)' },
      { key: 'AdvanceReceivedDate', label: 'Date of Receiving Advance' },
      { key: 'BalancePaymentUSD', label: 'Balance Payment Amount (USD)' },
      { key: 'BalancePaymentDate', label: 'Date of Receiving Balance Payment' },
      { key: 'RealizedAmount', label: 'Realized Value' },
      { key: 'BalanceUSD', label: 'Balance Realization' },
      { key: 'RealizedINR', label: 'Realized INR' },
      { key: 'Status', label: 'Realization Status' },
      { key: 'Voided', label: 'Voided' }
    ]);

    downloadFile(csvStr, `Export_Invoices_Selected_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleBulkConfirmVoid = () => {
    if (!bulkVoidReason.trim()) return;
    const targetInvoices = salesInvoices.filter((inv) => selectedIds.includes(inv.id) && !inv.isVoided);
    let count = 0;
    for (const inv of targetInvoices) {
      voidSalesInvoice(inv.id, bulkVoidReason.trim());
      count++;
    }
    showToast(`Successfully voided ${count} export invoices.`, 'success');
    setIsBulkVoidModalOpen(false);
    setBulkVoidReason('');
    setSelectedIds([]);
  };

  const handleBulkConfirmDelete = () => {
    let count = 0;
    for (const id of selectedIds) {
      deleteSalesInvoicePermanently(id);
      count++;
    }
    showToast(`Permanently deleted ${count} export invoices.`, 'success');
    setIsBulkDeleteModalOpen(false);
    setSelectedIds([]);
  };

  const handleExportCSV = () => {
    const exportData = filteredInvoices.map((inv) => {
      const consignee = customerMap.get(inv.consigneeId);
      const buyer = inv.buyerId ? customerMap.get(inv.buyerId) : consignee;
      const pod = portMap.get(inv.portOfDischargeId);
      const pol = portMap.get(inv.portOfLoadingId);

      return {
        InvoiceNo: inv.invoiceNo,
        Date: inv.invoiceDate,
        Consignee: consignee?.name || '',
        Buyer: buyer?.name || '',
        Country: consignee?.country || '',
        POL: pol?.name || '',
        POD: pod?.name || '',
        Currency: inv.currency,
        TotalWeightKg: inv.totalWeightKg,
        TotalAmount: inv.totalAmountCurrency,
        FOBValueUSD: inv.totalFobValueCurrency,
        FOBValueINR: (inv.realizationStatus === 'Fully Realized' || (inv.totalRealizedINR && inv.totalRealizedINR > 0))
          ? (inv.totalFobValueINR || inv.totalRealizedINR)
          : '',
        RealizedAmount: inv.totalRealizedCurrency,
        BalanceUSD: inv.balanceRealizationCurrency,
        RealizedINR: (inv.realizationStatus === 'Fully Realized' || (inv.totalRealizedINR && inv.totalRealizedINR > 0)) ? inv.totalRealizedINR : '',
        BankExchangeRate: inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5,
        AdvanceReceivedUSD: inv.advanceReceivedCurrency || 0,
        AdvanceReceivedDate: inv.advanceReceivedDate || '',
        BalancePaymentUSD: inv.balancePaymentAmountCurrency || 0,
        BalancePaymentDate: inv.balancePaymentDate || '',
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
      { key: 'POL', label: 'Port of Loading' },
      { key: 'POD', label: 'Port of Discharge' },
      { key: 'Currency', label: 'Currency' },
      { key: 'TotalWeightKg', label: 'Total Weight (Kg)' },
      { key: 'TotalAmount', label: 'Total Sales Value (USD)' },
      { key: 'FOBValueUSD', label: 'Total FOB Value (USD)' },
      { key: 'FOBValueINR', label: 'Realized FOB (INR)' },
      { key: 'BankExchangeRate', label: 'Exchange Rate (Pre-determined with Bank)' },
      { key: 'AdvanceReceivedUSD', label: 'Advance Received (USD)' },
      { key: 'AdvanceReceivedDate', label: 'Date of Receiving Advance' },
      { key: 'BalancePaymentUSD', label: 'Balance Payment Amount (USD)' },
      { key: 'BalancePaymentDate', label: 'Date of Receiving Balance Payment' },
      { key: 'RealizedAmount', label: 'Realized Foreign Currency' },
      { key: 'BalanceUSD', label: 'Balance Outstanding' },
      { key: 'RealizedINR', label: 'Realized INR' },
      { key: 'Status', label: 'Realization Status' },
      { key: 'Voided', label: 'Voided' }
    ]);

    downloadFile(csvStr, `Sales_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Figma Header Block */}
      <PageHeader
        title="Commercial sales invoices register"
        subtitle="Official commercial invoices, freight dispatches, and overseas bank remittance realization tracking."
        breadcrumbs={['Sales', 'Invoices Register']}
        primaryAction={
          permissions.canCreateEditSales && onNavigate
            ? {
                label: 'New commercial invoice',
                onClick: () => onNavigate('invoice-entry'),
                icon: Plus
              }
            : undefined
        }
        secondaryActions={[
          ...(onNavigate ? [{
            label: 'Import Excel',
            onClick: () => onNavigate('sales-excel-import'),
            icon: FileSpreadsheet
          }] : []),
          {
            label: 'Export CSV',
            onClick: handleExportCSV,
            icon: Download
          }
        ]}
      />

      {/* Bento KPI Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <BentoCard
          label="Active Invoices"
          value={activeInvoices.length}
          caption="Commercial export bills"
        />
        <BentoCard
          label="Total Export Weight"
          value={formatKg(totalWeightAll)}
          caption="Net shipping weight"
        />
        <BentoCard
          label="Total Invoiced (USD)"
          value={`$${totalValueUSDAll.toLocaleString()}`}
          caption="Foreign receivables"
          variant="highlight"
        />
        <BentoCard
          label="Realized Remittances"
          value={formatINR(totalRealizedINRAll)}
          caption="Bank settlements credited"
          variant="success"
        />
        <BentoCard
          label="Unrealized Balance"
          value={`$${totalBalanceUSDAll.toLocaleString()}`}
          caption="Pending overseas wire"
          variant={totalBalanceUSDAll > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Sticky Search & Multi-Filter Bar (Liquid Glass Surface) */}
      <div className="glass-surface-thin p-4 rounded-2xl border border-white/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              placeholder="Search invoice #, customer, order #, port, container..."
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
            <option value="">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.country})
              </option>
            ))}
          </select>

          <select
            value={podFilter}
            onChange={(e) => setPodFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
          >
            <option value="">All Discharge Ports</option>
            {ports.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
          >
            <option value="">All Statuses</option>
            <option value="Not Realized">Not Realized</option>
            <option value="Partially Realized">Partially Realized</option>
            <option value="Fully Realized">Fully Realized</option>
          </select>

          <button
            onClick={() => setShowVoided(!showVoided)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition ${
              showVoided
                ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                : 'bg-gray-50 text-ink-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {showVoided ? 'Showing Voided' : 'Show Voided'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-ink-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {permissions.canCreateEditSales && onNavigate && (
            <button
              onClick={() => onNavigate('invoice-entry')}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someFilteredSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-gray-300 cursor-pointer"
                    title={allFilteredSelected ? 'Deselect all visible' : 'Select all visible'}
                  />
                </th>
                <th className="py-3 px-3">Invoice #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 min-w-[170px]">Consignee &amp; Destination</th>
                <th className="py-3 px-3">Port of Discharge</th>
                <th className="py-3 px-3 text-right">Net Wt (Kg)</th>
                <th className="py-3 px-3 text-right">Invoice Value</th>
                <th className="py-3 px-3 text-center">Realization Status</th>
                <th className="py-3 px-3 text-right">Realized / Balance</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-ink-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-ink-400" />
                    No commercial export invoices found.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const consignee = customerMap.get(inv.consigneeId);
                  const pod = portMap.get(inv.portOfDischargeId);
                  const isSelected = selectedIds.includes(inv.id);
                  const isExpanded = expandedIds.includes(inv.id);

                  return (
                    <React.Fragment key={inv.id}>
                    <tr
                      className={`hover:bg-rose-50/25 transition-colors ${
                        isSelected ? 'bg-rose-50/70 font-medium' : ''
                      } ${inv.isVoided ? 'bg-rose-50/40 text-ink-400' : ''}`}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(inv.id)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-gray-300 cursor-pointer"
                        />
                      </td>
                      {/* Invoice No */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {inv.lineItems && inv.lineItems.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(inv.id)}
                              className="p-1 hover:bg-rose-100 rounded text-rose-700 transition"
                              title={isExpanded ? 'Hide item breakdown' : 'Show item breakdown'}
                              aria-label="Toggle item breakdown"
                            >
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                          <span className="font-mono font-bold text-rose-700">{inv.invoiceNo}</span>
                          {inv.isVoided && <StatusBadge status="Voided" />}
                        </div>
                        {inv.orderNo && (
                          <div className="text-[10px] text-ink-500 font-mono ml-6">PO: {inv.orderNo}</div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-ink-700 whitespace-nowrap">{inv.invoiceDate}</td>

                      {/* Consignee & Item Chips */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-ink-900 leading-tight">
                          {consignee?.name || 'Unknown Consignee'}
                        </div>
                        <div className="text-[10px] text-ink-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3 text-ink-400" />
                            <span>{consignee?.country || 'Export'}</span>
                          </span>
                          {(consignee?.isGstExempt || consignee?.customerType === 'Overseas') && (
                            <span className="px-1.5 py-0.2 text-[9px] bg-emerald-50 text-emerald-800 font-bold rounded-sm border border-emerald-200">
                              Overseas (GST Exempt)
                            </span>
                          )}
                        </div>

                        {/* Inline Item Chips (Species, Grade/Size, Cartons) */}
                        {inv.lineItems && inv.lineItems.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            {inv.lineItems.slice(0, 3).map((l, idx) => (
                              <span
                                key={l.id || idx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 border border-rose-200 rounded text-[10px] font-semibold text-rose-900"
                                title={`${l.productDescription}: Grade ${l.gradeSize || 'N/A'}, ${l.cartonsCount ? l.cartonsCount + ' cs, ' : ''}${l.weightKg} kg @ $${l.ratePerKg}/kg`}
                              >
                                {l.gradeSize ? (
                                  <strong className="text-rose-700 font-bold">{l.gradeSize}</strong>
                                ) : (
                                  <span>{l.productDescription}</span>
                                )}
                                {l.cartonsCount > 0 && <span className="text-ink-500">({l.cartonsCount}cs)</span>}
                                <span className="text-ink-600 font-mono text-[9px]">{l.weightKg}kg</span>
                              </span>
                            ))}
                            {inv.lineItems.length > 3 && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(inv.id)}
                                className="text-[10px] text-rose-700 font-bold hover:underline"
                              >
                                +{inv.lineItems.length - 3} more
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Port of Discharge & Destination */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-ink-800">{inv.portOfDischarge || pod?.name || 'POD'}</div>
                        <div className="text-[10px] text-ink-500 font-medium">{inv.finalDestination || pod?.code || ''}</div>
                      </td>

                      {/* Total Weight */}
                      <td className="py-3 px-3 text-right font-extrabold text-ink-900 tabular-nums">
                        {formatKg(inv.totalWeightKg)}
                      </td>

                      {/* Total Value */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-black text-rose-950 tabular-nums">
                          {inv.currency} {inv.totalAmountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        {(inv.realizationStatus === 'Fully Realized' || (inv.totalRealizedINR && inv.totalRealizedINR > 0)) ? (
                          <div className="text-[10px] text-emerald-700 font-bold tabular-nums">
                            Realized: ₹{inv.totalRealizedINR.toLocaleString()}
                          </div>
                        ) : null}
                      </td>

                      {/* Realization Status */}
                      <td className="py-3 px-3 text-center">
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

                      {/* Realized / Balance */}
                      <td className="py-3 px-3 text-right">
                        <div className="text-emerald-700 font-bold tabular-nums">
                          {inv.currency} {inv.totalRealizedCurrency.toLocaleString()}
                          {(inv.realizationStatus === 'Fully Realized' || (inv.totalRealizedINR && inv.totalRealizedINR > 0)) && (
                            <span className="text-[10px] text-emerald-800 ml-1 block font-mono">
                              ({formatINR(inv.totalRealizedINR)})
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-ink-500 tabular-nums">
                          Bal: {inv.currency} {inv.balanceRealizationCurrency.toLocaleString()}
                        </div>
                        {(inv.advanceReceivedCurrency || inv.balancePaymentAmountCurrency) && (
                          <div className="text-[9px] text-ink-500 font-mono mt-0.5 space-x-1">
                            {inv.advanceReceivedCurrency && (
                              <span className="text-blue-700 bg-blue-50 px-1 py-0.2 rounded" title={`Advance received on ${inv.advanceReceivedDate || 'N/A'}`}>
                                Adv: ${inv.advanceReceivedCurrency.toLocaleString()}
                              </span>
                            )}
                            {inv.balancePaymentAmountCurrency && (
                              <span className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded" title={`Balance received on ${inv.balancePaymentDate || 'N/A'}`}>
                                Bal: ${inv.balancePaymentAmountCurrency.toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                        {inv.bankPreDeterminedExchangeRate && (
                          <div className="text-[9px] text-rose-700 font-medium mt-0.5">
                            Bank Rate: ₹{inv.bankPreDeterminedExchangeRate.toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            title="View Commercial Invoice"
                            className="p-1.5 text-ink-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

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

                          {!inv.isVoided && (
                            <button
                              onClick={() => setRealizationTarget(inv)}
                              title="Record Remittance / Realization"
                              className="p-1.5 text-ink-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            >
                              <BadgeDollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          )}

                          {!inv.isVoided && permissions.canCreateEditSales && (
                            <button
                              onClick={() => handleStartEdit(inv)}
                              title="Edit Invoice"
                              className="p-1.5 text-ink-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!inv.isVoided && permissions.canVoid && (
                            <button
                              onClick={() => setVoidTarget(inv)}
                              title="Void Invoice (Soft-delete)"
                              className="p-1.5 text-ink-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {permissions.canPermanentlyDelete && (
                            <button
                              onClick={() => setDeleteTarget(inv)}
                              title="Permanent Purge (Owner/Admin only)"
                              className="p-1.5 text-ink-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && inv.lineItems && inv.lineItems.length > 0 && (
                      <tr className="bg-rose-50/25 border-b border-gray-200 animate-fade-in">
                        <td colSpan={10} className="p-3 pl-12 bg-neutral-50/70">
                          <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-ink-900 border-b border-gray-100 pb-1.5">
                              <span className="flex items-center gap-1.5 text-rose-800">
                                <Layers className="w-3.5 h-3.5 text-rose-600" />
                                Line Item Specifications &amp; Size Breakdown ({inv.lineItems.length} items)
                              </span>
                              <span className="text-ink-500 font-normal text-[11px]">
                                Invoice: <strong className="font-mono text-ink-900">{inv.invoiceNo}</strong>
                              </span>
                            </div>

                            {/* Origin, POL, POD, Final Destination particulars from Excel */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-[11px]">
                              <div>
                                <span className="text-[10px] font-bold text-ink-500 uppercase block">Country of Origin</span>
                                <span className="font-bold text-ink-900">{inv.countryOfOrigin || 'India'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-ink-500 uppercase block">Port of Loading</span>
                                <span className="font-bold text-ink-900">{inv.portOfLoading || 'Cochin Port, India'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-ink-500 uppercase block">Port of Discharge</span>
                                <span className="font-bold text-rose-700">{inv.portOfDischarge || pod?.name || 'POD'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-ink-500 uppercase block">Final Destination</span>
                                <span className="font-bold text-ink-900">{inv.finalDestination || consignee?.country || 'Export'}</span>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="text-[10px] text-ink-500 uppercase font-bold border-b border-gray-200 bg-gray-50/60">
                                    <th className="py-1.5 px-2">#</th>
                                    <th className="py-1.5 px-2">Product / Commodity</th>
                                    <th className="py-1.5 px-2 text-center">Grade / Size</th>
                                    <th className="py-1.5 px-2 text-center">Cartons</th>
                                    <th className="py-1.5 px-2 text-right">Net Weight (Kg)</th>
                                    <th className="py-1.5 px-2 text-right">Rate / Kg ({inv.currency})</th>
                                    <th className="py-1.5 px-2 text-right">Line Amount ({inv.currency})</th>
                                    <th className="py-1.5 px-2 text-center">HSN/SAC</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-ink-800">
                                  {inv.lineItems.map((line, idx) => (
                                    <tr key={line.id || idx} className="hover:bg-rose-50/30">
                                      <td className="py-1.5 px-2 font-mono text-ink-400">{idx + 1}</td>
                                      <td className="py-1.5 px-2 font-medium">{line.productDescription || 'Export Finish'}</td>
                                      <td className="py-1.5 px-2 text-center">
                                        {line.gradeSize ? (
                                          <span className="px-2 py-0.5 bg-rose-100/70 text-rose-800 font-bold rounded-md font-mono text-[11px] border border-rose-200">
                                            {line.gradeSize}
                                          </span>
                                        ) : (
                                          <span className="text-ink-400">-</span>
                                        )}
                                      </td>
                                      <td className="py-1.5 px-2 text-center font-bold text-ink-700">
                                        {line.cartonsCount > 0 ? `${line.cartonsCount} cs` : '-'}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-mono font-semibold tabular-nums">
                                        {formatKg(line.weightKg)}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                                        ${Number(line.ratePerKg || 0).toFixed(2)}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-mono font-bold tabular-nums text-rose-950">
                                        ${Number(line.amountCurrency || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-1.5 px-2 text-center font-mono text-[10px] text-ink-500">
                                        {line.hsCode || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Responsive Pagination Controls */}
        <PaginationControls
          currentPage={currentPage}
          totalItems={filteredInvoices.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-ink-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 text-xs font-semibold">
          <span className="flex items-center gap-2 pr-3 border-r border-white/20 font-bold text-white">
            <span className="w-5 h-5 rounded-full bg-rose-600 flex items-center justify-center text-[11px] font-bold">
              {selectedIds.length}
            </span>
            <span>selected</span>
          </span>

          <button
            onClick={handleBulkExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {permissions.canVoid && (
            <button
              onClick={() => {
                setBulkVoidReason('');
                setIsBulkVoidModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 transition"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Bulk Void</span>
            </button>
          )}

          {permissions.canPermanentlyDelete && (
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bulk Delete</span>
            </button>
          )}

          <button
            onClick={() => setSelectedIds([])}
            className="px-2.5 py-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            Deselect
          </button>
        </div>
      )}

      {/* Realization Modal */}
      <RealizationModal
        isOpen={realizationTarget !== null}
        onClose={() => setRealizationTarget(null)}
        invoice={realizationTarget}
      />

      {/* View Commercial Invoice Word Replica Preview Modal */}
      <ExportInvoicePreviewModal
        isOpen={selectedInvoice !== null}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        settings={businessSettings}
        customers={customers}
        ports={ports}
      />

      {/* Edit Invoice Modal */}
      <Modal
        isOpen={editingInvoice !== null}
        onClose={() => setEditingInvoice(null)}
        title={`Edit Invoice — ${editingInvoice?.invoiceNo}`}
        subtitle="Modify administrative header details, exchange rates, or order references"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Invoice Date</label>
            <input
              type="date"
              value={editForm.invoiceDate}
              onChange={(e) => setEditForm({ ...editForm, invoiceDate: e.target.value })}
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold outline-none focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Order / PO Reference</label>
            <input
              type="text"
              value={editForm.orderNo}
              onChange={(e) => setEditForm({ ...editForm, orderNo: e.target.value })}
              placeholder="e.g. PO-88231"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Booking Exchange Rate (INR / USD)</label>
            <input
              type="number"
              step="0.0001"
              value={editForm.exchangeRate}
              onChange={(e) => setEditForm({ ...editForm, exchangeRate: parseFloat(e.target.value) || 84.5 })}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Remarks &amp; Container #</label>
            <input
              type="text"
              value={editForm.remarks}
              onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Audit Reason for Modification <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={editForm.editReason}
              onChange={(e) => setEditForm({ ...editForm, editReason: e.target.value })}
              placeholder="e.g. Corrected buyer order reference number"
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium outline-none focus:border-rose-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setEditingInvoice(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-700 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-full transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Void Confirmation Modal */}
      <Modal
        isOpen={voidTarget !== null}
        onClose={() => setVoidTarget(null)}
        title={`Void Sales Invoice — ${voidTarget?.invoiceNo}`}
        subtitle="Soft-delete transaction with full audit tracking"
      >
        <div className="space-y-4 text-xs">
          <p className="text-ink-700 leading-relaxed">
            Voiding invoice <strong>{voidTarget?.invoiceNo}</strong> will deactivate it from commercial reports and dashboards while preserving an immutable surveillance trail.
          </p>
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Reason for Voiding <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={2}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Shipment cancelled by overseas buyer due to vessel rescheduling..."
              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-rose-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setVoidTarget(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-700 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmVoid}
              disabled={!voidReason.trim()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl transition"
            >
              Confirm Void
            </button>
          </div>
        </div>
      </Modal>

      {/* Permanent Delete Confirmation Modal (Admin only) */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Permanent Purge — ${deleteTarget?.invoiceNo}`}
        subtitle="Exclusive Owner / Admin permanent deletion authority"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 leading-relaxed">
            <strong>Warning:</strong> You are about to permanently purge export invoice <strong>{deleteTarget?.invoiceNo}</strong> from the database. This action cannot be undone.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-700 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-full transition"
            >
              Permanently Purge Record
            </button>
          </div>
        </div>
      </Modal>
      {/* BULK VOID MODAL */}
      <Modal
        isOpen={isBulkVoidModalOpen}
        onClose={() => setIsBulkVoidModalOpen(false)}
        title={`Bulk Void: ${selectedIds.length} Sales Invoices`}
        subtitle="Soft-delete selected export invoices with full audit tracking"
      >
        <div className="space-y-4 text-xs">
          <p className="text-ink-700 leading-relaxed">
            Voiding <strong>{selectedIds.length}</strong> export invoices will deactivate them from commercial reports and dashboards while preserving an immutable surveillance trail.
          </p>
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Reason for Bulk Voiding <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={2}
              value={bulkVoidReason}
              onChange={(e) => setBulkVoidReason(e.target.value)}
              placeholder="e.g. Shipment schedule cancellations across container booking..."
              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-rose-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsBulkVoidModalOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-700 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkConfirmVoid}
              disabled={!bulkVoidReason.trim()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl transition"
            >
              Confirm Bulk Void
            </button>
          </div>
        </div>
      </Modal>

      {/* BULK DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title={`Permanent Bulk Purge — ${selectedIds.length} Invoices`}
        subtitle="Exclusive Owner / Admin permanent deletion authority"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 leading-relaxed">
            <strong>Warning:</strong> You are about to permanently purge <strong>{selectedIds.length}</strong> export invoices from the database. This action cannot be undone.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-700 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkConfirmDelete}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-full transition"
            >
              Permanently Purge Selected
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
