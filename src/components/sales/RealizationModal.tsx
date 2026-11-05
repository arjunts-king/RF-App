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

  // Pre-determined forward exchange rates with bank (independent forward rates for Advance and Balance)
  const [bankPreDeterminedExchangeRate, setBankPreDeterminedExchangeRate] = useState<string>('84.50');
  const [advanceExchangeRate, setAdvanceExchangeRate] = useState<string>('84.50');
  const [balanceExchangeRate, setBalanceExchangeRate] = useState<string>('84.50');

  // Advance Payment (Terms of Contract vs Actual Received)
  const [advanceTermsUSD, setAdvanceTermsUSD] = useState<string>('');
  const [advanceReceived, setAdvanceReceived] = useState<string>('');
  const [advanceReceivedDate, setAdvanceReceivedDate] = useState<string>('');
  const [advanceBankRef, setAdvanceBankRef] = useState<string>('');

  // Balance Payment (Balance as per Actual Price vs Actual Received)
  const [balanceActualPriceUSD, setBalanceActualPriceUSD] = useState<string>('');
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
      setAdvanceExchangeRate(String(invoice.advanceExchangeRate || initialBankRate));
      setBalanceExchangeRate(String(invoice.balanceExchangeRate || initialBankRate));

      const defaultAdvTerms = invoice.advanceTermsUSD !== undefined
        ? String(invoice.advanceTermsUSD)
        : invoice.advanceReceivedCurrency
        ? String(invoice.advanceReceivedCurrency)
        : invoice.totalAmountCurrency
        ? String(Number((invoice.totalAmountCurrency * 0.3).toFixed(2)))
        : '';
      setAdvanceTermsUSD(defaultAdvTerms);

      setAdvanceReceived(invoice.advanceReceivedCurrency ? String(invoice.advanceReceivedCurrency) : '');
      setAdvanceReceivedDate(invoice.advanceReceivedDate || '');
      setAdvanceBankRef(invoice.advanceBankRef || '');

      const advTermsVal = parseFloat(defaultAdvTerms) || invoice.advanceReceivedCurrency || 0;
      const defaultBalPrice = invoice.balanceActualPriceUSD !== undefined
        ? String(invoice.balanceActualPriceUSD)
        : invoice.balancePaymentAmountCurrency
        ? String(invoice.balancePaymentAmountCurrency)
        : invoice.totalAmountCurrency
        ? String(Math.max(0, Number((invoice.totalAmountCurrency - advTermsVal).toFixed(2))))
        : '';
      setBalanceActualPriceUSD(defaultBalPrice);

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
  const currentAdvRate = parseFloat(advanceExchangeRate) || currentBankRate;
  const currentBalRate = parseFloat(balanceExchangeRate) || currentBankRate;

  const currentAdvTermsUSD = parseFloat(advanceTermsUSD) || 0;
  const currentAdvUSD = parseFloat(advanceReceived) || 0;
  const advShortfallUSD = currentAdvTermsUSD > currentAdvUSD ? Number((currentAdvTermsUSD - currentAdvUSD).toFixed(2)) : 0;

  const currentBalPriceUSD = parseFloat(balanceActualPriceUSD) || 0;
  const currentBalUSD = parseFloat(balancePaymentAmount) || 0;
  const balShortfallUSD = currentBalPriceUSD > currentBalUSD ? Number((currentBalPriceUSD - currentBalUSD).toFixed(2)) : 0;

  const totalShortfallUSD = Number((advShortfallUSD + balShortfallUSD).toFixed(2));

  const currentAdvINR = currentAdvUSD * currentAdvRate;
  const currentBalINR = currentBalUSD * currentBalRate;

  const outstandingAfterAdv = computeOutstandingFromAdvance(
    invoice.totalAmountCurrency,
    currentAdvUSD,
    currentBalRate
  );

  const totalSettledUSD = currentAdvUSD + currentBalUSD;
  const totalSettledINR = currentAdvINR + currentBalINR;
  const remainingUSD = Math.max(0, Number((invoice.totalAmountCurrency - totalSettledUSD - totalShortfallUSD).toFixed(2)));
  const remainingINR = remainingUSD * currentBalRate;

  const weightedAverageRate =
    totalSettledUSD > 0
      ? totalSettledINR / totalSettledUSD
      : (currentAdvRate + currentBalRate) / 2;

  const previewStatus =
    totalSettledUSD <= 0
      ? 'Not Realized'
      : (currentBalUSD > 0 && (totalSettledUSD + totalShortfallUSD >= invoice.totalAmountCurrency - 0.05 || remainingUSD <= 0.05)) || totalSettledUSD >= invoice.totalAmountCurrency
      ? 'Fully Realized'
      : 'Partially Realized';

  const previewProgressPct = Math.min(100, Math.round(((totalSettledUSD + totalShortfallUSD) / (invoice.totalAmountCurrency || 1)) * 100));

  const handleSetAdvTerms30Pct = () => {
    const val = Number((invoice.totalAmountCurrency * 0.3).toFixed(2));
    setAdvanceTermsUSD(String(val));
    const balVal = Math.max(0, Number((invoice.totalAmountCurrency - val).toFixed(2)));
    setBalanceActualPriceUSD(String(balVal));
  };

  const handleRecalcBalPrice = () => {
    const balVal = Math.max(0, Number((invoice.totalAmountCurrency - currentAdvTermsUSD).toFixed(2)));
    setBalanceActualPriceUSD(String(balVal));
  };

  const handleFillFullBalance = () => {
    const targetBalance = currentBalPriceUSD > 0 ? currentBalPriceUSD : Math.max(0, Number((invoice.totalAmountCurrency - currentAdvUSD).toFixed(2)));
    setBalancePaymentAmount(String(targetBalance));
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

    if (currentAdvRate <= 0 || currentBalRate <= 0) {
      alert('Please enter valid pre-determined bank forward exchange rates.');
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
      bankPreDeterminedExchangeRate: Number(weightedAverageRate.toFixed(4)),
      advanceExchangeRate: currentAdvRate,
      balanceExchangeRate: currentBalRate,
      advanceTermsUSD: currentAdvTermsUSD > 0 ? currentAdvTermsUSD : undefined,
      advanceReceivedCurrency: currentAdvUSD > 0 ? currentAdvUSD : undefined,
      advanceShortfallUSD: advShortfallUSD > 0 ? advShortfallUSD : undefined,
      advanceReceivedDate: currentAdvUSD > 0 ? advanceReceivedDate : undefined,
      advanceBankRef: currentAdvUSD > 0 ? advanceBankRef.trim() : undefined,
      balanceActualPriceUSD: currentBalPriceUSD > 0 ? currentBalPriceUSD : undefined,
      balancePaymentAmountCurrency: currentBalUSD > 0 ? currentBalUSD : undefined,
      balanceShortfallUSD: balShortfallUSD > 0 ? balShortfallUSD : undefined,
      balancePaymentDate: currentBalUSD > 0 ? balancePaymentDate : undefined,
      balanceBankRef: currentBalUSD > 0 ? balanceBankRef.trim() : undefined,
      totalShortfallUSD: totalShortfallUSD > 0 ? totalShortfallUSD : undefined,
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
        <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-200 grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
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
            <span className="text-ink-500 block font-medium">Bank Forward Rates</span>
            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[11px] font-bold">
              <span className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded border border-blue-200" title="Advance Forward Rate">
                Adv: ₹{currentAdvRate.toFixed(2)}
              </span>
              <span className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200" title="Balance Forward Rate">
                Bal: ₹{currentBalRate.toFixed(2)}
              </span>
            </div>
            <span className="text-[10px] text-ink-500 mt-0.5 block">
              Avg: ₹{weightedAverageRate.toFixed(2)} / {invoice.currency}
            </span>
          </div>

          <div>
            <span className="text-ink-500 block font-medium">Actual Realized</span>
            <span className="text-base font-extrabold text-emerald-700 mt-0.5 block">
              {invoice.currency} {totalSettledUSD.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-800 mt-0.5 block font-semibold">
              Credited: {formatINR(totalSettledINR)}
            </span>
          </div>

          <div>
            <span className="text-ink-500 block font-medium">Realization Shortfall</span>
            <span
              className={`text-base font-extrabold mt-0.5 block ${
                totalShortfallUSD > 0 ? 'text-amber-700' : 'text-ink-600'
              }`}
            >
              {invoice.currency} {totalShortfallUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-ink-500 mt-0.5 block">
              {totalShortfallUSD > 0 ? 'Bank fees / deductions' : 'Zero Shortfall'}
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
              {remainingUSD > 0.05 ? 'Outstanding Wire' : '100% Accounted'}
            </span>
          </div>

          <div>
            <span className="text-ink-500 block font-medium">Settlement Status</span>
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

        {/* SECTION 1: PRE-DETERMINED FORWARD EXCHANGE RATES WITH BANK */}
        <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-rose-600" />
              1. Forward Exchange Rates of Invoice (Pre-determined with Bank)
            </h4>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-100/70 px-2.5 py-0.5 rounded-md">
              Dual Forward Bookings Supported
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-blue-900 mb-1">
                Advance Forward Rate (INR/{invoice.currency}) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-ink-500">₹</span>
                <input
                  type="number"
                  step="0.0001"
                  min="1"
                  value={advanceExchangeRate}
                  onChange={(e) => setAdvanceExchangeRate(e.target.value)}
                  placeholder="e.g. 84.5000"
                  required
                  disabled={!permissions.canManageSalesRealization}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-blue-200 rounded-xl font-bold text-xs outline-none focus:border-blue-600"
                />
              </div>
              <p className="text-[10px] text-ink-500 mt-1">
                Forward contract booking rate agreed with bank for upfront advance.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                Balance Forward Rate (INR/{invoice.currency}) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-ink-500">₹</span>
                <input
                  type="number"
                  step="0.0001"
                  min="1"
                  value={balanceExchangeRate}
                  onChange={(e) => setBalanceExchangeRate(e.target.value)}
                  placeholder="e.g. 84.7500"
                  required
                  disabled={!permissions.canManageSalesRealization}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-emerald-200 rounded-xl font-bold text-xs outline-none focus:border-emerald-600"
                />
              </div>
              <p className="text-[10px] text-ink-500 mt-1">
                Forward contract booking rate agreed with bank for remaining balance.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-rose-100 flex flex-col justify-center text-xs">
              <span className="text-[10px] font-bold uppercase text-ink-500">Expected Total INR Realization</span>
              <span className="text-base font-black text-rose-950 mt-0.5">
                {formatINR(currentAdvINR + (invoice.totalAmountCurrency - currentAdvUSD) * currentBalRate)}
              </span>
              <span className="text-[10px] text-ink-500 mt-0.5">
                Adv: {formatINR(currentAdvINR)} + Bal: {formatINR((invoice.totalAmountCurrency - currentAdvUSD) * currentBalRate)}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: ADVANCE PAYMENT (CONTRACT TERMS VS ACTUAL RECEIVED) */}
        <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-blue-600" />
                2. Advance Payment Received &amp; Contract Terms
              </h4>
              <p className="text-[11px] text-ink-500 mt-0.5">
                Compare advance as per terms of contract against actual advance credited into bank account (both in USD)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetAdvTerms30Pct}
                className="text-[11px] font-bold px-2 py-1 bg-white border border-blue-200 hover:bg-blue-100 text-blue-800 rounded-lg transition"
                title="Calculate 30% contract advance"
              >
                Set 30% Contract
              </button>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">
                Advance as per Terms of Contract (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-ink-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={advanceTermsUSD}
                  onChange={(e) => setAdvanceTermsUSD(e.target.value)}
                  placeholder="e.g. 15000"
                  disabled={!permissions.canManageSalesRealization}
                  className="w-full pl-7 pr-3 py-2 bg-white border border-blue-200 rounded-xl font-bold text-xs outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-ink-500 mt-1">
                <span>Contractual agreed</span>
                {currentAdvTermsUSD > 0 && (
                  <button
                    type="button"
                    onClick={() => setAdvanceReceived(String(currentAdvTermsUSD))}
                    className="text-blue-700 font-bold hover:underline"
                  >
                    Match to Actual
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-blue-900 mb-1">
                Actual Advance Received (USD) {currentAdvUSD > 0 && <span className="text-rose-600">*</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-blue-600">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={advanceReceived}
                  onChange={(e) => setAdvanceReceived(e.target.value)}
                  placeholder="e.g. 14950"
                  disabled={!permissions.canManageSalesRealization}
                  className="w-full pl-7 pr-3 py-2 bg-white border border-blue-300 rounded-xl font-bold text-xs outline-none focus:border-blue-600 text-blue-900"
                />
              </div>
              <span className="text-[10px] text-blue-700 font-medium block mt-1">
                {currentAdvUSD > 0 ? `${((currentAdvUSD / invoice.totalAmountCurrency) * 100).toFixed(1)}% of total invoice` : 'Net bank credit'}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">
                Date of Receiving Advance {currentAdvUSD > 0 && <span className="text-rose-600">*</span>}
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
              <label className="block text-[11px] font-bold text-blue-900 mb-1">
                Advance Forward Rate (INR/USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-ink-500">₹</span>
                <input
                  type="number"
                  step="0.0001"
                  min="1"
                  value={advanceExchangeRate}
                  onChange={(e) => setAdvanceExchangeRate(e.target.value)}
                  placeholder="e.g. 84.50"
                  disabled={!permissions.canManageSalesRealization}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-blue-200 rounded-xl font-bold text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Advance Bank Ref / FIRC #</label>
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

          {/* Advance Shortfall Alert if actual < contract terms */}
          {advShortfallUSD > 0 && (
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-900 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Shortfall in Advance Received: ${advShortfallUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                <span className="text-[10px] text-amber-700 font-normal ml-1">
                  (Terms: ${currentAdvTermsUSD.toLocaleString()} vs Actual: ${currentAdvUSD.toLocaleString()} — bank wire fees / deductions)
                </span>
              </span>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                Deduction: -${advShortfallUSD.toFixed(2)}
              </span>
            </div>
          )}

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
                <span className="text-[10px] font-medium text-ink-500">Actual Advance Received</span>
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
              <span>Actual Advance Credited in Indian Rupees (₹) @ ₹{currentAdvRate.toFixed(2)}:</span>
              <span className="text-sm font-black">{formatINR(currentAdvINR)}</span>
            </div>
          )}
        </div>

        {/* SECTION 3: BALANCE PAYMENT (ACTUAL PRICE VS ACTUAL RECEIVED) */}
        <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                3. Balance Payment Amount &amp; Actual Price (USD)
              </h4>
              <p className="text-[11px] text-ink-500 mt-0.5">
                Compare balance as per actual price against actual balance credited into bank account (both in USD)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRecalcBalPrice}
                className="text-[11px] font-bold px-2 py-1 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-lg transition"
                title="Recalculate balance price from contract terms"
              >
                Recalc Bal Price
              </button>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">
                Balance as per Actual Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-ink-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={balanceActualPriceUSD}
                  onChange={(e) => setBalanceActualPriceUSD(e.target.value)}
                  placeholder="e.g. 35000"
                  disabled={!permissions.canManageSalesRealization}
                  className="w-full pl-7 pr-3 py-2 bg-white border border-emerald-200 rounded-xl font-bold text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-ink-500 mt-1">
                <span>Shipping price balance</span>
                {currentBalPriceUSD > 0 && (
                  <button
                    type="button"
                    onClick={() => setBalancePaymentAmount(String(currentBalPriceUSD))}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    Match to Actual
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                Actual Balance Received (USD) {currentBalUSD > 0 && <span className="text-rose-600">*</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-emerald-600">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={balancePaymentAmount}
                  onChange={(e) => setBalancePaymentAmount(e.target.value)}
                  placeholder="e.g. 34800"
                  disabled={!permissions.canManageSalesRealization}
                  className="w-full pl-7 pr-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-xs outline-none focus:border-emerald-600 text-emerald-900"
                />
              </div>
              {currentBalUSD > 0 && (
                <span className="text-[10px] text-emerald-700 font-medium block mt-1">
                  {((currentBalUSD / invoice.totalAmountCurrency) * 100).toFixed(1)}% of invoice value
                </span>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">
                Date of Receiving Balance {currentBalUSD > 0 && <span className="text-rose-600">*</span>}
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
              <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                Balance Forward Rate (INR/USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-ink-500">₹</span>
                <input
                  type="number"
                  step="0.0001"
                  min="1"
                  value={balanceExchangeRate}
                  onChange={(e) => setBalanceExchangeRate(e.target.value)}
                  placeholder="e.g. 84.75"
                  disabled={!permissions.canManageSalesRealization}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-emerald-200 rounded-xl font-bold text-xs outline-none focus:border-emerald-500"
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

          {/* Balance Shortfall Alert if actual < actual balance price */}
          {balShortfallUSD > 0 && (
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-900 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Shortfall in Balance Received: ${balShortfallUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                <span className="text-[10px] text-amber-700 font-normal ml-1">
                  (Price: ${currentBalPriceUSD.toLocaleString()} vs Actual: ${currentBalUSD.toLocaleString()} — bank wire fees / deductions)
                </span>
              </span>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                Deduction: -${balShortfallUSD.toFixed(2)}
              </span>
            </div>
          )}

          {currentBalUSD > 0 && (
            <div className="p-2.5 bg-emerald-100/60 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-semibold">
              <span>Actual Balance Credited in Indian Rupees (₹) @ ₹{currentBalRate.toFixed(2)}:</span>
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-ink-700">Total Actual Remittance:</span>
              <span className="font-black text-ink-950 text-sm">
                {invoice.currency} {totalSettledUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-ink-400">→</span>
              <span className="font-black text-rose-800 text-sm">{formatINR(totalSettledINR)}</span>
              {totalShortfallUSD > 0 && (
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold flex items-center gap-1 shadow-xs">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Shortfall: ${totalShortfallUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                  {advShortfallUSD > 0 && balShortfallUSD > 0 && (
                    <span className="font-normal text-[10px] text-amber-800">
                      (Adv: -${advShortfallUSD.toFixed(2)}, Bal: -${balShortfallUSD.toFixed(2)})
                    </span>
                  )}
                </span>
              )}
            </div>
            <p className="text-[11px] text-ink-500">
              Actual Adv: {invoice.currency} {currentAdvUSD.toLocaleString()} @ ₹{currentAdvRate.toFixed(2)} + Actual Bal: {invoice.currency}{' '}
              {currentBalUSD.toLocaleString()} @ ₹{currentBalRate.toFixed(2)} | Unrealized:{' '}
              <span className={remainingUSD > 0.05 ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold'}>
                {invoice.currency} {remainingUSD.toLocaleString()} ({formatINR(remainingINR)})
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
