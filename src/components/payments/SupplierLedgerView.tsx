import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/calculations';
import { triggerPrint } from '../../utils/exportUtils';
import { PaymentModal } from './PaymentModal';
import { BookOpen, Printer, PlusCircle } from 'lucide-react';

export const SupplierLedgerView: React.FC = () => {
  const { suppliers, purchases, payments, bankAccounts, businessSettings } = useData();
  const { permissions } = useAuth();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
  const bankMap = new Map(bankAccounts.map((b) => [b.id, b]));

  // Build combined chronological ledger events:
  // Purchases (Debit: increases payable)
  // Standalone Payments & Direct Payments (Credit: decreases payable)
  interface LedgerEntry {
    id: string;
    date: string;
    type: 'PURCHASE' | 'PAYMENT';
    refNo: string;
    description: string;
    debitAmount: number; // Increases payable (Purchase cost)
    creditAmount: number; // Reduces payable (Payment amount)
    runningBalance: number;
  }

  const supplierPurchases = purchases.filter(
    (p) => p.supplierId === selectedSupplierId && !p.isVoided
  );

  const supplierPayments = payments.filter(
    (pay) => pay.supplierId === selectedSupplierId && !pay.isVoided
  );

  // Direct payments recorded on purchase rows
  const directPurchasePayments = purchases
    .filter((p) => p.supplierId === selectedSupplierId && !p.isVoided && p.amountPaid > 0)
    .map((p) => ({
      id: `dir-pay-${p.id}`,
      paymentNo: `PAY-DIR-${p.purchaseId}`,
      paymentDate: p.paymentDate || p.purchaseDate,
      supplierId: p.supplierId,
      amount: p.amountPaid,
      paidFromAccountId: p.paidFromAccountId || '',
      paymentMode: 'Direct Purchase Payment',
      notes: `Settled on invoice ${p.invoiceNo || p.purchaseId}`
    }));

  // Combine and sort chronologically
  const rawEvents: {
    date: string;
    type: 'PURCHASE' | 'PAYMENT';
    refNo: string;
    description: string;
    debit: number;
    credit: number;
  }[] = [];

  supplierPurchases.forEach((p) => {
    rawEvents.push({
      date: p.purchaseDate,
      type: 'PURCHASE',
      refNo: p.purchaseId,
      description: `Purchase: ${p.weightKg}Kg seafood (Inv: ${p.invoiceNo || 'N/A'})`,
      debit: p.totalCost,
      credit: 0
    });
  });

  supplierPayments.forEach((pay) => {
    const bank = bankMap.get(pay.paidFromAccountId)?.name || 'Bank';
    rawEvents.push({
      date: pay.paymentDate,
      type: 'PAYMENT',
      refNo: pay.paymentNo,
      description: `Payment: ${pay.paymentMode} via ${bank} (Ref: ${pay.referenceNo || 'None'})`,
      debit: 0,
      credit: pay.amount
    });
  });

  // Include direct purchase payments in ledger credits
  directPurchasePayments.forEach((dirPay) => {
    const bank = bankMap.get(dirPay.paidFromAccountId)?.name || 'Harbour Float';
    rawEvents.push({
      date: dirPay.paymentDate,
      type: 'PAYMENT',
      refNo: dirPay.paymentNo,
      description: `Direct Payment on ${dirPay.notes} via ${bank}`,
      debit: 0,
      credit: dirPay.amount
    });
  });

  // Sort events by date ascending
  rawEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filter by date range if specified
  const filteredEvents = rawEvents.filter((e) => {
    if (startDate && e.date < startDate) return false;
    if (endDate && e.date > endDate) return false;
    return true;
  });

  // Calculate Running Balance
  const openingBalance = selectedSupplier?.openingBalance || 0;
  let running = openingBalance;

  const ledgerEntries: LedgerEntry[] = filteredEvents.map((e, idx) => {
    running = running + e.debit - e.credit;
    return {
      id: `led-${idx}`,
      date: e.date,
      type: e.type,
      refNo: e.refNo,
      description: e.description,
      debitAmount: e.debit,
      creditAmount: e.credit,
      runningBalance: Number(running.toFixed(2))
    };
  });

  const totalDebits = filteredEvents.reduce((s, e) => s + e.debit, 0);
  const totalCredits = filteredEvents.reduce((s, e) => s + e.credit, 0);
  const closingBalance = openingBalance + totalDebits - totalCredits;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-rose-600" />
            Supplier Account Ledger
          </h2>
          <p className="text-xs text-ink-500">
            Debits increase payables (purchases); Credits reduce payables (payments). Reconciles running balance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {permissions.canManagePayments && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          )}

          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 hover:bg-rose-50 text-ink-700 hover:text-rose-700 text-xs font-semibold border border-gray-200 rounded-xl transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print A4 Statement</span>
          </button>
        </div>
      </div>

      {/* Supplier Selector & Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex-1 min-w-[260px]">
          <label className="block text-[11px] font-semibold text-ink-500 uppercase tracking-wider mb-1">
            Select Supplier
          </label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-ink-900 focus:border-rose-600 outline-none transition"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code} · Credit: {s.creditDays}d)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-ink-500 uppercase tracking-wider mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:border-rose-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink-500 uppercase tracking-wider mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:border-rose-600 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Printable A4 Statement Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Printable Letterhead Header */}
        <div className="border-b border-gray-200 pb-6 flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-ink-900 uppercase">{businessSettings.businessName}</h1>
            <p className="text-xs text-ink-500 mt-0.5">
              {[businessSettings.address, businessSettings.district, businessSettings.state].filter(Boolean).join(', ') || 'Headquarters'}
            </p>
            <p className="text-xs text-ink-500">
              GSTIN: {businessSettings.gstin || 'Unregistered'} · PAN: {businessSettings.pan || 'N/A'}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-rose-50 text-rose-700 font-bold text-xs uppercase tracking-wider rounded-lg border border-rose-200">
              Supplier Statement of Account
            </span>
            <p className="text-xs text-ink-500 mt-1">Generated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Supplier Profile Card */}
        {selectedSupplier && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50/70 rounded-xl border border-gray-200 text-xs">
            <div>
              <span className="text-ink-500 block uppercase font-bold text-[10px]">Party Name &amp; Contact:</span>
              <h3 className="text-sm font-bold text-ink-900 mt-0.5">{selectedSupplier.name}</h3>
              <p className="text-ink-700">{selectedSupplier.contactPerson} · {selectedSupplier.phone}</p>
              <p className="text-ink-500">{selectedSupplier.address}, {selectedSupplier.district}, {selectedSupplier.state}</p>
              <div className="mt-2 text-ink-700 flex gap-4">
                <span>GSTIN: <strong>{selectedSupplier.gstin || 'Unregistered'}</strong></span>
                <span>PAN: <strong>{selectedSupplier.pan || 'N/A'}</strong></span>
              </div>
            </div>

            <div>
              <span className="text-ink-500 block uppercase font-bold text-[10px]">Bank &amp; Credit Terms:</span>
              <p className="text-ink-900 font-semibold mt-0.5">{selectedSupplier.bankName}</p>
              <p className="text-ink-700">A/c: <strong>{selectedSupplier.bankAccount}</strong> (IFSC: {selectedSupplier.bankIfsc})</p>
              <p className="text-ink-700 mt-1">Terms: {selectedSupplier.paymentTerms} (<strong>{selectedSupplier.creditDays} Credit Days</strong>)</p>
            </div>
          </div>
        )}

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100/80 border-b border-gray-200 text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Voucher Ref</th>
                <th className="py-2.5 px-3">Narration / Details</th>
                <th className="py-2.5 px-3 text-right">Debit (+) Purchases</th>
                <th className="py-2.5 px-3 text-right">Credit (-) Payments</th>
                <th className="py-2.5 px-3 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-ink-900">
              {/* Opening Balance Row */}
              <tr className="bg-rose-50/20 font-semibold">
                <td className="py-2.5 px-3 italic">{startDate || 'Opening'}</td>
                <td className="py-2.5 px-3 italic">—</td>
                <td className="py-2.5 px-3 italic font-bold">Opening Balance Brought Forward</td>
                <td className="py-2.5 px-3 text-right">—</td>
                <td className="py-2.5 px-3 text-right">—</td>
                <td className="py-2.5 px-3 text-right font-bold text-rose-900">
                  {formatINR(openingBalance)}
                </td>
              </tr>

              {ledgerEntries.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50">
                  <td className="py-2.5 px-3 whitespace-nowrap font-medium">{row.date}</td>
                  <td className="py-2.5 px-3 font-bold text-rose-700 whitespace-nowrap">{row.refNo}</td>
                  <td className="py-2.5 px-3">{row.description}</td>
                  <td className="py-2.5 px-3 text-right font-semibold whitespace-nowrap text-rose-900">
                    {row.debitAmount > 0 ? formatINR(row.debitAmount) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold whitespace-nowrap text-emerald-700">
                    {row.creditAmount > 0 ? formatINR(row.creditAmount) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap text-ink-900">
                    {formatINR(row.runningBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                <td colSpan={3} className="py-3 px-3 uppercase text-ink-700">
                  Totals &amp; Net Closing Outstanding Balance
                </td>
                <td className="py-3 px-3 text-right text-rose-900">{formatINR(totalDebits)}</td>
                <td className="py-3 px-3 text-right text-emerald-700">{formatINR(totalCredits)}</td>
                <td className="py-3 px-3 text-right text-base text-rose-700 font-extrabold">
                  {formatINR(closingBalance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Signatures & Seal for Print */}
        <div className="pt-12 flex justify-between items-end text-xs text-ink-500 border-t border-gray-200">
          <div>
            <p>Prepared By: Accounts Dept</p>
            <p className="mt-8 font-semibold text-ink-900">Authorized Signatory</p>
            <p className="text-[10px]">Coastal Marine Traders</p>
          </div>
          <div className="text-right">
            <p>Supplier Acknowledgement</p>
            <p className="mt-8 font-semibold text-ink-900">Sign &amp; Stamp</p>
            <p className="text-[10px]">{selectedSupplier?.name}</p>
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        defaultSupplierId={selectedSupplierId}
      />
    </div>
  );
};
