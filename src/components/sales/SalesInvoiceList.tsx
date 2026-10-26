import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { SalesInvoice, RealizationStatus } from '../../types';
import { formatINR, formatKg } from '../../utils/calculations';
import { Modal } from '../common/Modal';
import { RealizationModal } from './RealizationModal';
import { convertToCSV, downloadFile, triggerPrint } from '../../utils/exportUtils';
import {
  Search,
  Download,
  Eye,
  Pencil,
  Trash2,
  Ban,
  BadgeDollarSign,
  Printer,
  FileText,
  Globe,
  Plus
} from 'lucide-react';

export const SalesInvoiceList: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const {
    salesInvoices,
    customers,
    ports,
    species,
    sizes,
    counts,
    businessSettings,
    updateSalesInvoice,
    voidSalesInvoice,
    deleteSalesInvoicePermanently
  } = useData();
  const { permissions } = useAuth();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [podFilter, setPodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showVoided, setShowVoided] = useState(false);

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
  const speciesMap = new Map(species.map((sp) => [sp.id, sp]));
  const sizeMap = new Map(sizes.map((sz) => [sz.id, sz]));
  const countMap = new Map(counts.map((cnt) => [cnt.id, cnt]));

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
        FOBValue: inv.totalFobValueCurrency,
        EstimatedINR: inv.estimatedAmountINR,
        RealizedAmount: inv.totalRealizedCurrency,
        BalanceUSD: inv.balanceRealizationCurrency,
        RealizedINR: inv.totalRealizedINR,
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
      { key: 'TotalAmount', label: 'Total Amount' },
      { key: 'FOBValue', label: 'Total FOB Value' },
      { key: 'EstimatedINR', label: 'Estimated INR' },
      { key: 'RealizedAmount', label: 'Realized Foreign Currency' },
      { key: 'BalanceUSD', label: 'Balance Outstanding' },
      { key: 'RealizedINR', label: 'Realized INR' },
      { key: 'Status', label: 'Realization Status' },
      { key: 'Voided', label: 'Voided' }
    ]);

    downloadFile(csvStr, `Sales_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const getStatusBadge = (status: RealizationStatus) => {
    switch (status) {
      case 'Fully Realized':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Partially Realized':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="space-y-5">
      {/* Metrics Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-ink-500 tracking-wider block">Active Invoices</span>
          <span className="text-xl font-extrabold text-ink-900 mt-1 block">{activeInvoices.length}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-ink-500 tracking-wider block">Total Export Weight</span>
          <span className="text-xl font-extrabold text-ink-900 mt-1 block">{formatKg(totalWeightAll)}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-rose-800 tracking-wider block">Total Invoiced (USD)</span>
          <span className="text-xl font-extrabold text-rose-950 mt-1 block">${totalValueUSDAll.toLocaleString()}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">Realized Remittances</span>
          <span className="text-xl font-extrabold text-emerald-950 mt-1 block">{formatINR(totalRealizedINRAll)}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">Unrealized Balance</span>
          <span className="text-xl font-extrabold text-amber-950 mt-1 block">${totalBalanceUSDAll.toLocaleString()}</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              placeholder="Search invoice #, customer, order #, port, container..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
            />
          </div>

          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none transition"
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
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none transition"
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
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none transition"
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
            className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-ink-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {permissions.canCreateEditSales && onNavigate && (
            <button
              onClick={() => onNavigate('invoice-entry')}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
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
                  <td colSpan={9} className="py-12 text-center text-ink-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-ink-400" />
                    No commercial export invoices found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const consignee = customerMap.get(inv.consigneeId);
                  const pod = portMap.get(inv.portOfDischargeId);

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-rose-50/25 transition-colors ${
                        inv.isVoided ? 'bg-rose-50/40 text-ink-400' : ''
                      }`}
                    >
                      {/* Invoice No */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-rose-700">{inv.invoiceNo}</span>
                          {inv.isVoided && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-rose-200 text-rose-900">
                              VOID
                            </span>
                          )}
                        </div>
                        {inv.orderNo && (
                          <div className="text-[10px] text-ink-500 font-mono">PO: {inv.orderNo}</div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-ink-700 whitespace-nowrap">{inv.invoiceDate}</td>

                      {/* Consignee */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-ink-900 leading-tight">
                          {consignee?.name || 'Unknown Consignee'}
                        </div>
                        <div className="text-[10px] text-ink-500 flex items-center gap-1 mt-0.5">
                          <Globe className="w-3 h-3 text-ink-400" />
                          <span>{consignee?.country || 'Export'}</span>
                        </div>
                      </td>

                      {/* Port of Discharge */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-ink-800">{pod?.name || 'POD'}</div>
                        <div className="text-[10px] text-ink-500 font-mono">{pod?.code}</div>
                      </td>

                      {/* Total Weight */}
                      <td className="py-3 px-3 text-right font-extrabold text-ink-900">
                        {formatKg(inv.totalWeightKg)}
                      </td>

                      {/* Total Value */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-black text-rose-950">
                          {inv.currency} {inv.totalAmountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-ink-500">
                          Est: ₹{inv.estimatedAmountINR.toLocaleString()}
                        </div>
                      </td>

                      {/* Realization Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                            inv.realizationStatus
                          )}`}
                        >
                          {inv.realizationStatus}
                        </span>
                      </td>

                      {/* Realized / Balance */}
                      <td className="py-3 px-3 text-right">
                        <div className="text-emerald-700 font-bold">
                          {inv.currency} {inv.totalRealizedCurrency.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-ink-500">
                          Bal: {inv.currency} {inv.balanceRealizationCurrency.toLocaleString()}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            title="View Commercial Invoice"
                            className="p-1.5 text-ink-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Realization Modal */}
      <RealizationModal
        isOpen={realizationTarget !== null}
        onClose={() => setRealizationTarget(null)}
        invoice={realizationTarget}
      />

      {/* View Commercial Invoice Modal (Printable) */}
      <Modal
        isOpen={selectedInvoice !== null}
        onClose={() => setSelectedInvoice(null)}
        title={`Commercial Export Invoice — ${selectedInvoice?.invoiceNo}`}
        subtitle="Official export documentation and packing breakdown"
        maxWidth="max-w-4xl"
      >
        {selectedInvoice && (
          <div className="space-y-6 text-xs text-ink-900 print:text-black">
            {/* Action Bar for Invoice */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="font-mono text-xs text-ink-500">Document Date: {selectedInvoice.invoiceDate}</span>
              <button
                onClick={triggerPrint}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Commercial Invoice</span>
              </button>
            </div>

            {/* Invoice Header Details */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50/70 rounded-2xl border border-gray-200">
              <div>
                <span className="text-[10px] font-bold text-ink-500 uppercase block">Exporter / Shipper</span>
                <span className="text-sm font-extrabold text-ink-900 block mt-0.5">
                  {businessSettings.businessName}
                </span>
                <span className="text-[11px] text-ink-600 block">{businessSettings.address}</span>
                <span className="text-[10px] text-ink-500 block mt-1">
                  GSTIN: {businessSettings.gstin || '32AABCS1429B1Z2'} · PAN: {businessSettings.pan || 'AABCS1429B'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-ink-500 uppercase block">Consignee</span>
                <span className="text-sm font-extrabold text-ink-900 block mt-0.5">
                  {customerMap.get(selectedInvoice.consigneeId)?.name}
                </span>
                <span className="text-[11px] text-ink-600 block">
                  {customerMap.get(selectedInvoice.consigneeId)?.address}
                </span>
                <span className="text-[10px] text-ink-500 block mt-1">
                  Country: {customerMap.get(selectedInvoice.consigneeId)?.country} · Tax ID:{' '}
                  {customerMap.get(selectedInvoice.consigneeId)?.taxId || 'N/A'}
                </span>
              </div>
            </div>

            {/* Shipping & Shipment Meta */}
            <div className="grid grid-cols-4 gap-3 p-3 bg-white rounded-xl border border-gray-200 text-xs">
              <div>
                <span className="text-ink-500 text-[10px] block font-medium">Port of Loading (POL)</span>
                <span className="font-bold text-ink-900 block mt-0.5">
                  {portMap.get(selectedInvoice.portOfLoadingId)?.name}
                </span>
              </div>
              <div>
                <span className="text-ink-500 text-[10px] block font-medium">Port of Discharge (POD)</span>
                <span className="font-bold text-ink-900 block mt-0.5">
                  {portMap.get(selectedInvoice.portOfDischargeId)?.name}
                </span>
              </div>
              <div>
                <span className="text-ink-500 text-[10px] block font-medium">Final Destination</span>
                <span className="font-bold text-ink-900 block mt-0.5">
                  {portMap.get(selectedInvoice.finalDestinationId)?.name}
                </span>
              </div>
              <div>
                <span className="text-ink-500 text-[10px] block font-medium">Order / PO No</span>
                <span className="font-bold text-ink-900 block mt-0.5">
                  {selectedInvoice.orderNo || 'Open Contract'}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2 px-3">Description of Goods</th>
                    <th className="py-2 px-3">HS Code</th>
                    <th className="py-2 px-3">Size / Count</th>
                    <th className="py-2 px-3 text-right">Cartons</th>
                    <th className="py-2 px-3 text-right">Net Wt (Kg)</th>
                    <th className="py-2 px-3 text-right">Rate ({selectedInvoice.currency})</th>
                    <th className="py-2 px-3 text-right">Amount ({selectedInvoice.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {selectedInvoice.lineItems.map((line, idx) => (
                    <tr key={line.id || idx}>
                      <td className="py-2 px-3 font-bold text-ink-900">
                        {speciesMap.get(line.speciesId)?.name || 'Marine Seafood'}
                        {speciesMap.get(line.speciesId)?.productForm && (
                          <span className="block text-[10px] text-ink-500 font-normal">
                            {speciesMap.get(line.speciesId)?.productForm}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-ink-600">{line.hsCode}</td>
                      <td className="py-2 px-3">
                        {sizeMap.get(line.sizeId)?.name || 'Standard'}
                        {line.countId && (
                          <span className="text-ink-500 text-[10px] ml-1">({countMap.get(line.countId)?.name})</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">{line.cartonsCount}</td>
                      <td className="py-2 px-3 text-right font-bold">{formatKg(line.weightKg)}</td>
                      <td className="py-2 px-3 text-right font-semibold">
                        ${line.ratePerKg.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-extrabold text-ink-900">
                        ${line.amountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold border-t border-gray-200">
                    <td colSpan={3} className="py-2 px-3 uppercase text-[11px]">
                      Total Export Consignment
                    </td>
                    <td className="py-2 px-3 text-right">{selectedInvoice.totalCartons} ctn</td>
                    <td className="py-2 px-3 text-right">{formatKg(selectedInvoice.totalWeightKg)}</td>
                    <td className="py-2 px-3 text-right text-[10px] text-ink-500">Total CIF/FOB</td>
                    <td className="py-2 px-3 text-right font-extrabold text-rose-950 text-sm">
                      {selectedInvoice.currency} {selectedInvoice.totalAmountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Banking & Realization Status Strip */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-ink-500 block">Bank Realization Status:</span>
                <span className={`inline-block font-bold mt-0.5 px-2 py-0.5 rounded-md border text-xs ${getStatusBadge(selectedInvoice.realizationStatus)}`}>
                  {selectedInvoice.realizationStatus} · Realized: ${selectedInvoice.totalRealizedCurrency.toLocaleString()} (₹{selectedInvoice.totalRealizedINR.toLocaleString()})
                </span>
              </div>
              <div className="text-right">
                <span className="text-ink-500 block">Outstanding Remittance:</span>
                <span className="font-extrabold text-rose-700 text-sm">
                  ${selectedInvoice.balanceRealizationCurrency.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

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
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold outline-none focus:border-rose-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Order / PO Reference</label>
            <input
              type="text"
              value={editForm.orderNo}
              onChange={(e) => setEditForm({ ...editForm, orderNo: e.target.value })}
              placeholder="e.g. PO-88231"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-rose-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Booking Exchange Rate (INR / USD)</label>
            <input
              type="number"
              step="0.0001"
              value={editForm.exchangeRate}
              onChange={(e) => setEditForm({ ...editForm, exchangeRate: parseFloat(e.target.value) || 84.5 })}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-rose-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Remarks &amp; Container #</label>
            <input
              type="text"
              value={editForm.remarks}
              onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-rose-600"
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
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium outline-none focus:border-rose-600"
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
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition"
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
              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-rose-600"
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
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition"
            >
              Permanently Purge Record
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
