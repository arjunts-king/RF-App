import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { SalesInvoice } from '../../types';
import { formatINR } from '../../utils/calculations';
import { computeOutstandingFromAdvance } from '../../utils/collectionAnalysis';
import {
  Calendar,
  Building,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Receipt,
  Sparkles,
  Save,
  Trash2
} from 'lucide-react';

interface RealizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SalesInvoice | null;
}

export const RealizationModal: React.FC<RealizationModalProps> = ({ isOpen, onClose, invoice }) => {
  const { bankAccounts, updateInvoiceSettlement, deleteInvoiceRealization } = useData();
  const { permissions } = useAuth();

  const today = new Date().toISOString().split('T')[0];

  // Pre-determined exchange rate with bank
  const [bankPreDeterminedExchangeRate, setBankPreDeterminedExchangeRate] = useState<string>('84.50');

  // Advance Payment
  const [advanceReceived, setAdvanceReceived] = useState<string>('');
  const [advanceReceivedDate, setAdvanceReceivedDate] = useState<string>('');
  const [advanceBankRef, setAdvanceBankRef] = useState<string>('');

  // Balance Payment
  const [balancePaymentAmount, setBalancePaymentAmount] = useState<string>('');
  const [balancePaymentDate, setBalancePaymentDate] = useState<string>('');
  const [balanceBankRef, setBalanceBankRef] = useState<string>('');

  // Bank & Notes
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync state whenever invoice changes
  useEffect(() => {
    if (invoice) {
      const initialBankRate = invoice.bankPreDeterminedExchangeRate || invoice.exchangeRate || 84.50;
      setBankPreDeterminedExchangeRate(String(initialBankRate));

      setAdvanceReceived(invoice.advanceReceivedCurrency ? String(invoice.advanceReceivedCurrency) : '');
      setAdvanceReceivedDate(invoice.advanceReceivedDate || '');
      setAdvanceBankRef(invoice.advanceBankRef || '');

      setBalancePaymentAmount(invoice.balancePaymentAmountCurrency ? String(invoice.balancePaymentAmountCurrency) : '');
      setBalancePaymentDate(invoice.balancePaymentDate || '');
      setBalanceBankRef(invoice.balanceBankRef || '');

      // Pick receiving bank account
      const firstRealizationAcc = invoice.realizations?.find((r) => r.bankAccountId)?.bankAccountId;
      setBankAccountId(firstRealizationAcc || bankAccounts[0]?.id || '');
      setNotes('');
    }
  }, [invoice, bankAccounts]);

  if (!invoice) return null;

  const currentBankRate = parseFloat(bankPreDeterminedExchangeRate) || 84.50;
  const currentAdvUSD = parseFloat(advanceReceived) || 0;
  const currentBalUSD = parseFloat(balancePaymentAmount) || 0;

  const currentAdvINR = currentAdvUSD * currentBankRate;
  const currentBalINR = currentBalUSD * currentBankRate;

  const outstandingAfterAdv = computeOutstandingFromAdvance(
    invoice.totalAmountCurrency,
    currentAdvUSD,
    currentBankRate
  );

  const totalSettledUSD = currentAdvUSD + currentBalUSD;
  const totalSettledINR = currentAdvINR + currentBalINR;
  const remainingUSD = Math.max(0, invoice.totalAmountCurrency - totalSettledUSD);

  const previewStatus =
    totalSettledUSD <= 0
      ? 'Not Realized'
      : remainingUSD <= 0.05 || totalSettledUSD >= invoice.totalAmountCurrency
      ? 'Fully Realized'
      : 'Partially Realized';

  const previewProgressPct = Math.min(100, Math.round((totalSettledUSD / (invoice.totalAmountCurrency || 1)) * 100));

  const handleFillFullBalance = () => {
    const unallocated = Math.max(0, Number((invoice.totalAmountCurrency - currentAdvUSD).toFixed(2)));
    setBalancePaymentAmount(String(unallocated));
    if (!balancePaymentDate) {
      setBalancePaymentDate(today);
    }
    if (!balanceBankRef) {
      setBalanceBankRef(`BAL-${invoice.invoiceNo}`);
    }
  };

  const handleSetAdvanceToday = () => {
    setAdvanceReceivedDate(today);
    if (!advanceBankRef) {
      setAdvanceBankRef(`ADV-${invoice.invoiceNo}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentBankRate <= 0) {
      alert('Please enter a valid pre-determined bank exchange rate.');
      return;
    }

    if (currentAdvUSD > 0 && !advanceReceivedDate) {
      alert('Please select the date of receiving the advance.');
      return;
    }

    if (currentBalUSD > 0 && !balancePaymentDate) {
      alert('Please select the date of receiving the balance payment.');
      return;
    }

    if (totalSettledUSD > invoice.totalAmountCurrency + 1) {
      const confirmOver = confirm(
        `Total realization (${invoice.currency} ${totalSettledUSD.toLocaleString()}) exceeds invoice value (${invoice.currency} ${invoice.totalAmountCurrency.toLocaleString()}). Do you wish to continue?`
      );
      if (!confirmOver) return;
    }

    setIsSubmitting(true);
    const res = updateInvoiceSettlement(invoice.id, {
      bankPreDeterminedExchangeRate: currentBankRate,
      advanceReceivedCurrency: currentAdvUSD > 0 ? currentAdvUSD : undefined,
      advanceReceivedDate: currentAdvUSD > 0 ? advanceReceivedDate : undefined,
      advanceBankRef: currentAdvUSD > 0 ? advanceBankRef.trim() : undefined,
      balancePaymentAmountCurrency: currentBalUSD > 0 ? currentBalUSD : undefined,
      balancePaymentDate: currentBalUSD > 0 ? balancePaymentDate : undefined,
      balanceBankRef: currentBalUSD > 0 ? balanceBankRef.trim() : undefined,
      bankAccountId: bankAccountId || undefined,
      notes: notes.trim() || undefined
    });

    setIsSubmitting(false);
    if (res.success) {
      onClose();
    } else if (res.message) {
      alert(res.message);
    }
  };

  const statusBg =
    previewStatus === 'Fully Realized'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : previewStatus === 'Partially Realized'
      ? 'bg-blue-50 text-blue-800 border-blue-200'
      : 'bg-amber-50 text-amber-800 border-amber-200';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Realization & Settlement — ${invoice.invoiceNo}`}
      subtitle="Record advance received, balance payments, bank realization dates, and pre-determined bank exchange rates"
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Invoice Financial Summary Strip */}
        <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-200 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div>
            <span className="text-ink-500 block font-medium">Invoice Value</span>
            <span className="text-base font-extrabold text-ink-900 mt-0.5 block">
              {invoice.currency} {invoice.totalAmountCurrency.toLocaleString()}
            </span>
            <span className="text-[10px] text-ink-500 mt-0.5 block font-mono">
              Net: {invoice.totalWeightKg.toLocaleString()} Kg
            </span>
          </div>

          <div>
            <span className="text-ink-500 block font-medium">Pre-determined Bank Rate</span>
            <span className="text-base font-extrabold text-rose-700 mt-0.5 block font-mono">
              ₹{currentBankRate.toFixed(2)}
            </span>
            <span className="text-[10px] text-ink-500 mt-0.5 block">Per {invoice.currency}</span>
          </div>

          <div>
            <span className="text-ink-500 block font-medium">Total Realized</span>
            <span className="text-base font-extrabold text-emerald-700 mt-0.5 block">
              {invoice.currency} {totalSettledUSD.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-800 mt-0.5 block font-semibold">
              Credited: {formatINR(totalSettledINR)}
            </span>
          </div>

          <div>
            <span className="text-ink-500 block font-medium">Unrealized Balance</span>
            <span
              className={`text-base font-extrabold mt-0.5 block ${
                remainingUSD > 0.05 ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {invoice.currency} {remainingUSD.toLocaleString()}
            </span>
            <span className="text-[10px] text-ink-500 mt-0.5 block">
              {remainingUSD > 0.05 ? 'Outstanding Wire' : '100% Settled'}
            </span>
          </div>

          <div>
            <span className="text-ink-500 block font-medium">Realization Status</span>
            <span className={`inline-block px-2.5 py-1 rounded-lg font-bold text-xs border mt-1 ${statusBg}`}>
              {previewStatus}
            </span>
            <span className="text-[10px] text-ink-500 block mt-1">{previewProgressPct}% settled</span>
          </div>
        </div>

        {/* Realization Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-semibold text-ink-600">
            <span>Settlement Progress: {previewProgressPct}%</span>
            <span>
              {invoice.currency} {totalSettledUSD.toLocaleString()} of {invoice.currency}{' '}
              {invoice.totalAmountCurrency.toLocaleString()}
            </span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden flex">
            {currentAdvUSD > 0 && (
              <div
                style={{
                  width: `${Math.min(100, (currentAdvUSD / (invoice.totalAmountCurrency || 1)) * 100)}%`
                }}
                className="bg-blue-500 h-full transition-all duration-300"
                title={`Advance: ${invoice.currency} ${currentAdvUSD.toLocaleString()}`}
              />
            )}
            {currentBalUSD > 0 && (
              <div
                style={{
                  width: `${Math.min(
                    100 - (currentAdvUSD / (invoice.totalAmountCurrency || 1)) * 100,
                    (currentBalUSD / (invoice.totalAmountCurrency || 1)) * 100
                  )}%`
                }}
                className="bg-emerald-500 h-full transition-all duration-300"
                title={`Balance: ${invoice.currency} ${currentBalUSD.toLocaleString()}`}
              />
            )}
          </div>
          <div className="flex items-center gap-4 text-[10px] text-ink-500 pt-0.5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Advance Remittance
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Balance Settlement
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Outstanding Balance
            </span>
          </div>
        </div>

        {/* SECTION 1: PRE-DETERMINED EXCHANGE RATE WITH BANK */}
        <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-rose-600" />
              1. Exchange Rate of Invoice (Pre-determined with Bank)
            </h4>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-100/70 px-2.5 py-0.5 rounded-md">
              Bank Booked Forex Rate
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">
                Pre-determined Exchange Rate (INR per {invoice.currency}) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-ink-500">₹</span>
                <input
                  type="number"
                  step="0.0001"
                  min="1"
                  value={bankPreDeterminedExchangeRate}
                  onChange={(e) => setBankPreDeterminedExchangeRate(e.target.value)}
                  placeholder="e.g. 84.7500"
                  required
                  disabled={!permissions.canManageSalesRealization}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-rose-600"
                />
              </div>
              <p className="text-[10px] text-ink-500 mt-1">
                Pre-agreed forward booking rate confirmed with your bank treasury for this export invoice.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-rose-100 flex flex-col justify-center text-xs">
              <span className="text-[10px] font-bold uppercase text-ink-500">Total Invoice Valuation at Bank Rate</span>
              <span className="text-base font-black text-rose-950 mt-0.5">
                {formatINR(invoice.totalAmountCurrency * currentBankRate)}
              </span>
              <span className="text-[10px] text-ink-500 mt-0.5">
                {invoice.currency} {invoice.totalAmountCurrency.toLocaleString()} × ₹{currentBankRate.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: ADVANCE RECEIVED & DATE */}
        <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-blue-600" />
                2. Advance Payment Received
              </h4>
              <p className="text-[11px] text-ink-500 mt-0.5">
                Initial overseas deposit or upfront remittance received from buyer
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetAdvanceToday}
                className="text-[11px] font-bold px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition"
              >
                Set Today
              </button>
              {currentAdvUSD > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAdvanceReceived('');
                    setAdvanceReceivedDate('');
                    setAdvanceBankRef('');
                  }}
                  className="text-[11px] font-medium text-rose-600 hover:underline"
                >
                  Clear Advance
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">
                Advance Received ({invoice.currency})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={invoice.totalAmountCurrency}
                value={advanceReceived}
                onChange={(e) => setAdvanceReceived(e.target.value)}
                placeholder="e.g. 15000"
                disabled={!permissions.canManageSalesRealization}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-blue-500"
              />
              {currentAdvUSD > 0 && (
                <span className="text-[10px] text-blue-700 font-medium block mt-1">
                  {((currentAdvUSD / invoice.totalAmountCurrency) * 100).toFixed(1)}% of invoice value
                </span>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">
                Date of Receiving the Advance {currentAdvUSD > 0 && <span className="text-rose-600">*</span>}
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                <input
                  type="date"
                  value={advanceReceivedDate}
                  onChange={(e) => setAdvanceReceivedDate(e.target.value)}
                  required={currentAdvUSD > 0}
                  disabled={!permissions.canManageSalesRealization}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Advance Bank Ref / FIRC / Wire #</label>
              <input
                type="text"
                value={advanceBankRef}
                onChange={(e) => setAdvanceBankRef(e.target.value)}
                placeholder="e.g. FIRC-HDFC-ADV-9921"
                disabled={!permissions.canManageSalesRealization}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* DIRECT OUTSTANDING COMPUTATION BASED ON TOTAL INVOICE AMOUNT */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 rounded-xl border border-blue-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Direct Outstanding Balance Calculation
              </span>
              <span className="text-[10px] font-semibold text-blue-800 bg-white/90 px-2 py-0.5 rounded-md border border-blue-200">
                Total Invoice Value: {invoice.currency} {invoice.totalAmountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 bg-white/90 rounded-xl border border-blue-100 flex flex-col justify-center">
                <span className="text-[10px] font-medium text-ink-500">Advance Received</span>
                <span className="text-sm font-bold text-blue-700">
                  {invoice.currency} {currentAdvUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-blue-600 mt-0.5">
                  {outstandingAfterAdv.advancePercentage}% of total invoice
                </span>
              </div>

              <div className="p-2.5 bg-white/90 rounded-xl border border-blue-300 sm:col-span-2 flex flex-col justify-center shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                    Direct Outstanding Balance Remaining
                  </span>
                  <span className="text-[10px] font-bold text-ink-600">
                    {formatINR(outstandingAfterAdv.outstandingAfterAdvanceINR)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-base font-black text-rose-700 tabular-nums">
                    {invoice.currency} {outstandingAfterAdv.outstandingAfterAdvanceCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                    {outstandingAfterAdv.outstandingPercentage}% outstanding
                  </span>
                </div>
              </div>
            </div>

            {currentAdvUSD > 0 && currentBalUSD <= 0 && outstandingAfterAdv.outstandingAfterAdvanceCurrency > 0 && (
              <div className="flex flex-wrap items-center justify-between pt-1 border-t border-blue-200/60 text-[11px] gap-2">
                <span className="text-ink-600">
                  Recording advance now? Settle full remaining balance upon document release:
                </span>
                <button
                  type="button"
                  onClick={handleFillFullBalance}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold rounded-lg transition text-[11px] flex items-center gap-1 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Auto-fill Balance = {invoice.currency} {outstandingAfterAdv.outstandingAfterAdvanceCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </button>
              </div>
            )}
          </div>

          {currentAdvUSD > 0 && (
            <div className="p-2.5 bg-blue-100/60 rounded-xl flex items-center justify-between text-xs text-blue-900 font-semibold">
              <span>Advance Credited in Indian Rupees (₹):</span>
              <span className="text-sm font-black">{formatINR(currentAdvINR)}</span>
            </div>
          )}
        </div>

        {/* SECTION 3: BALANCE PAYMENT AMOUNT & DATE */}
        <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                3. Balance Payment Amount &amp; Settlement
              </h4>
              <p className="text-[11px] text-ink-500 mt-0.5">
                Final remittance against shipping documents, bill of lading, or inspection
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFillFullBalance}
                className="text-[11px] font-bold px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-xs flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Fill Remaining Balance</span>
              </button>
              {currentBalUSD > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBalancePaymentAmount('');
                    setBalancePaymentDate('');
                    setBalanceBankRef('');
                  }}
                  className="text-[11px] font-medium text-rose-600 hover:underline"
                >
                  Clear Balance
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">
                Balance Payment Amount ({invoice.currency})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={balancePaymentAmount}
                onChange={(e) => setBalancePaymentAmount(e.target.value)}
                placeholder="e.g. 35000"
                disabled={!permissions.canManageSalesRealization}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-emerald-500"
              />
              {currentBalUSD > 0 && (
                <span className="text-[10px] text-emerald-700 font-medium block mt-1">
                  {((currentBalUSD / invoice.totalAmountCurrency) * 100).toFixed(1)}% of invoice value
                </span>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">
                Date of Receiving Balance Payment {currentBalUSD > 0 && <span className="text-rose-600">*</span>}
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                <input
                  type="date"
                  value={balancePaymentDate}
                  onChange={(e) => setBalancePaymentDate(e.target.value)}
                  required={currentBalUSD > 0}
                  disabled={!permissions.canManageSalesRealization}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Balance Bank Ref / FIRC / Wire #</label>
              <input
                type="text"
                value={balanceBankRef}
                onChange={(e) => setBalanceBankRef(e.target.value)}
                placeholder="e.g. FIRC-HDFC-BAL-9934"
                disabled={!permissions.canManageSalesRealization}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {currentBalUSD > 0 && (
            <div className="p-2.5 bg-emerald-100/60 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-semibold">
              <span>Balance Credited in Indian Rupees (₹):</span>
              <span className="text-sm font-black">{formatINR(currentBalINR)}</span>
            </div>
          )}
        </div>

        {/* SECTION 4: RECEIVING BANK ACCOUNT & INTERNAL NOTES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Realization Bank Account</label>
            <div className="relative">
              <Building className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                disabled={!permissions.canManageSalesRealization}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-rose-600"
              >
                <option value="">Select Company Account...</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.bank})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Settlement Notes / Bank Advice Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Advance 30% received at booking; balance settled against BL release"
              disabled={!permissions.canManageSalesRealization}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-rose-600"
            />
          </div>
        </div>

        {/* Live Settlement Reconciliation Banner */}
        <div className="p-4 bg-gradient-to-r from-rose-50 via-white to-emerald-50 rounded-2xl border border-rose-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink-700">Total Remittance:</span>
              <span className="font-black text-ink-950 text-sm">
                {invoice.currency} {totalSettledUSD.toLocaleString()}
              </span>
              <span className="text-ink-400">→</span>
              <span className="font-black text-rose-800 text-sm">{formatINR(totalSettledINR)}</span>
            </div>
            <p className="text-[11px] text-ink-500">
              Advance: {invoice.currency} {currentAdvUSD.toLocaleString()} + Balance: {invoice.currency}{' '}
              {currentBalUSD.toLocaleString()} @ ₹{currentBankRate.toFixed(2)} | Unrealized:{' '}
              <span className={remainingUSD > 0.05 ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold'}>
                {invoice.currency} {remainingUSD.toLocaleString()}
              </span>
            </p>
          </div>

          {permissions.canManageSalesRealization ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Settlement...' : 'Save Realization & Settlement'}</span>
            </button>
          ) : (
            <div className="p-2 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-[11px] font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Editing restricted to Master Accountant and Admin.</span>
            </div>
          )}
        </div>

        {/* Historical Realization Log */}
        {invoice.realizations && invoice.realizations.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-rose-600" />
              Recorded Realizations &amp; FIRC History ({invoice.realizations.length})
            </h4>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Realized ({invoice.currency})</th>
                    <th className="py-2.5 px-3 text-right">Bank Rate</th>
                    <th className="py-2.5 px-3 text-right">Amount in INR</th>
                    <th className="py-2.5 px-3">Bank Ref / FIRC</th>
                    <th className="py-2.5 px-3">Operator</th>
                    {permissions.canManageSalesRealization && (
                      <th className="py-2.5 px-3 text-center">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {invoice.realizations.map((r) => (
                    <tr key={r.id} className="hover:bg-rose-50/20">
                      <td className="py-2 px-3 font-semibold">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            r.paymentType === 'Advance'
                              ? 'bg-blue-100 text-blue-800'
                              : r.paymentType === 'Balance'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-ink-700'
                          }`}
                        >
                          {r.paymentType || 'Remittance'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-ink-900 whitespace-nowrap">{r.settlementDate}</td>
                      <td className="py-2 px-3 text-right font-extrabold text-emerald-700">
                        {invoice.currency} {r.realizedAmountCurrency.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-ink-700">
                        ₹{r.exchangeRateRealized.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-ink-900">
                        {formatINR(r.amountINR)}
                      </td>
                      <td className="py-2 px-3 text-ink-700 font-mono text-[11px]">{r.bankRefNo}</td>
                      <td className="py-2 px-3 text-ink-500 text-[10px]">{r.createdBy}</td>
                      {permissions.canManageSalesRealization && (
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Reverse realization remittance of ${invoice.currency} ${r.realizedAmountCurrency}?`)) {
                                deleteInvoiceRealization(invoice.id, r.id);
                              }
                            }}
                            title="Reverse Realization Entry"
                            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-800 rounded-xl text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </form>
    </Modal>
  );
};
