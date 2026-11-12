import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/calculations';
import { triggerPrint } from '../../utils/exportUtils';
import {
  buildSupplierLedgerStatement,
  exportSupplierLedgerToWord,
  exportSupplierLedgerToExcel
} from '../../utils/exportSupplierStatement';
import { PageHeader } from '../common/PageHeader';
import { BentoCard } from '../common/BentoCard';
import { PaymentModal } from './PaymentModal';
import { Printer, PlusCircle, FileText, FileSpreadsheet } from 'lucide-react';

export const SupplierLedgerView: React.FC = () => {
  const { suppliers, purchases, payments, purchaseReturns, species, bankAccounts, businessSettings } = useData();
  const { permissions } = useAuth();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  const statement = useMemo(
    () =>
      buildSupplierLedgerStatement({
        supplier: selectedSupplier,
        purchases,
        payments,
        purchaseReturns,
        species,
        bankAccounts,
        startDate,
        endDate
      }),
    [selectedSupplier, purchases, payments, purchaseReturns, species, bankAccounts, startDate, endDate]
  );

  const {
    rows: ledgerEntries,
    openingBalance,
    totalWeightKg,
    totalPurchaseValue,
    totalExpenseValue,
    totalDebits,
    totalCredits,
    closingBalance
  } = statement;

  const handleDownloadWord = () => {
    exportSupplierLedgerToWord(statement, selectedSupplier, businessSettings, startDate, endDate).catch((err) => {
      console.error('Failed to export supplier ledger to Word:', err);
      alert('Failed to generate Word document. Please try again.');
    });
  };

  const handleDownloadExcel = () => {
    try {
      exportSupplierLedgerToExcel(statement, selectedSupplier, businessSettings, startDate, endDate);
    } catch (err) {
      console.error('Failed to export supplier ledger to Excel:', err);
      alert('Failed to generate Excel workbook. Please try again.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Figma Header Block */}
      <div className="print:hidden">
        <PageHeader
          title="Supplier account ledger"
          subtitle="Debits increase payables (purchases); Credits reduce payables (payments). Reconciles running balance."
          breadcrumbs={['Purchase', 'Supplier Ledger']}
          primaryAction={
            permissions.canManagePayments
              ? {
                  label: 'Record Payment',
                  onClick: () => setIsPaymentModalOpen(true),
                  icon: PlusCircle
                }
              : undefined
          }
          secondaryActions={[
            {
              label: 'Download Excel',
              onClick: handleDownloadExcel,
              icon: FileSpreadsheet
            },
            {
              label: 'Download Word',
              onClick: handleDownloadWord,
              icon: FileText
            },
            {
              label: 'Print / PDF (A4)',
              onClick: triggerPrint,
              icon: Printer
            }
          ]}
        />
      </div>

      {/* Bento Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <BentoCard
          label="Opening Balance"
          value={formatINR(openingBalance)}
          caption="Carried forward balance"
        />
        <BentoCard
          label="Total Purchases (Debit)"
          value={formatINR(totalDebits)}
          caption="Raw material landed cost"
          variant="highlight"
        />
        <BentoCard
          label="Settled & Returns (Credit)"
          value={formatINR(totalCredits)}
          caption="Disbursed & debit notes"
          variant="success"
        />
        <BentoCard
          label="Closing Net Payable"
          value={formatINR(closingBalance)}
          caption="Pending supplier remittance"
          variant={closingBalance > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Supplier Selector & Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex-1 min-w-[260px]">
          <label className="block text-[11px] font-bold text-ink-700 uppercase tracking-wider mb-1">
            Select Supplier
          </label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-ink-900 focus:bg-white focus:border-rose-400 outline-none transition"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code}{s.creditDays ? ` · Credit: ${s.creditDays}d` : ' · Immediate'})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 uppercase tracking-wider mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-rose-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 uppercase tracking-wider mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-rose-400 outline-none"
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
              <p className="text-ink-700 mt-1">
                Terms: {selectedSupplier.paymentTerms || (selectedSupplier.creditDays ? `Net ${selectedSupplier.creditDays} Days` : 'Immediate')}{' '}
                {selectedSupplier.creditDays ? (
                  <strong>({selectedSupplier.creditDays} Credit Days)</strong>
                ) : (
                  <span className="text-ink-500">(Immediate / No Credit Terms)</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs print:text-[9px]">
            <thead>
              <tr className="bg-gray-100/80 border-b border-gray-200 text-[10.5px] print:text-[8.5px] font-bold text-ink-600 uppercase tracking-wider">
                <th className="py-2.5 px-2 print:px-1">Purchase ID / Ref</th>
                <th className="py-2.5 px-2 print:px-1">Date</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Weight (Kg)</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Pur. Rate/Kg</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Exp. Rate/Kg</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Purchase Value</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Expense Value</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Debit (Purchases)</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Credit (Payments)</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-ink-900">
              {/* Opening Balance Row */}
              <tr className="bg-rose-50/20 font-semibold">
                <td className="py-2.5 px-2 print:px-1 italic">
                  <div>Opening</div>
                  <div className="text-[10px] font-normal text-ink-500">Opening Balance Brought Forward</div>
                </td>
                <td className="py-2.5 px-2 print:px-1 italic whitespace-nowrap">{startDate || 'Opening'}</td>
                <td className="py-2.5 px-2 print:px-1 text-right"></td>
                <td className="py-2.5 px-2 print:px-1 text-right"></td>
                <td className="py-2.5 px-2 print:px-1 text-right"></td>
                <td className="py-2.5 px-2 print:px-1 text-right"></td>
                <td className="py-2.5 px-2 print:px-1 text-right"></td>
                <td className="py-2.5 px-2 print:px-1 text-right"></td>
                <td className="py-2.5 px-2 print:px-1 text-right"></td>
                <td className="py-2.5 px-2 print:px-1 text-right font-bold text-rose-900 tabular-nums whitespace-nowrap">
                  {formatINR(openingBalance)}
                </td>
              </tr>

              {ledgerEntries.map((row) => (
                <tr key={row.id} className={`hover:bg-gray-50/50 ${row.type === 'RETURN' ? 'bg-amber-50/30' : ''}`}>
                  <td className="py-2.5 px-2 print:px-1 font-bold">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span
                        className={
                          row.type === 'RETURN'
                            ? 'text-amber-700'
                            : row.type === 'PAYMENT'
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }
                      >
                        {row.purchaseId}
                      </span>
                      {row.type === 'RETURN' && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                          Debit Note
                        </span>
                      )}
                    </div>
                    <div className="text-[10.5px] print:text-[8px] font-normal text-ink-500 mt-0.5 leading-snug">
                      {row.briefDetails}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 print:px-1 whitespace-nowrap font-medium">{row.formattedDate}</td>
                  <td className="py-2.5 px-2 print:px-1 text-right whitespace-nowrap tabular-nums">
                    {row.weightKg !== null ? `${row.weightKg.toLocaleString('en-IN')} Kg` : ''}
                  </td>
                  <td className="py-2.5 px-2 print:px-1 text-right whitespace-nowrap tabular-nums">
                    {row.purchaseRatePerKg !== null ? formatINR(row.purchaseRatePerKg) : ''}
                  </td>
                  <td className="py-2.5 px-2 print:px-1 text-right whitespace-nowrap tabular-nums">
                    {row.expenseRatePerKg !== null ? formatINR(row.expenseRatePerKg) : ''}
                  </td>
                  <td className="py-2.5 px-2 print:px-1 text-right whitespace-nowrap tabular-nums">
                    {row.purchaseValue !== null ? formatINR(row.purchaseValue) : ''}
                  </td>
                  <td className="py-2.5 px-2 print:px-1 text-right whitespace-nowrap tabular-nums">
                    {row.expenseValue !== null ? formatINR(row.expenseValue) : ''}
                  </td>
                  <td className="py-2.5 px-2 print:px-1 text-right font-semibold whitespace-nowrap text-rose-900 tabular-nums">
                    {row.debitAmount > 0 ? formatINR(row.debitAmount) : ''}
                  </td>
                  <td className="py-2.5 px-2 print:px-1 text-right font-semibold whitespace-nowrap text-emerald-700 tabular-nums">
                    {row.creditAmount > 0 ? formatINR(row.creditAmount) : ''}
                  </td>
                  <td className="py-2.5 px-2 print:px-1 text-right font-bold whitespace-nowrap text-ink-900 tabular-nums">
                    {formatINR(row.runningBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                <td colSpan={2} className="py-3 px-2 print:px-1 uppercase text-ink-700">
                  Totals &amp; Net Closing Balance
                </td>
                <td className="py-3 px-2 print:px-1 text-right text-ink-900 tabular-nums whitespace-nowrap">
                  {totalWeightKg > 0 ? `${totalWeightKg.toLocaleString('en-IN')} Kg` : ''}
                </td>
                <td className="py-3 px-2 print:px-1"></td>
                <td className="py-3 px-2 print:px-1"></td>
                <td className="py-3 px-2 print:px-1 text-right text-ink-900 tabular-nums whitespace-nowrap">
                  {totalPurchaseValue > 0 ? formatINR(totalPurchaseValue) : ''}
                </td>
                <td className="py-3 px-2 print:px-1 text-right text-ink-900 tabular-nums whitespace-nowrap">
                  {totalExpenseValue > 0 ? formatINR(totalExpenseValue) : ''}
                </td>
                <td className="py-3 px-2 print:px-1 text-right text-rose-900 tabular-nums whitespace-nowrap">
                  {formatINR(totalDebits)}
                </td>
                <td className="py-3 px-2 print:px-1 text-right text-emerald-700 tabular-nums whitespace-nowrap">
                  {formatINR(totalCredits)}
                </td>
                <td className="py-3 px-2 print:px-1 text-right text-sm sm:text-base text-rose-700 font-extrabold tabular-nums whitespace-nowrap">
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
            <p className="text-[10px]">{businessSettings.businessName || 'Coastal Marine Traders'}</p>
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
