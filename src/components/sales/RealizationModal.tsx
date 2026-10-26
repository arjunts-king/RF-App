import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { SalesInvoice } from '../../types';
import { formatINR } from '../../utils/calculations';
import {
  BadgeDollarSign,
  Calendar,
  Building,
  FileCheck,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface RealizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SalesInvoice | null;
}

export const RealizationModal: React.FC<RealizationModalProps> = ({ isOpen, onClose, invoice }) => {
  const { bankAccounts, addInvoiceRealization, deleteInvoiceRealization } = useData();
  const { permissions } = useAuth();

  const today = new Date().toISOString().split('T')[0];

  const [settlementDate, setSettlementDate] = useState(today);
  const [realizedAmountUSD, setRealizedAmountUSD] = useState('');
  const [exchangeRateRealized, setExchangeRateRealized] = useState('');
  const [bankRefNo, setBankRefNo] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankChargesUSD, setBankChargesUSD] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When an invoice opens, prefill outstanding balance and default exchange rate
  React.useEffect(() => {
    if (invoice) {
      setSettlementDate(today);
      setRealizedAmountUSD(invoice.balanceRealizationCurrency > 0 ? String(invoice.balanceRealizationCurrency) : '');
      setExchangeRateRealized(String(invoice.exchangeRate || 84.5));
      setBankRefNo('');
      setBankAccountId(bankAccounts[0]?.id || '');
      setBankChargesUSD('');
      setNotes('');
    }
  }, [invoice, bankAccounts, today]);

  if (!invoice) return null;

  const currentUSD = parseFloat(realizedAmountUSD) || 0;
  const currentRate = parseFloat(exchangeRateRealized) || 0;
  const computedINR = currentUSD * currentRate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUSD <= 0) {
      alert('Please enter a realized amount greater than 0.');
      return;
    }
    if (currentRate <= 0) {
      alert('Please enter a valid realized exchange rate.');
      return;
    }
    if (!bankRefNo.trim()) {
      alert('Please provide a Bank Reference / FIRC / BRC Advice No.');
      return;
    }

    setIsSubmitting(true);
    const res = addInvoiceRealization(invoice.id, {
      settlementDate,
      realizedAmountCurrency: currentUSD,
      exchangeRateRealized: currentRate,
      amountINR: computedINR,
      bankRefNo: bankRefNo.trim(),
      bankAccountId: bankAccountId || undefined,
      bankChargesCurrency: parseFloat(bankChargesUSD) || undefined,
      notes: notes.trim() || undefined
    });

    setIsSubmitting(false);
    if (res.success) {
      setRealizedAmountUSD('');
      setBankRefNo('');
      setNotes('');
    }
  };

  const statusBg =
    invoice.realizationStatus === 'Fully Realized'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : invoice.realizationStatus === 'Partially Realized'
      ? 'bg-blue-50 text-blue-800 border-blue-200'
      : 'bg-amber-50 text-amber-800 border-amber-200';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Export Realization & Settlement — ${invoice.invoiceNo}`}
      subtitle="Track foreign currency remittance, realized INR conversions, and FIRC / BRC documents"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Invoice Summary Strip */}
        <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-ink-500 block font-medium">Invoice Value</span>
            <span className="text-base font-extrabold text-ink-900 mt-0.5 block">
              {invoice.currency} {invoice.totalAmountCurrency.toLocaleString()}
            </span>
            <span className="text-[10px] text-ink-500 mt-0.5 block">
              Est: ₹{invoice.estimatedAmountINR.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-ink-500 block font-medium">Total Realized</span>
            <span className="text-base font-extrabold text-emerald-700 mt-0.5 block">
              {invoice.currency} {invoice.totalRealizedCurrency.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-800 mt-0.5 block">
              Received: ₹{invoice.totalRealizedINR.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-ink-500 block font-medium">Unrealized Balance</span>
            <span className={`text-base font-extrabold mt-0.5 block ${invoice.balanceRealizationCurrency > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {invoice.currency} {invoice.balanceRealizationCurrency.toLocaleString()}
            </span>
            <span className="text-[10px] text-ink-500 mt-0.5 block">
              {invoice.balanceRealizationCurrency > 0 ? 'Remittance Pending' : 'Fully Settled'}
            </span>
          </div>

          <div>
            <span className="text-ink-500 block font-medium">Realization Status</span>
            <span className={`inline-block px-2.5 py-1 rounded-lg font-bold text-xs border mt-1 ${statusBg}`}>
              {invoice.realizationStatus}
            </span>
          </div>
        </div>

        {/* New Realization Form (for Admin and Master Accountant) */}
        {permissions.canManageSalesRealization && invoice.balanceRealizationCurrency > 0 ? (
          <form onSubmit={handleSubmit} className="p-4 bg-rose-50/40 rounded-2xl border border-rose-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                <BadgeDollarSign className="w-4 h-4 text-rose-600" />
                Record Inward Realization / Bank Remittance
              </h4>
              <span className="text-[11px] font-semibold text-rose-700 bg-rose-100/60 px-2 py-0.5 rounded-md">
                Currency: {invoice.currency}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-ink-700 mb-1">
                  Settlement Date <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                  <input
                    type="date"
                    value={settlementDate}
                    onChange={(e) => setSettlementDate(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold text-xs outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink-700 mb-1">
                  Realized Amount ({invoice.currency}) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={invoice.balanceRealizationCurrency + 0.05}
                  value={realizedAmountUSD}
                  onChange={(e) => setRealizedAmountUSD(e.target.value)}
                  placeholder="e.g. 25000"
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink-700 mb-1">
                  Realized Rate (INR / {invoice.currency}) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="1"
                  value={exchangeRateRealized}
                  onChange={(e) => setExchangeRateRealized(e.target.value)}
                  placeholder="e.g. 84.75"
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-rose-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-ink-700 mb-1">
                  FIRC / BRC / Wire Ref <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={bankRefNo}
                  onChange={(e) => setBankRefNo(e.target.value)}
                  placeholder="e.g. FIRC-HDFC-992384"
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink-700 mb-1">Receiving Bank Account</label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                  <select
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
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
                <label className="block text-[11px] font-bold text-ink-700 mb-1">Bank Charges / Deductions ({invoice.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={bankChargesUSD}
                  onChange={(e) => setBankChargesUSD(e.target.value)}
                  placeholder="e.g. 45.00"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-rose-600"
                />
              </div>
            </div>

            {/* Calculated Conversion Preview */}
            <div className="p-3 bg-white rounded-xl border border-rose-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-ink-500 text-[11px]">Realized Indian Rupee Amount:</span>
                <span className="text-base font-extrabold text-rose-800 ml-2">
                  {formatINR(computedINR)}
                </span>
                <span className="text-[10px] text-ink-500 ml-2">
                  ({invoice.currency} {currentUSD.toLocaleString()} × ₹{currentRate.toFixed(2)})
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || currentUSD <= 0}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Confirm Realization</span>
              </button>
            </div>
          </form>
        ) : invoice.balanceRealizationCurrency <= 0 ? (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>This export invoice is 100% fully realized. No outstanding remittance pending.</span>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Remittance recording is restricted to Master Accountant and Owner/Admin.</span>
          </div>
        )}

        {/* Realization History Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-rose-600" />
            Realization Audit History ({invoice.realizations.length} entries)
          </h4>

          {invoice.realizations.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Clock className="w-6 h-6 mx-auto mb-1 text-ink-400" />
              No settlement or realization remittances recorded for this invoice yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Realized ({invoice.currency})</th>
                    <th className="py-2.5 px-3 text-right">Realized Rate</th>
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
                      <td className="py-2 px-3 font-semibold text-ink-900">{r.settlementDate}</td>
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
                            onClick={() => {
                              if (confirm(`Reverse realization remittance of ${invoice.currency} ${r.realizedAmountCurrency}?`)) {
                                deleteInvoiceRealization(invoice.id, r.id);
                              }
                            }}
                            title="Delete / Reverse Realization Entry"
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
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-800 rounded-xl text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
