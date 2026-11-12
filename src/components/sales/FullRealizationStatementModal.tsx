import React, { useState, useMemo } from 'react';
import { SalesInvoice, BusinessSettings, BankAccount } from '../../types';
import { formatINR } from '../../utils/calculations';
import { formatDDMMYYYY } from '../../utils/exportWordInvoice';
import { exportFullRealizationToWord } from '../../utils/exportRealizationStatement';
import { getSettledInvoiceShortfallBreakdown } from '../../utils/collectionAnalysis';
import {
  FileText,
  Printer,
  X,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Search,
  Filter,
  Layers,
  FileDown
} from 'lucide-react';

function formatUSD(num?: number): string {
  const n = Number(num || 0);
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRate(rate?: number): string {
  if (rate === undefined || rate === null || rate === 0) return '84.50';
  const str = String(rate);
  const parts = str.split('.');
  if (parts.length === 1) return `${parts[0]}.00`;
  if (parts[1].length < 2) return `${parts[0]}.${parts[1].padEnd(2, '0')}`;
  return str;
}

export interface FullRealizationStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: SalesInvoice[];
  settings?: BusinessSettings;
  bankAccounts?: BankAccount[];
}

export const FullRealizationStatementModal: React.FC<FullRealizationStatementModalProps> = ({
  isOpen,
  onClose,
  invoices,
  settings,
  bankAccounts = []
}) => {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'fully' | 'partial' | 'not-realized' | 'shortfall'>('all');

  const todayStr = formatDDMMYYYY(new Date().toISOString().split('T')[0]);
  const companyName = settings?.businessName || 'SEAFOOD EXPORTS INDIA PVT LTD';
  const companyAddress = settings?.address || 'Kochi, Kerala, India';

  const activeInvoices = useMemo(() => invoices.filter((inv) => !inv.isVoided), [invoices]);

  // Financial aggregates
  const totalInvoicedUSD = activeInvoices.reduce((s, inv) => s + (inv.totalAmountCurrency || 0), 0);
  const totalInvoicedINR = activeInvoices.reduce(
    (s, inv) =>
      s +
      (inv.estimatedAmountINR ||
        (inv.totalAmountCurrency || 0) * (inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5)),
    0
  );

  const totalAdvUSD = activeInvoices.reduce((s, inv) => s + (inv.advanceReceivedCurrency || 0), 0);
  const totalAdvINR = activeInvoices.reduce(
    (s, inv) =>
      s +
      (inv.advanceReceivedINR ||
        (inv.advanceReceivedCurrency || 0) *
          (inv.advanceExchangeRate || inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5)),
    0
  );

  const totalBalUSD = activeInvoices.reduce((s, inv) => s + (inv.balancePaymentAmountCurrency || 0), 0);
  const totalBalINR = activeInvoices.reduce(
    (s, inv) =>
      s +
      (inv.balancePaymentINR ||
        (inv.balancePaymentAmountCurrency || 0) *
          (inv.balanceExchangeRate || inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5)),
    0
  );

  const totalRealizedUSD = activeInvoices.reduce(
    (s, inv) =>
      s +
      (inv.totalRealizedCurrency !== undefined
        ? inv.totalRealizedCurrency
        : (inv.advanceReceivedCurrency || 0) + (inv.balancePaymentAmountCurrency || 0)),
    0
  );
  const totalRealizedINR = activeInvoices.reduce(
    (s, inv) =>
      s +
      (inv.totalRealizedINR !== undefined
        ? inv.totalRealizedINR
        : (inv.advanceReceivedINR || 0) + (inv.balancePaymentINR || 0)),
    0
  );

  const totalShortfallUSD = activeInvoices.reduce((s, inv) => s + getSettledInvoiceShortfallBreakdown(inv).totalShortfallUSD, 0);
  const totalUnrealizedUSD = activeInvoices.reduce((s, inv) => s + getSettledInvoiceShortfallBreakdown(inv).unrealizedBalanceUSD, 0);

  const fullyRealizedCount = activeInvoices.filter(
    (i) => getSettledInvoiceShortfallBreakdown(i).isSettled
  ).length;
  const partiallyRealizedCount = activeInvoices.filter(
    (i) => !getSettledInvoiceShortfallBreakdown(i).isSettled && (i.totalRealizedCurrency || 0) > 0
  ).length;
  const notRealizedCount = activeInvoices.filter(
    (i) => !getSettledInvoiceShortfallBreakdown(i).isSettled && (i.totalRealizedCurrency || 0) <= 0
  ).length;
  const shortfallCount = activeInvoices.filter((i) => getSettledInvoiceShortfallBreakdown(i).totalShortfallUSD > 0).length;

  const overallProgressPct =
    totalInvoicedUSD > 0
      ? Math.min(100, Math.round(((totalRealizedUSD + totalShortfallUSD) / totalInvoicedUSD) * 100))
      : 100;

  // Beneficiary Receiving Bank
  const targetBank = bankAccounts[0] as any;
  const bankName = targetBank?.bankName || targetBank?.bank || targetBank?.name || 'State Bank of India';
  const bankAccNo = targetBank?.accountNumber || targetBank?.code || 'Primary Forex EEFC / Export Current A/c';
  const bankBranch =
    targetBank?.branch || targetBank?.ifscCode
      ? `${targetBank.branch || ''} (IFSC: ${targetBank.ifscCode || 'N.A.'})`
      : 'Commercial Overseas Branch';

  // Filtered rows for interactive display (print will print all active invoices or filtered based on selection)
  const displayInvoices = useMemo(() => {
    return activeInvoices.filter((inv) => {
      if (statusFilter === 'fully') {
        const isFull = inv.realizationStatus === 'Fully Realized' || (inv.balanceRealizationCurrency || 0) <= 0.05;
        if (!isFull) return false;
      } else if (statusFilter === 'partial') {
        if (inv.realizationStatus !== 'Partially Realized') return false;
      } else if (statusFilter === 'not-realized') {
        const isNot = inv.realizationStatus === 'Not Realized' || !inv.realizationStatus;
        if (!isNot) return false;
      } else if (statusFilter === 'shortfall') {
        if (getSettledInvoiceShortfallBreakdown(inv).totalShortfallUSD <= 0) return false;
      }

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchNo = inv.invoiceNo.toLowerCase().includes(q);
        const matchCust = (inv.consigneeName || '').toLowerCase().includes(q);
        const matchDest = (inv.countryOfDestination || inv.finalDestination || '').toLowerCase().includes(q);
        const matchAdv = (inv.advanceBankRef || '').toLowerCase().includes(q);
        const matchBal = (inv.balanceBankRef || '').toLowerCase().includes(q);
        return matchNo || matchCust || matchDest || matchAdv || matchBal;
      }

      return true;
    });
  }, [activeInvoices, statusFilter, searchTerm]);

  const handleDownloadWord = async () => {
    try {
      await exportFullRealizationToWord(activeInvoices, settings, targetBank);
    } catch (err: any) {
      alert(`Export error: ${err.message || 'Unknown error'}`);
    }
  };

  const handlePrintPDF = () => {
    const originalTitle = document.title;
    const safeCompany = companyName.replace(/[^a-zA-Z0-9]/g, '_');
    document.title = `${safeCompany}_Full_Realization_Settlement_Statement`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in print:p-0 print:bg-white print:static">
      <div className="bg-ink-900/40 fixed inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-[1240px] my-4 max-h-[95vh] flex flex-col overflow-hidden z-10 print:max-h-none print:shadow-none print:border-none print:my-0 print:w-full print:max-w-none">
        {/* Top Floating Action Toolbar - Hidden on Print */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-2">
                <span>Comprehensive Export Realization &amp; Settlement Statement</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/20 font-mono">
                  {activeInvoices.length} Invoices
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Consolidated Master Foreign Currency Inward Remittance Reconciliation &amp; Statutory EDPMS Statement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadWord}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Download Full Statement in Word Document (.docx)"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-100" />
              <span>Download Word (.docx)</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Download or Print Full Statement in Colorful A4 PDF"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-100" />
              <span>Download PDF (A4)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Close Statement"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Search & Filter Sub-Bar - Hidden on Print */}
        <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoice no, consignee, FIRC ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" /> Filter:
            </span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              All ({activeInvoices.length})
            </button>
            <button
              onClick={() => setStatusFilter('fully')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                statusFilter === 'fully'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Fully Realized ({fullyRealizedCount})
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                statusFilter === 'partial'
                  ? 'bg-blue-700 text-white'
                  : 'bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100'
              }`}
            >
              Partial ({partiallyRealizedCount})
            </button>
            <button
              onClick={() => setStatusFilter('shortfall')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                statusFilter === 'shortfall'
                  ? 'bg-amber-700 text-white'
                  : 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100'
              }`}
            >
              Shortfall ({shortfallCount})
            </button>
          </div>
        </div>

        {/* Scrollable Printable Statement Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 print:p-0 print:overflow-visible font-sans text-slate-900">
          <style>{`
            @media print {
              @page {
                size: A4 landscape;
                margin: 8mm;
              }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-no-break {
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
          `}</style>

          {/* DOCUMENT HEADER BANNER */}
          <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-sm print:rounded-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-400 block">
                  Export Accounting &amp; Foreign Currency Inward Remittance Statement
                </span>
                <h1 className="text-lg sm:text-2xl font-black tracking-tight mt-0.5">
                  COMPREHENSIVE EXPORT SALES REALIZATION &amp; SETTLEMENT STATEMENT
                </h1>
                <p className="text-xs text-slate-300 mt-1">
                  Consolidated Master Foreign Currency Remittance Reconciliation &amp; Statutory EDPMS Settlement Register
                </p>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{overallProgressPct}% Realized</span>
                </span>
                <div className="text-[11px] text-slate-400 font-mono">Statement Date: {todayStr}</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Financial Year: {settings?.financialYear || '2026-2027'}
                </div>
              </div>
            </div>

            <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Exporter &amp; Manufacturer:</span>
                <div className="text-sm font-black text-white">{companyName}</div>
                <div className="text-[11px] text-slate-300">{companyAddress}</div>
                {settings?.gstin && (
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    GSTIN: {settings.gstin} {settings.pan && `· PAN: ${settings.pan}`}
                  </div>
                )}
              </div>

              <div className="sm:text-right space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Portfolio Scope:</span>
                <div className="font-bold text-white text-xs">{activeInvoices.length} Commercial Export Invoices</div>
                <div className="text-[11px] text-slate-300">
                  {fullyRealizedCount} Fully Realized · {partiallyRealizedCount} Partially Realized · {notRealizedCount} Not Realized
                </div>
                <div className="text-[10px] text-indigo-300 font-mono">
                  Foreign Bank Shortfall Deductions Accounted: {formatUSD(totalShortfallUSD)}
                </div>
              </div>
            </div>
          </div>

          {/* 6 EXECUTIVE PORTFOLIO SUMMARY STAT CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:grid-cols-6 print:gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-600 uppercase block">Total Invoiced</span>
              <span className="text-sm sm:text-base font-black text-slate-900 block mt-0.5 tabular-nums">
                {formatUSD(totalInvoicedUSD)}
              </span>
              <span className="text-[10px] text-slate-600 font-semibold block mt-0.5 truncate">
                {formatINR(totalInvoicedINR)}
              </span>
            </div>

            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-bold text-blue-700 uppercase block">Advance Realized</span>
              <span className="text-sm sm:text-base font-black text-blue-900 block mt-0.5 tabular-nums">
                {formatUSD(totalAdvUSD)}
              </span>
              <span className="text-[10px] text-blue-700 font-semibold block mt-0.5 truncate">
                {formatINR(totalAdvINR)}
              </span>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Balance Realized</span>
              <span className="text-sm sm:text-base font-black text-emerald-950 block mt-0.5 tabular-nums">
                {formatUSD(totalBalUSD)}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5 truncate">
                {formatINR(totalBalINR)}
              </span>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">Accounted Shortfall</span>
              <span className="text-sm sm:text-base font-black text-amber-900 block mt-0.5 tabular-nums">
                -{formatUSD(totalShortfallUSD)}
              </span>
              <span className="text-[10px] text-amber-800 font-bold block mt-0.5">
                {shortfallCount} Invoices with wire fees
              </span>
            </div>

            <div className="bg-emerald-100/70 border border-emerald-300 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Net Realized In India</span>
              <span className="text-sm sm:text-base font-black text-emerald-950 block mt-0.5 tabular-nums">
                {formatUSD(totalRealizedUSD)}
              </span>
              <span className="text-[10px] text-emerald-800 font-bold block mt-0.5 truncate">
                {formatINR(totalRealizedINR)}
              </span>
            </div>

            <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-bold text-rose-800 uppercase block">Pending Unrealized</span>
              <span className="text-sm sm:text-base font-black text-rose-900 block mt-0.5 tabular-nums">
                {formatUSD(totalUnrealizedUSD)}
              </span>
              <span className="text-[10px] text-rose-800 font-bold block mt-0.5">
                {totalUnrealizedUSD <= 0.05 ? '0.00 Bal (All Settled)' : 'Awaiting Foreign Wire'}
              </span>
            </div>
          </div>

          {/* CONSOLIDATED MASTER REMITTANCE RECONCILIATION TABLE */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 font-bold text-[11px] text-slate-800 uppercase tracking-wide flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>1. Consolidated Inward Remittances &amp; EDPMS Settlement Register</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal">
                Displaying {displayInvoices.length} of {activeInvoices.length} Invoices
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-[10px] font-bold text-white uppercase tracking-wider">
                    <th className="py-2.5 px-2 text-center w-8">#</th>
                    <th className="py-2.5 px-3">Invoice No &amp; Dt</th>
                    <th className="py-2.5 px-3">Consignee &amp; Destination</th>
                    <th className="py-2.5 px-3 text-right">Invoiced ($)</th>
                    <th className="py-2.5 px-3 text-right">Advance Received</th>
                    <th className="py-2.5 px-3 text-right">Balance Received</th>
                    <th className="py-2.5 px-3 text-right">Shortfall ($)</th>
                    <th className="py-2.5 px-3 text-right">Net Realized</th>
                    <th className="py-2.5 px-3 text-center">EDPMS Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayInvoices.map((inv, idx) => {
                    const invDate = formatDDMMYYYY(inv.invoiceDate);
                    const breakdown = getSettledInvoiceShortfallBreakdown(inv);
                    const isFullyRealized = breakdown.isSettled;
                    const statusText = isFullyRealized
                      ? 'Fully Realized'
                      : (inv.totalRealizedCurrency || 0) > 0
                      ? 'Partially Realized'
                      : 'Not Realized';
                    const statusClass = isFullyRealized
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : (inv.totalRealizedCurrency || 0) > 0
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-rose-100 text-rose-800 border-rose-200';

                    const advAmt = inv.advanceReceivedCurrency || 0;
                    const advRate = inv.advanceExchangeRate || inv.bankPreDeterminedExchangeRate || 84.5;
                    const balAmt = inv.balancePaymentAmountCurrency || 0;
                    const balRate = inv.balanceExchangeRate || inv.bankPreDeterminedExchangeRate || 84.5;
                    const shortfallAmt = breakdown.totalShortfallUSD;
                    const realizedUSD =
                      inv.totalRealizedCurrency !== undefined ? inv.totalRealizedCurrency : advAmt + balAmt;
                    const realizedINR =
                      inv.totalRealizedINR !== undefined ? inv.totalRealizedINR : advAmt * advRate + balAmt * balRate;

                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-indigo-50/20 transition ${idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}
                      >
                        <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-bold text-indigo-900 font-mono text-xs">{inv.invoiceNo}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Dt: {invDate}</div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 truncate max-w-[200px]" title={inv.consigneeName}>
                            {inv.consigneeName || 'OVERSEAS BUYER'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {inv.countryOfDestination || inv.finalDestination || 'OVERSEAS'}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="font-extrabold text-slate-900 tabular-nums">
                            {formatUSD(inv.totalAmountCurrency)}
                          </div>
                          <div className="text-[10px] text-slate-500 tabular-nums">
                            {formatINR(
                              inv.estimatedAmountINR ||
                                inv.totalAmountCurrency * (inv.bankPreDeterminedExchangeRate || 84.5)
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="font-extrabold text-blue-800 tabular-nums">{formatUSD(advAmt)}</div>
                          <div className="text-[10px] text-blue-600 font-mono">
                            ₹{formatRate(advRate)}
                            {inv.advanceBankRef ? ` · ${inv.advanceBankRef}` : ''}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="font-extrabold text-emerald-800 tabular-nums">{formatUSD(balAmt)}</div>
                          <div className="text-[10px] text-emerald-600 font-mono">
                            ₹{formatRate(balRate)}
                            {inv.balanceBankRef ? ` · ${inv.balanceBankRef}` : ''}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div
                            className={`font-bold tabular-nums ${
                              shortfallAmt > 0 ? 'text-amber-800 font-black' : 'text-slate-400'
                            }`}
                          >
                            {shortfallAmt > 0 ? `-${formatUSD(shortfallAmt)}` : '$0.00'}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="font-black text-emerald-900 tabular-nums">{formatUSD(realizedUSD)}</div>
                          <div className="text-[10px] text-emerald-700 font-semibold tabular-nums">
                            {formatINR(realizedINR)}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${statusClass}`}
                          >
                            {statusText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-900 text-xs">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 uppercase text-[11px] font-black tracking-wider text-slate-200">
                      Consolidated Portfolio Totals ({activeInvoices.length} Invoices)
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums text-white">
                      {formatUSD(totalInvoicedUSD)}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums text-blue-300">
                      {formatUSD(totalAdvUSD)}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums text-emerald-300">
                      {formatUSD(totalBalUSD)}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums text-amber-300">
                      -{formatUSD(totalShortfallUSD)}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums text-emerald-300">
                      {formatUSD(totalRealizedUSD)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap text-emerald-400 font-black">
                      {overallProgressPct}% Settled
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* BENEFICIARY BANK ROUTING & STATUTORY TIE-OUT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print-no-break">
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-xs">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>2. Beneficiary Receiving Bank Account Details</span>
              </div>
              <div className="pt-1 text-xs">
                <div className="font-bold text-slate-900">{bankName}</div>
                <div className="text-slate-600 font-mono mt-0.5">A/C: {bankAccNo}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Branch: {bankBranch}</div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 shadow-2xs space-y-1.5 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="font-bold text-slate-900">Statutory Settlement Tie-Out</span>
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded bg-emerald-100 text-emerald-800">
                  {overallProgressPct}% Portfolio Settled
                </span>
              </div>
              <div className="space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Gross Export Invoiced Value:</span>
                  <span className="font-bold text-slate-900 tabular-nums">{formatUSD(totalInvoicedUSD)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Total Realized In India (Inward Wire):</span>
                  <span className="font-bold tabular-nums">+{formatUSD(totalRealizedUSD)}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Foreign Bank Wire Deductions:</span>
                  <span className="font-bold tabular-nums">-{formatUSD(totalShortfallUSD)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                  <span>Net Unrealized Receivables:</span>
                  <span className="tabular-nums">{formatUSD(totalUnrealizedUSD)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* STATUTORY DECLARATION & SIGNATORY BLOCK */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-4 items-center print-no-break">
            <div className="sm:col-span-2 text-[10px] text-slate-600 leading-normal space-y-1">
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. Statutory Remittance Certification &amp; EDPMS Declaration</span>
              </div>
              <p>
                We hereby certify and confirm that the particulars furnished in this Comprehensive Export Realization and
                Settlement Statement represent the authentic foreign currency inward remittances received through
                Authorized Dealer banking channels against all commercial export invoices, in strict reconciliation with
                respective FIRCs, credit advice intimations, and statutory EDPMS settlement records.
              </p>
            </div>

            <div className="text-center sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4 space-y-2">
              <div className="text-xs font-bold text-slate-900">For {companyName}</div>
              <div className="h-8"></div>
              <div className="text-[10px] text-slate-500 border-t border-slate-300 pt-1 inline-block px-3">
                Authorized Signatory / Finance Controller
              </div>
              <div className="text-[9px] text-slate-400 font-mono block">Date: {todayStr}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
