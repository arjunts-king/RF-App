import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { getIndianFinancialYear, formatINR } from '../../utils/calculations';
import { CheckCircle2, Lock } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSupplierId?: string;
  defaultPurchaseId?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  defaultSupplierId,
  defaultPurchaseId
}) => {
  const { suppliers, bankAccounts, purchases, addPayment, businessSettings } = useData();
  const { permissions } = useAuth();
  const { showToast } = useToast();

  const today = new Date().toISOString().split('T')[0];

  const [supplierId, setSupplierId] = useState(defaultSupplierId || '');
  const [purchaseId, setPurchaseId] = useState(defaultPurchaseId || '');
  const [paidFromAccountId, setPaidFromAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentMode, setPaymentMode] = useState<'Bank Transfer' | 'Cheque' | 'Cash' | 'RTGS/NEFT' | 'UPI'>('Bank Transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

  const activeSuppliers = suppliers.filter((s) => s.active);
  const activeAccounts = bankAccounts.filter((b) => b.active);

  // Unpaid purchases for this supplier
  const unpaidPurchases = purchases.filter(
    (p) => !p.isVoided && p.supplierId === supplierId && p.balancePayable > 0
  );

  const handlePurchaseSelect = (pid: string) => {
    setPurchaseId(pid);
    if (pid) {
      const match = purchases.find((p) => p.id === pid);
      if (match) {
        setAmount(String(match.balancePayable));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!permissions.canManagePayments) {
      showToast('Unauthorized: Only Owner/Admin and Master Accountant can record payments.', 'error');
      return;
    }

    if (!supplierId || !paidFromAccountId) {
      showToast('Please select Supplier and Payment Source Account.', 'error');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid payment amount greater than ₹0.', 'error');
      return;
    }

    const fy = getIndianFinancialYear(paymentDate) || businessSettings.financialYear;

    addPayment({
      paymentDate,
      financialYear: fy,
      supplierId,
      purchaseId: purchaseId || undefined,
      paidFromAccountId,
      amount: numAmount,
      paymentMode,
      referenceNo: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Disburse Supplier Payment"
      subtitle="Record payment on account (reduces supplier payable balance)"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!permissions.canManagePayments && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Unauthorized: Only Owner / Admin and Master Accountant can disburse payments.</span>
          </div>
        )}

        <div>
          <label className="block font-semibold text-ink-700 mb-1">
            Supplier <span className="text-rose-600">*</span>
          </label>
          <select
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setPurchaseId('');
            }}
            required
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
          >
            <option value="">-- Select Supplier --</option>
            {activeSuppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code} · {s.bankName})
              </option>
            ))}
          </select>
        </div>

        {supplierId && unpaidPurchases.length > 0 && (
          <div>
            <label className="block font-semibold text-ink-700 mb-1">
              Apply to Specific Invoice <span className="text-ink-500 font-normal">(Optional: default is FIFO on account)</span>
            </label>
            <select
              value={purchaseId}
              onChange={(e) => handlePurchaseSelect(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
            >
              <option value="">-- Lump-sum On Account (FIFO across all unpaid purchases) --</option>
              {unpaidPurchases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.purchaseId} · {p.purchaseDate} · {p.invoiceNo ? `Inv: ${p.invoiceNo}` : 'No Inv'} · Due: {formatINR(p.balancePayable)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-ink-700 mb-1">
              Payment Amount (₹) <span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full p-2.5 font-bold text-ink-900 bg-rose-50/40 border border-rose-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">
              Payment Date <span className="text-rose-600">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-ink-700 mb-1">
              Paid From Account <span className="text-rose-600">*</span>
            </label>
            <select
              value={paidFromAccountId}
              onChange={(e) => setPaidFromAccountId(e.target.value)}
              required
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
            >
              <option value="">-- Disbursal Bank / Cash Float --</option>
              {activeAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.bank} · {acc.accountType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as any)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
            >
              <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="RTGS/NEFT">RTGS / NEFT Direct</option>
              <option value="UPI">UPI / Digital Immediate</option>
              <option value="Cheque">Bank Cheque</option>
              <option value="Cash">Harbour Cash Float</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-ink-700 mb-1">
              Transaction / Cheque / UTR Ref
            </label>
            <input
              type="text"
              placeholder="e.g. UTR-HDFC90281"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Narration / Notes</label>
            <input
              type="text"
              placeholder="e.g. Lump sum settlement for week 41"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-ink-700 font-semibold rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!permissions.canManagePayments}
            className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-xs transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Disburse &amp; Post to Ledger</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
