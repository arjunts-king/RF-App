import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { SalesInvoice } from '../../types';
import { formatINR, formatKg } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
import { BentoCard } from '../common/BentoCard';
import { StatusBadge } from '../common/StatusBadge';
import { RealizationModal } from './RealizationModal';
import { convertToCSV, downloadFile } from '../../utils/exportUtils';
import { exportInvoiceToWord } from '../../utils/exportWordInvoice';
import {
  Search,
  Download,
  BadgeDollarSign,
  Calendar,
  CheckCircle2,
  FileDown,
  Globe,
  Plus,
  ArrowRight
} from 'lucide-react';

export const SalesRealizationView: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { salesInvoices, customers, ports, businessSettings } = useData();
  const { permissions } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showVoided, setShowVoided] = useState(false);

  const [realizationTarget, setRealizationTarget] = useState<SalesInvoice | null>(null);

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

  // Aggregates
  const activeInvoices = salesInvoices.filter((inv) => !inv.isVoided);
  const totalInvoicedUSD = activeInvoices.reduce((s, inv) => s + inv.totalAmountCurrency, 0);
  const totalAdvanceUSD = activeInvoices.reduce((s, inv) => s + (inv.advanceReceivedCurrency || 0), 0);
  const totalAdvanceINR = activeInvoices.reduce((s, inv) => {
    const rate = inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5;
    return s + (inv.advanceReceivedINR || (inv.advanceReceivedCurrency || 0) * rate);
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

  // Export CSV with all 5 settlement parameters
  const handleExportCSV = () => {
    const exportData = filteredInvoices.map((inv) => {
      const consignee = customerMap.get(inv.consigneeId);
      const buyer = inv.buyerId ? customerMap.get(inv.buyerId) : consignee;
      const pod = portMap.get(inv.portOfDischargeId);
      const bankRate = inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5;
      const advUSD = inv.advanceReceivedCurrency || 0;
      const advINR = inv.advanceReceivedINR || Number((advUSD * bankRate).toFixed(2));
      const balUSD = inv.balancePaymentAmountCurrency || 0;
      const balINR = inv.balancePaymentINR || Number((balUSD * bankRate).toFixed(2));

      return {
        InvoiceNo: inv.invoiceNo,
        Date: inv.invoiceDate,
        Consignee: consignee?.name || '',
        Buyer: buyer?.name || '',
        Country: consignee?.country || '',
        POD: pod?.name || '',
        Currency: inv.currency,
        TotalAmount: inv.totalAmountCurrency,
        BankExchangeRate: bankRate,
        AdvanceReceivedUSD: advUSD,
        AdvanceDate: inv.advanceReceivedDate || '',
        AdvanceReceivedINR: advINR,
        AdvanceBankRef: inv.advanceBankRef || '',
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
      { key: 'BankExchangeRate', label: 'Exchange Rate (Pre-determined with Bank)' },
      { key: 'AdvanceReceivedUSD', label: 'Advance Received (USD)' },
      { key: 'AdvanceDate', label: 'Date of Receiving Advance' },
      { key: 'AdvanceReceivedINR', label: 'Advance Received (INR)' },
      { key: 'AdvanceBankRef', label: 'Advance Bank Ref / FIRC' },
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Figma Header Block */}
      <PageHeader
        title="Export realization & settlement register"
        subtitle="Manage advance payments received, balance remittances, bank receipt dates, and pre-determined bank exchange rates for all commercial invoices."
        breadcrumbs={['Sales', 'Settlement & Banking', 'Realization & Settlement']}
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
          ...(onNavigate
            ? [
                {
                  label: 'Invoices Register',
                  onClick: () => onNavigate('invoices'),
                  icon: ArrowRight
                }
              ]
            : []),
          {
            label: 'Export Settlement CSV',
            onClick: handleExportCSV,
            icon: Download
          }
        ]}
      />

      {/* Bento Settlement KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
          caption={totalUnrealizedUSD > 0 ? 'Pending foreign remittance' : 'All invoices fully settled'}
          variant={totalUnrealizedUSD > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Realization Guide Pill Banner */}
      <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-rose-900">
          <BadgeDollarSign className="w-4 h-4 text-rose-700 shrink-0" />
          <span className="font-semibold">
            Track five critical settlement variables for each invoice:
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-800">
            <span className="px-1.5 py-0.5 bg-white rounded border border-rose-200">1. Advance Received</span>
            <span className="px-1.5 py-0.5 bg-white rounded border border-rose-200">2. Date of Advance</span>
            <span className="px-1.5 py-0.5 bg-white rounded border border-rose-200">3. Balance Payment</span>
            <span className="px-1.5 py-0.5 bg-white rounded border border-rose-200">4. Date of Balance</span>
            <span className="px-1.5 py-0.5 bg-white rounded border border-rose-200">5. Pre-determined Bank Rate</span>
          </span>
        </div>
        <span className="text-[11px] text-rose-700 font-medium">Click the settlement button on any row to update.</span>
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
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase tracking-wider border-b border-gray-200">
                <th className="py-3 px-3">Invoice # &amp; Date</th>
                <th className="py-3 px-3">Consignee &amp; Buyer</th>
                <th className="py-3 px-3 text-right">Invoice Value</th>
                <th className="py-3 px-3 text-center bg-rose-50/40">Bank Rate</th>
                <th className="py-3 px-3 text-right bg-blue-50/40">Advance Received</th>
                <th className="py-3 px-3 bg-blue-50/40">Date of Advance</th>
                <th className="py-3 px-3 text-right bg-emerald-50/40">Balance Payment</th>
                <th className="py-3 px-3 bg-emerald-50/40">Date of Balance</th>
                <th className="py-3 px-3 text-right">Unrealized</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-ink-500">
                    <BadgeDollarSign className="w-8 h-8 mx-auto mb-2 text-ink-400" />
                    <p className="font-semibold text-sm text-ink-700">No export invoices match the selected criteria</p>
                    <p className="text-xs text-ink-500 mt-1">
                      Create a new commercial invoice or adjust your search filter above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const consignee = customerMap.get(inv.consigneeId);
                  const buyer = inv.buyerId ? customerMap.get(inv.buyerId) : consignee;
                  const bankRate = inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5;
                  const advUSD = inv.advanceReceivedCurrency || 0;
                  const advINR = inv.advanceReceivedINR || (advUSD > 0 ? Number((advUSD * bankRate).toFixed(2)) : 0);
                  const balUSD = inv.balancePaymentAmountCurrency || 0;
                  const balINR = inv.balancePaymentINR || (balUSD > 0 ? Number((balUSD * bankRate).toFixed(2)) : 0);

                  const advPct = inv.totalAmountCurrency > 0 ? ((advUSD / inv.totalAmountCurrency) * 100).toFixed(0) : '0';

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-rose-50/25 transition-colors ${
                        inv.isVoided ? 'bg-rose-50/40 text-ink-400' : ''
                      }`}
                    >
                      {/* Invoice No & Date */}
                      <td className="py-3 px-3">
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
                      <td className="py-3 px-3 max-w-[200px]">
                        <div className="font-bold text-ink-900 truncate">
                          {consignee?.name || 'Unknown Consignee'}
                        </div>
                        <div className="text-[10px] text-ink-500 flex items-center gap-1 mt-0.5">
                          <Globe className="w-3 h-3 text-ink-400 shrink-0" />
                          <span>{consignee?.country || 'Export'}</span>
                          {buyer && buyer.id !== consignee?.id && (
                            <span className="text-ink-400">· Buyer: {buyer.name}</span>
                          )}
                        </div>
                      </td>

                      {/* Total Invoiced Value */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-black text-ink-950 tabular-nums">
                          {inv.currency} {inv.totalAmountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-ink-500 font-medium tabular-nums">
                          {formatKg(inv.totalWeightKg)}
                        </div>
                      </td>

                      {/* Pre-determined Bank Exchange Rate */}
                      <td className="py-3 px-3 text-center bg-rose-50/30">
                        <span className="inline-block px-2.5 py-1 bg-white border border-rose-300 rounded-lg font-mono font-extrabold text-rose-800 text-xs shadow-2xs">
                          ₹{bankRate.toFixed(2)}
                        </span>
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-rose-700 mt-0.5">
                          Bank Booked
                        </span>
                      </td>

                      {/* Advance Received */}
                      <td className="py-3 px-3 text-right bg-blue-50/30">
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
                      <td className="py-3 px-3 bg-blue-50/30 whitespace-nowrap">
                        {inv.advanceReceivedDate ? (
                          <div className="flex items-center gap-1 text-ink-800 font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{inv.advanceReceivedDate}</span>
                          </div>
                        ) : advUSD > 0 ? (
                          <span className="text-[11px] text-amber-700 font-medium">Date pending</span>
                        ) : (
                          <span className="text-[11px] text-ink-400">—</span>
                        )}
                        {inv.advanceBankRef && (
                          <div className="text-[9px] text-blue-600 font-mono truncate max-w-[110px]" title={inv.advanceBankRef}>
                            {inv.advanceBankRef}
                          </div>
                        )}
                      </td>

                      {/* Balance Payment Amount */}
                      <td className="py-3 px-3 text-right bg-emerald-50/30">
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
                      <td className="py-3 px-3 bg-emerald-50/30 whitespace-nowrap">
                        {inv.balancePaymentDate ? (
                          <div className="flex items-center gap-1 text-ink-800 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{inv.balancePaymentDate}</span>
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[10px] font-bold">
                            Awaiting wire
                          </span>
                        )}
                        {inv.balanceBankRef && (
                          <div className="text-[9px] text-emerald-700 font-mono truncate max-w-[110px]" title={inv.balanceBankRef}>
                            {inv.balanceBankRef}
                          </div>
                        )}
                      </td>

                      {/* Unrealized Balance */}
                      <td className="py-3 px-3 text-right">
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

                      {/* Action */}
                      <td className="py-3 px-3 text-center">
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

      {/* Realization & Settlement Modal */}
      {realizationTarget && (
        <RealizationModal
          isOpen={!!realizationTarget}
          onClose={() => setRealizationTarget(null)}
          invoice={realizationTarget}
        />
      )}
    </div>
  );
};
