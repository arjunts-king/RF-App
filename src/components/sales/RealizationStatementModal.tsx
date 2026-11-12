import React from 'react';
import { SalesInvoice, BusinessSettings, BankAccount } from '../../types';
import { formatINR } from '../../utils/calculations';
import { getSettledInvoiceShortfallBreakdown } from '../../utils/collectionAnalysis';
import { formatDDMMYYYY } from '../../utils/exportWordInvoice';
import { exportRealizationToWord } from '../../utils/exportRealizationStatement';
import {
  FileText,
  Printer,
  X,
  CheckCircle2,
  Receipt,
  ShieldCheck,
  CreditCard,
  Layers
} from 'lucide-react';

function formatRate(rate?: number): string {
  if (rate === undefined || rate === null || rate === 0) return '84.50';
  const str = String(rate);
  const parts = str.split('.');
  if (parts.length === 1) return `${parts[0]}.00`;
  if (parts[1].length < 2) return `${parts[0]}.${parts[1].padEnd(2, '0')}`;
  return str;
}

export interface RealizationStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SalesInvoice | null;
  settings?: BusinessSettings;
  bankAccounts?: BankAccount[];
  onOpenFull?: () => void;
}

export const RealizationStatementModal: React.FC<RealizationStatementModalProps> = ({
  isOpen,
  onClose,
  invoice,
  settings,
  bankAccounts = [],
  onOpenFull
}) => {
  if (!isOpen || !invoice) return null;

  const todayStr = formatDDMMYYYY(new Date().toISOString().split('T')[0]);
  const invoiceDateStr = formatDDMMYYYY(invoice.invoiceDate);

  const companyName = settings?.businessName || invoice.exporterName || 'SEAFOOD EXPORTS INDIA PVT LTD';
  const companyAddress = settings?.address || invoice.exporterAddress || 'Kochi, Kerala, India';

  // Bank rates
  const bankRate = invoice.bankPreDeterminedExchangeRate || invoice.exchangeRate || 84.50;
  const advRate = invoice.advanceExchangeRate || bankRate;
  const balRate = invoice.balanceExchangeRate || bankRate;
  const avgRate = invoice.averageRealizedExchangeRate || bankRate;

  // Financial figures
  const totalInvoicedUSD = Number(invoice.totalAmountCurrency || 0);
  const totalInvoicedINR = Number(
    invoice.estimatedAmountINR || totalInvoicedUSD * (invoice.bankPreDeterminedExchangeRate || invoice.exchangeRate || 84.50)
  );

  // Advance Leg
  const advTermsUSD = Number(
    invoice.advanceTermsUSD !== undefined ? invoice.advanceTermsUSD : (invoice.advanceReceivedCurrency || 0)
  );
  const advReceivedUSD = Number(invoice.advanceReceivedCurrency || 0);
  const advReceivedINR = Number(invoice.advanceReceivedINR || advReceivedUSD * advRate);
  const advReceivedDate = formatDDMMYYYY(invoice.advanceReceivedDate) || (advReceivedUSD > 0 ? 'Recorded' : 'Pending');
  const advBankRef = invoice.advanceBankRef || '—';

  // Balance Leg
  const balPriceUSD = Number(
    invoice.balanceActualPriceUSD !== undefined
      ? invoice.balanceActualPriceUSD
      : Math.max(0, totalInvoicedUSD - advTermsUSD)
  );
  const balReceivedUSD = Number(invoice.balancePaymentAmountCurrency || 0);
  const balReceivedINR = Number(invoice.balancePaymentINR || balReceivedUSD * balRate);
  const balReceivedDate = formatDDMMYYYY(invoice.balancePaymentDate) || (balReceivedUSD > 0 ? 'Recorded' : 'Awaiting Wire');
  const balBankRef = invoice.balanceBankRef || '—';

  // Totals & Settled-Only Shortfall (unsettled / advance-only keeps remaining as unrealized balance)
  const totalRealizedUSD = Number(
    invoice.totalRealizedCurrency !== undefined ? invoice.totalRealizedCurrency : advReceivedUSD + balReceivedUSD
  );
  const totalRealizedINR = Number(
    invoice.totalRealizedINR !== undefined ? invoice.totalRealizedINR : advReceivedINR + balReceivedINR
  );
  const shortfallBreakdown = getSettledInvoiceShortfallBreakdown(invoice);
  const isFullyRealized = shortfallBreakdown.isSettled;
  const advShortfallUSD = shortfallBreakdown.advShortfallUSD;
  const balShortfallUSD = shortfallBreakdown.balShortfallUSD;
  const totalShortfallUSD = shortfallBreakdown.totalShortfallUSD;
  const balanceOutstandingUSD = shortfallBreakdown.unrealizedBalanceUSD;

  // Commercial particulars
  const buyerName = invoice.buyerName && invoice.buyerName !== invoice.consigneeName ? invoice.buyerName : 'Same as Consignee';
  const orderRef = invoice.orderNo ? (invoice.orderNo.toUpperCase().startsWith('PI') ? '' : 'PI NO: ') + invoice.orderNo : (invoice.salesOrderNo || 'N.A.');
  const portOfLoading = invoice.portOfLoading || 'Cochin Port, India';
  const destination = invoice.finalDestination || invoice.portOfDischarge || 'OVERSEAS PORT';

  // Selected Bank Account
  const targetAccId = invoice.realizations?.find((r) => r.bankAccountId)?.bankAccountId;
  const targetBank = (bankAccounts.find((b) => b.id === targetAccId) || bankAccounts[0]) as any;
  const bankName = targetBank?.bankName || targetBank?.bank || targetBank?.name || 'State Bank of India';
  const bankAccNo = targetBank?.accountNumber || targetBank?.code || 'Primary Forex EEFC / Export Current A/c';
  const bankBranch = targetBank?.branch || (targetBank?.ifscCode ? `IFSC: ${targetBank.ifscCode}` : 'Commercial Overseas Branch');

  const handleDownloadWord = async () => {
    try {
      await exportRealizationToWord(invoice, settings, targetBank);
    } catch (err: any) {
      alert(`Export error: ${err.message || 'Unknown error'}`);
    }
  };

  const handlePrintPDF = () => {
    const originalTitle = document.title;
    document.title = `${invoice.invoiceNo}_Realization_Settlement`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in print:p-0 print:bg-white print:static">
      <div className="bg-ink-900/40 fixed inset-0" onClick={onClose} />

      <div className="relative bg-neutral-100 rounded-2xl shadow-2xl max-w-5xl w-full my-6 overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:rounded-none print:bg-white print:my-0 print:border-none">
        {/* Top Control Toolbar (Hidden in print) */}
        <div className="bg-white px-5 py-3.5 border-b border-gray-200 flex items-center justify-between shrink-0 print:hidden shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs text-ink-900">Realization &amp; Settlement Statement (A4)</h3>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-1 ${
                    isFullyRealized
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : totalRealizedUSD > 0
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {isFullyRealized ? 'Fully Realized' : totalRealizedUSD > 0 ? 'Partially Realized' : 'Not Realized'}
                </span>
              </div>
              <p className="text-[11px] text-ink-500">
                Invoice: <strong>{invoice.invoiceNo}</strong> · Download in Word (.docx) or PDF (A4)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenFull && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFull();
                }}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Download or View Full Realization Statement across all invoices"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Full Statement</span>
              </button>
            )}
            <button
              onClick={handleDownloadWord}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Download editable Microsoft Word document (.docx)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Word (.docx)</span>
            </button>
            <button
              onClick={handlePrintPDF}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Print or Save as PDF in exact A4 portrait format"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Download PDF (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-ink-400 hover:text-ink-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Container Body */}
        <div className="overflow-y-auto p-4 sm:p-8 flex-1 bg-neutral-200/60 print:p-0 print:bg-white print:overflow-visible">
          {/* Simulated A4 Sheet */}
          <div
            id="realization-statement-printable"
            className="max-w-[850px] mx-auto bg-white p-6 sm:p-10 shadow-xl rounded-sm border border-gray-300 font-sans text-[11px] leading-tight text-ink-900 print:p-0 print:shadow-none print:border-none print:max-w-none space-y-4"
          >
            {/* DOCUMENT HEADER BANNER */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 rounded-xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 block mb-0.5">
                  Foreign Currency Inward Remittance Certificate
                </span>
                <h1 className="text-base sm:text-lg font-black tracking-wide">
                  EXPORT REALIZATION &amp; SETTLEMENT STATEMENT
                </h1>
                <p className="text-xs text-slate-300 font-medium mt-1">
                  {companyName} · {companyAddress}
                </p>
              </div>

              <div className="sm:text-right shrink-0 bg-white/10 px-3.5 py-2.5 rounded-lg border border-white/10 backdrop-blur-xs">
                <div className="text-[10px] text-slate-300 font-medium">INVOICE NUMBER</div>
                <div className="text-sm font-black font-mono text-white tracking-wider">{invoice.invoiceNo}</div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  Date: <span className="text-white font-semibold">{invoiceDateStr}</span>
                </div>
              </div>
            </div>

            {/* TOP 4 EXECUTIVE KPI CHIPS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Invoiced</span>
                <span className="text-sm sm:text-base font-black text-slate-950 block mt-0.5 tabular-nums">
                  ${totalInvoicedUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-600 font-semibold block mt-0.5">
                  {formatINR(totalInvoicedINR)}
                </span>
              </div>

              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 shadow-2xs">
                <span className="text-[10px] font-bold text-blue-700 uppercase block">Advance Realized</span>
                <span className="text-sm sm:text-base font-black text-blue-900 block mt-0.5 tabular-nums">
                  ${advReceivedUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-blue-700 font-semibold block mt-0.5">
                  {formatINR(advReceivedINR)} · ₹{formatRate(advRate)}
                </span>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Balance Realized</span>
                <span className="text-sm sm:text-base font-black text-emerald-950 block mt-0.5 tabular-nums">
                  ${balReceivedUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                  {formatINR(balReceivedINR)} · ₹{formatRate(balRate)}
                </span>
              </div>

              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 shadow-2xs">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Shortfall / Wire Fees</span>
                <span className="text-sm sm:text-base font-black text-amber-900 block mt-0.5 tabular-nums">
                  -${totalShortfallUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-amber-800 font-bold block mt-0.5">
                  {isFullyRealized ? 'Fully Cleared (0.00 Bal)' : `Unsettled: $${balanceOutstandingUSD.toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* SECTION 1: COMMERCIAL SHIPMENT & BUYER PARTICULARS */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-100 px-3.5 py-1.5 border-b border-slate-200 font-bold text-[11px] text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span>1. Commercial Shipment &amp; Buyer Particulars</span>
                <span className="text-[10px] text-slate-500 font-normal">Export Verification</span>
              </div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Consignee Name:</span>
                  <span className="font-bold text-slate-900 text-right">{invoice.consigneeName || 'N.A.'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Country of Destination:</span>
                  <span className="font-bold text-slate-900 text-right">{invoice.countryOfDestination || 'OVERSEAS'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Buyer (if other than consignee):</span>
                  <span className="font-bold text-slate-900 text-right">{buyerName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Buyer Order / PI Ref &amp; Date:</span>
                  <span className="font-bold text-slate-900 text-right">{orderRef}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Port of Loading:</span>
                  <span className="font-bold text-slate-900 text-right">{portOfLoading}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Final Destination:</span>
                  <span className="font-bold text-slate-900 text-right">{destination}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Total Net Weight &amp; Cartons:</span>
                  <span className="font-bold text-slate-900 text-right">
                    {invoice.totalWeightKg ? invoice.totalWeightKg.toFixed(3) + ' Kgs' : '—'} / {invoice.totalCartons || '—'} Cartons
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Price Terms &amp; Payment Terms:</span>
                  <span className="font-bold text-slate-900 text-right">
                    {invoice.priceTerms || 'FOB'} / {invoice.termsOfPayment || 'DP / TT'}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 2: FORWARD EXCHANGE RATES MATRIX */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-100 px-3.5 py-1.5 border-b border-slate-200 font-bold text-[11px] text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span>2. Agreed Bank Forward Exchange Rates</span>
                <span className="text-[10px] text-slate-500 font-normal">Pre-Determined Hedging Contracts</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-200 text-center bg-slate-50/50">
                <div className="p-2.5">
                  <span className="text-[10px] text-slate-500 font-medium block">Pre-Determined Bank Rate</span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono block mt-0.5">
                    ₹{formatRate(bankRate)}
                  </span>
                </div>
                <div className="p-2.5 bg-blue-50/40">
                  <span className="text-[10px] text-blue-700 font-medium block">Advance Forward Rate</span>
                  <span className="text-xs sm:text-sm font-extrabold text-blue-900 font-mono block mt-0.5">
                    ₹{formatRate(advRate)}
                  </span>
                </div>
                <div className="p-2.5 bg-emerald-50/40">
                  <span className="text-[10px] text-emerald-700 font-medium block">Balance Forward Rate</span>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-900 font-mono block mt-0.5">
                    ₹{formatRate(balRate)}
                  </span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] text-slate-500 font-medium block">Weighted Average Realized</span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono block mt-0.5">
                    ₹{formatRate(avgRate)}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 3: DUAL-LEG SETTLEMENT BREAKDOWN TABLE */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-100 px-3.5 py-1.5 border-b border-slate-200 font-bold text-[11px] text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span>3. Dual-Leg Settlement Breakdown (Advance &amp; Balance Remittances)</span>
                <span className="text-[10px] text-slate-500 font-normal">Foreign Currency Inward Remittance</span>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-200/80 text-[10px] font-bold text-slate-700 uppercase border-b border-slate-200">
                    <th className="py-2 px-3">Settlement Stage</th>
                    <th className="py-2 px-3 text-right">Contract Terms ($)</th>
                    <th className="py-2 px-3 text-right">Actual Credited ($)</th>
                    <th className="py-2 px-3 text-center">Receipt Date</th>
                    <th className="py-2 px-3 text-center">Rate</th>
                    <th className="py-2 px-3 text-right">Realized INR (₹)</th>
                    <th className="py-2 px-3 text-right">Wire Shortfall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-[11px]">
                  {/* Advance Row */}
                  <tr className="bg-blue-50/30">
                    <td className="py-2 px-3">
                      <div className="font-bold text-blue-900">Advance Payment Leg</div>
                      <div className="text-[10px] text-slate-500 font-mono">Ref: {advBankRef}</div>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-900">
                      ${advTermsUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-blue-800">
                      ${advReceivedUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-700 font-medium">
                      {advReceivedDate}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                      ₹{formatRate(advRate)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-900">
                      {formatINR(advReceivedINR)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-amber-700">
                      {advShortfallUSD > 0 ? `-$${advShortfallUSD.toFixed(2)}` : '—'}
                    </td>
                  </tr>

                  {/* Balance Row */}
                  <tr className="bg-emerald-50/30">
                    <td className="py-2 px-3">
                      <div className="font-bold text-emerald-950">Balance Payment Leg</div>
                      <div className="text-[10px] text-slate-500 font-mono">Ref: {balBankRef}</div>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-900">
                      ${balPriceUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-emerald-800">
                      ${balReceivedUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-700 font-medium">
                      {balReceivedDate}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                      ₹{formatRate(balRate)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-900">
                      {formatINR(balReceivedINR)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-amber-700">
                      {balShortfallUSD > 0 ? `-$${balShortfallUSD.toFixed(2)}` : '—'}
                    </td>
                  </tr>

                  {/* Summary Totals Row */}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <td className="py-2 px-3 text-slate-950 tracking-wider uppercase text-[10px]">
                      TOTAL REALIZED PROCEEDS
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-900">
                      ${totalInvoicedUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-emerald-800 text-xs">
                      ${totalRealizedUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-500">—</td>
                    <td className="py-2 px-3 text-center font-mono text-slate-900">
                      ₹{formatRate(avgRate)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-950 text-xs">
                      {formatINR(totalRealizedINR)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-amber-800 font-bold">
                      {totalShortfallUSD > 0 ? `-$${totalShortfallUSD.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SECTION 4 & 5: RECONCILIATION SUMMARY & BANK ROUTING */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Beneficiary Bank Account Details */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-xs">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Beneficiary Receiving Bank Account</span>
                </div>
                <div className="pt-1 text-xs">
                  <div className="font-bold text-slate-900">{bankName}</div>
                  <div className="text-slate-600 font-mono mt-0.5">
                    A/C: {bankAccNo}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Branch: {bankBranch}
                  </div>
                </div>
              </div>

              {/* Statutory Reconciliation */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 shadow-2xs space-y-1 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="font-bold text-slate-900">Statutory Settlement Tie-Out</span>
                  <span
                    className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded ${
                      isFullyRealized ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isFullyRealized ? '100% Settled' : 'Unsettled'}
                  </span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-600">Total Invoiced Amount:</span>
                  <span className="font-bold text-slate-900">
                    ${totalInvoicedUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Realized Proceeds:</span>
                  <span className="font-bold text-emerald-700">
                    ${totalRealizedUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Bank Wire Fees / Deductions:</span>
                  <span className="font-bold text-amber-700">
                    -${totalShortfallUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                  <span className="text-slate-800">Net Outstanding Receivables:</span>
                  <span className={isFullyRealized ? 'text-emerald-700' : 'text-rose-700 font-mono'}>
                    ${balanceOutstandingUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 6: DECLARATION & AUTHORIZED SIGNATORY */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div className="sm:col-span-2 text-[10px] text-slate-600 leading-normal space-y-1">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Statutory Export Audit &amp; Remittance Certification</span>
                </div>
                <p>
                  We hereby certify and confirm that the particulars furnished above represent the authentic foreign
                  currency inward remittances received through Authorized Dealer banking channels against the subject
                  commercial export invoice, in full conformity with the respective FIRCs, advice notices, and statutory EDPMS
                  settlement records.
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
    </div>
  );
};
